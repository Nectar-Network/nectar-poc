"use client";

import { useState, useEffect, useCallback } from "react";
import { formatUSDC } from "../../lib/api";
import {
  checkFreighter,
  connectWallet,
  depositToVault,
  withdrawFromVault,
  queryVaultBalance,
  shortAddr,
  type WalletState,
} from "../../lib/stellar";

type Tab = "deposit" | "withdraw";
type TxStatus = "idle" | "simulating" | "signing" | "submitted" | "confirmed" | "error";

const VAULT_CONTRACT = process.env.NEXT_PUBLIC_VAULT_CONTRACT ?? "";

const VAULT_INFO = {
  tvl: 5117310000000,
  apy: 12.4,
  totalShares: 5517300000000,
  depositors: 22,
};

export default function VaultApp() {
  const [tab, setTab] = useState<Tab>("deposit");
  const [amount, setAmount] = useState("");
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [txStatus, setTxStatus] = useState<TxStatus>("idle");
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");
  const [hasFreighter, setHasFreighter] = useState<boolean | null>(null);
  const [vaultShares, setVaultShares] = useState<number>(0);
  const [vaultUsdcValue, setVaultUsdcValue] = useState<number>(0);

  // Check Freighter on mount
  useEffect(() => {
    checkFreighter().then(setHasFreighter);
  }, []);

  // Query vault balance when connected
  const refreshVaultBalance = useCallback(async () => {
    if (!wallet?.address || !VAULT_CONTRACT) return;
    const bal = await queryVaultBalance(wallet.address);
    if (bal) {
      setVaultShares(bal.shares);
      setVaultUsdcValue(bal.usdcValue);
    }
  }, [wallet?.address]);

  useEffect(() => {
    refreshVaultBalance();
  }, [refreshVaultBalance]);

  const handleConnect = async () => {
    setError("");
    try {
      const w = await connectWallet();
      if (w) setWallet(w);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect wallet");
    }
  };

  const handleDisconnect = () => {
    setWallet(null);
    setVaultShares(0);
    setVaultUsdcValue(0);
    resetTx();
  };

  const handleSubmit = async () => {
    if (!amount || parseFloat(amount) <= 0 || !wallet) return;
    setError("");
    setTxStatus("simulating");

    try {
      const stroops = BigInt(Math.floor(parseFloat(amount) * 1e7));

      setTxStatus("signing");
      let result;
      if (tab === "deposit") {
        result = await depositToVault(wallet.address, stroops);
      } else {
        result = await withdrawFromVault(wallet.address, stroops);
      }

      setTxStatus("submitted");
      setTxHash(result.txHash);

      if (result.success) {
        setTxStatus("confirmed");
        // Refresh balances
        await refreshVaultBalance();
        // Refresh wallet balances
        const updated = await connectWallet();
        if (updated) setWallet(updated);
      } else {
        setTxStatus("error");
        setError("Transaction failed on-chain. Check explorer for details.");
      }
    } catch (err) {
      setTxStatus("error");
      setError(err instanceof Error ? err.message : "Transaction failed");
    }
  };

  const resetTx = () => {
    setTxStatus("idle");
    setTxHash("");
    setAmount("");
    setError("");
  };

  const cell: React.CSSProperties = {
    fontFamily: "monospace",
    fontSize: "13px",
    color: "var(--text)",
  };

  const connected = wallet?.connected;

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 24px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px" }}>
        <div>
          <h1
            style={{
              fontFamily: "var(--font-syne)",
              fontSize: "20px",
              fontWeight: 700,
              letterSpacing: "0.15em",
              color: "var(--text)",
              textTransform: "uppercase",
              marginBottom: "4px",
            }}
          >
            Nectar Vault
          </h1>
          <p style={{ fontSize: "12px", color: "var(--text-dim)", fontFamily: "monospace" }}>
            Deposit USDC to fund liquidations and earn yield from keeper profits
          </p>
        </div>
        {connected && wallet && (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--accent)" }}>
                {shortAddr(wallet.address)}
              </div>
              <div style={{ fontSize: "10px", fontFamily: "monospace", color: "var(--text-dim)" }}>
                {wallet.balance} XLM · {wallet.network}
              </div>
            </div>
            <button
              onClick={handleDisconnect}
              style={{
                padding: "4px 10px",
                fontSize: "10px",
                fontFamily: "monospace",
                background: "transparent",
                border: "1px solid var(--border)",
                color: "var(--text-dim)",
                cursor: "pointer",
              }}
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* Left: Vault Stats + How it works */}
        <div>
          {/* Vault Stats */}
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "4px",
              padding: "24px",
              background: "rgba(255,255,255,0.02)",
              marginBottom: "16px",
            }}
          >
            <div style={{ fontSize: "11px", color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "16px" }}>
              VAULT OVERVIEW
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              {[
                { label: "TVL", value: `$${formatUSDC(VAULT_INFO.tvl)}` },
                { label: "Est. APY", value: `${VAULT_INFO.apy}%`, accent: true },
                { label: "Depositors", value: `${VAULT_INFO.depositors}` },
                { label: "Total Shares", value: `${(VAULT_INFO.totalShares / 1e7).toLocaleString()}` },
              ].map(({ label, value, accent }) => (
                <div key={label}>
                  <div style={{ fontSize: "10px", color: "var(--text-dim)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "4px" }}>
                    {label}
                  </div>
                  <div style={{ fontSize: "18px", fontFamily: "monospace", fontWeight: 600, color: accent ? "var(--accent)" : "var(--text)" }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Your Position (when connected) */}
          {connected && (
            <div
              style={{
                border: "1px solid var(--accent)",
                borderRadius: "4px",
                padding: "24px",
                background: "rgba(0, 229, 160, 0.03)",
                marginBottom: "16px",
              }}
            >
              <div style={{ fontSize: "11px", color: "var(--accent)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "16px" }}>
                YOUR POSITION
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <div style={{ fontSize: "10px", color: "var(--text-dim)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "4px" }}>
                    Vault Shares
                  </div>
                  <div style={{ fontSize: "18px", fontFamily: "monospace", fontWeight: 600, color: "var(--text)" }}>
                    {(vaultShares / 1e7).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "10px", color: "var(--text-dim)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "4px" }}>
                    USDC Value
                  </div>
                  <div style={{ fontSize: "18px", fontFamily: "monospace", fontWeight: 600, color: "var(--accent)" }}>
                    ${formatUSDC(vaultUsdcValue)}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "10px", color: "var(--text-dim)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "4px" }}>
                    USDC Balance
                  </div>
                  <div style={{ fontSize: "18px", fontFamily: "monospace", fontWeight: 600, color: "var(--text)" }}>
                    {wallet?.usdcBalance ?? "0.00"}
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "10px", color: "var(--text-dim)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "4px" }}>
                    XLM Balance
                  </div>
                  <div style={{ fontSize: "18px", fontFamily: "monospace", fontWeight: 600, color: "var(--text)" }}>
                    {wallet?.balance ?? "0.00"}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* How It Works */}
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "4px",
              padding: "24px",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div style={{ fontSize: "11px", color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "16px" }}>
              HOW VAULT DEPOSITS WORK
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {[
                { step: "1", title: "Deposit USDC", desc: "Your USDC is pooled in the NectarVault smart contract on Soroban. You receive LP shares proportional to your deposit." },
                { step: "2", title: "Keepers Draw Capital", desc: "When a liquidation opportunity is found, keepers draw USDC from the vault to fill Blend Protocol Dutch auctions." },
                { step: "3", title: "Profits Returned", desc: "After a successful liquidation, the capital + profit is returned to the vault. Your shares appreciate in value." },
                { step: "4", title: "Withdraw Anytime", desc: "Redeem your LP shares for USDC at the current share price, which reflects accumulated profits." },
              ].map(({ step, title, desc }) => (
                <div key={step} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <div
                    style={{
                      width: "24px",
                      height: "24px",
                      borderRadius: "50%",
                      border: "1px solid var(--accent)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontSize: "11px",
                      fontFamily: "monospace",
                      color: "var(--accent)",
                    }}
                  >
                    {step}
                  </div>
                  <div>
                    <div style={{ fontSize: "13px", fontFamily: "monospace", color: "var(--text)", marginBottom: "2px" }}>{title}</div>
                    <div style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--text-dim)", lineHeight: "1.5" }}>{desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Deposit/Withdraw Form */}
        <div>
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "4px",
              background: "rgba(255,255,255,0.02)",
              overflow: "hidden",
            }}
          >
            {/* Tabs */}
            <div style={{ display: "flex", borderBottom: "1px solid var(--border)" }}>
              {(["deposit", "withdraw"] as Tab[]).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); resetTx(); }}
                  style={{
                    flex: 1,
                    padding: "12px",
                    border: "none",
                    background: tab === t ? "rgba(255,255,255,0.04)" : "transparent",
                    color: tab === t ? "var(--accent)" : "var(--text-dim)",
                    fontSize: "12px",
                    fontFamily: "monospace",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em",
                    cursor: "pointer",
                    borderBottom: tab === t ? "2px solid var(--accent)" : "2px solid transparent",
                    transition: "all 0.2s",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>

            {/* Form Content */}
            <div style={{ padding: "24px" }}>
              {!connected ? (
                <div style={{ textAlign: "center", padding: "32px 0" }}>
                  {hasFreighter === false && (
                    <div style={{
                      fontSize: "12px", color: "var(--amber)", fontFamily: "monospace",
                      marginBottom: "16px", padding: "8px 12px", background: "rgba(230, 172, 47, 0.08)",
                      border: "1px solid rgba(230, 172, 47, 0.2)", borderRadius: "2px",
                    }}>
                      Freighter wallet extension not detected.
                      <br />
                      <a
                        href="https://www.freighter.app/"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "var(--accent)", textDecoration: "underline" }}
                      >
                        Install Freighter
                      </a>
                      {" "}to interact with the vault.
                    </div>
                  )}
                  <div style={{ fontSize: "13px", color: "var(--text-dim)", fontFamily: "monospace", marginBottom: "16px" }}>
                    Connect your Stellar wallet to {tab}
                  </div>
                  <button
                    onClick={handleConnect}
                    style={{
                      padding: "12px 32px",
                      background: "var(--accent)",
                      color: "var(--bg)",
                      border: "none",
                      fontSize: "13px",
                      fontFamily: "monospace",
                      fontWeight: 600,
                      cursor: "pointer",
                      letterSpacing: "0.05em",
                    }}
                  >
                    Connect Freighter
                  </button>
                  <div style={{ fontSize: "11px", color: "var(--text-dim)", fontFamily: "monospace", marginTop: "12px" }}>
                    Stellar wallet for Soroban dApps
                  </div>
                  {error && (
                    <div style={{ fontSize: "11px", color: "var(--red)", fontFamily: "monospace", marginTop: "8px" }}>
                      {error}
                    </div>
                  )}
                </div>
              ) : txStatus === "confirmed" ? (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <div style={{ fontSize: "32px", marginBottom: "12px", color: "var(--accent)" }}>&#10003;</div>
                  <div style={{ fontSize: "14px", color: "var(--accent)", fontFamily: "monospace", marginBottom: "8px" }}>
                    {tab === "deposit" ? "Deposit" : "Withdrawal"} Confirmed
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--text-dim)", fontFamily: "monospace", marginBottom: "4px" }}>
                    {amount} USDC {tab === "deposit" ? "deposited into" : "withdrawn from"} vault
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-dim)", fontFamily: "monospace", marginBottom: "16px" }}>
                    tx:{" "}
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: "var(--accent)", textDecoration: "underline" }}
                    >
                      {txHash.slice(0, 8)}...{txHash.slice(-8)}
                    </a>
                  </div>
                  <button
                    onClick={resetTx}
                    style={{
                      padding: "8px 24px",
                      background: "transparent",
                      color: "var(--accent)",
                      border: "1px solid var(--accent)",
                      fontSize: "12px",
                      fontFamily: "monospace",
                      cursor: "pointer",
                    }}
                  >
                    New {tab}
                  </button>
                </div>
              ) : txStatus === "error" ? (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <div style={{ fontSize: "32px", marginBottom: "12px", color: "var(--red)" }}>&#10007;</div>
                  <div style={{ fontSize: "14px", color: "var(--red)", fontFamily: "monospace", marginBottom: "8px" }}>
                    Transaction Failed
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--text-dim)", fontFamily: "monospace", marginBottom: "16px", maxWidth: "300px", margin: "0 auto 16px" }}>
                    {error}
                  </div>
                  {txHash && (
                    <div style={{ fontSize: "11px", color: "var(--text-dim)", fontFamily: "monospace", marginBottom: "12px" }}>
                      tx:{" "}
                      <a
                        href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: "var(--accent)", textDecoration: "underline" }}
                      >
                        {txHash.slice(0, 8)}...{txHash.slice(-8)}
                      </a>
                    </div>
                  )}
                  <button
                    onClick={resetTx}
                    style={{
                      padding: "8px 24px",
                      background: "transparent",
                      color: "var(--accent)",
                      border: "1px solid var(--accent)",
                      fontSize: "12px",
                      fontFamily: "monospace",
                      cursor: "pointer",
                    }}
                  >
                    Try Again
                  </button>
                </div>
              ) : (
                <>
                  {/* Amount Input */}
                  <div style={{ marginBottom: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                      <label style={{ fontSize: "11px", color: "var(--text-dim)", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                        {tab === "deposit" ? "USDC Amount" : "Shares to Redeem"}
                      </label>
                      <span style={{ fontSize: "11px", color: "var(--text-dim)", fontFamily: "monospace" }}>
                        {tab === "deposit"
                          ? `Balance: ${wallet?.usdcBalance ?? "0.00"} USDC`
                          : `Shares: ${(vaultShares / 1e7).toFixed(2)}`}
                      </span>
                    </div>
                    <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: "2px", overflow: "hidden" }}>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        style={{
                          flex: 1,
                          padding: "12px",
                          background: "var(--surface)",
                          color: "var(--text)",
                          border: "none",
                          fontSize: "16px",
                          fontFamily: "monospace",
                          outline: "none",
                        }}
                      />
                      <button
                        onClick={() => setAmount(
                          tab === "deposit"
                            ? wallet?.usdcBalance ?? "0"
                            : (vaultShares / 1e7).toFixed(2)
                        )}
                        style={{
                          padding: "12px 16px",
                          background: "rgba(255,255,255,0.04)",
                          color: "var(--accent)",
                          border: "none",
                          borderLeft: "1px solid var(--border)",
                          fontSize: "11px",
                          fontFamily: "monospace",
                          cursor: "pointer",
                          letterSpacing: "0.05em",
                        }}
                      >
                        MAX
                      </button>
                    </div>
                  </div>

                  {/* Summary */}
                  {amount && parseFloat(amount) > 0 && (
                    <div style={{ padding: "12px", background: "var(--surface)", borderRadius: "2px", marginBottom: "16px" }}>
                      {tab === "deposit" ? (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                            <span style={{ ...cell, fontSize: "11px", color: "var(--text-dim)" }}>You deposit</span>
                            <span style={{ ...cell, fontSize: "11px" }}>{parseFloat(amount).toLocaleString()} USDC</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                            <span style={{ ...cell, fontSize: "11px", color: "var(--text-dim)" }}>You receive</span>
                            <span style={{ ...cell, fontSize: "11px" }}>~{(parseFloat(amount) * 0.99).toFixed(2)} shares</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ ...cell, fontSize: "11px", color: "var(--text-dim)" }}>Share price</span>
                            <span style={{ ...cell, fontSize: "11px", color: "var(--accent)" }}>$1.0099</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                            <span style={{ ...cell, fontSize: "11px", color: "var(--text-dim)" }}>You redeem</span>
                            <span style={{ ...cell, fontSize: "11px" }}>{parseFloat(amount).toLocaleString()} shares</span>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ ...cell, fontSize: "11px", color: "var(--text-dim)" }}>You receive</span>
                            <span style={{ ...cell, fontSize: "11px", color: "var(--accent)" }}>~{(parseFloat(amount) * 1.0099).toFixed(2)} USDC</span>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* Error display */}
                  {error && (
                    <div style={{
                      fontSize: "11px", color: "var(--red)", fontFamily: "monospace",
                      marginBottom: "12px", padding: "8px", background: "rgba(204, 68, 68, 0.08)",
                      borderRadius: "2px",
                    }}>
                      {error}
                    </div>
                  )}

                  {/* Submit */}
                  <button
                    onClick={handleSubmit}
                    disabled={!amount || parseFloat(amount) <= 0 || txStatus !== "idle"}
                    style={{
                      width: "100%",
                      padding: "14px",
                      background: !amount || parseFloat(amount) <= 0 ? "var(--surface)" : "var(--accent)",
                      color: !amount || parseFloat(amount) <= 0 ? "var(--text-dim)" : "var(--bg)",
                      border: "none",
                      fontSize: "13px",
                      fontFamily: "monospace",
                      fontWeight: 600,
                      cursor: !amount || parseFloat(amount) <= 0 ? "not-allowed" : "pointer",
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    {txStatus === "simulating"
                      ? "Simulating..."
                      : txStatus === "signing"
                      ? "Sign in Freighter..."
                      : txStatus === "submitted"
                      ? "Confirming on Soroban..."
                      : tab === "deposit"
                      ? "Deposit USDC"
                      : "Withdraw USDC"}
                  </button>

                  {!VAULT_CONTRACT && (
                    <div style={{
                      fontSize: "10px", color: "var(--amber)", fontFamily: "monospace",
                      marginTop: "8px", textAlign: "center",
                    }}>
                      Vault contract not deployed yet. Set NEXT_PUBLIC_VAULT_CONTRACT to enable transactions.
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Contract Info */}
          <div
            style={{
              border: "1px solid var(--border)",
              borderRadius: "4px",
              padding: "16px",
              marginTop: "16px",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div style={{ fontSize: "11px", color: "var(--text-dim)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "8px" }}>
              CONTRACT INFO
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {[
                { label: "Network", value: "Soroban Testnet" },
                { label: "Asset", value: "USDC (test token)" },
                { label: "Vault Contract", value: VAULT_CONTRACT ? shortAddr(VAULT_CONTRACT) : "Not deployed" },
                { label: "Min Deposit", value: "1.00 USDC" },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "11px", color: "var(--text-dim)", fontFamily: "monospace" }}>{label}</span>
                  <span style={{ fontSize: "11px", color: "var(--text)", fontFamily: "monospace" }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
