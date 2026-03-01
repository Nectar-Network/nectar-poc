package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"sync/atomic"
	"testing"
	"time"
)

// mockRPCServer returns a test HTTP server that mimics Soroban JSON-RPC.
// Each call to rpcHandler is invoked per request. If nil, a default noop is used.
func mockRPCServer(t *testing.T, handler http.HandlerFunc) *httptest.Server {
	t.Helper()
	if handler == nil {
		handler = func(w http.ResponseWriter, r *http.Request) {
			json.NewEncoder(w).Encode(map[string]any{
				"jsonrpc": "2.0",
				"id":      1,
				"result":  map[string]any{},
			})
		}
	}
	return httptest.NewServer(handler)
}

// TestHandleState_ReturnsJSON verifies /api/state encodes valid JSON.
func TestHandleState_ReturnsJSON(t *testing.T) {
	s := newTestState()
	s.mu.Lock()
	s.Keepers = []keeperRow{{Name: "test", Address: "GABC", Active: true}}
	s.mu.Unlock()

	// Temporarily replace global state
	orig := state
	state = s
	defer func() { state = orig }()

	req := httptest.NewRequest(http.MethodGet, "/api/state", nil)
	w := httptest.NewRecorder()
	handleState(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var result map[string]any
	if err := json.NewDecoder(w.Body).Decode(&result); err != nil {
		t.Fatalf("response is not JSON: %v", err)
	}
}

// TestHandlePerformance_ReturnsJSON verifies /api/performance encodes valid JSON.
func TestHandlePerformance_ReturnsJSON(t *testing.T) {
	orig := state
	state = newTestState()
	defer func() { state = orig }()

	req := httptest.NewRequest(http.MethodGet, "/api/performance", nil)
	w := httptest.NewRecorder()
	handlePerformance(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var result map[string]any
	if err := json.NewDecoder(w.Body).Decode(&result); err != nil {
		t.Fatalf("response is not JSON: %v", err)
	}
	if _, ok := result["vault"]; !ok {
		t.Fatal("response missing 'vault' key")
	}
}

// TestHandleMetrics_ReturnsPrometheusFormat checks /metrics output.
func TestHandleMetrics_ReturnsPrometheusFormat(t *testing.T) {
	origMet := appMet
	appMet = &appMetrics{}
	defer func() { appMet = origMet }()

	orig := state
	state = newTestState()
	defer func() { state = orig }()

	req := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	w := httptest.NewRecorder()
	handleMetrics(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	body := w.Body.String()
	if len(body) == 0 {
		t.Fatal("empty metrics response")
	}
	// Should contain at least one metric line
	if !containsStr(body, "nectar_cycles_total") {
		t.Fatalf("missing nectar_cycles_total in metrics:\n%s", body)
	}
}

// TestHandleSSE_ClientLimit verifies the 503 when maxSSEClients is exceeded.
func TestHandleSSE_ClientLimit(t *testing.T) {
	origMet := appMet
	appMet = &appMetrics{}
	defer func() { appMet = origMet }()

	// Simulate being at the limit
	appMet.sseActive.Store(maxSSEClients)

	req := httptest.NewRequest(http.MethodGet, "/api/events", nil)
	w := httptest.NewRecorder()
	handleSSE(w, req)

	if w.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503 at SSE limit, got %d", w.Code)
	}
}

// TestCORSMiddleware verifies CORS headers are set.
func TestCORSMiddleware(t *testing.T) {
	handler := corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodGet, "/", nil)
	w := httptest.NewRecorder()
	handler(w, req)

	if got := w.Header().Get("Access-Control-Allow-Origin"); got != "*" {
		t.Fatalf("expected CORS header '*', got %q", got)
	}
}

// TestCORSMiddleware_Options verifies preflight returns 204.
func TestCORSMiddleware_Options(t *testing.T) {
	handler := corsMiddleware(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	req := httptest.NewRequest(http.MethodOptions, "/", nil)
	w := httptest.NewRecorder()
	handler(w, req)

	if w.Code != http.StatusNoContent {
		t.Fatalf("expected 204 for OPTIONS, got %d", w.Code)
	}
}

// TestAddEvent_Broadcast_MultipleSubscribers verifies all subscribers get the event.
func TestAddEvent_Broadcast_MultipleSubscribers(t *testing.T) {
	s := newTestState()
	ch1 := s.subscribe()
	ch2 := s.subscribe()
	defer s.unsubscribe(ch1)
	defer s.unsubscribe(ch2)

	s.addEvent("broadcast-test")

	for i, ch := range []chan string{ch1, ch2} {
		select {
		case msg := <-ch:
			var m map[string]string
			json.Unmarshal([]byte(msg), &m)
			if m["msg"] != "broadcast-test" {
				t.Fatalf("subscriber %d got wrong msg: %q", i, m["msg"])
			}
		case <-time.After(time.Second):
			t.Fatalf("subscriber %d timed out", i)
		}
	}
}

// TestMetrics_LiquidationsCount verifies the counter increments.
func TestMetrics_LiquidationsCount(t *testing.T) {
	origMet := appMet
	appMet = &appMetrics{}
	defer func() { appMet = origMet }()

	var counter atomic.Int64
	counter.Store(0)

	appMet.liquidationsTotal.Add(3)

	req := httptest.NewRequest(http.MethodGet, "/metrics", nil)
	w := httptest.NewRecorder()

	orig := state
	state = newTestState()
	defer func() { state = orig }()

	handleMetrics(w, req)
	body := w.Body.String()
	if !containsStr(body, "nectar_liquidations_total 3") {
		t.Fatalf("expected counter 3 in metrics:\n%s", body)
	}
}

func containsStr(s, sub string) bool {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
