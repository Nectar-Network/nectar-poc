#[cfg(test)]
mod tests {
    use crate::{Error, KeeperRegistry, KeeperRegistryClient};
    use soroban_sdk::{testutils::Address as _, Address, Env, String};

    #[test]
    fn test_initialize() {
        let env = Env::default();
        let id = env.register(KeeperRegistry, ());
        let client = KeeperRegistryClient::new(&env, &id);
        let admin = Address::generate(&env);

        client.initialize(&admin);
        assert_eq!(client.keeper_count(), 0);
    }

    #[test]
    fn test_register_and_get() {
        let env = Env::default();
        let id = env.register(KeeperRegistry, ());
        let client = KeeperRegistryClient::new(&env, &id);
        let admin = Address::generate(&env);
        let op = Address::generate(&env);

        client.initialize(&admin);
        env.mock_all_auths();

        client.register(&op, &String::from_str(&env, "keeper-alpha"));

        let info = client.get_keeper(&op);
        assert_eq!(info.name, String::from_str(&env, "keeper-alpha"));
        assert!(info.active);
        assert_eq!(info.addr, op);
        assert_eq!(client.keeper_count(), 1);
    }

    #[test]
    fn test_deregister() {
        let env = Env::default();
        let id = env.register(KeeperRegistry, ());
        let client = KeeperRegistryClient::new(&env, &id);
        let admin = Address::generate(&env);
        let op = Address::generate(&env);

        client.initialize(&admin);
        env.mock_all_auths();

        client.register(&op, &String::from_str(&env, "keeper-alpha"));
        assert_eq!(client.keeper_count(), 1);

        client.deregister(&op);
        assert_eq!(client.keeper_count(), 0);
        assert_eq!(client.get_keepers().len(), 0);
    }

    #[test]
    fn test_double_register_fails() {
        let env = Env::default();
        let id = env.register(KeeperRegistry, ());
        let client = KeeperRegistryClient::new(&env, &id);
        let admin = Address::generate(&env);
        let op = Address::generate(&env);

        client.initialize(&admin);
        env.mock_all_auths();

        client.register(&op, &String::from_str(&env, "keeper-alpha"));
        let result = client.try_register(&op, &String::from_str(&env, "keeper-alpha"));
        assert_eq!(result, Err(Ok(Error::AlreadyRegistered)));
    }

    #[test]
    fn test_deregister_unregistered_fails() {
        let env = Env::default();
        let id = env.register(KeeperRegistry, ());
        let client = KeeperRegistryClient::new(&env, &id);
        let admin = Address::generate(&env);
        let op = Address::generate(&env);

        client.initialize(&admin);
        env.mock_all_auths();

        let result = client.try_deregister(&op);
        assert_eq!(result, Err(Ok(Error::NotRegistered)));
    }

    #[test]
    fn test_pause_blocks_register() {
        let env = Env::default();
        let id = env.register(KeeperRegistry, ());
        let client = KeeperRegistryClient::new(&env, &id);
        let admin = Address::generate(&env);
        let op = Address::generate(&env);

        client.initialize(&admin);
        env.mock_all_auths();

        client.pause(&admin);
        let result = client.try_register(&op, &String::from_str(&env, "test"));
        assert_eq!(result, Err(Ok(Error::Paused)));
    }

    #[test]
    fn test_unpause_allows_register() {
        let env = Env::default();
        let id = env.register(KeeperRegistry, ());
        let client = KeeperRegistryClient::new(&env, &id);
        let admin = Address::generate(&env);
        let op = Address::generate(&env);

        client.initialize(&admin);
        env.mock_all_auths();

        client.pause(&admin);
        client.unpause(&admin);
        client.register(&op, &String::from_str(&env, "keeper-alpha"));
        assert_eq!(client.keeper_count(), 1);
    }

    #[test]
    fn test_get_keepers_list() {
        let env = Env::default();
        let id = env.register(KeeperRegistry, ());
        let client = KeeperRegistryClient::new(&env, &id);
        let admin = Address::generate(&env);
        let op_a = Address::generate(&env);
        let op_b = Address::generate(&env);

        client.initialize(&admin);
        env.mock_all_auths();

        client.register(&op_a, &String::from_str(&env, "keeper-alpha"));
        client.register(&op_b, &String::from_str(&env, "keeper-beta"));

        let keepers = client.get_keepers();
        assert_eq!(keepers.len(), 2);

        client.deregister(&op_a);
        let keepers = client.get_keepers();
        assert_eq!(keepers.len(), 1);
        assert_eq!(keepers.get(0).unwrap(), op_b);
    }

    #[test]
    fn test_unauthorized_pause() {
        let env = Env::default();
        let id = env.register(KeeperRegistry, ());
        let client = KeeperRegistryClient::new(&env, &id);
        let admin = Address::generate(&env);
        let intruder = Address::generate(&env);

        client.initialize(&admin);
        // No mock_all_auths — let auth check for intruder fail
        let result = client.try_pause(&intruder);
        assert_eq!(result, Err(Ok(Error::Unauthorized)));
    }

    #[test]
    fn test_double_init_fails() {
        let env = Env::default();
        let id = env.register(KeeperRegistry, ());
        let client = KeeperRegistryClient::new(&env, &id);
        let admin = Address::generate(&env);
        let admin2 = Address::generate(&env);

        client.initialize(&admin);
        let result = client.try_initialize(&admin2);
        assert_eq!(result, Err(Ok(Error::AlreadyInit)));
    }

    #[test]
    fn test_keeper_count_after_deregister() {
        let env = Env::default();
        let id = env.register(KeeperRegistry, ());
        let client = KeeperRegistryClient::new(&env, &id);
        let admin = Address::generate(&env);
        let op_a = Address::generate(&env);
        let op_b = Address::generate(&env);
        let op_c = Address::generate(&env);

        client.initialize(&admin);
        env.mock_all_auths();

        client.register(&op_a, &String::from_str(&env, "alpha"));
        client.register(&op_b, &String::from_str(&env, "beta"));
        client.register(&op_c, &String::from_str(&env, "gamma"));
        assert_eq!(client.keeper_count(), 3);

        client.deregister(&op_b);
        assert_eq!(client.keeper_count(), 2);

        client.deregister(&op_a);
        assert_eq!(client.keeper_count(), 1);

        client.deregister(&op_c);
        assert_eq!(client.keeper_count(), 0);
    }

    #[test]
    fn test_name_persisted_correctly() {
        let env = Env::default();
        let id = env.register(KeeperRegistry, ());
        let client = KeeperRegistryClient::new(&env, &id);
        let admin = Address::generate(&env);
        let op = Address::generate(&env);

        client.initialize(&admin);
        env.mock_all_auths();

        let name = String::from_str(&env, "my-keeper-node-01");
        client.register(&op, &name);

        let info = client.get_keeper(&op);
        assert_eq!(info.name, name);
        assert_eq!(info.addr, op);
        assert!(info.active);
    }
}
