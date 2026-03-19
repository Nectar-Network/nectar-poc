package blend

import (
	"errors"
	"fmt"
	"math"
	"math/big"

	"github.com/stellar/go/keypair"
	"github.com/stellar/go/xdr"

	"github.com/nectar-network/keeper/soroban"
)

type Auction struct {
	User       string
	StartBlock int64
	Lot        map[string]*big.Int
	Bid        map[string]*big.Int
}

var ErrAlreadyFilled = errors.New("auction already filled by another keeper")

// CreateAuction calls new_liquidation_auction on the Blend pool.
func CreateAuction(rpc *soroban.Client, horizonURL string, kp *keypair.Full, passphrase, poolAddr, user string, pct int) error {
	userVal, err := soroban.ScvAddress(user)
	if err != nil {
		return err
	}
	pctVal := soroban.ScvU64(uint64(pct) * 1e7)

	_, err = rpc.Invoke(horizonURL, kp, passphrase, poolAddr, "new_liquidation_auction", userVal, pctVal)
	if err != nil {
		if isAuctionExists(err.Error()) {
			return nil
		}
		return fmt.Errorf("new_liquidation_auction: %w", err)
	}
	return nil
}

// GetAuction fetches an existing liquidation auction for user.
func GetAuction(rpc *soroban.Client, passphrase, poolAddr, user string) (*Auction, error) {
	userVal, err := soroban.ScvAddress(user)
	if err != nil {
		return nil, err
	}
	auctType := soroban.ScvU64(0) // 0 = UserLiquidation

	sim, err := rpc.SimulateRead(passphrase, poolAddr, "get_auction", auctType, userVal)
	if err != nil {
		return nil, err
	}
	if sim.Error != "" {
		if isNotFound(sim.Error) {
			return nil, nil
		}
		return nil, fmt.Errorf("get_auction: %s", sim.Error)
	}
	if len(sim.Results) == 0 {
		return nil, nil
	}
	var val xdr.ScVal
	if err := xdr.SafeUnmarshalBase64(sim.Results[0].XDR, &val); err != nil {
		return nil, err
	}
	return parseAuction(val, user), nil
}

// FillAuction fills an active auction via pool.submit().
func FillAuction(rpc *soroban.Client, horizonURL string, kp *keypair.Full, passphrase, poolAddr, user string) error {
	fromVal, err := soroban.ScvAddress(kp.Address())
	if err != nil {
		return err
	}
	userVal, err := soroban.ScvAddress(user)
	if err != nil {
		return err
	}

	reqTypeVal := soroban.ScvU64(6) // RequestType::FillUserLiquidationAuction
	zeroAmt := soroban.ScvU64(0)

	// Keys MUST be in sorted lexicographic order for Soroban Map<Symbol, Val>
	reqMap := xdr.ScMap{
		{Key: soroban.ScvSymbol("address"), Val: userVal},
		{Key: soroban.ScvSymbol("amount"), Val: zeroAmt},
		{Key: soroban.ScvSymbol("request_type"), Val: reqTypeVal},
	}
	reqMapPtr := &reqMap
	reqVec := xdr.ScVec{{Type: xdr.ScValTypeScvMap, Map: &reqMapPtr}}
	reqVecPtr := &reqVec
	requestsVal := xdr.ScVal{Type: xdr.ScValTypeScvVec, Vec: &reqVecPtr}

	_, err = rpc.Invoke(horizonURL, kp, passphrase, poolAddr, "submit",
		fromVal, fromVal, fromVal, requestsVal)
	if err != nil {
		if isAlreadyFilled(err.Error()) {
			return ErrAlreadyFilled
		}
		return fmt.Errorf("fill auction: %w", err)
	}
	return nil
}

// Profitability computes lot_value/bid_cost for a Blend Dutch auction at currentBlock.
func Profitability(auction Auction, pool *PoolState, currentBlock int64) float64 {
	elapsed := currentBlock - auction.StartBlock
	if elapsed > 200 {
		elapsed = 200
	}
	if elapsed < 0 {
		elapsed = 0
	}
	lotPct := float64(elapsed) / 200.0
	bidPct := float64(200-elapsed) / 200.0

	var lotVal, bidVal float64
	for asset, amt := range auction.Lot {
		r, ok := pool.Reserves[asset]
		if !ok {
			continue
		}
		f, _ := new(big.Float).SetInt(amt).Float64()
		lotVal += (f / scalar) * lotPct * r.OraclePrice
	}
	for asset, amt := range auction.Bid {
		r, ok := pool.Reserves[asset]
		if !ok {
			continue
		}
		f, _ := new(big.Float).SetInt(amt).Float64()
		bidVal += (f / scalar) * bidPct * r.OraclePrice
	}
	if bidVal == 0 {
		return math.Inf(1)
	}
	return lotVal / bidVal
}

func parseAuction(val xdr.ScVal, user string) *Auction {
	a := &Auction{User: user, Lot: make(map[string]*big.Int), Bid: make(map[string]*big.Int)}
	if val.Type != xdr.ScValTypeScvMap || val.Map == nil || *val.Map == nil {
		return a
	}
	for _, entry := range **val.Map {
		switch scSymbol(entry.Key) {
		case "block":
			if entry.Val.Type == xdr.ScValTypeScvU32 && entry.Val.U32 != nil {
				a.StartBlock = int64(*entry.Val.U32)
			}
		case "lot":
			a.Lot = parseAssetMap(entry.Val)
		case "bid":
			a.Bid = parseAssetMap(entry.Val)
		}
	}
	return a
}

func parseAssetMap(val xdr.ScVal) map[string]*big.Int {
	m := make(map[string]*big.Int)
	if val.Type != xdr.ScValTypeScvMap || val.Map == nil || *val.Map == nil {
		return m
	}
	for _, e := range **val.Map {
		if e.Key.Type != xdr.ScValTypeScvAddress || e.Key.Address == nil {
			continue
		}
		asset, err := soroban.ParseAddress(*e.Key.Address)
		if err != nil {
			continue
		}
		if amt := scI128(e.Val); amt != nil {
			m[asset] = amt
		}
	}
	return m
}

func isNotFound(s string) bool {
	return contains(s, "AuctionNotFound") || contains(s, "NotFound") || contains(s, "#4")
}
func isAlreadyFilled(s string) bool {
	return contains(s, "AuctionNotFound") || contains(s, "AlreadyFilled") || contains(s, "#4")
}
func isAuctionExists(s string) bool {
	return contains(s, "AuctionExists") || contains(s, "#5")
}

func contains(s, sub string) bool {
	for i := 0; i <= len(s)-len(sub); i++ {
		if s[i:i+len(sub)] == sub {
			return true
		}
	}
	return false
}
