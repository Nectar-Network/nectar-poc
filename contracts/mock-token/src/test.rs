#[cfg(test)]
mod tests {
    use soroban_sdk::{testutils::Address as _, Address, Env, String};
    use crate::{MockToken, MockTokenClient};

    fn setup(env: &Env) -> (MockTokenClient, Address) {
        let admin = Address::generate(env);
        let id = env.register(MockToken, ());
        let client = MockTokenClient::new(env, &id);
        client.initialize(
            &admin,
            &String::from_str(env, "Mock USDC"),
            &String::from_str(env, "USDC"),
            &7,
        );
        (client, admin)
    }

    #[test]
    fn test_initialize_metadata() {
        let env = Env::default();
        let (client, admin) = setup(&env);
        assert_eq!(client.name(), String::from_str(&env, "Mock USDC"));
        assert_eq!(client.symbol(), String::from_str(&env, "USDC"));
        assert_eq!(client.decimals(), 7);
        assert_eq!(client.admin(), admin);
    }

    #[test]
    fn test_mint_and_balance() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _admin) = setup(&env);
        let user = Address::generate(&env);

        client.mint(&user, &1_000_0000000);
        assert_eq!(client.balance(&user), 1_000_0000000);
    }

    #[test]
    fn test_transfer() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _admin) = setup(&env);
        let alice = Address::generate(&env);
        let bob = Address::generate(&env);

        client.mint(&alice, &500_0000000);
        client.transfer(&alice, &bob, &200_0000000);
        assert_eq!(client.balance(&alice), 300_0000000);
        assert_eq!(client.balance(&bob), 200_0000000);
    }

    #[test]
    fn test_approve_and_transfer_from() {
        let env = Env::default();
        env.mock_all_auths();
        let (client, _admin) = setup(&env);
        let owner = Address::generate(&env);
        let spender = Address::generate(&env);
        let recipient = Address::generate(&env);

        client.mint(&owner, &1000_0000000);
        client.approve(&owner, &spender, &300_0000000, &(env.ledger().sequence() + 1000));
        assert_eq!(client.allowance(&owner, &spender), 300_0000000);

        client.transfer_from(&spender, &owner, &recipient, &100_0000000);
        assert_eq!(client.balance(&owner), 900_0000000);
        assert_eq!(client.balance(&recipient), 100_0000000);
        assert_eq!(client.allowance(&owner, &spender), 200_0000000);
    }

    #[test]
    fn test_double_initialize_panics() {
        let env = Env::default();
        let (client, admin) = setup(&env);
        let result = client.try_initialize(
            &admin,
            &String::from_str(&env, "X"),
            &String::from_str(&env, "X"),
            &7,
        );
        assert!(result.is_err());
    }
}
