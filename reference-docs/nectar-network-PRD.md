# Nectar Network — Product Requirements Document (PRD)
## Testnet Prototype for SCF #42 Submission
**Version:** 1.0
**Date:** March 10, 2026
**Author:** 29projects Lab
**Timeline:** 2–3 days (March 10–12, 2026)

---

## 1. Purpose

This document defines the scope, requirements, and success criteria for the Nectar Network testnet prototype. The prototype serves one strategic goal: **demonstrate to SCF #42 reviewers that 29projects Lab can build production-grade keeper infrastructure on Soroban today.** It is not the MVP — it is the minimum credible proof of technical capability that accompanies the Build Award submission.

The prototype must accomplish three things:
1. Show a working Soroban smart contract deployed on testnet
2. Show an off-chain keeper client detecting and executing Blend liquidation opportunities
3. Show multi-operator coordination (2+ keepers competing for the same task)

---

## 2. Context: The Problem Being Demonstrated

On February 22, 2026, an attacker manipulated the USTRY/XLM SDEX market, corrupting the Reflector oracle VWAP and borrowing 61.2M XLM against inflated collateral from a Blend pool. The resulting cascade produced 60 auction fills over ~4 hours, with only 2 pre-positioned bots capturing the majority of $10.8M in liquidation value. The broader ecosystem had no coordinated keeper response.

Blend's existing liquidation bot (`blend-capital/liquidation-bot`) is:
- Single-operator (one Docker container, one private key)
- No redundancy (if the operator goes down, no fallback)
- No coordination (multiple operators would conflict rather than coordinate)
- Explicitly disclaimed as unreliable ("not guaranteed to be profitable and may result in financial loss")

The prototype demonstrates what a multi-operator alternative looks like in practice.

---

## 3. Target Users (for the prototype)

| User | What they see |
|------|--------------|
| **SCF Panel Reviewer** | A testnet demo proving Soroban competency, Blend integration knowledge, and architecture readiness |
| **SCF Community Voter** | A GitHub repo with real code, a recorded demo, and a clear architecture diagram |
| **Script3 / Blend team** | A complementary project that strengthens Blend's resilience, not a competitor |

---

## 4. Prototype Scope

### 4.1 In Scope

**On-chain component (Soroban contract on testnet):**
- `KeeperRegistry` contract: register/deregister keeper operators, store operator metadata (address, name, status), emit registration events
- Read-only query functions: list active keepers, get keeper details
- Admin functions: pause/unpause registry (for emergency scenarios)

**Off-chain component (Rust/TypeScript keeper client):**
- Connect to Soroban testnet RPC
- Monitor a Blend test pool for positions approaching liquidation threshold
- Detect when a position's health factor drops below 1.0
- Trigger auction creation via Blend's `new_liquidation_auction` interface
- Fill the auction via Blend's `fill` function when profitability conditions are met
- Support running 2+ instances simultaneously with different keypairs

**Monitoring component (minimal dashboard or CLI output):**
- Real-time log output showing: pool positions monitored, health factors, auction detection, keeper execution, fill confirmation
- Can be CLI-based (does not need to be a React dashboard for the prototype)

**Test environment:**
- Deploy a Blend test pool on Soroban testnet using `blend-utils` scripts
- Create test positions (supply collateral, borrow against it)
- Manipulate mock oracle price to push a position underwater
- Record the full flow as a demo video (3–5 minutes)

### 4.2 Out of Scope (deferred to grant milestones)

- Multi-protocol adapters (DeFindex, FxDAO, oracles) — grant Tranche 2
- Incentive/reward distribution mechanics — grant Tranche 2
- Production keeper staking and slashing — grant Tranche 3
- React monitoring dashboard — grant Tranche 2–3
- Mainnet deployment — grant Tranche 3
- Token economics or governance — post-grant
- Oracle circuit breakers — grant Tranche 3

---

## 5. Functional Requirements

### FR-1: KeeperRegistry Contract

| ID | Requirement | Priority |
|----|------------|----------|
| FR-1.1 | Contract deploys successfully on Soroban testnet | P0 |
| FR-1.2 | `register_keeper(address, name)` stores operator in contract storage and emits a `KeeperRegistered` event | P0 |
| FR-1.3 | `deregister_keeper(address)` removes operator from storage and emits a `KeeperDeregistered` event | P0 |
| FR-1.4 | `get_keepers()` returns a list of all registered keeper addresses and metadata | P0 |
| FR-1.5 | `get_keeper(address)` returns metadata for a single keeper | P1 |
| FR-1.6 | `pause()` / `unpause()` admin functions halt/resume registration (admin-only) | P1 |
| FR-1.7 | Contract enforces that only the operator's own address can register/deregister themselves | P0 |

### FR-2: Blend Pool Monitor

