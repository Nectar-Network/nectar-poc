#![no_std]

mod types;
pub use types::{DataKey, Error, KeeperInfo};

#[cfg(test)]
mod test;

use soroban_sdk::{contract, contractimpl, vec, Address, Env, String, Symbol, Vec};

#[contract]
pub struct KeeperRegistry;

#[contractimpl]
impl KeeperRegistry {
    pub fn initialize(env: Env, admin: Address) -> Result<(), Error> {
        let store = env.storage().instance();
        if store.has(&DataKey::Admin) {
            return Err(Error::AlreadyInit);
        }
        store.set(&DataKey::Admin, &admin);
        store.set(&DataKey::KeeperCount, &0u32);
        store.extend_ttl(1000, 1000);
        Ok(())
    }

    pub fn register(env: Env, operator: Address, name: String) -> Result<(), Error> {
        env.storage().instance().extend_ttl(1000, 1000);

        let store = env.storage().instance();
        if !store.has(&DataKey::Admin) {
            return Err(Error::NotInit);
        }
        if store.get::<DataKey, bool>(&DataKey::Paused).unwrap_or(false) {
            return Err(Error::Paused);
        }

        operator.require_auth();

        let pstore = env.storage().persistent();
        if pstore.has(&DataKey::Keeper(operator.clone())) {
            return Err(Error::AlreadyRegistered);
        }

        let info = KeeperInfo {
            addr: operator.clone(),
            name: name.clone(),
            registered_at: env.ledger().timestamp(),
            active: true,
        };

        pstore.set(&DataKey::Keeper(operator.clone()), &info);
        pstore.extend_ttl(&DataKey::Keeper(operator.clone()), 535680, 535680);

        let mut list: Vec<Address> = pstore
            .get(&DataKey::KeeperList)
            .unwrap_or_else(|| vec![&env]);
        list.push_back(operator.clone());
        pstore.set(&DataKey::KeeperList, &list);
        pstore.extend_ttl(&DataKey::KeeperList, 535680, 535680);

        let count: u32 = store.get(&DataKey::KeeperCount).unwrap_or(0);
        store.set(&DataKey::KeeperCount, &(count + 1));

        env.events().publish(
            (Symbol::new(&env, "registered"), operator.clone()),
            (name, env.ledger().timestamp()),
        );

        Ok(())
    }

    pub fn deregister(env: Env, operator: Address) -> Result<(), Error> {
        env.storage().instance().extend_ttl(1000, 1000);

        let store = env.storage().instance();
        if !store.has(&DataKey::Admin) {
            return Err(Error::NotInit);
        }

        operator.require_auth();

        let pstore = env.storage().persistent();
        if !pstore.has(&DataKey::Keeper(operator.clone())) {
            return Err(Error::NotRegistered);
        }

        pstore.remove(&DataKey::Keeper(operator.clone()));

        let list: Vec<Address> = pstore
            .get(&DataKey::KeeperList)
            .unwrap_or_else(|| vec![&env]);
        let mut updated: Vec<Address> = vec![&env];
        for a in list.iter() {
            if a != operator {
                updated.push_back(a);
            }
        }
        pstore.set(&DataKey::KeeperList, &updated);
        pstore.extend_ttl(&DataKey::KeeperList, 535680, 535680);

        let count: u32 = store.get(&DataKey::KeeperCount).unwrap_or(1);
        store.set(&DataKey::KeeperCount, &count.saturating_sub(1));

        env.events().publish(
            (Symbol::new(&env, "deregistered"), operator.clone()),
            (env.ledger().timestamp(),),
        );

        Ok(())
    }

    pub fn get_keeper(env: Env, operator: Address) -> Result<KeeperInfo, Error> {
        env.storage().instance().extend_ttl(1000, 1000);
        env.storage()
            .persistent()
            .get(&DataKey::Keeper(operator))
            .ok_or(Error::NotRegistered)
    }

    pub fn get_keepers(env: Env) -> Vec<Address> {
        env.storage().instance().extend_ttl(1000, 1000);
        env.storage()
            .persistent()
            .get(&DataKey::KeeperList)
            .unwrap_or_else(|| vec![&env])
    }

    pub fn keeper_count(env: Env) -> u32 {
        env.storage().instance().extend_ttl(1000, 1000);
        env.storage()
            .instance()
            .get(&DataKey::KeeperCount)
            .unwrap_or(0)
    }

    pub fn pause(env: Env, admin: Address) -> Result<(), Error> {
        env.storage().instance().extend_ttl(1000, 1000);
        Self::require_admin(&env, &admin)?;
        env.storage().instance().set(&DataKey::Paused, &true);
        Ok(())
    }

    pub fn unpause(env: Env, admin: Address) -> Result<(), Error> {
        env.storage().instance().extend_ttl(1000, 1000);
        Self::require_admin(&env, &admin)?;
        env.storage().instance().remove(&DataKey::Paused);
        Ok(())
    }

    fn require_admin(env: &Env, caller: &Address) -> Result<(), Error> {
        let stored: Address = env
            .storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInit)?;
        if stored != *caller {
            return Err(Error::Unauthorized);
        }
        caller.require_auth();
        Ok(())
    }
}
