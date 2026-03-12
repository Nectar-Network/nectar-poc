#!/usr/bin/env bash
set -euo pipefail

: "${KEEPER_A_SECRET:?KEEPER_A_SECRET required}"
: "${KEEPER_A_ADDRESS:?KEEPER_A_ADDRESS required}"
: "${KEEPER_B_SECRET:?KEEPER_B_SECRET required}"
: "${KEEPER_B_ADDRESS:?KEEPER_B_ADDRESS required}"
: "${REGISTRY_CONTRACT:?REGISTRY_CONTRACT required}"

RPC_URL="${SOROBAN_RPC:-https://soroban-testnet.stellar.org:443}"
PASSPHRASE="${NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}"

echo "Registering keeper-alpha ($KEEPER_A_ADDRESS)..."
stellar contract invoke \
  --id "$REGISTRY_CONTRACT" \
  --source "$KEEPER_A_SECRET" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$PASSPHRASE" \
  -- register \
  --operator "$KEEPER_A_ADDRESS" \
  --name "keeper-alpha"

echo "Registering keeper-beta ($KEEPER_B_ADDRESS)..."
stellar contract invoke \
  --id "$REGISTRY_CONTRACT" \
  --source "$KEEPER_B_SECRET" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$PASSPHRASE" \
  -- register \
  --operator "$KEEPER_B_ADDRESS" \
  --name "keeper-beta"

echo "Verifying..."
stellar contract invoke \
  --id "$REGISTRY_CONTRACT" \
  --source "$KEEPER_A_SECRET" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$PASSPHRASE" \
  -- keeper_count

stellar contract invoke \
  --id "$REGISTRY_CONTRACT" \
  --source "$KEEPER_A_SECRET" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$PASSPHRASE" \
  -- get_keepers

echo "Done. Both keepers registered."
