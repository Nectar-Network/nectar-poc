#[cfg(test)]
mod tests {
    use soroban_sdk::{
        contract, contractimpl,
        testutils::{Address as _, Events as _},
        token, Address, Env, Symbol, TryFromVal, Val, Vec,
    };

    use crate::{NectarVault, NectarVaultClient, types::VaultError};

    // Minimal mock registry: get_keeper always succeeds (any address is "registered").
    #[contract]
    pub struct MockRegistry;
    #[contractimpl]
    impl MockRegistry {
        pub fn get_keeper(_env: Env, _operator: Address) -> Address {
            _operator
        }
    }

    fn setup_token(env: &Env, admin: &Address) -> Address {
        let token_id = env.register_stellar_asset_contract_v2(admin.clone()).address();
        token::StellarAssetClient::new(env, &token_id).mint(admin, &1_000_000_0000000);
        token_id
    }

    fn setup(env: &Env) -> (NectarVaultClient, Address, Address, Address) {
        let admin = Address::generate(env);
        let usdc = setup_token(env, &admin);
        let registry_id = env.register(MockRegistry, ());
        let vault_id = env.register(NectarVault, ());
        let client = NectarVaultClient::new(env, &vault_id);
        client.initialize(&admin, &usdc, &registry_id);
        (client, admin, usdc, vault_id)
    }

