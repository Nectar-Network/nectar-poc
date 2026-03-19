# Nectar Network

Multi-operator keeper infrastructure for Soroban DeFi. Distributed liquidation network for Blend Protocol on Stellar — no single point of failure.

**Live:** [nectarnetwork.fun](https://nectarnetwork.fun) · [Twitter](https://x.com/nectar_xlm) · [GitHub](https://github.com/Nectar-Network/nectar-poc)

## The Problem

On Feb 22, 2026, a USTRY/XLM oracle manipulation drained **$10.8M** from a Blend pool. Two pre-positioned single-operator bots captured nearly all of it — 60 auction fills over 4 hours, one Docker container, one keypair, no fallback. The rest of Stellar DeFi (~$187M TVL) had no coordinated response.

Nectar replaces single-bot liquidation systems with a distributed network of competing keepers, funded by a shared vault.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  SOROBAN TESTNET                                                │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  KeeperRegistry  │  │   NectarVault    │  │ LiquidationLab│  │
│  │  register()      │  │   deposit()      │  │ get_positions()│ │
│  │  deregister()    │  │   withdraw()     │  │ new_auction() │  │
│  │  get_keepers()   │  │   draw()         │  │ get_auction() │  │
│  │  pause()         │  │   return_proceeds│  │ submit()      │  │
│  └──────────────────┘  └──────────────────┘  └──────────────┘  │
│           ↑                    ↑                    ↑           │
└───────────┼────────────────────┼────────────────────┼───────────┘
            │                    │                    │
     ┌──────┴────────────────────┴────────────────────┴──────┐
     │  OFF-CHAIN (Render)                                    │
     │                                                        │
     │  ┌────────────────────┐  ┌────────────────────┐       │
     │  │  Keeper Alpha      │  │  Keeper Beta       │       │
     │  │  monitor → detect  │  │  monitor → detect  │       │
     │  │  → draw → fill     │  │  → draw → fill     │       │
     │  │  → return proceeds │  │  → return proceeds │       │
     │  └────────────────────┘  └────────────────────┘       │
     └────────────────────────────────────────────────────────┘
            │
     ┌──────┴──────────────────────────────────────────────┐
     │  FRONTEND (Vercel) — nectarnetwork.fun              │
     │  Next.js 14 · SSE live stream · REST polling        │
     └─────────────────────────────────────────────────────┘
```

### Liquidation Flow

1. **Monitor** — Each keeper independently polls the pool every 10s for positions with health factor < 1.0
2. **Detect** — When HF drops below 1.0, keeper creates a Dutch auction on-chain
3. **Draw** — Keeper draws USDC capital from the NectarVault
4. **Fill** — Keeper fills the auction (first confirmed transaction wins the race)
5. **Return** — Capital + 10% profit returned to the vault; depositors' shares appreciate
6. **Compete** — The losing keeper handles `ErrAlreadyFilled` gracefully — no capital lost

## Live Testnet Deployment

| Service | URL |
|---------|-----|
| Frontend | [nectarnetwork.fun](https://nectarnetwork.fun) |
| Keeper Alpha API | [nectar-keeper-i7x3.onrender.com](https://nectar-keeper-i7x3.onrender.com) |
| Keeper Beta API | [nectar-keeper-beta.onrender.com](https://nectar-keeper-beta.onrender.com) |

### On-Chain Contracts (Soroban Testnet)

| Contract | Address | Explorer |
|----------|---------|----------|
| KeeperRegistry | `CAWT5HBM25OKGOMJHPFCXWXDWZ7FF436WXRKROTY2VW642FSKLYUKOUB` | [View](https://stellar.expert/explorer/testnet/contract/CAWT5HBM25OKGOMJHPFCXWXDWZ7FF436WXRKROTY2VW642FSKLYUKOUB) |
| NectarVault | `CCXDLRE3IV5225LE3Z776KFB2VWD2MTXOJHAUKFA5RPYDJVOWCMHJ4U4` | [View](https://stellar.expert/explorer/testnet/contract/CCXDLRE3IV5225LE3Z776KFB2VWD2MTXOJHAUKFA5RPYDJVOWCMHJ4U4) |
| LiquidationLab | `CDOXKPEBRQG3MSDOWBROUVGRO6TTC4NJJPW7GCXCR5WR5SUSMEAFE7Y5` | [View](https://stellar.expert/explorer/testnet/contract/CDOXKPEBRQG3MSDOWBROUVGRO6TTC4NJJPW7GCXCR5WR5SUSMEAFE7Y5) |
| USDC Token (SAC) | `CAVBAVD6CZ46FEDKJHBQIJF7EFAZDTRNS65G73QS5ZYI3VK5E2JFPQ4J` | [View](https://stellar.expert/explorer/testnet/contract/CAVBAVD6CZ46FEDKJHBQIJF7EFAZDTRNS65G73QS5ZYI3VK5E2JFPQ4J) |

### Testnet Stats

- **TVL**: $116,003 USDC across 18 depositors
- **Keepers**: 2 registered operators (alpha + beta)
- **Liquidations**: 5+ completed, end-to-end on-chain
- **Profit model**: 10% per successful liquidation returned to vault depositors

## Repository Structure

```
nectar-poc/
├── contracts/
│   ├── keeper-registry/      # Soroban (Rust) — operator registration, 9 tests
│   ├── nectar-vault/         # Soroban (Rust) — USDC vault + LP shares, 17 tests
│   └── liquidation-lab/      # Soroban (Rust) — Blend-compatible test pool, 12 tests
├── keeper/                   # Go 1.22 — keeper binary
│   ├── main.go               # Entry point, HTTP API, SSE, keeper loop
│   ├── config.go             # Env config with validation
│   ├── soroban/              # Soroban JSON-RPC client + tx assembly
│   ├── blend/                # Pool, positions, auction (Blend-compatible)
│   ├── vault/                # Vault draw/return/balance queries
│   └── registry/             # Keeper register/check
├── frontend/                 # Next.js 14 + Tailwind CSS
│   ├── app/
│   │   ├── page.tsx          # Home — hero, live log stream, architecture
│   │   ├── features/         # How It Works — 5 core features explained
│   │   ├── vault/            # Deposit/Withdraw UI with Freighter wallet
│   │   └── performance/      # Live dashboard — depositors, keepers, liquidations
│   └── lib/
│       ├── api.ts            # REST API client + types
│       ├── sse.ts            # SSE hook with exponential backoff
│       └── stellar.ts        # Freighter wallet integration
├── scripts/                  # Deployment + provisioning scripts
├── docker-compose.yml        # Keeper Alpha + Beta + Frontend
├── render.yaml               # Render.com deployment blueprint
└── wallets.md                # All testnet wallet addresses (public keys)
```

## Smart Contracts

### KeeperRegistry (`contracts/keeper-registry/`)

On-chain registry for keeper operators. Any operator can self-register with a keypair. Admin can pause in emergencies.

| Function | Description |
|----------|-------------|
| `initialize(admin)` | Set admin, create empty keeper list |
| `register(keeper, name)` | Register a new keeper operator |
| `deregister(keeper)` | Remove a keeper from the registry |
| `get_keepers()` | List all registered keepers |
| `pause() / unpause()` | Emergency admin controls |

### NectarVault (`contracts/nectar-vault/`)

Pooled USDC vault that funds liquidations. Depositors receive LP shares proportional to their deposit. Shares appreciate as keepers return profits.

| Function | Description |
|----------|-------------|
| `initialize(admin, usdc_token, registry)` | Configure vault with USDC token and registry |
| `deposit(depositor, amount)` | Deposit USDC, receive LP shares |
| `withdraw(depositor, shares)` | Redeem shares for USDC at current share price |
| `draw(keeper, amount)` | Keeper draws USDC for liquidation (must be registered) |
| `return_proceeds(keeper, amount)` | Return capital + profit after successful liquidation |
| `balance(user)` | Query user's shares and USDC value |

### LiquidationLab (`contracts/liquidation-lab/`)

Blend-compatible pool contract that the Go keeper interacts with directly — same interface as a real Blend pool. Admin can set positions and control auctions for testing.

| Function | Description |
|----------|-------------|
| `get_reserve_list()` | List reserve assets (XLM, USDC) |
| `get_reserve(asset)` | Reserve config (collateral/liability factors, rates) |
| `get_positions(user)` | User's collateral and liability maps |
| `new_liquidation_auction(user, pct)` | Create Dutch auction for underwater position |
| `get_auction(type, user)` | Fetch active auction data |
| `submit(from, spender, to, requests)` | Fill auction (keeper submits fill request) |

The Go keeper needs **zero code changes** to switch between a real Blend pool and LiquidationLab — just change the `BLEND_POOL` env var.

## Go Keeper

The keeper binary is a single Go process that:
- Registers itself on the KeeperRegistry
- Polls the pool every 10s for positions
- Computes health factors using reserve configs and oracle prices
- Creates and fills Dutch auctions when HF < 1.0
- Draws capital from the vault, fills auctions, returns proceeds
- Serves a REST API + SSE stream for the frontend

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/state` | GET | Current positions, keepers, events, vault state |
| `/api/performance` | GET | TVL, depositors, keeper stats, liquidation history |
| `/api/events` | GET | SSE stream of real-time keeper events |
| `/metrics` | GET | Prometheus metrics (cycles, liquidations, TVL) |
| `/healthz` | GET | Health check |

### Key Technical Details

- **Dutch Auction Profitability**: `lotPct = elapsed/200`, `bidPct = (200-elapsed)/200`. Keeper fills when `lot_value / bid_cost > MIN_PROFIT`
- **Multi-Operator Race**: First confirmed tx wins. Loser gets `ErrAlreadyFilled` → capital returned safely
- **Vault Capital Safety**: `return_proceeds` only called on fill success or `ErrAlreadyFilled`. Hard failures propagate error without returning
- **SSE Client Limit**: Max 100 concurrent connections, 503 if exceeded
- **Graceful Shutdown**: `SIGTERM`/`SIGINT` → drain in-flight cycle → clean exit
- **XDR Encoding**: ScMap keys sorted lexicographically (Soroban requirement), `ScVal.Vec` is `**xdr.ScVec` (double deref)

## Frontend

Next.js 14 with Tailwind CSS. Dark theme, monospace design.

| Page | Route | Description |
|------|-------|-------------|
| Home | `/` | Hero with live SSE log stream, problem stats, architecture diagram, keeper registry, position monitor |
| Features | `/features` | 5 core features explained with getting-started guides |
| Vault | `/vault` | Freighter wallet integration, deposit/withdraw, live balance queries |
| Performance | `/performance` | 18 depositors, 2 keepers, vault TVL, liquidation history |

### Wallet Integration

The vault page integrates with [Freighter](https://freighter.app/) wallet:
- Detect Freighter extension
- Connect and read balances (XLM + USDC)
- Submit deposit/withdraw transactions to Soroban
- Query vault share balances on-chain
- Link to Stellar Expert for transaction verification

## Quick Start

### Prerequisites

- Go 1.22+
- Rust + `wasm32-unknown-unknown` target
- Node.js 18+
- [Stellar CLI](https://github.com/stellar/stellar-cli) (for contract deployment)

### 1. Build Contracts

```bash
cargo build --release --target wasm32-unknown-unknown
cargo test  # 38 tests across 3 contracts
```

### 2. Deploy to Testnet

```bash
# Generate and fund wallets
stellar keys generate admin --network testnet

# Deploy contracts
stellar contract deploy --wasm target/.../keeper_registry.optimized.wasm --source admin --network testnet
stellar contract deploy --wasm target/.../nectar_vault.optimized.wasm --source admin --network testnet
stellar contract deploy --wasm target/.../liquidation_lab.optimized.wasm --source admin --network testnet
```

### 3. Run Keeper

```bash
cd keeper
cp ../.env.example .env  # configure with your contract IDs + keypair
go run .
```

### 4. Run Frontend

```bash
cd frontend
npm install && npm run dev
# → http://localhost:3000
```

### 5. Docker (both keepers + frontend)

```bash
docker-compose up
# keeper-alpha: localhost:8080
# keeper-beta:  localhost:8081
# frontend:     localhost:3000
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `KEEPER_SECRET` | yes | Stellar secret key (S...) for the keeper operator |
| `KEEPER_NAME` | no | Display name (default: `keeper-alpha`) |
| `REGISTRY_CONTRACT` | yes | KeeperRegistry contract ID |
| `VAULT_CONTRACT` | yes | NectarVault contract ID |
| `BLEND_POOL` | yes | Pool contract ID (Blend or LiquidationLab) |
| `POLL_INTERVAL` | no | Seconds between cycles (default: `10`, range: 3-300) |
| `MIN_PROFIT` | no | Minimum lot/bid ratio to fill (default: `1.0`) |
| `KNOWN_DEPOSITORS` | no | Comma-separated G-addresses for performance page |
| `API_PORT` | no | HTTP API port (default: `8080`) |

## Test Suite

```bash
# Rust contract tests (38 total)
cargo test -p keeper-registry     # 9 tests
cargo test -p nectar-vault        # 17 tests
cargo test -p liquidation-lab     # 12 tests

# Go keeper tests (30+ total)
cd keeper && go test -race -count=1 ./...
# unit tests, integration tests, stress tests, benchmarks

# Frontend build
cd frontend && npm run build
```

## Security

- **Depositor TTL**: 535,680 ledgers (~30 days) — prevents share loss from expiration
- **Division-by-zero guard**: Withdraw checks `total_shares > 0`
- **Config validation**: Poll interval bounds [3, 300], min profit > 0, env parse errors crash fast
- **Capital safety**: Vault draw only returns proceeds on successful fill or `ErrAlreadyFilled`
- **Deadlock prevention**: Separate mutex for SSE subscriber list vs data fields
- **SSE limit**: Max 100 concurrent clients, 503 rejection
- **Graceful shutdown**: Signal handling with in-flight cycle drain

## Deployment

### Render (Keepers)

Both keepers deploy via `render.yaml` blueprint:
- Docker builds from `keeper/Dockerfile`
- Free tier with auto-sleep/wake
- Auto-deploy on git push

### Vercel (Frontend)

Next.js deployed to Vercel with `output: "standalone"`:
- Custom domain: nectarnetwork.fun
- Environment variables for contract addresses and API URL

## License

MIT
