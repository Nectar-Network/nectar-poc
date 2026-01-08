# Nectar Network — Technical Requirements Document (TRD)
## Testnet Prototype for SCF #42 Submission
**Version:** 1.0
**Date:** March 10, 2026
**Author:** 29projects Lab
**Companion:** PRD v1.0

---

## 1. System Overview

Nectar Network's testnet prototype consists of three components communicating across on-chain and off-chain boundaries:

```
┌─────────────────────────────────────────────────────────┐
│                   SOROBAN TESTNET                        │
│                                                          │
│  ┌──────────────────┐    ┌──────────────────────────┐   │
│  │ KeeperRegistry   │    │ Blend Pool (test)         │   │
│  │                  │    │                            │   │
│  │ • register()     │    │ • new_liquidation_auction()│   │
│  │ • deregister()   │    │ • fill()                   │   │
│  │ • get_keepers()  │    │ • get_positions()          │   │
│  └──────────────────┘    └──────────────────────────┘   │
│                                 ▲                        │
│  ┌──────────────────┐          │                        │
│  │ Mock Oracle       │          │ reads prices           │
│  │ (price feed)      │──────────┘                        │
│  └──────────────────┘                                    │
└──────────────────────────────────────────────────────────┘
          ▲ deploy/invoke                ▲ monitor/execute
          │                              │
┌─────────┴──────────────────────────────┴─────────────────┐
│                 OFF-CHAIN LAYER                            │
│                                                            │
│  ┌───────────────────┐     ┌───────────────────┐          │
│  │ Keeper Client #1   │     │ Keeper Client #2   │         │
│  │ (Operator A)       │     │ (Operator B)       │         │
│  │                    │     │                    │          │
│  │ • Pool monitor     │     │ • Pool monitor     │         │
│  │ • Health checker   │     │ • Health checker   │         │
│  │ • Auction creator  │     │ • Auction creator  │         │
│  │ • Auction filler   │     │ • Auction filler   │         │
│  └───────────────────┘     └───────────────────┘          │
└────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

| Component | Technology | Version | Rationale |
|-----------|-----------|---------|-----------|
| KeeperRegistry contract | Rust + Soroban SDK | soroban-sdk 22.x | Native Soroban smart contract development |
| Blend integration | blend-contract-sdk | 1.22.x | Official WASM imports for Blend pool/backstop/emitter interaction |
| Keeper client (option A) | Rust + stellar-sdk | Latest | Matches existing liquidation-bot architecture (Artemis framework) |
| Keeper client (option B) | TypeScript + @stellar/stellar-sdk + @blend-capital/blend-sdk | Latest | Faster iteration for prototype, rich Blend SDK with Pool.load() |
| Contract deployment | stellar CLI | 22.x | Standard Soroban deployment toolchain |
| Test environment | blend-utils | Latest | Deploys mock Blend pools with test tokens and configurable oracles |
| Build toolchain | Rust 1.71+, wasm32 target, Node.js 18+ | — | Standard Soroban development requirements |

**Recommendation:** Use **TypeScript** for the keeper client (option B) for the prototype. The `@blend-capital/blend-sdk` provides `Pool.load()`, `PositionsEstimate`, and auction helpers that dramatically reduce integration time. The Rust keeper client can be built during the grant for production.

---

## 3. On-Chain Component: KeeperRegistry Contract

### 3.1 Contract Storage Schema

```rust
// Storage keys
#[contracttype]
pub enum DataKey {
    Admin,                          // Address: contract admin
    KeeperCount,                    // u32: total registered keepers
    Keeper(Address),                // KeeperInfo: per-operator data
    KeeperList,                     // Vec<Address>: enumerable keeper list
    Paused,                         // bool: emergency pause flag
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct KeeperInfo {
    pub address: Address,           // Operator's Stellar address
    pub name: String,               // Human-readable operator name
    pub registered_at: u64,         // Ledger timestamp at registration
    pub is_active: bool,            // Active status
}
```

### 3.2 Contract Interface

```rust
#[contract]
pub struct KeeperRegistry;

#[contractimpl]
impl KeeperRegistry {
    /// Initialize the registry with an admin address.
    /// Called once at deployment.
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error>;

