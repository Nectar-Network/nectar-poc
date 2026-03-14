# Nectar Network

Multi-operator keeper infrastructure for Soroban DeFi. Monitors Blend Protocol pools, detects liquidatable positions, and coordinates auction execution across multiple independent operators.

On Feb 22, 2026, a USTRY/XLM oracle manipulation drained $10.8M from a Blend pool. Two pre-positioned bots captured nearly all of it. The rest of the ecosystem had no coordinated response. Nectar fixes this.

## Architecture

```
KeeperRegistry (Soroban)  ←——  register/query
         ↑                              ↑
    [on-chain]                    [off-chain]
         ↑                              ↑
    Blend Pool  ←——  Keeper #1 (keeper-alpha)
    (testnet)   ←——  Keeper #2 (keeper-beta)
         ↑
    Mock Oracle
```

Both keepers independently monitor pool health factors. When a position drops below HF 1.0, both detect it, race to fill the liquidation auction — one wins, the other handles "already filled" gracefully.

## Quick Start

**1. Deploy the registry contract:**
```bash
export ADMIN_SECRET="S..."
export ADMIN_ADDRESS="G..."
./scripts/deploy.sh
# outputs: REGISTRY_CONTRACT=C...
```

**2. Run a keeper:**
```bash
cd keeper && npm install
export KEEPER_SECRET="S..."
export KEEPER_NAME="keeper-alpha"
export REGISTRY_CONTRACT="C..."
export BLEND_POOL="C..."
npm start
```

**3. Run a second keeper** (in another terminal):
```bash
export KEEPER_SECRET="S..."  # different keypair
export KEEPER_NAME="keeper-beta"
export REGISTRY_CONTRACT="C..."
export BLEND_POOL="C..."
npm start
```

**4. Trigger a liquidation** (requires a deployed test pool):
```bash
export ORACLE_CONTRACT="C..."
export ORACLE_ADMIN_SECRET="S..."
npx tsx scripts/trigger-liquidation.ts
```

## Testnet Contracts

| Contract | Address | Network |
|----------|---------|---------|
| KeeperRegistry | deploy with `./scripts/deploy.sh` | Soroban Testnet |
| Blend Pool | use `blend-utils` to deploy | Soroban Testnet |

## Frontend

```bash
cd frontend && npm install && npm run dev
# → http://localhost:3000
```

## Contract Tests

```bash
cd contracts/keeper-registry
cargo test
# 9 tests, all passing
```

## Env Vars

| Variable | Required | Description |
|----------|----------|-------------|
| `KEEPER_SECRET` | yes | Stellar secret key (S...) |
| `REGISTRY_CONTRACT` | yes | KeeperRegistry contract ID |
| `BLEND_POOL` | yes | Blend pool contract ID |
| `KEEPER_NAME` | no | Display name (default: keeper-alpha) |
| `POLL_INTERVAL_MS` | no | Poll interval (default: 10000) |
| `MIN_PROFIT_RATIO` | no | Fill threshold (default: 1.02) |

## Status

Testnet prototype. Built by 29projects Lab.
