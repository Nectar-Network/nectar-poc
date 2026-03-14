package main

import (
	"fmt"
	"os"
	"strconv"
	"strings"
)

type Config struct {
	RpcURL          string
	HorizonURL      string
	Passphrase      string
	SecretKey       string
	KeeperName      string
	RegistryID      string
	VaultID         string
	BlendPool       string
	APIPort         string
	PollInterval    int
	MinProfit       float64
	KnownDepositors []string // comma-separated G-addresses for performance page
}

func LoadConfig() Config {
	c := Config{
		RpcURL:     envOr("SOROBAN_RPC", "https://soroban-testnet.stellar.org:443"),
		HorizonURL: envOr("HORIZON_URL", "https://horizon-testnet.stellar.org"),
		Passphrase: envOr("NETWORK_PASSPHRASE", "Test SDF Network ; September 2015"),
		SecretKey:  mustEnv("KEEPER_SECRET"),
		KeeperName: envOr("KEEPER_NAME", "nectar-keeper-1"),
		RegistryID: mustEnv("REGISTRY_CONTRACT"),
		VaultID:    mustEnv("VAULT_CONTRACT"),
		BlendPool:  envOr("BLEND_POOL", ""),
		APIPort:    envOr("API_PORT", "8080"),
	}

	pollStr := envOr("POLL_INTERVAL", "10")
	poll, err := strconv.Atoi(pollStr)
	if err != nil {
		fmt.Fprintf(os.Stderr, "POLL_INTERVAL=%q is not a valid integer\n", pollStr)
		os.Exit(1)
	}
	if poll < 3 || poll > 300 {
		fmt.Fprintf(os.Stderr, "POLL_INTERVAL=%d out of range [3,300]\n", poll)
		os.Exit(1)
	}
	c.PollInterval = poll

	profitStr := envOr("MIN_PROFIT", "1.02")
	profit, err := strconv.ParseFloat(profitStr, 64)
	if err != nil {
		fmt.Fprintf(os.Stderr, "MIN_PROFIT=%q is not a valid float\n", profitStr)
		os.Exit(1)
	}
	if profit <= 0 {
		fmt.Fprintf(os.Stderr, "MIN_PROFIT must be > 0, got %.4f\n", profit)
		os.Exit(1)
	}
	c.MinProfit = profit

	if raw := os.Getenv("KNOWN_DEPOSITORS"); raw != "" {
		for _, addr := range strings.Split(raw, ",") {
			addr = strings.TrimSpace(addr)
			if addr != "" {
				c.KnownDepositors = append(c.KnownDepositors, addr)
			}
		}
	}

	return c
}

func mustEnv(key string) string {
	v := strings.TrimSpace(os.Getenv(key))
	if v == "" {
		fmt.Fprintf(os.Stderr, "missing required env: %s\n", key)
		os.Exit(1)
	}
	return v
}

func envOr(key, fallback string) string {
	if v := strings.TrimSpace(os.Getenv(key)); v != "" {
		return v
	}
	return fallback
}