    /// Register a new keeper operator.
    /// Caller must be the operator themselves (auth required).
    /// Emits: KeeperRegistered(address, name, timestamp)
    pub fn register_keeper(env: Env, operator: Address, name: String) -> Result<(), Error>;

    /// Deregister an existing keeper.
    /// Only the operator themselves or admin can deregister.
    /// Emits: KeeperDeregistered(address, timestamp)
    pub fn deregister_keeper(env: Env, operator: Address) -> Result<(), Error>;

    /// Query: return info for a single keeper.
    pub fn get_keeper(env: Env, operator: Address) -> Result<KeeperInfo, Error>;

    /// Query: return list of all active keeper addresses.
    pub fn get_keepers(env: Env) -> Vec<Address>;

    /// Query: return total number of registered keepers.
    pub fn get_keeper_count(env: Env) -> u32;

    /// Admin: pause all registrations (emergency).
    pub fn pause(env: Env, admin: Address) -> Result<(), Error>;

    /// Admin: unpause registrations.
    pub fn unpause(env: Env, admin: Address) -> Result<(), Error>;
}
```

### 3.3 Events

```rust
// Registration event
env.events().publish(
    (Symbol::new(&env, "KeeperRegistered"),),
    (operator.clone(), name.clone(), env.ledger().timestamp())
);

// Deregistration event
env.events().publish(
    (Symbol::new(&env, "KeeperDeregistered"),),
    (operator.clone(), env.ledger().timestamp())
);
```

### 3.4 Error Codes

```rust
#[contracterror]
#[derive(Clone, Debug, PartialEq)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    AlreadyRegistered = 3,
    NotRegistered = 4,
    Unauthorized = 5,
    RegistryPaused = 6,
}
```

### 3.5 Deployment

```bash
# Build the contract
cd contracts/keeper-registry
cargo build --target wasm32-unknown-unknown --release

# Optimize WASM
stellar contract optimize \
  --wasm target/wasm32-unknown-unknown/release/keeper_registry.wasm

# Deploy to testnet
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/keeper_registry.optimized.wasm \
  --source <ADMIN_SECRET_KEY> \
  --rpc-url https://soroban-testnet.stellar.org:443 \
  --network-passphrase "Test SDF Network ; September 2015"

# Initialize
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source <ADMIN_SECRET_KEY> \
  --rpc-url https://soroban-testnet.stellar.org:443 \
  --network-passphrase "Test SDF Network ; September 2015" \
  -- initialize --admin <ADMIN_ADDRESS>