| ID | Requirement | Priority |
|----|------------|----------|
| FR-2.1 | Client connects to Soroban testnet RPC and loads Blend test pool state | P0 |
| FR-2.2 | Client polls pool positions at configurable interval (default: every 10 seconds) | P0 |
| FR-2.3 | Client calculates position health factor using oracle price data and Blend's collateral/liability math | P0 |
| FR-2.4 | Client detects positions with health factor < 1.0 and logs them as liquidation candidates | P0 |
| FR-2.5 | Client supports monitoring multiple positions in a single pool | P1 |

### FR-3: Auction Execution

| ID | Requirement | Priority |
|----|------------|----------|
| FR-3.1 | Client creates a liquidation auction on an underwater position via Blend's pool contract | P0 |
| FR-3.2 | Client evaluates auction profitability (lot value vs bid cost at current auction block) | P0 |
| FR-3.3 | Client fills the auction when profitability threshold is met (configurable, default: lot/bid > 1.02) | P0 |
| FR-3.4 | Client handles Blend's Dutch auction price decay (auction becomes more favorable over time) | P1 |
| FR-3.5 | Client logs the full execution trace: detection → auction creation → fill → confirmation | P0 |

### FR-4: Multi-Operator Demo

| ID | Requirement | Priority |
|----|------------|----------|
| FR-4.1 | Two keeper instances run simultaneously with different Stellar keypairs | P0 |
| FR-4.2 | Both instances detect the same liquidation opportunity | P0 |
| FR-4.3 | One instance wins the auction fill (first to submit), the other handles the failure gracefully (no crash, logs "auction already filled") | P0 |
| FR-4.4 | Both instances are registered in the KeeperRegistry contract | P1 |

---

## 6. Non-Functional Requirements

| ID | Requirement |
|----|------------|
| NFR-1 | All code is open-source under MIT license on GitHub (`nectar-network` org) |
| NFR-2 | README includes setup instructions reproducible by any developer with Rust and Stellar CLI |
| NFR-3 | Demo video is recorded at 1080p, narrated, and uploaded to YouTube (unlisted) or included in submission |
| NFR-4 | Architecture diagram (system-level) is included as a PNG/SVG in the repo |
| NFR-5 | The prototype runs entirely on Soroban testnet — no mainnet interaction |
| NFR-6 | No private keys or secrets are committed to the repository |

---

## 7. Success Criteria

The prototype is complete when:

1. ✅ `KeeperRegistry` contract is deployed on Soroban testnet with a verifiable contract address
2. ✅ Two keeper operators are registered in the contract
3. ✅ A Blend test pool exists on testnet with at least one position
4. ✅ Mock oracle price manipulation pushes a position underwater
5. ✅ Both keeper clients detect the liquidation opportunity
6. ✅ One keeper successfully creates and fills the auction
7. ✅ The other keeper gracefully handles the "already filled" case
8. ✅ Full execution is recorded as a demo video
9. ✅ GitHub repo has clean code, README, and architecture diagram
10. ✅ All of the above is referenced in the SCF #42 Build submission

---

## 8. Deliverables

| Deliverable | Format | Purpose |
|-------------|--------|---------|
| `KeeperRegistry` Soroban contract | Rust (`.rs`) + deployed WASM | On-chain component for SCF submission |
| Keeper client | Rust or TypeScript | Off-chain monitoring and execution |
| Configuration files | TOML/JSON | Pool addresses, RPC endpoints, keypair references |
| Demo video | MP4 (3–5 min) | Primary evidence of build readiness for reviewers |
| Architecture diagram | PNG/SVG | Visual system overview for submission |
| GitHub repository | Public repo | Code artifact linked in SCF application |
| Landing page | GitHub Pages or similar | One-pager with problem statement, architecture, team |

---

## 9. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Blend testnet pool deployment fails or is outdated | Blocks entire demo | Use `blend-utils` mock scripts; fall back to creating a simplified mock pool contract if needed |
| Soroban testnet is congested or down | Delays demo recording | Have backup screen recordings of partial flows; testnet is generally stable |
| Blend's auction interface has changed in v2 contracts | Integration code doesn't work | Reference `blend-contracts-v2` repo (Aug 2025 update) and `blend-contract-sdk` for latest interfaces |
| Cannot get both keepers to race in a visible way | Multi-operator demo is unconvincing | Add artificial delay to one keeper, or run both with logging timestamps to show concurrent detection |
| Time runs out before full demo is ready | Incomplete prototype | Prioritize P0 requirements; a working single-keeper flow + KeeperRegistry contract is better than a broken multi-keeper demo |

---

## 10. Timeline

| Day | Focus | Hours | Output |
|-----|-------|-------|--------|
| Day 1 (Mar 10) | Environment setup, KeeperRegistry contract, GitHub org | 8h | Contract deployed on testnet, repo created |
| Day 2 (Mar 11) | Keeper client (monitor + execute), Blend test pool setup | 10h | Working single-keeper liquidation flow |
| Day 3 (Mar 12) | Multi-operator demo, video recording, landing page, architecture diagram | 8h | Complete demo video, polished repo, submission-ready assets |
