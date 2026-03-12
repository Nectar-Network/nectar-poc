/**
 * Triggers a liquidation scenario for demo purposes by dropping the XLM oracle price.
 * Usage: ORACLE_CONTRACT=C... ORACLE_ADMIN_SECRET=S... npx tsx scripts/trigger-liquidation.ts
 */
import { rpc, Keypair, Contract, TransactionBuilder, nativeToScVal, xdr } from "@stellar/stellar-sdk";

const RPC_URL = process.env.NETWORK_RPC || "https://soroban-testnet.stellar.org:443";
const PASSPHRASE = process.env.NETWORK_PASSPHRASE || "Test SDF Network ; September 2015";
const ORACLE_CONTRACT = process.env.ORACLE_CONTRACT;
const ORACLE_ADMIN_SECRET = process.env.ORACLE_ADMIN_SECRET;
const NEW_XLM_PRICE = Number(process.env.NEW_XLM_PRICE || "0.23");

if (!ORACLE_CONTRACT || !ORACLE_ADMIN_SECRET) {
  console.error("Usage: ORACLE_CONTRACT=C... ORACLE_ADMIN_SECRET=S... npx tsx scripts/trigger-liquidation.ts");
  process.exit(1);
}

async function setOraclePrice(asset: string, price: number) {
  const server = new rpc.Server(RPC_URL);
  const keypair = Keypair.fromSecret(ORACLE_ADMIN_SECRET!);
  const account = await server.getAccount(keypair.publicKey());
  const contract = new Contract(ORACLE_CONTRACT!);

  // Mock oracle from blend-utils uses set_price(asset: Address, price: i128)
  // Price is in oracle base denomination scaled to 7 decimals
  const scaledPrice = BigInt(Math.round(price * 1e7));

  const op = contract.call(
    "set_price",
    nativeToScVal(asset, { type: "address" }),
    nativeToScVal(scaledPrice, { type: "i128" })
  );

  const tx = new TransactionBuilder(account, {
    fee: "500000",
    networkPassphrase: PASSPHRASE,
  })
    .addOperation(op)
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (rpc.Api.isSimulationError(sim)) {
    throw new Error(`oracle set_price sim failed: ${sim.error}`);
  }

  const prepared = rpc.assembleTransaction(tx, sim).build();
  prepared.sign(keypair);
  const result = await server.sendTransaction(prepared);

  console.log(`[trigger] oracle price update submitted hash=${result.hash}`);

  // Poll for confirmation
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const txResult = await server.getTransaction(result.hash);
    if (txResult.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      console.log(`[trigger] confirmed — XLM price set to $${price}`);
      console.log(`[trigger] expected health factor impact: positions at ~77% LTV drop to HF ~0.76`);
      return;
    }
    if (txResult.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw new Error(`oracle price update failed`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("oracle price update timed out");
}

const XLM_ASSET = process.env.XLM_ASSET_CONTRACT || "native";

console.log(`[trigger] dropping XLM price to $${NEW_XLM_PRICE} on oracle ${ORACLE_CONTRACT}`);
setOraclePrice(XLM_ASSET, NEW_XLM_PRICE).catch((e) => {
  console.error(e);
  process.exit(1);
});
