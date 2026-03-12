#!/usr/bin/env bash
# register-keepers-testnet.sh — Register keeper-alpha and keeper-beta in the KeeperRegistry
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$ROOT_DIR/.env"
ENV_WALLETS="$ROOT_DIR/.env.wallets"

source "$ENV_WALLETS"
source "$ENV_FILE"

: "${REGISTRY_CONTRACT:?REGISTRY_CONTRACT not set in .env}"

RPC_URL="${SOROBAN_RPC:-https://soroban-testnet.stellar.org:443}"
PASSPHRASE="${NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}"

register_keeper() {
  local secret="$1"
  local address="$2"
  local name="$3"
  echo -n "Registering $name ($address)... "
  stellar contract invoke \
    --id "$REGISTRY_CONTRACT" \
    --source "$secret" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$PASSPHRASE" \
    -- register \
      --operator "$address" \
      --name "$name"
  echo "OK"
}

register_keeper "$KEEPER_A_SECRET" "$KEEPER_A_ADDRESS" "keeper-alpha"
register_keeper "$KEEPER_B_SECRET" "$KEEPER_B_ADDRESS" "keeper-beta"

echo ""
echo "Keeper count:"
stellar contract invoke \
  --id "$REGISTRY_CONTRACT" \
  --source "$ADMIN_SECRET" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$PASSPHRASE" \
  -- keeper_count
