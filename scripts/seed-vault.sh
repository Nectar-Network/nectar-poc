#!/usr/bin/env bash
# seed-vault.sh — Mint 4,000 USDC to each of 15 test users and have them deposit
#                 3,334 USDC into NectarVault → total TVL ~50,010 USDC
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$ROOT_DIR/.env"
ENV_WALLETS="$ROOT_DIR/.env.wallets"

if [ ! -f "$ENV_WALLETS" ]; then
  echo "ERROR: $ENV_WALLETS not found. Run gen-wallets.sh first." >&2
  exit 1
fi

if [ ! -f "$ENV_FILE" ]; then
  echo "ERROR: $ENV_FILE not found. Run deploy.sh first." >&2
  exit 1
fi

source "$ENV_WALLETS"
source "$ENV_FILE"

: "${USDC_CONTRACT:?USDC_CONTRACT not set in .env}"
: "${VAULT_CONTRACT:?VAULT_CONTRACT not set in .env}"

RPC_URL="${SOROBAN_RPC:-https://soroban-testnet.stellar.org:443}"
PASSPHRASE="${NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}"

# 3,334 USDC at 7 decimal places = 3334 * 10^7 = 33,340,000,000 stroops
DEPOSIT_AMOUNT=33340000000
# 4,000 USDC = 40,000,000,000 stroops (mint a bit more than deposit)
MINT_AMOUNT=40000000000

TOTAL_DEPOSITED=0

echo "Seeding NectarVault with 15 test users..."
echo "  USDC contract: $USDC_CONTRACT"
echo "  Vault contract: $VAULT_CONTRACT"
echo "  Deposit per user: 3,334 USDC"
echo ""

for i in $(seq 1 15); do
  NUM=$(printf "%02d" $i)
  SECRET_VAR="USER_${NUM}_SECRET"
  ADDRESS_VAR="USER_${NUM}_ADDRESS"
  USER_SECRET="${!SECRET_VAR}"
  USER_ADDRESS="${!ADDRESS_VAR}"

  echo "User ${NUM} ($USER_ADDRESS):"

  # Admin mints USDC to user
  echo -n "  Minting ${MINT_AMOUNT} stroops USDC... "
  stellar contract invoke \
    --id "$USDC_CONTRACT" \
    --source "$ADMIN_SECRET" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$PASSPHRASE" \
    -- mint \
      --to "$USER_ADDRESS" \
      --amount "$MINT_AMOUNT" \
    2>&1 | tail -1
  echo "OK"

  # User deposits into vault (user must auth the transfer)
  echo -n "  Depositing ${DEPOSIT_AMOUNT} stroops into vault... "
  stellar contract invoke \
    --id "$VAULT_CONTRACT" \
    --source "$USER_SECRET" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$PASSPHRASE" \
    -- deposit \
      --user "$USER_ADDRESS" \
      --amount "$DEPOSIT_AMOUNT" \
    2>&1 | tail -1

  TOTAL_DEPOSITED=$((TOTAL_DEPOSITED + DEPOSIT_AMOUNT))
  echo "  Done. Running TVL: $((TOTAL_DEPOSITED / 10000000)) USDC"
  echo ""
done

echo "======================================="
echo "Seeding complete!"
echo "  Users seeded: 15"
echo "  Total TVL: $((TOTAL_DEPOSITED / 10000000)) USDC ($TOTAL_DEPOSITED stroops)"
echo ""

# Print final vault state
echo "Vault state:"
stellar contract invoke \
  --id "$VAULT_CONTRACT" \
  --source "$ADMIN_SECRET" \
  --rpc-url "$RPC_URL" \
  --network-passphrase "$PASSPHRASE" \
  -- get_state
