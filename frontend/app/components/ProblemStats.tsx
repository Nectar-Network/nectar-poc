const stats = [
  {
    value: "$10.8M",
    label: "liquidation value",
    note: "Feb 22, 2026 YieldBlox exploit — USTRY/XLM oracle manipulation",
    color: "var(--red)",
  },
  {
    value: "2 bots",
    label: "captured majority",
    note: "Single-operator bots pre-positioned. No coordinated keeper response.",
    color: "var(--amber)",
  },
  {
    value: "60",
    label: "auction fills",
    note: "Over ~4 hours. One Docker container, one private key, no fallback.",
    color: "var(--text)",
  },
];

export default function ProblemStats() {
  return (
    <section
      className="py-24 px-6"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <div className="max-w-6xl mx-auto">
        <p
          className="stagger-1 text-xs font-mono mb-12"
          style={{ color: "var(--text-dim)", letterSpacing: "0.12em" }}
        >
          THE PROBLEM
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
          {stats.map((s, i) => (
            <div
              key={i}
              className="py-8 pr-8 border-b md:border-b-0 md:border-r last:border-r-0 last:border-b-0"
              style={{ borderColor: "var(--border)" }}
            >
              <div
                className="font-syne font-700 mb-2"
                style={{
                  fontSize: "clamp(2.2rem, 5vw, 3.5rem)",
                  color: s.color,
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {s.value}
              </div>
              <div
                className="text-sm font-mono mb-3"
                style={{ color: "var(--text)" }}
              >
                {s.label}
              </div>
              <div
                className="text-xs font-mono leading-relaxed"
                style={{ color: "var(--text-dim)", maxWidth: "260px" }}
              >
                {s.note}
              </div>
            </div>
          ))}
        </div>

        <div
          className="mt-12 p-6 border"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <p
            className="text-sm font-mono leading-relaxed"
            style={{ color: "var(--text-dim)" }}
          >
            <span style={{ color: "var(--amber)" }}>→ </span>
            Stellar DeFi (~$187M TVL) relies on single-operator bots for critical automation.
            Blend&apos;s liquidation bot is explicitly disclaimed as{" "}
            <span style={{ color: "var(--text)" }}>
              &quot;not guaranteed to be profitable and may result in financial loss&quot;
            </span>
            . Nectar distributes keeper responsibility across competing operators.
          </p>
        </div>
      </div>
    </section>
  );
}
