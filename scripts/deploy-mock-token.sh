#!/usr/bin/env bash
# deploy-mock-token.sh — Deploy mock USDC token to Stellar Testnet
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$ROOT_DIR/.env"
ENV_WALLETS="$ROOT_DIR/.env.wallets"

if [ ! -f "$ENV_WALLETS" ]; then
  echo "ERROR: $ENV_WALLETS not found. Run gen-wallets.sh first." >&2
  exit 1
fi

source "$ENV_WALLETS"

RPC_URL="${SOROBAN_RPC:-https://soroban-testnet.stellar.org:443}"
PASSPHRASE="${NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}"

update_env() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}

# Build mock-token
echo "Building mock-token contract..."
cd "$ROOT_DIR"
cargo build --target wasm32-unknown-unknown --release -p mock-token \
  2>&1 | grep -E "Compiling|Finished|error"

WASM="target/wasm32-unknown-unknown/release/mock_token.wasm"
OPT="${WASM%.wasm}.optimized.wasm"

echo "Optimizing WASM..."
stellar contract optimize --wasm "$WASM"

# Deploy
echo "Deploying MockToken..."
TOKEN_ID=$(stellar contract deploy \
  --wasm "$OPT" \
  --source "$ADMIN_SECRET" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$PASSPHRASE")
echo "MockToken: $TOKEN_ID"

# Initialize
stellar contract invoke \
  --id "$TOKEN_ID" \
  --source "$ADMIN_SECRET" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$PASSPHRASE" \
  -- initialize \
    --admin "$ADMIN_ADDRESS" \
    --name "Mock USDC" \
    --symbol "USDC" \
    --decimals 7

update_env "USDC_CONTRACT" "$TOKEN_ID"

echo ""
echo "Mock USDC deployed: $TOKEN_ID"
echo "Saved USDC_CONTRACT to $ENV_FILE"
