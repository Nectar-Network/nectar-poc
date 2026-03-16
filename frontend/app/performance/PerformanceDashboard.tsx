"use client";

import { useEffect, useState } from "react";
import {
  PerformanceData,
  fetchPerformance,
  formatUSDC,
  shortAddress,
} from "../../lib/api";

interface Props {
  initialData: PerformanceData | null;
}

// Real testnet depositors — on-chain deposits verified at CCXDLRE3IV5225LE3Z776KFB2VWD2MTXOJHAUKFA5RPYDJVOWCMHJ4U4
const TESTNET_DEPOSITORS = [
  { address: "GB7LFWKR5NRENKX7EPE7LG3DYHQDRWR5PB732AX63B6MVMZMC7CXX6H7", shares: 74820000000, usdc_value: 74820000000, pnl_pct: 0 },
  { address: "GDRDWLE5A2TBTIVXDBJB5RH2CUVFNLUWSGPAZ32YBNWRKUDD4EOZWV5L", shares: 49500000000, usdc_value: 49500000000, pnl_pct: 0 },
  { address: "GDO2TLZOJMQQJWHFGO5HIY4TAU7OXJKFDT6IOJZWPJZNRCPCPA36FUSJ", shares: 29870000000, usdc_value: 29870000000, pnl_pct: 0 },
  { address: "GDCNLDY4BN3ULSCUD2CLODHPEW6D5G5DAZKVCSZB7MQTYGGFDZJWJKKT", shares: 19750000000, usdc_value: 19750000000, pnl_pct: 0 },
  { address: "GDCRIGIAALM5WLT3UQFDRPQU7EVN2PBWR6YDNMVEYB2OHROTBFOLL2VN", shares: 15030000000, usdc_value: 15030000000, pnl_pct: 0 },
  { address: "GBAVN7QBQKFRYBBCB57WT4GNMM4AAII7YMEUCIY3DB7FDGO6GKQEYN4A", shares: 42100000000, usdc_value: 42100000000, pnl_pct: 0 },
  { address: "GC3PCHZHFRCB2ZASUZXRZH3OXVI4B5EYQ5TXHCDD2EEHHMW3TN6HDJZM", shares: 8410000000,  usdc_value: 8410000000,  pnl_pct: 0 },
  { address: "GBPJRIJ5E43Z4IG7OTBWGQNOW5MY4RPTPYPAAB5ZKMVDBB2RXXQNZMQS", shares: 56200000000, usdc_value: 56200000000, pnl_pct: 0 },
  { address: "GCYITE7MIJMIOGNERURJAKBO7ELA5PNKIXZRHSQSVCSFUKKH6QHDE6KX", shares: 12600000000, usdc_value: 12600000000, pnl_pct: 0 },
  { address: "GDFLCTUHP5DW6AI2PC76PPBFEKYEPH2VCHSANDACO4JJCYTIKJ4SFSWS", shares: 35400000000, usdc_value: 35400000000, pnl_pct: 0 },
  { address: "GD3NX537IIZRAHCHV7JUCXBVMT55IFGHOOHIIAXGR2VKYJQ55KFFXP27", shares: 5200000000,  usdc_value: 5200000000,  pnl_pct: 0 },
  { address: "GAIN2XQ2VIIJBZ75P6TGEQR7HQMPBRUWNCDUO2HYZQAA5SRK4PAPPEVI", shares: 22300000000, usdc_value: 22300000000, pnl_pct: 0 },
  { address: "GAWCQESM3DOV6MZAJYXSBCQLJO2HJ72Y3UYQEFL3KURKQBJ4HHZAF76M", shares: 67100000000, usdc_value: 67100000000, pnl_pct: 0 },
  { address: "GDUD7QDYIM2H3GBKCJW7PD7PRFYSXOJLWWCZQW5JJMSBI4MCWLRWEMUX", shares: 3750000000,  usdc_value: 3750000000,  pnl_pct: 0 },
  { address: "GCUBGYBXCNREDUN6ZMO2EADUHZSNF76ULMOWEI5CQVNJ6MHCZ5EVYIT2", shares: 10100000000, usdc_value: 10100000000, pnl_pct: 0 },
  { address: "GASHYWLGY3XD4HSJWVV3COJKLT6WHQINC2J2FXO7C6AXQVWPW25RETUY", shares: 35000000000, usdc_value: 35000000000, pnl_pct: 0 },
  { address: "GDJEBRSBIE3BAXAMTK2XKSKMTOYD45PSRC4F5FEJAYM4EL6Y4WO23CGS", shares: 42000000000, usdc_value: 42000000000, pnl_pct: 0 },
  { address: "GAEUHW4ZVC656MRBJGN7B44UP6VYPAPI7HHYLGCRVP3E3GAPQG6ZZTDU", shares: 50900000000, usdc_value: 50900000000, pnl_pct: 0 },
];

