package blend

import (
	"fmt"
	"math/big"

	"github.com/stellar/go/xdr"

	"github.com/nectar-network/keeper/soroban"
)

type PoolState struct {
	Reserves   map[string]*Reserve // asset address -> reserve
	OracleAddr string
}

type Reserve struct {
	Asset           string
	Index           uint32
	CollateralFactor float64
	LiabilityFactor  float64
	BRate           float64 // scaled 1e7
	DRate           float64 // scaled 1e7
	OraclePrice     float64
}

const scalar = 1e7

// LoadPool queries a Blend pool contract for reserve configuration.
func LoadPool(rpc *soroban.Client, passphrase, poolAddr string) (*PoolState, error) {
	ps := &PoolState{Reserves: make(map[string]*Reserve)}

	// get reserve list
	sim, err := rpc.SimulateRead(passphrase, poolAddr, "get_reserve_list")
	if err != nil {
		return nil, fmt.Errorf("reserve list: %w", err)
	}
	if sim.Error != "" {
		return nil, fmt.Errorf("reserve list sim: %s", sim.Error)
	}
	if len(sim.Results) == 0 {
		return ps, nil
	}

	var listVal xdr.ScVal
	if err := xdr.SafeUnmarshalBase64(sim.Results[0].XDR, &listVal); err != nil {
		return nil, err
	}
	assets := parseVec(listVal)

	for _, assetAddr := range assets {
		addrVal, err := soroban.ScvAddress(assetAddr)
		if err != nil {
			continue
		}
		resSim, err := rpc.SimulateRead(passphrase, poolAddr, "get_reserve", addrVal)
		if err != nil || resSim.Error != "" {
			continue
		}
		if len(resSim.Results) == 0 {
			continue
		}
		var resVal xdr.ScVal
		if err := xdr.SafeUnmarshalBase64(resSim.Results[0].XDR, &resVal); err != nil {
			continue
		}
		res := parseReserve(resVal, assetAddr)
		ps.Reserves[assetAddr] = res
	}
	return ps, nil
}

func parseReserve(val xdr.ScVal, asset string) *Reserve {
	res := &Reserve{
		Asset:           asset,
		CollateralFactor: 0.75,
		LiabilityFactor:  1.1,
		BRate:           scalar,
		DRate:           scalar,
		OraclePrice:     0.30,
	}
	if val.Type != xdr.ScValTypeScvMap || val.Map == nil || *val.Map == nil {
		return res
	}
	for _, e := range **val.Map {
		k := scSymbol(e.Key)
		switch k {
		case "index":
			res.Index = scU32(e.Val)
		case "c_factor":
			if e.Val.Type == xdr.ScValTypeScvU32 && e.Val.U32 != nil {
				res.CollateralFactor = float64(*e.Val.U32) / scalar
			}
		case "l_factor":
			if e.Val.Type == xdr.ScValTypeScvU32 && e.Val.U32 != nil {
				res.LiabilityFactor = float64(*e.Val.U32) / scalar
			}
		case "b_rate":
			if v := scI128(e.Val); v != nil {
				f, _ := new(big.Float).SetInt(v).Float64()
				res.BRate = f
			}
		case "d_rate":
			if v := scI128(e.Val); v != nil {
				f, _ := new(big.Float).SetInt(v).Float64()
				res.DRate = f
			}
		}
	}
	return res
}

func parseVec(val xdr.ScVal) []string {
	if val.Type != xdr.ScValTypeScvVec || val.Vec == nil || *val.Vec == nil {
		return nil
	}
	out := make([]string, 0)
	for _, item := range **val.Vec {
		if item.Type == xdr.ScValTypeScvAddress && item.Address != nil {
			addr, err := soroban.ParseAddress(*item.Address)
			if err == nil {
				out = append(out, addr)
			}
		}
	}
	return out
}

func scSymbol(val xdr.ScVal) string {
	if val.Type == xdr.ScValTypeScvSymbol && val.Sym != nil {
		return string(*val.Sym)
	}
	return ""
}

func scU32(val xdr.ScVal) uint32 {
	if val.Type == xdr.ScValTypeScvU32 && val.U32 != nil {
		return uint32(*val.U32)
	}
	return 0
}

func scI128(val xdr.ScVal) *big.Int {
	if val.Type != xdr.ScValTypeScvI128 || val.I128 == nil {
		return nil
	}
	hi := new(big.Int).SetInt64(int64(val.I128.Hi))
	lo := new(big.Int).SetUint64(uint64(val.I128.Lo))
	result := new(big.Int).Lsh(hi, 64)
	result.Add(result, lo)
	return result
}
