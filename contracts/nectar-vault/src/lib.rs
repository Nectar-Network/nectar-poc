#![no_std]

mod types;

use soroban_sdk::{
    contract, contractimpl, token, Address, Env, Symbol,
};
use types::{Depositor, VaultError, VaultKey, VaultState};

#[contract]
pub struct NectarVault;

#[contractimpl]
impl NectarVault {
    pub fn initialize(
        env: Env,
        admin: Address,
        usdc_token: Address,
        registry: Address,
    ) -> Result<(), VaultError> {
        env.storage().instance().extend_ttl(1000, 1000);
        if env.storage().instance().has(&VaultKey::Admin) {
            return Err(VaultError::AlreadyInit);
        }
        env.storage().instance().set(&VaultKey::Admin, &admin);
        env.storage().instance().set(&VaultKey::Usdc, &usdc_token);
        env.storage().instance().set(&VaultKey::KeeperRegistry, &registry);
        env.storage().instance().set(
            &VaultKey::State,
            &VaultState {
                total_usdc: 0,
                total_shares: 0,
                total_profit: 0,
                active_liq: 0,
            },
        );
        Ok(())
    }

    /// Deposit USDC into the vault and receive shares proportional to current ratio.
    pub fn deposit(env: Env, user: Address, amount: i128) -> Result<i128, VaultError> {
        env.storage().instance().extend_ttl(1000, 1000);
        require_init(&env)?;
        user.require_auth();

        let usdc: Address = env.storage().instance().get(&VaultKey::Usdc).unwrap();
        let mut state: VaultState = env.storage().instance().get(&VaultKey::State).unwrap();

        let shares = if state.total_shares == 0 {
            amount
        } else {
            amount * state.total_shares / state.total_usdc
        };

        token::Client::new(&env, &usdc).transfer(&user, &env.current_contract_address(), &amount);

        let depositor_key = VaultKey::Depositor(user.clone());
        let mut depositor = env
            .storage()
            .persistent()
            .get::<VaultKey, Depositor>(&depositor_key)
            .unwrap_or(Depositor {
                addr: user.clone(),
                shares: 0,
                deposited_at: env.ledger().timestamp(),
            });
        depositor.shares += shares;
        env.storage().persistent().set(&depositor_key, &depositor);
        env.storage()
            .persistent()
            .extend_ttl(&depositor_key, 535680, 535680);

        state.total_usdc += amount;
        state.total_shares += shares;
        env.storage().instance().set(&VaultKey::State, &state);

        env.events().publish(
            (Symbol::new(&env, "deposit"), user.clone()),
            (amount, shares),
        );
        Ok(shares)
    }

    /// Burn shares and receive proportional USDC (including any accumulated profit).
    pub fn withdraw(env: Env, user: Address, shares: i128) -> Result<i128, VaultError> {
        env.storage().instance().extend_ttl(1000, 1000);
        require_init(&env)?;
        user.require_auth();

        let depositor_key = VaultKey::Depositor(user.clone());
        let mut depositor: Depositor = env
            .storage()
            .persistent()
            .get(&depositor_key)
            .ok_or(VaultError::NoShares)?;

        if shares > depositor.shares {
            return Err(VaultError::InsufficientBalance);
        }

        let mut state: VaultState = env.storage().instance().get(&VaultKey::State).unwrap();
        if state.total_shares == 0 {
            return Err(VaultError::InsufficientVault);
        }
        let usdc_out = shares * state.total_usdc / state.total_shares;

        let usdc: Address = env.storage().instance().get(&VaultKey::Usdc).unwrap();
        token::Client::new(&env, &usdc).transfer(
            &env.current_contract_address(),
            &user,
            &usdc_out,
        );

        depositor.shares -= shares;
        env.storage().persistent().set(&depositor_key, &depositor);
        env.storage()
            .persistent()
            .extend_ttl(&depositor_key, 535680, 535680);

        state.total_usdc -= usdc_out;
        state.total_shares -= shares;
        env.storage().instance().set(&VaultKey::State, &state);

        env.events().publish(
            (Symbol::new(&env, "withdraw"), user.clone()),
            (shares, usdc_out),
        );
        Ok(usdc_out)
    }