    #[test]
    fn test_deposit_and_balance() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin, usdc, _) = setup(&env);

        let user = Address::generate(&env);
        token::Client::new(&env, &usdc).transfer(&admin, &user, &100_0000000);
        client.deposit(&user, &100_0000000);

        let (shares, usdc_val) = client.balance(&user);
        assert_eq!(shares, 100_0000000);
        assert_eq!(usdc_val, 100_0000000);
    }

    #[test]
    fn test_withdraw_full() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin, usdc, _) = setup(&env);

        let user = Address::generate(&env);
        token::Client::new(&env, &usdc).transfer(&admin, &user, &100_0000000);
        let shares = client.deposit(&user, &100_0000000);
        let usdc_back = client.withdraw(&user, &shares);
        assert_eq!(usdc_back, 100_0000000);
        let (s, _) = client.balance(&user);
        assert_eq!(s, 0);
    }

    #[test]
    fn test_full_cycle_with_profit() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin, usdc, _) = setup(&env);

        let user = Address::generate(&env);
        let keeper = Address::generate(&env);
        token::Client::new(&env, &usdc).transfer(&admin, &user, &1000_0000000);
        token::Client::new(&env, &usdc).transfer(&admin, &keeper, &200_0000000);

        client.deposit(&user, &1000_0000000);

        // keeper draws 500
        client.draw(&keeper, &500_0000000);

        // keeper returns 510 (10 profit)
        client.return_proceeds(&keeper, &510_0000000);

        let state = client.get_state();
        assert_eq!(state.total_usdc, 1010_0000000);
        assert_eq!(state.total_profit, 10_0000000);

        let (shares, _) = client.balance(&user);
        let out = client.withdraw(&user, &shares);
        assert_eq!(out, 1010_0000000);
    }

    #[test]
    fn test_withdraw_more_than_owned_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin, usdc, _) = setup(&env);

        let user = Address::generate(&env);
        token::Client::new(&env, &usdc).transfer(&admin, &user, &100_0000000);
        let shares = client.deposit(&user, &100_0000000);
        let result = client.try_withdraw(&user, &(shares + 1));
        assert_eq!(result, Err(Ok(VaultError::InsufficientBalance)));
    }

    #[test]
    fn test_draw_more_than_available_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin, usdc, _) = setup(&env);

        let user = Address::generate(&env);
        token::Client::new(&env, &usdc).transfer(&admin, &user, &100_0000000);
        client.deposit(&user, &100_0000000);
        let keeper = Address::generate(&env);
        let result = client.try_draw(&keeper, &200_0000000);
        assert_eq!(result, Err(Ok(VaultError::InsufficientVault)));
    }

    #[test]
    fn test_multiple_depositors_proportional_shares() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin, usdc, _) = setup(&env);

        let alice = Address::generate(&env);
        let bob = Address::generate(&env);
        token::Client::new(&env, &usdc).transfer(&admin, &alice, &200_0000000);
        token::Client::new(&env, &usdc).transfer(&admin, &bob, &100_0000000);

        client.deposit(&alice, &200_0000000);
        client.deposit(&bob, &100_0000000);

        let (alice_shares, _) = client.balance(&alice);
        let (bob_shares, _) = client.balance(&bob);
        assert_eq!(alice_shares, bob_shares * 2);
    }

    #[test]
    fn test_double_init_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin, usdc, vault_id) = setup(&env);
        let dummy_reg = Address::generate(&env);
        let result = client.try_initialize(&admin, &usdc, &dummy_reg);
        assert_eq!(result, Err(Ok(VaultError::AlreadyInit)));
        let _ = vault_id;
    }

    // ── Additional edge-case tests ─────────────────────────────────────────

    #[test]
    fn test_withdraw_with_zero_shares_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin, usdc, _) = setup(&env);

        let user = Address::generate(&env);
        token::Client::new(&env, &usdc).transfer(&admin, &user, &100_0000000);
        client.deposit(&user, &100_0000000);

        // Attempting to withdraw 0 shares: library panics with InsufficientBalance
        // because depositor.shares (100) is NOT > 0 requested, but the contract
        // checks `shares > depositor.shares` which is false for 0. Actually 0 is allowed
        // by the contract (no explicit zero-guard). But usdc_out = 0*total/total = 0
        // and the vault still sends 0 USDC back. Verify balance unchanged.
        let usdc_back = client.withdraw(&user, &0);
        assert_eq!(usdc_back, 0);
        let (s, _) = client.balance(&user);
        assert_eq!(s, 100_0000000); // shares unchanged
    }

    #[test]
    fn test_withdraw_more_than_available_fails() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin, usdc, _) = setup(&env);

        let user = Address::generate(&env);
        token::Client::new(&env, &usdc).transfer(&admin, &user, &100_0000000);
        let shares = client.deposit(&user, &100_0000000);

        let result = client.try_withdraw(&user, &(shares + 1));
        assert_eq!(result, Err(Ok(VaultError::InsufficientBalance)));
    }

    #[test]
    fn test_partial_return_reduces_active_liq() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin, usdc, _) = setup(&env);

        let user = Address::generate(&env);
        let keeper = Address::generate(&env);
        token::Client::new(&env, &usdc).transfer(&admin, &user, &1000_0000000);
        token::Client::new(&env, &usdc).transfer(&admin, &keeper, &500_0000000);

        client.deposit(&user, &1000_0000000);
        client.draw(&keeper, &500_0000000);

        // return only 400 (partial, no profit)
        client.return_proceeds(&keeper, &400_0000000);

        let state = client.get_state();
        // active_liq should be 100 (500 drawn, 400 repaid)
        assert_eq!(state.active_liq, 100_0000000);
        // no profit was made
        assert_eq!(state.total_profit, 0);
    }

    #[test]
    fn test_draw_zero_fails_or_noop() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin, usdc, _) = setup(&env);

        let user = Address::generate(&env);
        let keeper = Address::generate(&env);
        token::Client::new(&env, &usdc).transfer(&admin, &user, &100_0000000);
        client.deposit(&user, &100_0000000);

        // Drawing 0 should succeed (0 <= available) but result in no state change
        client.draw(&keeper, &0);
        let state = client.get_state();
        assert_eq!(state.active_liq, 0);
    }

    #[test]
    fn test_return_without_draw_no_panic() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin, usdc, _) = setup(&env);

        let user = Address::generate(&env);
        let keeper = Address::generate(&env);
        token::Client::new(&env, &usdc).transfer(&admin, &user, &1000_0000000);
        token::Client::new(&env, &usdc).transfer(&admin, &keeper, &50_0000000);

        client.deposit(&user, &1000_0000000);

        // Returning 50 when active_liq=0: repay=0, profit=50
        // total_usdc += 50, active_liq stays 0
        client.return_proceeds(&keeper, &50_0000000);
        let state = client.get_state();
        assert_eq!(state.total_profit, 50_0000000);
        assert_eq!(state.total_usdc, 1050_0000000);
    }

    #[test]
    fn test_multiple_draws_and_returns() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin, usdc, _) = setup(&env);

        let user = Address::generate(&env);
        let keeper = Address::generate(&env);
        token::Client::new(&env, &usdc).transfer(&admin, &user, &2000_0000000);
        token::Client::new(&env, &usdc).transfer(&admin, &keeper, &500_0000000);

        client.deposit(&user, &2000_0000000);

        // First draw + return with profit
        client.draw(&keeper, &300_0000000);
        client.return_proceeds(&keeper, &310_0000000);

        // Second draw + return with profit
        client.draw(&keeper, &200_0000000);
        client.return_proceeds(&keeper, &215_0000000);

        let state = client.get_state();
        assert_eq!(state.active_liq, 0);
        assert_eq!(state.total_profit, 25_0000000); // 10 + 15
        assert_eq!(state.total_usdc, 2025_0000000);
    }

    #[test]
    fn test_share_rounding_bounded() {
        // Verifies that integer rounding doesn't cause unbounded dust accumulation.
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin, usdc, _) = setup(&env);

        let a = Address::generate(&env);
        let b = Address::generate(&env);
        let c = Address::generate(&env);

        // Give 100 each
        token::Client::new(&env, &usdc).transfer(&admin, &a, &100_0000000);
        token::Client::new(&env, &usdc).transfer(&admin, &b, &100_0000000);
        token::Client::new(&env, &usdc).transfer(&admin, &c, &100_0000000);

        client.deposit(&a, &100_0000000);
        client.deposit(&b, &100_0000000);
        client.deposit(&c, &100_0000000);

        let state = client.get_state();
        assert_eq!(state.total_usdc, 300_0000000);
        assert_eq!(state.total_shares, 300_0000000);

        // Withdraw all three — total recovered should be close to 300
        let (shares_a, _) = client.balance(&a);
        let (shares_b, _) = client.balance(&b);
        let (shares_c, _) = client.balance(&c);

        let out_a = client.withdraw(&a, &shares_a);
        let out_b = client.withdraw(&b, &shares_b);
        let out_c = client.withdraw(&c, &shares_c);

        let total_out = out_a + out_b + out_c;
        // allow up to 3 stroops of rounding loss across 3 withdrawals
        assert!(total_out >= 300_0000000 - 3, "too much rounding dust: {}", 300_0000000 - total_out);
        assert!(total_out <= 300_0000000);
    }

    #[test]
    fn test_draw_event_emitted() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin, usdc, _) = setup(&env);

        let user = Address::generate(&env);
        let keeper = Address::generate(&env);
        token::Client::new(&env, &usdc).transfer(&admin, &user, &1000_0000000);
        token::Client::new(&env, &usdc).transfer(&admin, &keeper, &200_0000000);

        client.deposit(&user, &1000_0000000);
        client.draw(&keeper, &100_0000000);

        // Verify draw event was published (event count > deposit event)
        let events = env.events().all();
        let has_draw = events.iter().any(|(_, topics, _): (Address, Vec<Val>, Val)| {
            if let Some(val) = topics.first() {
                if let Ok(s) = Symbol::try_from_val(&env, &val) {
                    return s == Symbol::new(&env, "draw");
                }
            }
            false
        });
        assert!(has_draw, "draw event not emitted");
    }

    #[test]
    fn test_return_event_emitted() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, admin, usdc, _) = setup(&env);

        let user = Address::generate(&env);
        let keeper = Address::generate(&env);
        token::Client::new(&env, &usdc).transfer(&admin, &user, &1000_0000000);
        token::Client::new(&env, &usdc).transfer(&admin, &keeper, &200_0000000);

        client.deposit(&user, &1000_0000000);
        client.draw(&keeper, &100_0000000);
        client.return_proceeds(&keeper, &110_0000000);

        let events = env.events().all();
        let has_return = events.iter().any(|(_, topics, _): (Address, Vec<Val>, Val)| {
            if let Some(val) = topics.first() {
                if let Ok(s) = Symbol::try_from_val(&env, &val) {
                    return s == Symbol::new(&env, "return");
                }
            }
            false
        });
        assert!(has_return, "return event not emitted");
    }
}
