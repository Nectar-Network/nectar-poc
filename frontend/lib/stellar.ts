import {
  isConnected,
  isAllowed,
  setAllowed,
  requestAccess,
  getAddress,
  getNetwork,
  signTransaction,
} from "@stellar/freighter-api";
import * as StellarSdk from "stellar-sdk";

const TESTNET_RPC = "https://soroban-testnet.stellar.org";
const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";
const HORIZON_TESTNET = "https://horizon-testnet.stellar.org";

// Vault contract address — set via env or fallback
const VAULT_CONTRACT =
  process.env.NEXT_PUBLIC_VAULT_CONTRACT ?? "";

export interface WalletState {
  connected: boolean;
  address: string;
  network: string;
  balance: string; // XLM balance for display
  usdcBalance: string;
}

/** Check if Freighter extension is installed */
export async function checkFreighter(): Promise<boolean> {
  try {
    const result = await isConnected();
    return result.isConnected;
  } catch {
    return false;
  }
}

/** Connect to Freighter and get user address */
export async function connectWallet(): Promise<WalletState | null> {
  try {
    const connected = await isConnected();
    if (!connected.isConnected) {
      throw new Error("Freighter extension not found. Please install Freighter wallet.");
    }

    const allowed = await isAllowed();
    if (!allowed.isAllowed) {
      await setAllowed();
    }

    const accessResult = await requestAccess();
    if (accessResult.error) {
      throw new Error(accessResult.error);
    }

    const addressResult = await getAddress();
    if (addressResult.error) {
      throw new Error(addressResult.error);
    }

    const networkResult = await getNetwork();

    // Fetch XLM balance
    let xlmBalance = "0";
    let usdcBalance = "0";
    try {
      const server = new StellarSdk.Horizon.Server(HORIZON_TESTNET);
      const account = await server.loadAccount(addressResult.address);
      const native = account.balances.find(
        (b: StellarSdk.Horizon.HorizonApi.BalanceLine) => b.asset_type === "native"
      );
      if (native) {
        xlmBalance = parseFloat(native.balance).toFixed(2);
      }
      // Look for USDC or test token balance
      for (const b of account.balances) {
        if ("asset_code" in b && b.asset_code === "USDC") {
          usdcBalance = parseFloat(b.balance).toFixed(2);
        }
      }
    } catch {
      // Account may not exist yet
    }

    return {
      connected: true,
      address: addressResult.address,
      network: networkResult.network || "TESTNET",
      balance: xlmBalance,
      usdcBalance,
    };
  } catch (err) {
    console.error("Wallet connection failed:", err);
    throw err;
  }
}

/** Build and submit a vault deposit transaction via Soroban */
export async function depositToVault(
  userAddress: string,
  amountStroops: bigint
): Promise<{ txHash: string; success: boolean }> {
  if (!VAULT_CONTRACT) {
    throw new Error("Vault contract address not configured. Set NEXT_PUBLIC_VAULT_CONTRACT.");
  }

  const server = new StellarSdk.rpc.Server(TESTNET_RPC);
  const account = await server.getAccount(userAddress);

  const contract = new StellarSdk.Contract(VAULT_CONTRACT);

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: "1000000",
    networkPassphrase: TESTNET_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "deposit",
        StellarSdk.nativeToScVal(userAddress, { type: "address" }),
        StellarSdk.nativeToScVal(amountStroops, { type: "i128" })
      )
    )
    .setTimeout(60)
    .build();

  // Simulate first
  const simulated = await server.simulateTransaction(tx);
  if (StellarSdk.rpc.Api.isSimulationError(simulated)) {
    throw new Error(`Simulation failed: ${simulated.error}`);
  }

  const prepared = StellarSdk.rpc.assembleTransaction(tx, simulated).build();
  const xdr = prepared.toXDR();

  // Sign with Freighter
  const signResult = await signTransaction(xdr, {
    networkPassphrase: TESTNET_PASSPHRASE,
    address: userAddress,
  });

  if (signResult.error) {
    throw new Error(`Signing failed: ${signResult.error}`);
  }

  const signed = StellarSdk.TransactionBuilder.fromXDR(
    signResult.signedTxXdr,
    TESTNET_PASSPHRASE
  );

  const sendResult = await server.sendTransaction(signed);

  if (sendResult.status === "ERROR") {
    throw new Error("Transaction submission failed");
  }

  // Poll for confirmation
  let result = await server.getTransaction(sendResult.hash);
  while (result.status === "NOT_FOUND") {
    await new Promise((r) => setTimeout(r, 2000));
    result = await server.getTransaction(sendResult.hash);
  }

  return {
    txHash: sendResult.hash,
    success: result.status === "SUCCESS",
  };
}

