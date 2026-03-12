#!/usr/bin/env bash
# testnet-setup.sh — Master script: generate wallets, fund, deploy, seed vault
# Run once to bring up the full Nectar testnet environment.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

echo "================================================================"
echo "  Nectar Network — Testnet Setup"
echo "================================================================"
echo ""

step() { echo ""; echo "── Step $1: $2 ──────────────────────────────────────"; }

# ── Step 1: Generate wallets ──────────────────────────────────────────────────
step 1 "Generate wallets"
"$SCRIPT_DIR/gen-wallets.sh"

# ── Step 2: Fund all wallets via Friendbot ────────────────────────────────────
step 2 "Fund wallets via Friendbot"
"$SCRIPT_DIR/fund-wallets.sh"

# Small delay to let accounts settle
sleep 3

# ── Step 3: Deploy mock USDC ──────────────────────────────────────────────────
step 3 "Deploy mock USDC token"
"$SCRIPT_DIR/deploy-mock-token.sh"

# ── Step 4: Deploy KeeperRegistry + NectarVault ───────────────────────────────
step 4 "Deploy KeeperRegistry and NectarVault"
source "$ROOT_DIR/.env.wallets"
source "$ROOT_DIR/.env" 2>/dev/null || true

ADMIN_SECRET="$ADMIN_SECRET" \
ADMIN_ADDRESS="$ADMIN_ADDRESS" \
USDC_CONTRACT="$USDC_CONTRACT" \
  "$SCRIPT_DIR/deploy.sh"

# ── Step 5: Register keepers ──────────────────────────────────────────────────
step 5 "Register keeper-alpha and keeper-beta"
"$SCRIPT_DIR/register-keepers-testnet.sh"

# ── Step 6: Seed vault with 15 test users ────────────────────────────────────
step 6 "Seed vault with 15 users (~50,010 USDC TVL)"
"$SCRIPT_DIR/seed-vault.sh"

# ── Summary ───────────────────────────────────────────────────────────────────
source "$ROOT_DIR/.env"
source "$ROOT_DIR/.env.wallets"

echo ""
echo "================================================================"
echo "  Setup Complete!"
echo "================================================================"
echo ""
echo "Contract Addresses:"
echo "  Mock USDC:        ${USDC_CONTRACT:-NOT SET}"
echo "  KeeperRegistry:   ${REGISTRY_CONTRACT:-NOT SET}"
echo "  NectarVault:      ${VAULT_CONTRACT:-NOT SET}"
echo ""
echo "Keepers:"
echo "  keeper-alpha: $KEEPER_A_ADDRESS"
echo "  keeper-beta:  $KEEPER_B_ADDRESS"
echo ""
echo "Test Users (15):"
for i in $(seq 1 15); do
  NUM=$(printf "%02d" $i)
  VAR="USER_${NUM}_ADDRESS"
  echo "  User ${NUM}: ${!VAR}"
done
echo ""
echo "Next steps:"
echo "  1. Copy .env.wallets values to keeper-alpha / keeper-beta .env files"
echo "  2. Set KEEPER_SECRET=\$KEEPER_A_SECRET for keeper-alpha"
echo "  3. Run: docker-compose up -d"
echo "  4. Visit: http://localhost:3000"
echo "  5. Performance: http://localhost:3000/performance"
