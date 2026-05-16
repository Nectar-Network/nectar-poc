#!/usr/bin/env bash
# railway-keeper-env.sh — set all public env vars on the linked Railway service.
#
# Usage:
#   cd keeper && railway link            # pick the right service first
#   ../scripts/railway-keeper-env.sh keeper-alpha
#   ../scripts/railway-keeper-env.sh keeper-beta
#
# This script does NOT set KEEPER_SECRET — set that in the Railway dashboard
# (Variables tab → New Variable → tick "Mark as secret"). Keys end up in
# shell history if set via CLI.

set -euo pipefail

NAME="${1:-keeper-alpha}"
case "$NAME" in
  keeper-alpha|keeper-beta) ;;
  *)
    echo "name must be keeper-alpha or keeper-beta" >&2
    exit 1
    ;;
esac

# Tranche 1 contracts (testnet, deployed 2026-04-27)
REGISTRY=CAEHWZOOEP6YSU3EJDO7B2L7QJTG4YHXJIACRBWRTFRPMRVND56LTWAO
VAULT=CCSR5GT6BEZXCW5UWV4LOXC24L75YQ7JJ5Q3Q7WJKLCGSKOSWOELJJFQ
USDC=CD3YAGUK4SV67PIHRYKR5QAKTNVIGVDAXT6P426EO2E76DAXGMPLMSAH

ARGS=(
  --set "KEEPER_NAME=${NAME}"
  --set "REGISTRY_CONTRACT=${REGISTRY}"
  --set "VAULT_CONTRACT=${VAULT}"
  --set "USDC_CONTRACT=${USDC}"
  --set "SOROBAN_RPC=https://soroban-testnet.stellar.org:443"
  --set "HORIZON_URL=https://horizon-testnet.stellar.org"
  --set "POLL_INTERVAL=10"
  --set "MIN_PROFIT=1.02"
  --set "API_PORT=8080"
)

# Blend testnet pool — only set when non-empty (Railway CLI rejects "KEY=").
# Set BLEND_POOL=... in the environment before running, or set it later via
# `railway variables --set BLEND_POOL=C...`. Without it, the keeper runs in
# vault-monitor-only mode (no liquidation cycle, but the API still serves).
if [[ -n "${BLEND_POOL:-}" ]]; then
  ARGS+=(--set "BLEND_POOL=${BLEND_POOL}")
fi

railway variables "${ARGS[@]}"

echo
echo "Public env vars set for ${NAME}."
echo "Now set KEEPER_SECRET in the Railway dashboard (Variables → New Variable → mark as secret)."
echo
case "$NAME" in
  keeper-alpha) echo "  KEEPER_SECRET → alpha's secret from deploy/keepers.json"  ;;
  keeper-beta)  echo "  KEEPER_SECRET → beta's secret from deploy/keepers.json"   ;;
esac