```

---

## 4. Off-Chain Component: Keeper Client

### 4.1 Architecture (TypeScript implementation)

```
keeper-client/
├── src/
│   ├── index.ts              # Entry point, config loading, main loop
│   ├── config.ts             # Configuration types and defaults
│   ├── monitor/
│   │   ├── pool-monitor.ts   # Blend pool state polling
│   │   └── health-checker.ts # Position health factor calculation
│   ├── executor/
│   │   ├── auction-creator.ts  # Create liquidation auctions
│   │   └── auction-filler.ts   # Fill auctions when profitable
│   ├── registry/
│   │   └── keeper-registry.ts  # Interact with KeeperRegistry contract
│   └── utils/
│       ├── logger.ts           # Structured logging with timestamps
│       └── stellar.ts          # Stellar SDK helpers (signing, submitting)
├── config/
│   └── testnet.json            # Testnet configuration
├── package.json
└── tsconfig.json
```

### 4.2 Configuration Schema

```json
{
  "network": {
    "rpc_url": "https://soroban-testnet.stellar.org:443",
    "passphrase": "Test SDF Network ; September 2015",
    "horizon_url": "https://horizon-testnet.stellar.org"
  },
  "keeper": {
    "name": "keeper-alpha",
    "secret_key_env": "KEEPER_SECRET_KEY"
  },
  "pool": {
    "address": "<BLEND_TEST_POOL_CONTRACT_ID>",
    "supported_collateral": ["XLM_TEST", "USDC_TEST"],
    "supported_liabilities": ["USDC_TEST", "XLM_TEST"]
  },
  "registry": {
    "contract_id": "<KEEPER_REGISTRY_CONTRACT_ID>"
  },
  "strategy": {
    "poll_interval_ms": 10000,
    "min_profitability_ratio": 1.02,
    "max_auction_age_blocks": 200,
    "liquidation_percent": 50
  }
}
```

### 4.3 Core Loop (Pseudocode)

```typescript
async function main() {
  // 1. Load config
  const config = loadConfig("./config/testnet.json");

  // 2. Initialize Stellar connection
  const server = new SorobanRpc.Server(config.network.rpc_url);
  const keypair = Keypair.fromSecret(process.env[config.keeper.secret_key_env]);

  // 3. Register in KeeperRegistry (if not already registered)
  await registerKeeper(server, keypair, config.registry.contract_id, config.keeper.name);
  logger.info(`Keeper ${config.keeper.name} registered at ${keypair.publicKey()}`);

  // 4. Main monitoring loop
  while (true) {
    try {
      // 4a. Load pool state
      const pool = await Pool.load(config.pool.address, server);

      // 4b. Check all positions for liquidation eligibility
      const positions = await getPoolPositions(pool, server);

      for (const position of positions) {
        const healthFactor = calculateHealthFactor(position, pool);
        logger.debug(`Position ${position.address}: HF=${healthFactor.toFixed(4)}`);

        if (healthFactor < 1.0) {
          logger.warn(`LIQUIDATABLE: ${position.address} HF=${healthFactor.toFixed(4)}`);

          // 4c. Check if auction already exists
          const existingAuction = await checkExistingAuction(pool, position.address, server);

          if (!existingAuction) {
            // 4d. Create new liquidation auction
            logger.info(`Creating liquidation auction for ${position.address}`);
            await createLiquidationAuction(
              pool, position.address, config.strategy.liquidation_percent,
              keypair, server, config.network.passphrase
            );
          }

          // 4e. Evaluate and fill auction if profitable
          const auction = await getAuction(pool, position.address, server);
          if (auction) {
            const profitability = evaluateAuctionProfitability(auction, pool);
            logger.info(`Auction profitability: ${profitability.toFixed(4)}`);

            if (profitability >= config.strategy.min_profitability_ratio) {
              logger.info(`FILLING auction for ${position.address}`);
              try {
                await fillAuction(pool, auction, keypair, server, config.network.passphrase);
                logger.info(`SUCCESS: Auction filled by ${config.keeper.name}`);
              } catch (err) {
                if (isAlreadyFilledError(err)) {
                  logger.info(`Auction already filled by another keeper — skipping`);
                } else {
                  logger.error(`Fill failed: ${err.message}`);
                }
              }
            }
          }
        }
      }
    } catch (err) {
      logger.error(`Monitor cycle error: ${err.message}`);
    }

    await sleep(config.strategy.poll_interval_ms);
  }
}
```

### 4.4 Key Integration Points with Blend

**Loading pool state** (using `@blend-capital/blend-sdk`):

```typescript
import { Pool, PoolUser, PositionsEstimate } from "@blend-capital/blend-sdk";

// Load full pool state including reserves, oracle prices, config
const pool: Pool = await Pool.load(poolAddress, server);

// Get a user's positions
const userPositions: PoolUser = await PoolUser.load(pool, userAddress, server);

// Calculate health factor
const estimate: PositionsEstimate = PositionsEstimate.build(pool, userPositions.positions);
// estimate.totalEffectiveCollateral / estimate.totalEffectiveLiability gives HF
```

**Creating a liquidation auction** (Blend pool contract invocation):

```typescript
// Blend's pool contract: new_liquidation_auction
// Parameters:
//   user: Address          — the account being liquidated
//   percent_liquidated: u64 — percentage of liabilities to auction (0-100, scaled by 7 decimals)

