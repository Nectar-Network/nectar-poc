#!/usr/bin/env bash
set -euo pipefail

: "${ADMIN_SECRET:?}"
: "${ADMIN_ADDRESS:?}"
: "${KEEPER_A_SECRET:?}"
: "${KEEPER_A_ADDRESS:?}"
: "${KEEPER_B_SECRET:?}"
: "${KEEPER_B_ADDRESS:?}"
: "${BLEND_POOL:?}"
: "${ORACLE_CONTRACT:?}"
: "${ORACLE_ADMIN_SECRET:?}"

RPC_URL="${SOROBAN_RPC:-https://soroban-testnet.stellar.org:443}"
PASSPHRASE="${NETWORK_PASSPHRASE:-Test SDF Network ; September 2015}"
REPO="$(cd "$(dirname "$0")/.." && pwd)"
LOGS="$REPO/logs"
mkdir -p "$LOGS"

invoke() {
  stellar contract invoke \
    --id "$1" --source "$2" \
    --rpc-url "$RPC_URL" \
    --network-passphrase "$PASSPHRASE" \
    -- "${@:3}"
}

echo "[1/6] Deploying KeeperRegistry..."
source "$REPO/scripts/deploy.sh"

echo "[2/6] Registering keepers..."
invoke "$REGISTRY_CONTRACT" "$KEEPER_A_SECRET" register \
  --operator "$KEEPER_A_ADDRESS" --name "keeper-alpha"
invoke "$REGISTRY_CONTRACT" "$KEEPER_B_SECRET" register \
  --operator "$KEEPER_B_ADDRESS" --name "keeper-beta"

echo "[3/6] Verifying registration..."
COUNT=$(invoke "$REGISTRY_CONTRACT" "$KEEPER_A_SECRET" keeper_count)
if [ "$COUNT" != "2" ]; then
  echo "FAIL: expected 2 keepers, got $COUNT"
  exit 1
fi
echo "PASS: $COUNT keepers registered"

echo "[4/6] Starting keeper clients..."
KEEPER_SECRET="$KEEPER_A_SECRET" KEEPER_NAME="keeper-alpha" \
  REGISTRY_CONTRACT="$REGISTRY_CONTRACT" BLEND_POOL="$BLEND_POOL" \
  npx --prefix "$REPO/keeper" tsx src/index.ts > "$LOGS/keeper-alpha.log" 2>&1 &
KEEPER_A_PID=$!

KEEPER_SECRET="$KEEPER_B_SECRET" KEEPER_NAME="keeper-beta" \
  REGISTRY_CONTRACT="$REGISTRY_CONTRACT" BLEND_POOL="$BLEND_POOL" \
  npx --prefix "$REPO/keeper" tsx src/index.ts > "$LOGS/keeper-beta.log" 2>&1 &
KEEPER_B_PID=$!

echo "  keeper-alpha PID=$KEEPER_A_PID"
echo "  keeper-beta  PID=$KEEPER_B_PID"
sleep 8

echo "[5/6] Triggering liquidation (oracle price drop)..."
ORACLE_CONTRACT="$ORACLE_CONTRACT" ORACLE_ADMIN_SECRET="$ORACLE_ADMIN_SECRET" \
  npx --prefix "$REPO/keeper" tsx "$REPO/scripts/trigger-liquidation.ts"

echo "[6/6] Waiting 40s for keeper execution..."
sleep 40

kill $KEEPER_A_PID $KEEPER_B_PID 2>/dev/null || true

echo ""
echo "=== Results ==="
echo "keeper-alpha log:"
tail -20 "$LOGS/keeper-alpha.log" || true
echo ""
echo "keeper-beta log:"
tail -20 "$LOGS/keeper-beta.log" || true
echo ""
echo "Check for 'fill success' in one log and 'already filled' in the other."
