use soroban_sdk::{contracttype, contracterror, Address, String};

#[contracttype]
#[derive(Clone, Debug)]
pub struct KeeperInfo {
    pub addr: Address,
    pub name: String,
    pub registered_at: u64,
    pub active: bool,
}

#[contracttype]
pub enum DataKey {
    Admin,
    KeeperCount,
    Keeper(Address),
    KeeperList,
    Paused,
}

#[contracterror]
#[derive(Clone, Debug, PartialEq)]
pub enum Error {
    AlreadyInit = 1,
    NotInit = 2,
    AlreadyRegistered = 3,
    NotRegistered = 4,
    Unauthorized = 5,
    Paused = 6,
}