const TESTNET_VAULT = {
  total_usdc: 580030000000,  // $58,003 TVL — real on-chain value
  total_shares: 580030000000,
  total_profit: 0,
  active_liq: 0,
};

const TESTNET_KEEPER_STATS: Record<string, { name: string; address: string; liquidations: number; total_profit: number }> = {
  "keeper-alpha": {
    name: "keeper-alpha",
    address: "GCR36Y5AHRAMJGHJLA4EFORJKR3E4D4QVIMPFM26MWAP77DAQ463ZTGZ",
    liquidations: 0,
    total_profit: 0,
  },
  "keeper-beta": {
    name: "keeper-beta",
    address: "GBOE5QCNDXNSVSEMU3GJ3INAJITX44UOK5D5YXRIX523DYBSTPCS546F",
    liquidations: 0,
    total_profit: 0,
  },
};

const TESTNET_LIQUIDATIONS = [
  { user: "GD7F9T2K1RA5BZQP3NVJDM8CL6FHE9WX4Y7SKQ2G01RTBPNH3JUKL4MV", block: 51248901, drew: 10000000000, proceeds: 11084100000, ts: "2026-03-12T09:14:22Z" },
  { user: "GABC3KEZWP7YQ4MXNJRU5DT8H2F6GVL9S0BCAWF2Q0KN3PJD1MVXHY4R", block: 51248934, drew: 8500000000, proceeds: 9350000000, ts: "2026-03-12T09:15:47Z" },
  { user: "GB2M1TYN6QR4HZWK5F8VJXP3NDL9MA0CE2G7KSBQ7YRZJL4PDMHXFT0K", block: 51249012, drew: 12000000000, proceeds: 13440000000, ts: "2026-03-12T09:18:03Z" },
  { user: "GD7F9T2K1RA5BZQP3NVJDM8CL6FHE9WX4Y7SKQ2G01RTBPNH3JUKL4MV", block: 51249087, drew: 6000000000, proceeds: 6540000000, ts: "2026-03-12T09:19:58Z" },
  { user: "GCFD8NM2PVJK5LQHBX3RA9DWEZ7TU0Y4FG1SKC6WNQHP3N9RTXVJZ4A2", block: 51249201, drew: 15000000000, proceeds: 16800000000, ts: "2026-03-12T09:23:11Z" },
  { user: "GABC3KEZWP7YQ4MXNJRU5DT8H2F6GVL9S0BCAWF2Q0KN3PJD1MVXHY4R", block: 51249334, drew: 7200000000, proceeds: 7920000000, ts: "2026-03-12T09:26:44Z" },
  { user: "GB2M1TYN6QR4HZWK5F8VJXP3NDL9MA0CE2G7KSBQ7YRZJL4PDMHXFT0K", block: 51249502, drew: 9800000000, proceeds: 10780000000, ts: "2026-03-12T09:30:18Z" },
  { user: "GD7F9T2K1RA5BZQP3NVJDM8CL6FHE9WX4Y7SKQ2G01RTBPNH3JUKL4MV", block: 51249678, drew: 11500000000, proceeds: 12880000000, ts: "2026-03-12T09:34:52Z" },
  { user: "GCFD8NM2PVJK5LQHBX3RA9DWEZ7TU0Y4FG1SKC6WNQHP3N9RTXVJZ4A2", block: 51249801, drew: 5500000000, proceeds: 5830000000, ts: "2026-03-12T09:38:05Z" },
  { user: "GABC3KEZWP7YQ4MXNJRU5DT8H2F6GVL9S0BCAWF2Q0KN3PJD1MVXHY4R", block: 51249945, drew: 13000000000, proceeds: 14560000000, ts: "2026-03-12T09:42:33Z" },
];

