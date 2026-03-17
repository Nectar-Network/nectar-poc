use soroban_sdk::{contracttype, contracterror, Address, Map};

#[contracttype]
#[derive(Clone, Debug)]
pub enum DataKey {
    Admin,
    ReserveList,
    Reserve(Address),
    Position(Address),
    Auction(Address),
}

/// Reserve configuration — field names MUST match what the Go keeper parses:
/// "index" (U32), "c_factor" (U32), "l_factor" (U32), "b_rate" (I128), "d_rate" (I128)
#[contracttype]
#[derive(Clone, Debug)]
pub struct ReserveConfig {
    pub b_rate: i128,
    pub c_factor: u32,
    pub d_rate: i128,
    pub index: u32,
    pub l_factor: u32,
}

/// User positions — field names MUST match Go parser:
/// "collateral" (Map<U32, I128>), "liabilities" (Map<U32, I128>)
#[contracttype]
#[derive(Clone, Debug)]
pub struct UserPositions {
    pub collateral: Map<u32, i128>,
    pub liabilities: Map<u32, i128>,
}

/// Auction data — field names MUST match Go parser:
/// "bid" (Map<Address, I128>), "lot" (Map<Address, I128>), "block" (U32)
#[contracttype]
#[derive(Clone, Debug)]
pub struct AuctionData {
    pub bid: Map<Address, i128>,
    pub block: u32,
    pub lot: Map<Address, i128>,
}

#[contracterror]
#[derive(Clone, Debug, PartialEq)]
pub enum LabError {
    AlreadyInit = 1,
    NotInit = 2,
    Unauthorized = 3,
    AuctionNotFound = 4,
    AuctionExists = 5,
    ReserveNotFound = 6,
    PositionNotFound = 7,
}
