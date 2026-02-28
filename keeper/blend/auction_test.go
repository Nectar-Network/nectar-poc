package blend

import (
	"math"
	"testing"

	"math/big"
)

func makePool(price float64) *PoolState {
	return &PoolState{
		Reserves: map[string]*Reserve{
			"XLM":  {OraclePrice: price},
			"USDC": {OraclePrice: 1.0},
		},
	}
}

func makeBigInt(n int64) *big.Int { return big.NewInt(n) }

func TestProfitability_Block0(t *testing.T) {
	// At block 0, lot pct = 0 → lot value = 0 → ratio = 0
	auction := Auction{
		StartBlock: 1000,
		Lot:        map[string]*big.Int{"XLM": makeBigInt(1_0000000)},
		Bid:        map[string]*big.Int{"USDC": makeBigInt(1_0000000)},
	}
	pool := makePool(1.0)
	got := Profitability(auction, pool, 1000) // elapsed = 0
	if got != 0 {
		t.Fatalf("expected 0 at block 0, got %f", got)
	}
}

func TestProfitability_Block100(t *testing.T) {
	// At block 100: lotPct=0.5, bidPct=0.5 → ratio = 1.0 with equal values
	auction := Auction{
		StartBlock: 1000,
		Lot:        map[string]*big.Int{"XLM": makeBigInt(1_0000000)},
		Bid:        map[string]*big.Int{"USDC": makeBigInt(1_0000000)},
	}
	pool := makePool(1.0)
	got := Profitability(auction, pool, 1100) // elapsed = 100
	const eps = 1e-6
	if math.Abs(got-1.0) > eps {
		t.Fatalf("expected ~1.0 at block 100, got %f", got)
	}
}

func TestProfitability_Block200(t *testing.T) {
	// At block 200: bidPct=0 → infinite profit
	auction := Auction{
		StartBlock: 1000,
		Lot:        map[string]*big.Int{"XLM": makeBigInt(1_0000000)},
		Bid:        map[string]*big.Int{"USDC": makeBigInt(1_0000000)},
	}
	pool := makePool(1.0)
	got := Profitability(auction, pool, 1200) // elapsed = 200
	if !math.IsInf(got, 1) {
		t.Fatalf("expected +Inf at block 200, got %f", got)
	}
}

func TestProfitability_Block150_Profitable(t *testing.T) {
	// At block 150: lotPct=0.75, bidPct=0.25
	// lot = 1 XLM * 1.0 * 0.75 = 0.75
	// bid = 1 USDC * 1.0 * 0.25 = 0.25
	// ratio = 3.0
	auction := Auction{
		StartBlock: 0,
		Lot:        map[string]*big.Int{"XLM": makeBigInt(1_0000000)},
		Bid:        map[string]*big.Int{"USDC": makeBigInt(1_0000000)},
	}
	pool := makePool(1.0)
	got := Profitability(auction, pool, 150)
	const eps = 1e-4
	if math.Abs(got-3.0) > eps {
		t.Fatalf("expected ~3.0 at block 150, got %f", got)
	}
}

func TestProfitability_OverBlock200_Clamped(t *testing.T) {
	// elapsed > 200 should be clamped to 200 → same result as block 200
	auction := Auction{
		StartBlock: 0,
		Lot:        map[string]*big.Int{"XLM": makeBigInt(1_0000000)},
		Bid:        map[string]*big.Int{"USDC": makeBigInt(1_0000000)},
	}
	pool := makePool(1.0)
	got := Profitability(auction, pool, 500)
	if !math.IsInf(got, 1) {
		t.Fatalf("expected +Inf for clamped elapsed=200, got %f", got)
	}
}

func TestErrAlreadyFilled_Sentinel(t *testing.T) {
	if ErrAlreadyFilled == nil {
		t.Fatal("ErrAlreadyFilled should not be nil")
	}
	if ErrAlreadyFilled.Error() == "" {
		t.Fatal("ErrAlreadyFilled should have a non-empty message")
	}
}

func TestContains(t *testing.T) {
	cases := []struct {
		s, sub string
		want   bool
	}{
		{"AuctionNotFound", "AuctionNotFound", true},
		{"AuctionNotFound", "NotFound", true},
		{"AuctionExists", "AuctionNotFound", false},
		{"", "x", false},
		{"abc", "", true},
	}
	for _, c := range cases {
		if got := contains(c.s, c.sub); got != c.want {
			t.Fatalf("contains(%q, %q) = %v, want %v", c.s, c.sub, got, c.want)
		}
	}
}