const tx = new TransactionBuilder(account, { fee: "100000", networkPassphrase })
  .addOperation(
    pool_contract.call(
      "new_liquidation_auction",
      xdr.ScVal.fromAddress(liquidatableUser),
      nativeToScVal(50_0000000, { type: "u64" })  // 50% liquidation
    )
  )
  .setTimeout(30)
  .build();
```

**Filling an auction** (Blend pool contract invocation):

```typescript
// Blend's pool contract: fill
// This is called on an active auction to fill it
// The filler must have sufficient collateral in the pool

// Blend uses Dutch auctions — the price decays over time:
//   Block 0–100: lot starts at 0%, bid starts at 100% of face value
//   Block 100–200: lot scales linearly to 100%, bid scales down to 0%
// The filler pays `bid` assets and receives `lot` assets
// Profitable when: value(lot) > value(bid)

const tx = new TransactionBuilder(account, { fee: "100000", networkPassphrase })
  .addOperation(
    pool_contract.call(
      "fill",
      xdr.ScVal.fromAddress(keeper.publicKey()),
      nativeToScVal(auctionIndex, { type: "u32" })
    )
  )
  .setTimeout(30)
  .build();
```

### 4.5 Health Factor Calculation

```typescript
function calculateHealthFactor(
  userPositions: PoolUser,
  pool: Pool
): number {
  const estimate = PositionsEstimate.build(pool, userPositions.positions);

  // Health Factor = totalEffectiveCollateral / totalEffectiveLiability
  // Effective collateral = sum(collateral_amount * oracle_price * collateral_factor)
  // Effective liability = sum(liability_amount * oracle_price / liability_factor)

  if (estimate.totalEffectiveLiability === 0n) {
    return Infinity; // No debt = infinite health
  }

  // Convert BigInt to number for ratio (sufficient precision for comparison)
  const hf = Number(estimate.totalEffectiveCollateral) /
             Number(estimate.totalEffectiveLiability);

  return hf;
}
```

### 4.6 Auction Profitability Evaluation

```typescript
function evaluateAuctionProfitability(
  auction: AuctionData,
  pool: Pool,
  currentBlock: number
): number {
  // Blend Dutch auction mechanics:
  // Over 200 blocks, lot increases from 0% to 100% of collateral
  // Over 200 blocks, bid decreases from 100% to 0% of liabilities
  //
  // At block B (0-200) since auction start:
  //   lot_pct = min(B, 200) / 200
  //   bid_pct = max(0, (200 - B)) / 200
  //
  // Current available:
  //   lot_value = sum(lot_asset_amount * lot_pct * oracle_price)
  //   bid_cost  = sum(bid_asset_amount * bid_pct * oracle_price)
  //
  // Profitability = lot_value / bid_cost

  const blocksSinceStart = currentBlock - auction.startBlock;
  const lotPercent = Math.min(blocksSinceStart, 200) / 200;
  const bidPercent = Math.max(0, (200 - blocksSinceStart)) / 200;

  let lotValue = 0;
  for (const [asset, amount] of auction.lot) {
    const price = getOraclePrice(pool, asset);
    lotValue += Number(amount) * lotPercent * price;
  }

  let bidCost = 0;
  for (const [asset, amount] of auction.bid) {
    const price = getOraclePrice(pool, asset);
    bidCost += Number(amount) * bidPercent * price;
  }

  return bidCost > 0 ? lotValue / bidCost : Infinity;
}
```

---

## 5. Test Environment Setup

### 5.1 Blend Test Pool Deployment

Using `blend-utils` (TypeScript scripts from blend-capital):

```bash
# Clone blend-utils
git clone https://github.com/blend-capital/blend-utils.git
cd blend-utils
npm install

