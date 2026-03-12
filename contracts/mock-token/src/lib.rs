#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, Address, Env, String,
};

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Admin,
    Name,
    Symbol,
    Decimals,
    Balance(Address),
    Allowance(Address, Address), // (owner, spender)
}

#[contract]
pub struct MockToken;

#[contractimpl]
impl MockToken {
    /// Initialize the token. Can only be called once.
    pub fn initialize(env: Env, admin: Address, name: String, symbol: String, decimals: u32) {
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Name, &name);
        env.storage().instance().set(&DataKey::Symbol, &symbol);
        env.storage().instance().set(&DataKey::Decimals, &decimals);
        env.storage().instance().extend_ttl(535680, 535680);
    }

    /// Mint tokens to an address. Admin only.
    pub fn mint(env: Env, to: Address, amount: i128) {
        assert!(amount >= 0, "negative mint");
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.storage().instance().extend_ttl(535680, 535680);

        let key = DataKey::Balance(to.clone());
        let bal: i128 = env.storage().persistent().get(&key).unwrap_or(0);
        env.storage().persistent().set(&key, &(bal + amount));
        env.storage().persistent().extend_ttl(&key, 535680, 535680);
    }

    pub fn balance(env: Env, id: Address) -> i128 {
        let key = DataKey::Balance(id);
        env.storage().persistent().get(&key).unwrap_or(0)
    }

    pub fn transfer(env: Env, from: Address, to: Address, amount: i128) {
        assert!(amount >= 0, "negative transfer");
        from.require_auth();
        env.storage().instance().extend_ttl(535680, 535680);

        let from_key = DataKey::Balance(from.clone());
        let from_bal: i128 = env.storage().persistent().get(&from_key).unwrap_or(0);
        assert!(from_bal >= amount, "insufficient balance");
        env.storage().persistent().set(&from_key, &(from_bal - amount));
        env.storage().persistent().extend_ttl(&from_key, 535680, 535680);

        let to_key = DataKey::Balance(to.clone());
        let to_bal: i128 = env.storage().persistent().get(&to_key).unwrap_or(0);
        env.storage().persistent().set(&to_key, &(to_bal + amount));
        env.storage().persistent().extend_ttl(&to_key, 535680, 535680);
    }

    pub fn approve(env: Env, from: Address, spender: Address, amount: i128, _expiration_ledger: u32) {
        from.require_auth();
        env.storage().instance().extend_ttl(535680, 535680);

        let key = DataKey::Allowance(from.clone(), spender.clone());
        env.storage().temporary().set(&key, &amount);
        // TTL for allowance: ~30 days
        env.storage().temporary().extend_ttl(&key, 535680, 535680);
    }

    pub fn allowance(env: Env, from: Address, spender: Address) -> i128 {
        let key = DataKey::Allowance(from, spender);
        env.storage().temporary().get(&key).unwrap_or(0)
    }

    pub fn transfer_from(env: Env, spender: Address, from: Address, to: Address, amount: i128) {
        assert!(amount >= 0, "negative transfer");
        spender.require_auth();
        env.storage().instance().extend_ttl(535680, 535680);

        let allowance_key = DataKey::Allowance(from.clone(), spender.clone());
        let allowance: i128 = env.storage().temporary().get(&allowance_key).unwrap_or(0);
        assert!(allowance >= amount, "insufficient allowance");
        env.storage().temporary().set(&allowance_key, &(allowance - amount));

        let from_key = DataKey::Balance(from.clone());
        let from_bal: i128 = env.storage().persistent().get(&from_key).unwrap_or(0);
        assert!(from_bal >= amount, "insufficient balance");
        env.storage().persistent().set(&from_key, &(from_bal - amount));
        env.storage().persistent().extend_ttl(&from_key, 535680, 535680);

        let to_key = DataKey::Balance(to.clone());
        let to_bal: i128 = env.storage().persistent().get(&to_key).unwrap_or(0);
        env.storage().persistent().set(&to_key, &(to_bal + amount));
        env.storage().persistent().extend_ttl(&to_key, 535680, 535680);
    }

    pub fn name(env: Env) -> String {
        env.storage().instance().get(&DataKey::Name).unwrap()
    }

    pub fn symbol(env: Env) -> String {
        env.storage().instance().get(&DataKey::Symbol).unwrap()
    }

    pub fn decimals(env: Env) -> u32 {
        env.storage().instance().get(&DataKey::Decimals).unwrap()
    }

    pub fn admin(env: Env) -> Address {
        env.storage().instance().get(&DataKey::Admin).unwrap()
    }
}

#[cfg(test)]
mod test;