    /// Returns depositor's shares and their current USDC value.
    pub fn balance(env: Env, user: Address) -> (i128, i128) {
        env.storage().instance().extend_ttl(1000, 1000);
        let depositor_key = VaultKey::Depositor(user);
        let depositor = env
            .storage()
            .persistent()
            .get::<VaultKey, Depositor>(&depositor_key);
        let depositor = match depositor {
            Some(d) => {
                // Renew TTL so idle depositors don't lose their record.
                env.storage()
                    .persistent()
                    .extend_ttl(&depositor_key, 535680, 535680);
                d
            }
            None => return (0, 0),
        };
        let state: VaultState = match env.storage().instance().get(&VaultKey::State) {
            Some(s) => s,
            None => return (0, 0),
        };
        if state.total_shares == 0 {
            return (depositor.shares, 0);
        }
        let usdc_val = depositor.shares * state.total_usdc / state.total_shares;
        (depositor.shares, usdc_val)
    }

    /// Keeper draws capital for a liquidation. Verified against registry.
    pub fn draw(env: Env, keeper: Address, amount: i128) -> Result<(), VaultError> {
        env.storage().instance().extend_ttl(1000, 1000);
        require_init(&env)?;
        keeper.require_auth();

        let mut state: VaultState = env.storage().instance().get(&VaultKey::State).unwrap();
        let available = state.total_usdc - state.active_liq;
        if amount > available {
            return Err(VaultError::InsufficientVault);
        }
        require_registered_keeper(&env, &keeper);

        let usdc: Address = env.storage().instance().get(&VaultKey::Usdc).unwrap();
        token::Client::new(&env, &usdc).transfer(
            &env.current_contract_address(),
            &keeper,
            &amount,
        );

        state.active_liq += amount;
        env.storage().instance().set(&VaultKey::State, &state);

        env.events()
            .publish((Symbol::new(&env, "draw"), keeper.clone()), amount);
        Ok(())
    }

    /// Keeper returns capital + profit after a successful liquidation.
    pub fn return_proceeds(env: Env, keeper: Address, amount: i128) -> Result<(), VaultError> {
        env.storage().instance().extend_ttl(1000, 1000);
        require_init(&env)?;
        keeper.require_auth();

        let usdc: Address = env.storage().instance().get(&VaultKey::Usdc).unwrap();
        token::Client::new(&env, &usdc).transfer(
            &keeper,
            &env.current_contract_address(),
            &amount,
        );

        let mut state: VaultState = env.storage().instance().get(&VaultKey::State).unwrap();
        let repay = if amount < state.active_liq { amount } else { state.active_liq };
        let profit = if amount > repay { amount - repay } else { 0 };

        state.active_liq -= repay;
        state.total_usdc += profit;
        state.total_profit += profit;
        env.storage().instance().set(&VaultKey::State, &state);

        env.events().publish(
            (Symbol::new(&env, "return"), keeper.clone()),
            (amount, profit),
        );
        Ok(())
    }

    pub fn get_state(env: Env) -> VaultState {
        env.storage().instance().extend_ttl(1000, 1000);
        env.storage().instance().get(&VaultKey::State).unwrap()
    }
}

fn require_init(env: &Env) -> Result<(), VaultError> {
    if !env.storage().instance().has(&VaultKey::Admin) {
        return Err(VaultError::NotInit);
    }
    Ok(())
}

// Verifies the keeper is registered by making a cross-contract call.
// If get_keeper panics (NotRegistered), the whole tx reverts.
fn require_registered_keeper(env: &Env, keeper: &Address) {
    let registry: Address = env
        .storage()
        .instance()
        .get(&VaultKey::KeeperRegistry)
        .unwrap();
    // invoke_contract returns Result — if it errors, the tx reverts
    let _: soroban_sdk::Val = env.invoke_contract(
        &registry,
        &Symbol::new(env, "get_keeper"),
        soroban_sdk::vec![env, keeper.to_val()],
    );
}

#[cfg(test)]
mod test;
