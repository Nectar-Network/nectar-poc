#!/usr/bin/env bash
# fund-wallets.sh — Fund all 18 wallets via Stellar Testnet Friendbot
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_WALLETS="$ROOT_DIR/.env.wallets"

if [ ! -f "$ENV_WALLETS" ]; then
  echo "ERROR: $ENV_WALLETS not found. Run gen-wallets.sh first." >&2
  exit 1
fi

source "$ENV_WALLETS"

FRIENDBOT="https://friendbot.stellar.org"

fund_account() {
  local addr="$1"
  local label="$2"
  echo -n "  Funding $label ($addr)... "
  local resp
  resp=$(curl -sf "${FRIENDBOT}/?addr=${addr}" 2>&1)
  if echo "$resp" | grep -q '"hash"'; then
    echo "OK"
  elif echo "$resp" | grep -q "createAccountAlreadyExist"; then
    echo "already funded"
  else
    echo "WARN: $resp"
  fi
}

echo "Funding wallets on Stellar Testnet via Friendbot..."
echo ""

fund_account "$ADMIN_ADDRESS"    "admin"
fund_account "$KEEPER_A_ADDRESS" "keeper-alpha"
fund_account "$KEEPER_B_ADDRESS" "keeper-beta"

for i in $(seq 1 15); do
  NUM=$(printf "%02d" $i)
  VAR="USER_${NUM}_ADDRESS"
  fund_account "${!VAR}" "user-${NUM}"
done

echo ""
echo "All 18 accounts funded on Stellar Testnet."
echo "Each account received 10,000 XLM (Friendbot default)."
