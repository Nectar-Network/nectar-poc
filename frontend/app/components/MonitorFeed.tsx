"use client";

import { useEffect, useState } from "react";
import { fetchState, PosRow } from "../../lib/api";

const FALLBACK: PosRow[] = [
  { address: "GD7F9…2K1R", hf: 1.847 },
  { address: "GABC3…F2Q0", hf: 1.203 },
  { address: "GB2M1…7YRZ", hf: 1.056 },
  { address: "GCFD8…P3N9", hf: 2.341 },
];

function hfColor(hf: number): string {
  if (hf < 1.0) return "var(--red)";
  if (hf < 1.2) return "var(--amber)";
  return "var(--text-dim)";
}

function hfLabel(hf: number): string {
  if (hf < 1.0) return "LIQUIDATABLE";
  if (hf < 1.2) return "AT RISK";
  return "healthy";
}

function shortAddr(addr: string): string {
  if (addr.length > 10) return addr.slice(0, 6) + "…" + addr.slice(-4);
  return addr;
}

export default function MonitorFeed() {
  const [positions, setPositions] = useState<PosRow[]>(FALLBACK);
  const [live, setLive] = useState(false);

  useEffect(() => {
    const load = () =>
      fetchState().then((s) => {
        if (s?.positions && s.positions.length > 0) {
          setPositions(s.positions);
          setLive(true);
        } else {
          // drift simulation for fallback
          setPositions((prev) =>
            prev.map((p) => ({
              ...p,
              hf: Math.max(0.7, p.hf + (Math.random() - 0.52) * 0.03),
            }))
          );
        }
      });

    load();
    const id = setInterval(load, 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <section
      className="py-24 px-6"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between mb-12">
          <div>
            <p
              className="text-xs font-mono mb-2"
              style={{ color: "var(--text-dim)", letterSpacing: "0.12em" }}
            >
              MONITOR
            </p>
            <h2
              className="font-syne font-700"
              style={{ fontSize: "clamp(1.4rem, 3vw, 2rem)", color: "var(--text)" }}
            >
              Pool Position Health
            </h2>
          </div>
          <div
            className="text-xs font-mono flex items-center gap-2"
            style={{ color: "var(--text-dim)" }}
          >
            <span
              className="status-dot"
              style={{ background: live ? "var(--accent)" : "var(--amber)" }}
            />
            <span>{live ? "live data · polling 10s" : "simulated · no keeper connected"}</span>
          </div>
        </div>

        <div className="border" style={{ borderColor: "var(--border)" }}>
          <div
            className="grid grid-cols-3 px-4 py-3 text-xs font-mono border-b"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface)",
              color: "var(--text-dim)",
              letterSpacing: "0.08em",
            }}
          >
            <span>ADDRESS</span>
            <span>HEALTH FACTOR</span>
            <span>STATUS</span>
          </div>

          {positions.map((p, i) => (
            <div
              key={i}
              className="grid grid-cols-3 px-4 py-4 text-xs font-mono border-b last:border-b-0 transition-all duration-500"
              style={{
                borderColor: "var(--border)",
                background: p.hf < 1.0 ? "rgba(239,68,68,0.04)" : "transparent",
              }}
            >
              <span style={{ color: "var(--accent)" }}>{shortAddr(p.address)}</span>
              <span className="flex items-center gap-2">
                <span
                  style={{
                    color: hfColor(p.hf),
                    fontVariantNumeric: "tabular-nums",
                    transition: "color 0.5s ease",
                  }}
                >
                  {p.hf.toFixed(4)}
                </span>
                {p.hf < 1.2 && (
                  <span
                    className="px-1.5 py-0.5 text-xs"
                    style={{
                      background: p.hf < 1.0 ? "rgba(239,68,68,0.15)" : "rgba(245,158,11,0.15)",
                      color: hfColor(p.hf),
                    }}
                  >
                    {hfLabel(p.hf)}
                  </span>
                )}
              </span>
              <span style={{ color: "var(--text-dim)" }}>{hfLabel(p.hf)}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