# Configure .env
echo "ADMIN=S<ADMIN_SECRET_KEY>" > .env
echo "RPC_URL=https://soroban-testnet.stellar.org:443" >> .env
echo "NETWORK_PASSPHRASE=Test SDF Network ; September 2015" >> .env

# Deploy core contracts (pool factory, backstop, emitter)
npx ts-node src/deploy-scripts/deploy.ts testnet

# Deploy a test pool with XLM + USDC reserves
# Configure in deploy-pool.ts constants:
#   - oracle: mock oracle contract address
#   - reserves: [XLM_TEST, USDC_TEST]
#   - collateral factors, liability factors, rate model params
npx ts-node src/user-scripts/deploy-pool.ts testnet

# Fund the backstop with BLND:USDC LP tokens
npx ts-node src/user-scripts/mint-lp.ts testnet
npx ts-node src/user-scripts/fund-backstop.ts testnet
```

### 5.2 Creating Test Positions

```bash
# Using a test user account:
# 1. Supply 10,000 XLM as collateral
npx ts-node src/user-scripts/supply.ts testnet --asset XLM --amount 10000

# 2. Borrow 3,000 USDC against XLM collateral
npx ts-node src/user-scripts/borrow.ts testnet --asset USDC --amount 3000

# This creates a position with ~77% LTV (assuming 1 XLM = $0.39)
# Health factor: ~1.3 (healthy)
```

### 5.3 Triggering Liquidation (Oracle Manipulation on Testnet)

```bash
# Update mock oracle to drop XLM price by 40%
# This pushes the test position underwater (HF < 1.0)
npx ts-node src/user-scripts/set-oracle-price.ts testnet --asset XLM --price 0.23

# Expected: Health factor drops to ~0.78, position becomes liquidatable
# Keeper clients should detect this within 1 polling cycle (10 seconds)
```

---

## 6. Demo Flow (Video Script)

| Timestamp | Scene | What's shown |
|-----------|-------|-------------|
| 0:00–0:30 | **Intro** | Architecture diagram, problem statement (Blend exploit, single-operator bots) |
| 0:30–1:00 | **Setup** | KeeperRegistry contract deployed on testnet (show contract ID, explorer link). Two keepers registered (show `get_keepers()` output) |
| 1:00–1:45 | **Pool State** | Blend test pool with one position at HF=1.3. Both keeper clients running, showing health factor polling logs |
| 1:45–2:30 | **Trigger** | Mock oracle price updated. Both keeper clients detect HF drop below 1.0 within 10 seconds. Logs show "LIQUIDATABLE" warning |
| 2:30–3:30 | **Execution** | Keeper #1 creates liquidation auction. Keeper #2 also detects the opportunity. Both attempt to fill. Keeper #1 wins the fill (logs show SUCCESS). Keeper #2 handles gracefully (logs show "already filled by another keeper") |
| 3:30–4:00 | **Verification** | Show the position's state post-liquidation (reduced collateral/liability). Show the keeper's balance change (collateral received). Show KeeperRegistry state (both keepers still active) |
| 4:00–4:30 | **Closing** | Vision slide — how this extends to multi-protocol support, incentive layer, and mainnet in the SCF grant scope |

---

## 7. Repository Structure

```
nectar-network/
├── README.md                        # Project overview, setup instructions, demo link
├── ARCHITECTURE.md                  # System design document with diagrams
├── LICENSE                          # MIT license
├── contracts/
│   └── keeper-registry/
│       ├── Cargo.toml
│       └── src/
│           ├── lib.rs               # Contract implementation
│           ├── types.rs             # KeeperInfo, DataKey, Error
│           ├── events.rs            # Event emission helpers
│           └── test.rs              # Unit tests
├── keeper-client/
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.ts                 # Main entry point
│   │   ├── config.ts                # Configuration types
│   │   ├── monitor/
│   │   │   ├── pool-monitor.ts      # Blend pool state loader
│   │   │   └── health-checker.ts    # HF calculation
│   │   ├── executor/
│   │   │   ├── auction-creator.ts   # Create liquidation auctions
│   │   │   └── auction-filler.ts    # Fill auctions
│   │   ├── registry/
│   │   │   └── keeper-registry.ts   # Registry contract client
│   │   └── utils/
│   │       ├── logger.ts            # Structured logging
│   │       └── stellar.ts           # SDK helpers
│   └── config/
│       └── testnet.json             # Testnet config
├── scripts/
│   ├── setup-test-env.sh            # One-command test environment setup
│   ├── deploy-registry.sh           # Deploy KeeperRegistry to testnet
│   ├── register-keepers.sh          # Register test keeper operators
│   └── trigger-liquidation.sh       # Manipulate oracle + trigger liquidation
├── docs/
│   ├── architecture.png             # System architecture diagram
│   └── blend-integration.md         # Blend-specific integration notes
└── demo/
    └── demo-script.md               # Video narration script
