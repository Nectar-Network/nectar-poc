const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export interface KeeperRow {
  name: string;
  address: string;
  active: boolean;
}

export interface PosRow {
  address: string;
  hf: number;
}

export interface VaultState {
  total_usdc: number;
  total_shares: number;
  total_profit: number;
  active_liq: number;
}

export interface AppState {
  keepers: KeeperRow[];
  positions: PosRow[];
  events: string[];
  vault: VaultState | null;
}

export interface DepositorRow {
  address: string;
  shares: number;
  usdc_value: number;
  pnl_pct: number;
}

export interface KeeperStat {
  name: string;
  address: string;
  liquidations: number;
  total_profit: number;
}

export interface LiquidationRecord {
  user: string;
  block: number;
  drew: number;
  proceeds: number;
  ts: string;
}

export interface PerformanceData {
  vault: VaultState | null;
  depositors: DepositorRow[];
  keeper_stats: Record<string, KeeperStat>;
  liquidations: LiquidationRecord[];
}

export async function fetchState(): Promise<AppState | null> {
  try {
    const res = await fetch(`${API_URL}/api/state`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function fetchPerformance(): Promise<PerformanceData | null> {
  try {
    const res = await fetch(`${API_URL}/api/performance`, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export function apiUrl(): string {
  return API_URL;
}

/** Format a stroop amount (7 decimals) as a USDC dollar string */
export function formatUSDC(stroops: number): string {
  return (stroops / 1e7).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Shorten a Stellar address for display */
export function shortAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 4)}…${addr.slice(-4)}`;
}
