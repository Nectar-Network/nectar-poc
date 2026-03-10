#!/usr/bin/env bash
set -euo pipefail

: "${ADMIN_SECRET:?ADMIN_SECRET required}"
: "${ADMIN_ADDRESS:?ADMIN_ADDRESS required}"
: "${USDC_CONTRACT:?USDC_CONTRACT required — testnet USDC token address}"

RPC_URL="${SOROBAN_RPC:-https://soroban-testnet.stellar.org:443}"
PASSPHRASE="${NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}"

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$REPO_ROOT/.env"

update_env() {
  local key="$1" val="$2"
  if grep -q "^${key}=" "$ENV_FILE" 2>/dev/null; then
    sed -i "s|^${key}=.*|${key}=${val}|" "$ENV_FILE"
  else
    echo "${key}=${val}" >> "$ENV_FILE"
  fi
}

# ── 1. Build both contracts ───────────────────────────────────────────────────
echo "Building contracts..."
cd "$REPO_ROOT"
cargo build --target wasm32-unknown-unknown --release \
  2>&1 | grep -E "Compiling|Finished|error"

REGISTRY_WASM="contracts/keeper-registry/target/wasm32-unknown-unknown/release/keeper_registry.wasm"
VAULT_WASM="contracts/nectar-vault/target/wasm32-unknown-unknown/release/nectar_vault.wasm"

echo "Optimizing WASMs..."
stellar contract optimize --wasm "$REGISTRY_WASM"
stellar contract optimize --wasm "$VAULT_WASM"

REGISTRY_OPT="${REGISTRY_WASM%.wasm}.optimized.wasm"
VAULT_OPT="${VAULT_WASM%.wasm}.optimized.wasm"

# ── 2. Deploy KeeperRegistry ─────────────────────────────────────────────────
echo "Deploying KeeperRegistry..."
REGISTRY_ID=$(stellar contract deploy \
  --wasm "$REGISTRY_OPT" \
  --source "$ADMIN_SECRET" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$PASSPHRASE")
echo "KeeperRegistry: $REGISTRY_ID"

stellar contract invoke \
  --id "$REGISTRY_ID" \
  --source "$ADMIN_SECRET" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$PASSPHRASE" \
  -- initialize --admin "$ADMIN_ADDRESS"

update_env "REGISTRY_CONTRACT" "$REGISTRY_ID"

# ── 3. Deploy NectarVault ─────────────────────────────────────────────────────
echo "Deploying NectarVault..."
VAULT_ID=$(stellar contract deploy \
  --wasm "$VAULT_OPT" \
  --source "$ADMIN_SECRET" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$PASSPHRASE")
echo "NectarVault: $VAULT_ID"

stellar contract invoke \
  --id "$VAULT_ID" \
  --source "$ADMIN_SECRET" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$PASSPHRASE" \
  -- initialize \
    --admin "$ADMIN_ADDRESS" \
    --usdc_token "$USDC_CONTRACT" \
    --registry "$REGISTRY_ID"

update_env "VAULT_CONTRACT" "$VAULT_ID"

echo ""
echo "Done."
echo "  REGISTRY_CONTRACT=$REGISTRY_ID"
echo "  VAULT_CONTRACT=$VAULT_ID"
echo "Saved to $ENV_FILE"