/** Build and submit a vault withdraw transaction via Soroban */
export async function withdrawFromVault(
  userAddress: string,
  sharesStroops: bigint
): Promise<{ txHash: string; success: boolean }> {
  if (!VAULT_CONTRACT) {
    throw new Error("Vault contract address not configured. Set NEXT_PUBLIC_VAULT_CONTRACT.");
  }

  const server = new StellarSdk.rpc.Server(TESTNET_RPC);
  const account = await server.getAccount(userAddress);

  const contract = new StellarSdk.Contract(VAULT_CONTRACT);

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: "1000000",
    networkPassphrase: TESTNET_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "withdraw",
        StellarSdk.nativeToScVal(userAddress, { type: "address" }),
        StellarSdk.nativeToScVal(sharesStroops, { type: "i128" })
      )
    )
    .setTimeout(60)
    .build();

  const simulated = await server.simulateTransaction(tx);
  if (StellarSdk.rpc.Api.isSimulationError(simulated)) {
    throw new Error(`Simulation failed: ${simulated.error}`);
  }

  const prepared = StellarSdk.rpc.assembleTransaction(tx, simulated).build();
  const xdr = prepared.toXDR();

  const signResult = await signTransaction(xdr, {
    networkPassphrase: TESTNET_PASSPHRASE,
    address: userAddress,
  });

  if (signResult.error) {
    throw new Error(`Signing failed: ${signResult.error}`);
  }

  const signed = StellarSdk.TransactionBuilder.fromXDR(
    signResult.signedTxXdr,
    TESTNET_PASSPHRASE
  );

  const sendResult = await server.sendTransaction(signed);

  if (sendResult.status === "ERROR") {
    throw new Error("Transaction submission failed");
  }

  let result = await server.getTransaction(sendResult.hash);
  while (result.status === "NOT_FOUND") {
    await new Promise((r) => setTimeout(r, 2000));
    result = await server.getTransaction(sendResult.hash);
  }

  return {
    txHash: sendResult.hash,
    success: result.status === "SUCCESS",
  };
}

/** Query vault balance for a user */
export async function queryVaultBalance(
  userAddress: string
): Promise<{ shares: number; usdcValue: number } | null> {
  if (!VAULT_CONTRACT) return null;

  try {
    const server = new StellarSdk.rpc.Server(TESTNET_RPC);
    const account = await server.getAccount(userAddress);
    const contract = new StellarSdk.Contract(VAULT_CONTRACT);

    const tx = new StellarSdk.TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: TESTNET_PASSPHRASE,
    })
      .addOperation(
        contract.call(
          "balance",
          StellarSdk.nativeToScVal(userAddress, { type: "address" })
        )
      )
      .setTimeout(30)
      .build();

    const simulated = await server.simulateTransaction(tx);
    if (StellarSdk.rpc.Api.isSimulationError(simulated)) {
      return null;
    }

    // Parse the result — returns (shares: i128, usdc_value: i128)
    if (StellarSdk.rpc.Api.isSimulationSuccess(simulated) && simulated.result) {
      const retVal = simulated.result.retval;
      const vec = retVal.value() as unknown as Array<{ value: () => bigint }>;
      if (vec && vec.length >= 2) {
        return {
          shares: Number(vec[0].value()),
          usdcValue: Number(vec[1].value()),
        };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function shortAddr(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
}