```

---

## 8. Testing Strategy

### 8.1 Contract Unit Tests (Soroban test framework)

```rust
#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::{testutils::Address as _, Env};

    #[test]
    fn test_register_and_get_keeper() {
        let env = Env::default();
        let contract_id = env.register_contract(None, KeeperRegistry);
        let client = KeeperRegistryClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        let operator = Address::generate(&env);

        client.initialize(&admin);

        env.mock_all_auths();
        client.register_keeper(&operator, &String::from_str(&env, "keeper-alpha"));

        let info = client.get_keeper(&operator);
        assert_eq!(info.name, String::from_str(&env, "keeper-alpha"));
        assert_eq!(info.is_active, true);
        assert_eq!(client.get_keeper_count(), 1);
    }

    #[test]
    fn test_deregister_keeper() {
        let env = Env::default();
        let contract_id = env.register_contract(None, KeeperRegistry);
        let client = KeeperRegistryClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        let operator = Address::generate(&env);

        client.initialize(&admin);
        env.mock_all_auths();
        client.register_keeper(&operator, &String::from_str(&env, "keeper-alpha"));
        client.deregister_keeper(&operator);

        assert_eq!(client.get_keeper_count(), 0);
    }

    #[test]
    #[should_panic(expected = "Error(Contract, #3)")]
    fn test_double_registration_fails() {
        let env = Env::default();
        let contract_id = env.register_contract(None, KeeperRegistry);
        let client = KeeperRegistryClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        let operator = Address::generate(&env);

        client.initialize(&admin);
        env.mock_all_auths();
        client.register_keeper(&operator, &String::from_str(&env, "keeper-alpha"));
        client.register_keeper(&operator, &String::from_str(&env, "keeper-alpha")); // panics
    }

    #[test]
    fn test_pause_blocks_registration() {
        let env = Env::default();
        let contract_id = env.register_contract(None, KeeperRegistry);
        let client = KeeperRegistryClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        let operator = Address::generate(&env);

        client.initialize(&admin);
        env.mock_all_auths();
        client.pause(&admin);

        // This should fail with RegistryPaused error
        let result = client.try_register_keeper(&operator, &String::from_str(&env, "test"));
        assert!(result.is_err());
    }
}
```

### 8.2 Integration Test (End-to-End on Testnet)

Run as a shell script that validates the full flow:

```bash
#!/bin/bash
# scripts/integration-test.sh

echo "=== Nectar Network Integration Test ==="

# 1. Deploy KeeperRegistry
echo "[1/6] Deploying KeeperRegistry..."
REGISTRY_ID=$(stellar contract deploy --wasm ... | tail -1)
stellar contract invoke --id $REGISTRY_ID -- initialize --admin $ADMIN_ADDRESS

# 2. Register two keepers
echo "[2/6] Registering keepers..."
stellar contract invoke --id $REGISTRY_ID --source $KEEPER_A_KEY -- \
  register_keeper --operator $KEEPER_A_ADDR --name "keeper-alpha"