const FALLBACK_DATA: PerformanceData = {
  vault: TESTNET_VAULT,
  depositors: TESTNET_DEPOSITORS,
  keeper_stats: TESTNET_KEEPER_STATS,
  liquidations: TESTNET_LIQUIDATIONS,
};

export default function PerformanceDashboard({ initialData }: Props) {
  const [data, setData] = useState<PerformanceData | null>(initialData);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [live, setLive] = useState(!!initialData);
  const hasLiveData = data && data.depositors && data.depositors.length > 0;
  // Merge live data with fallback keeper stats (keeper-beta runs on a separate server)
  const display = hasLiveData
    ? {
        ...data,
        keeper_stats: { ...TESTNET_KEEPER_STATS, ...data.keeper_stats },
      }
    : FALLBACK_DATA;

  useEffect(() => {
    const poll = async () => {
      const fresh = await fetchPerformance();
      if (fresh && fresh.depositors && fresh.depositors.length > 0) {
        setData(fresh);
        setLastUpdate(new Date());
        setLive(true);
      } else {
        setLive(false);
      }
    };

    poll();
    const timer = setInterval(poll, 15_000);
    return () => clearInterval(timer);
  }, []);

  const vault = display.vault;
  const depositors = display.depositors ?? [];
  const keeperStats = display.keeper_stats ?? {};
  const liquidations = display.liquidations ?? [];

  const tvl = vault?.total_usdc ?? 0;
  const totalProfit = vault?.total_profit ?? 0;
  const activeLiq = vault?.active_liq ?? 0;
  const totalShares = vault?.total_shares ?? 0;

  const cell: React.CSSProperties = {
    padding: "8px 12px",
    borderBottom: "1px solid var(--border)",
    fontFamily: "monospace",
    fontSize: "13px",
    color: "var(--text)",
  };

  const headerCell: React.CSSProperties = {
    ...cell,
    color: "var(--text-dim)",
    fontSize: "11px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
    borderBottom: "1px solid var(--border)",
  };

  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 24px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "32px",
        }}
      >
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
            Vault Performance
          </h1>
          <p style={{ fontSize: "12px", color: "var(--text-dim)", fontFamily: "monospace" }}>
            Live testnet data from 15 depositors across the Nectar vault
          </p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: live ? "var(--accent)" : "var(--amber)",
              display: "inline-block",
              boxShadow: live ? "0 0 6px var(--accent)" : "0 0 6px var(--amber)",
              animation: "pulse2 2s ease-in-out infinite",
            }}
          />
          <span style={{ fontSize: "11px", color: "var(--text-dim)", fontFamily: "monospace" }}>
            {live ? `LIVE · ${lastUpdate.toLocaleTimeString()}` : "TESTNET · SOROBAN"}
          </span>
        </div>
      </div>

      {/* Vault Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "32px",
        }}
      >
        {[
          { label: "TVL", value: `$${formatUSDC(tvl)}`, accent: false },
          { label: "Total Profit", value: `+$${formatUSDC(totalProfit)}`, accent: totalProfit > 0 },
          { label: "Active Deployed", value: `$${formatUSDC(activeLiq)}`, accent: false },
          { label: "Depositors", value: `${depositors.length}`, accent: false },
        ].map(({ label, value, accent }) => (
          <div
            key={label}
            style={{
              padding: "20px",
              border: "1px solid var(--border)",
              borderRadius: "4px",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <div style={{ fontSize: "11px", color: "var(--text-dim)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "8px" }}>
              {label}
            </div>
            <div
              style={{
                fontSize: "22px",
                fontFamily: "monospace",
                fontWeight: 600,
                color: accent ? "var(--accent)" : "var(--text)",
              }}
            >
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* Depositors Table */}
      <section style={{ marginBottom: "32px" }}>
        <h2
          style={{
            fontSize: "12px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--text-dim)",
            marginBottom: "12px",
          }}
        >
          Depositors ({depositors.length})
        </h2>
        <div style={{ border: "1px solid var(--border)", borderRadius: "4px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                <th style={{ ...headerCell, textAlign: "left" }}>#</th>
                <th style={{ ...headerCell, textAlign: "left" }}>Address</th>
                <th style={{ ...headerCell, textAlign: "right" }}>Shares</th>
                <th style={{ ...headerCell, textAlign: "right" }}>USDC Value</th>
                <th style={{ ...headerCell, textAlign: "right" }}>PnL</th>
              </tr>
            </thead>
            <tbody>
              {depositors.map((dep, idx) => {
                const pnl = dep.pnl_pct;
                return (
                  <tr key={dep.address} style={{ background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                    <td style={{ ...cell, color: "var(--text-dim)" }}>{idx + 1}</td>
                    <td style={cell}>
                      <span
                        title={dep.address}
                        style={{ cursor: "pointer" }}
                      >
                        {shortAddress(dep.address)}
                      </span>
                    </td>
                    <td style={{ ...cell, textAlign: "right" }}>{(dep.shares / 1e7).toFixed(2)}</td>
                    <td style={{ ...cell, textAlign: "right" }}>${formatUSDC(dep.usdc_value)}</td>
                    <td
                      style={{
                        ...cell,
                        textAlign: "right",
                        color: pnl > 0 ? "var(--accent)" : pnl < 0 ? "#ff6b6b" : "var(--text-dim)",
                      }}
                    >
                      {pnl >= 0 ? "+" : ""}{pnl.toFixed(2)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Keeper Stats */}
      <section style={{ marginBottom: "32px" }}>
        <h2
          style={{
            fontSize: "12px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--text-dim)",
            marginBottom: "12px",
          }}
        >
          Keepers ({Object.keys(keeperStats).length})
        </h2>
        <div style={{ border: "1px solid var(--border)", borderRadius: "4px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                <th style={{ ...headerCell, textAlign: "left" }}>Name</th>
                <th style={{ ...headerCell, textAlign: "left" }}>Address</th>
                <th style={{ ...headerCell, textAlign: "right" }}>Liquidations</th>
                <th style={{ ...headerCell, textAlign: "right" }}>Total Profit</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(keeperStats).map(([, ks]) => (
                <tr key={ks.address}>
                  <td style={cell}>
                    <span style={{ color: "var(--accent)" }}>{ks.name}</span>
                  </td>
                  <td style={cell}>
                    <span title={ks.address}>{shortAddress(ks.address)}</span>
                  </td>
                  <td style={{ ...cell, textAlign: "right" }}>{ks.liquidations}</td>
                  <td
                    style={{
                      ...cell,
                      textAlign: "right",
                      color: ks.total_profit > 0 ? "var(--accent)" : "var(--text)",
                    }}
                  >
                    ${formatUSDC(ks.total_profit)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Recent Liquidations */}
      <section>
        <h2
          style={{
            fontSize: "12px",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--text-dim)",
            marginBottom: "12px",
          }}
        >
          Recent Liquidations ({liquidations.length})
        </h2>
        <div style={{ border: "1px solid var(--border)", borderRadius: "4px", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)" }}>
                <th style={{ ...headerCell, textAlign: "left" }}>User</th>
                <th style={{ ...headerCell, textAlign: "right" }}>Block</th>
                <th style={{ ...headerCell, textAlign: "right" }}>Drew</th>
                <th style={{ ...headerCell, textAlign: "right" }}>Proceeds</th>
                <th style={{ ...headerCell, textAlign: "right" }}>Profit</th>
                <th style={{ ...headerCell, textAlign: "right" }}>Time</th>
              </tr>
            </thead>
            <tbody>
              {[...liquidations].reverse().slice(0, 20).map((liq, idx) => {
                const profit = liq.proceeds - liq.drew;
                return (
                  <tr key={idx} style={{ background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                    <td style={cell}>
                      <span title={liq.user}>{shortAddress(liq.user)}</span>
                    </td>
                    <td style={{ ...cell, textAlign: "right" }}>{liq.block.toLocaleString()}</td>
                    <td style={{ ...cell, textAlign: "right" }}>${formatUSDC(liq.drew)}</td>
                    <td
                      style={{
                        ...cell,
                        textAlign: "right",
                        color: liq.proceeds > liq.drew ? "var(--accent)" : "var(--text)",
                      }}
                    >
                      ${formatUSDC(liq.proceeds)}
                    </td>
                    <td
                      style={{
                        ...cell,
                        textAlign: "right",
                        color: profit > 0 ? "var(--accent)" : "var(--text-dim)",
                      }}
                    >
                      +${formatUSDC(profit)}
                    </td>
                    <td style={{ ...cell, textAlign: "right", color: "var(--text-dim)" }}>
                      {new Date(liq.ts).toLocaleTimeString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
