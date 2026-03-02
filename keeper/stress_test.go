package main

import (
	"fmt"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

// TestStress_ConcurrentAddEvent fires addEvent from many goroutines simultaneously.
// Run with: go test -race -run TestStress -timeout 30s
func TestStress_ConcurrentAddEvent(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping stress test in short mode")
	}
	s := newTestState()

	// Add a few subscribers so the fan-out code is also exercised.
	const numSubs = 5
	for i := 0; i < numSubs; i++ {
		ch := s.subscribe()
		// drain goroutine so channel never fills
		go func() {
			for range ch {
			}
		}()
	}

	var wg sync.WaitGroup
	const goroutines = 20
	const eventsPerGoroutine = 200

	for i := 0; i < goroutines; i++ {
		wg.Add(1)
		go func(id int) {
			defer wg.Done()
			for j := 0; j < eventsPerGoroutine; j++ {
				s.addEvent(fmt.Sprintf("event-%d-%d", id, j))
			}
		}(i)
	}
	wg.Wait()

	s.mu.RLock()
	n := len(s.Events)
	s.mu.RUnlock()
	if n > 100 {
		t.Fatalf("event ring overflowed: %d", n)
	}
	t.Logf("Stress complete: %d events in ring after %d total", n, goroutines*eventsPerGoroutine)
}

// TestStress_SubscribeUnsubscribeConcurrent hammers subscribe/unsubscribe concurrently.
func TestStress_SubscribeUnsubscribeConcurrent(t *testing.T) {
	if testing.Short() {
		t.Skip("skipping stress test in short mode")
	}
	s := newTestState()
	var wg sync.WaitGroup
	const goroutines = 10

	for i := 0; i < goroutines; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < 100; j++ {
				ch := s.subscribe()
				s.addEvent("x")
				s.unsubscribe(ch)
			}
		}()
	}
	wg.Wait()

	s.subsMu.Lock()
	n := len(s.subs)
	s.subsMu.Unlock()
	if n != 0 {
		t.Fatalf("expected 0 subs after all unsubscribed, got %d", n)
	}
}

// TestStress_MetricsCounters verifies atomic counters are consistent under load.
func TestStress_MetricsCounters(t *testing.T) {
	origMet := appMet
	appMet = &appMetrics{}
	defer func() { appMet = origMet }()

	var wg sync.WaitGroup
	const goroutines = 50
	const incsEach = 100

	for i := 0; i < goroutines; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := 0; j < incsEach; j++ {
				appMet.cyclesTotal.Add(1)
				appMet.liquidationsTotal.Add(1)
			}
		}()
	}
	wg.Wait()

	want := int64(goroutines * incsEach)
	if got := appMet.cyclesTotal.Load(); got != want {
		t.Fatalf("cyclesTotal: want %d got %d", want, got)
	}
	if got := appMet.liquidationsTotal.Load(); got != want {
		t.Fatalf("liquidationsTotal: want %d got %d", want, got)
	}
}

// BenchmarkAddEvent measures throughput of the addEvent hot path.
func BenchmarkAddEvent(b *testing.B) {
	s := newTestState()
	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			s.addEvent("bench-event")
		}
	})
}

// BenchmarkAddEvent_WithSubscribers measures addEvent with active subscribers.
func BenchmarkAddEvent_WithSubscribers(b *testing.B) {
	s := newTestState()
	var drained atomic.Int64
	for i := 0; i < 10; i++ {
		ch := s.subscribe()
		go func() {
			for range ch {
				drained.Add(1)
			}
		}()
	}

	b.ResetTimer()
	b.RunParallel(func(pb *testing.PB) {
		for pb.Next() {
			s.addEvent("bench-event")
		}
	})

	// give drain goroutines a moment
	time.Sleep(10 * time.Millisecond)
	b.Logf("drained %d events", drained.Load())
}