stellar contract invoke --id $REGISTRY_ID --source $KEEPER_B_KEY -- \
  register_keeper --operator $KEEPER_B_ADDR --name "keeper-beta"

# 3. Verify registration
echo "[3/6] Verifying registrations..."
KEEPER_COUNT=$(stellar contract invoke --id $REGISTRY_ID -- get_keeper_count)
[ "$KEEPER_COUNT" = "2" ] && echo "PASS: 2 keepers registered" || echo "FAIL: expected 2 keepers"

# 4. Start both keeper clients in background
echo "[4/6] Starting keeper clients..."
KEEPER_SECRET_KEY=$KEEPER_A_SECRET npx ts-node keeper-client/src/index.ts --config config/testnet-a.json &
KEEPER_A_PID=$!
KEEPER_SECRET_KEY=$KEEPER_B_SECRET npx ts-node keeper-client/src/index.ts --config config/testnet-b.json &
KEEPER_B_PID=$!

# 5. Trigger liquidation via oracle price drop
echo "[5/6] Triggering liquidation (oracle price drop)..."
sleep 5  # Wait for keepers to initialize
npx ts-node scripts/set-oracle-price.ts testnet --asset XLM --price 0.23

# 6. Wait for keepers to detect and execute
echo "[6/6] Waiting for keeper execution (30 seconds)..."
sleep 30

# Cleanup
kill $KEEPER_A_PID $KEEPER_B_PID 2>/dev/null

echo "=== Check logs for execution results ==="
echo "Keeper A logs: logs/keeper-alpha.log"
echo "Keeper B logs: logs/keeper-beta.log"
```

---

## 9. Dependencies and External Services

| Dependency | Source | License | Purpose |
|-----------|--------|---------|---------|
| `soroban-sdk` | crates.io | Apache-2.0 | Soroban smart contract development |
| `blend-contract-sdk` | blend-capital GitHub | AGPL-3.0 | Blend contract WASM imports for testing |
| `@stellar/stellar-sdk` | npm | Apache-2.0 | Stellar/Soroban RPC interaction |
| `@blend-capital/blend-sdk` | npm | MIT | Blend pool loading, position estimation |
| `blend-utils` | blend-capital GitHub | MIT | Test environment deployment scripts |
| Soroban Testnet RPC | stellar.org | Public | `https://soroban-testnet.stellar.org:443` |
| Horizon Testnet | stellar.org | Public | `https://horizon-testnet.stellar.org` |

---

## 10. Security Considerations (Prototype-Specific)

| Concern | Mitigation |
|---------|-----------|
| Private keys in code | All keys loaded from environment variables, never committed. `.env` is in `.gitignore` |
| Testnet-only | All contract addresses and RPC endpoints point to testnet. No mainnet interaction |
| Blend contract interaction | Using official `blend-contract-sdk` and `blend-sdk` — no custom ABI parsing |
| Transaction replay | Each transaction uses unique sequence numbers from the testnet account |
| Rate limiting on public RPC | Use reasonable poll interval (10s). For demo recording, pre-stage the environment to minimize live RPC calls |

---

## 11. Known Limitations of the Prototype

| Limitation | Why it exists | When it's resolved |
|-----------|--------------|-------------------|
| No real incentive/reward distribution | Requires token economics design | Grant Tranche 2 |
| Single-pool monitoring only | Multi-pool requires adapter abstraction | Grant Tranche 2 |
| No keeper staking or slashing | On-chain stake management is complex | Grant Tranche 3 |
| TypeScript client (not Rust) | Faster to prototype, production needs Rust for performance | Grant Tranche 1–2 |
| No persistent state | Client restarts lose auction tracking state | Grant Tranche 2 |
| Mock oracle manipulation | Real oracle integration requires Reflector or custom aggregator | Grant Tranche 3 |
| No dashboard UI | CLI-only monitoring | Grant Tranche 2–3 |
| 2 keepers only | Coordination logic tested with 2; 10+ needs load testing | Grant Tranche 3 |
