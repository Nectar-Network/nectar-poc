package main

import (
	"encoding/json"
	"sync"
	"testing"
	"time"
)

func newTestState() *State {
	return &State{KeeperStats: map[string]*KeeperStat{}}
}

func TestAddEvent_TrimsAt100(t *testing.T) {
	s := newTestState()
	for i := 0; i < 110; i++ {
		s.addEvent("event")
	}
	s.mu.RLock()
	n := len(s.Events)
	s.mu.RUnlock()
	if n != 100 {
		t.Fatalf("expected 100 events after trim, got %d", n)
	}
}

func TestAddEvent_ContentPreserved(t *testing.T) {
	s := newTestState()
	s.addEvent("alpha")
	s.addEvent("beta")
	s.mu.RLock()
	defer s.mu.RUnlock()
	if s.Events[0] != "alpha" || s.Events[1] != "beta" {
		t.Fatalf("events not in order: %v", s.Events)
	}
}

func TestSubscribeUnsubscribe(t *testing.T) {
	s := newTestState()
	ch := s.subscribe()

	s.subsMu.Lock()
	if len(s.subs) != 1 {
		s.subsMu.Unlock()
		t.Fatal("expected 1 subscriber")
	}
	s.subsMu.Unlock()

	s.unsubscribe(ch)

	s.subsMu.Lock()
	if len(s.subs) != 0 {
		s.subsMu.Unlock()
		t.Fatal("expected 0 subscribers after unsub")
	}
	s.subsMu.Unlock()
}

func TestAddEvent_Concurrent(t *testing.T) {
	s := newTestState()
	var wg sync.WaitGroup
	for i := 0; i < 10; i++ {
		wg.Add(1)
		go func(n int) {
			defer wg.Done()
			for j := 0; j < 20; j++ {
				s.addEvent("msg")
			}
		}(i)
	}
	wg.Wait()
	s.mu.RLock()
	n := len(s.Events)
	s.mu.RUnlock()
	if n > 100 {
		t.Fatalf("events overflowed 100, got %d", n)
	}
}

func TestAddEvent_SlowSubscriber_DoesNotBlock(t *testing.T) {
	s := newTestState()
	// subscribe but never drain — buffer will fill
	ch := s.subscribe()
	defer s.unsubscribe(ch)

	done := make(chan struct{})
	go func() {
		// fire 200 events — only 32 fit in the buffered channel, rest are dropped
		for i := 0; i < 200; i++ {
			s.addEvent("event")
		}
		close(done)
	}()

	select {
	case <-done:
		// success — addEvent never blocked
	case <-time.After(2 * time.Second):
		t.Fatal("addEvent blocked on slow subscriber")
	}
}

func TestAddEvent_PayloadIsValidJSON(t *testing.T) {
	s := newTestState()
	ch := s.subscribe()
	defer s.unsubscribe(ch)

	s.addEvent("test message")

	select {
	case payload := <-ch:
		var m map[string]string
		if err := json.Unmarshal([]byte(payload), &m); err != nil {
			t.Fatalf("payload is not valid JSON: %v", err)
		}
		if m["msg"] != "test message" {
			t.Fatalf("unexpected msg: %q", m["msg"])
		}
	case <-time.After(1 * time.Second):
		t.Fatal("timed out waiting for event")
	}
}

func TestLiquidationRecord_AppendedCorrectly(t *testing.T) {
	s := newTestState()
	s.mu.Lock()
	s.Liquidations = append(s.Liquidations, LiquidationRecord{
		User:      "GABC",
		Block:     12345,
		Drew:      100,
		Proceeds:  110,
		Timestamp: time.Now().UTC(),
	})
	s.mu.Unlock()

	s.mu.RLock()
	defer s.mu.RUnlock()
	if len(s.Liquidations) != 1 {
		t.Fatalf("expected 1 liquidation, got %d", len(s.Liquidations))
	}
	if s.Liquidations[0].User != "GABC" {
		t.Fatalf("wrong user: %q", s.Liquidations[0].User)
	}
}
