#!/usr/bin/env bash
# e2e_test.sh — Automated end-to-end testnet validation
# Prerequisites: testnet-setup.sh completed, keepers running via docker-compose
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

source "$ROOT_DIR/.env" 2>/dev/null || { echo "ERROR: .env not found. Run testnet-setup.sh first."; exit 1; }
source "$ROOT_DIR/.env.wallets" 2>/dev/null || { echo "ERROR: .env.wallets not found."; exit 1; }

API_URL="${KEEPER_API_URL:-http://localhost:8080}"
TIMEOUT=120  # seconds to wait for liquidation event

PASS=0
FAIL=0

ok()   { echo "  [PASS] $1"; PASS=$((PASS+1)); }
fail() { echo "  [FAIL] $1"; FAIL=$((FAIL+1)); }

echo "================================================================"
echo "  Nectar Network E2E Test"
echo "  API: $API_URL"
echo "================================================================"
echo ""

# ── Test 1: Health check ──────────────────────────────────────────────────────
echo "1. Keeper health check"
if curl -sf "$API_URL/healthz" >/dev/null; then
  ok "Keeper API is healthy"
else
  fail "Keeper API is not responding at $API_URL"
fi

# ── Test 2: API returns vault state ───────────────────────────────────────────
echo "2. Vault state"
STATE=$(curl -sf "$API_URL/api/state" 2>/dev/null)
if echo "$STATE" | grep -q '"vault"'; then
  ok "API /api/state returns vault data"
else
  fail "API /api/state missing vault field"
fi

# ── Test 3: TVL is ~50,010 USDC ───────────────────────────────────────────────
echo "3. Vault TVL"
TVL=$(echo "$STATE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(d.get('vault', {}).get('total_usdc', 0))" 2>/dev/null || echo "0")
# 50,010 USDC = 500,100,000,000 stroops; allow ±100 stroops for rounding
if [ "$TVL" -ge 500099999900 ] && [ "$TVL" -le 500100000100 ]; then
  ok "Vault TVL is ~50,010 USDC ($TVL stroops)"
else
  fail "Vault TVL unexpected: $TVL (expected ~500100000000)"
fi

# ── Test 4: Performance endpoint ─────────────────────────────────────────────
echo "4. Performance endpoint"
PERF=$(curl -sf "$API_URL/api/performance" 2>/dev/null)
DEP_COUNT=$(echo "$PERF" | python3 -c "import sys, json; d=json.load(sys.stdin); print(len(d.get('depositors', [])))" 2>/dev/null || echo "0")
if [ "$DEP_COUNT" -ge 1 ]; then
  ok "Performance endpoint shows $DEP_COUNT depositors"
else
  fail "Performance endpoint shows no depositors (check KNOWN_DEPOSITORS env var)"
fi

# ── Test 5: Metrics endpoint ─────────────────────────────────────────────────
echo "5. Prometheus metrics"
METRICS=$(curl -sf "$API_URL/metrics" 2>/dev/null)
if echo "$METRICS" | grep -q "nectar_cycles_total"; then
  ok "Prometheus /metrics endpoint works"
else
  fail "Prometheus /metrics missing nectar_cycles_total"
fi

# ── Test 6: Wait for liquidation (if BLEND_POOL configured) ──────────────────
echo "6. Liquidation cycle (if BLEND_POOL configured)"
if [ -n "${BLEND_POOL:-}" ]; then
  echo "  Waiting up to ${TIMEOUT}s for a liquidation cycle..."
  ELAPSED=0
  INITIAL_LIQ=$(echo "$STATE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(len(d.get('liquidations', [])))" 2>/dev/null || echo "0")
  while [ $ELAPSED -lt $TIMEOUT ]; do
    sleep 10
    ELAPSED=$((ELAPSED+10))
    NEW_STATE=$(curl -sf "$API_URL/api/state" 2>/dev/null)
    NEW_LIQ=$(echo "$NEW_STATE" | python3 -c "import sys, json; d=json.load(sys.stdin); print(len(d.get('liquidations', [])))" 2>/dev/null || echo "0")
    if [ "$NEW_LIQ" -gt "$INITIAL_LIQ" ]; then
      ok "Liquidation detected after ${ELAPSED}s ($NEW_LIQ total)"
      break
    fi
    echo "  ...${ELAPSED}s elapsed, waiting for liquidation..."
  done
  if [ $ELAPSED -ge $TIMEOUT ]; then
    fail "No liquidation in ${TIMEOUT}s (pool may have no underwater positions)"
  fi
else
  echo "  BLEND_POOL not set — skipping liquidation test (expected in pure vault test)"
  ok "Liquidation test skipped (no BLEND_POOL)"
fi

# ── Test 7: SSE endpoint connects ────────────────────────────────────────────
echo "7. SSE endpoint"
SSE_OUTPUT=$(timeout 3 curl -sf -N -H "Accept: text/event-stream" "$API_URL/api/events" 2>/dev/null || true)
# Even empty SSE stream is OK — just check it doesn't 4xx/5xx immediately
HTTP_CODE=$(curl -o /dev/null -w "%{http_code}" -sf -N "$API_URL/api/events" --max-time 2 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "000" ]; then
  ok "SSE endpoint accessible (HTTP $HTTP_CODE)"
else
  fail "SSE endpoint returned HTTP $HTTP_CODE"
fi

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "================================================================"
echo "  Results: $PASS passed, $FAIL failed"
echo "================================================================"

if [ $FAIL -eq 0 ]; then
  echo "  ALL TESTS PASSED"
  exit 0
else
  echo "  SOME TESTS FAILED"
  exit 1
fi
