use soroban_sdk::{contracttype, contracterror, Address};

#[contracttype]
#[derive(Clone, Debug)]
pub struct Depositor {
    pub addr: Address,
    pub shares: i128,
    pub deposited_at: u64,
}

#[contracttype]
#[derive(Clone, Debug)]
pub struct VaultState {
    pub total_usdc: i128,
    pub total_shares: i128,
    pub total_profit: i128,
    pub active_liq: i128,
}

#[contracttype]
pub enum VaultKey {
    Admin,
    Usdc,
    State,
    Depositor(Address),
    KeeperRegistry,
}

#[contracterror]
#[derive(Clone, Debug, PartialEq)]
pub enum VaultError {
    AlreadyInit = 1,
    NotInit = 2,
    InsufficientBalance = 3,
    InsufficientVault = 4,
    Unauthorized = 5,
    NoShares = 6,
}
