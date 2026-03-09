"use client";

export default function FeaturesContent() {
  return (
    <div style={{ maxWidth: "1100px", margin: "0 auto", padding: "32px 24px" }}>
      {/* Header */}
      <div style={{ marginBottom: "48px" }}>
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
          How Nectar Works
        </h1>
        <p style={{ fontSize: "12px", color: "var(--text-dim)", fontFamily: "monospace", maxWidth: "600px", lineHeight: "1.6" }}>
          Nectar is a multi-operator keeper infrastructure for Blend Protocol on Stellar.
          It replaces single-bot liquidation systems with a distributed network of competing keepers,
          funded by a shared vault.
        </p>
      </div>

      {/* Core Features */}
      <div style={{ display: "flex", flexDirection: "column", gap: "48px" }}>

        {/* Feature 1: Vault */}
        <FeatureSection
          number="01"
          title="Nectar Vault"
          subtitle="Pooled Liquidation Capital"
          description="Users deposit USDC into the NectarVault smart contract on Soroban. This pooled capital is available for keepers to draw from when profitable liquidation opportunities arise. Depositors receive LP shares and earn yield from successful liquidations."
          details={[
            { label: "Contract", value: "NectarVault (Soroban/Rust)" },
            { label: "Asset", value: "USDC" },
            { label: "Share Model", value: "Pro-rata LP shares" },
            { label: "Yield Source", value: "10% profit from each liquidation" },
          ]}
          actions={[
            { label: "Deposit USDC", href: "/vault", primary: true },
            { label: "View Performance", href: "/performance", primary: false },
          ]}
        />

        {/* Feature 2: Keeper Registry */}
        <FeatureSection
          number="02"
          title="Keeper Registry"
          subtitle="Decentralized Operator Network"
          description="Any operator can register as a keeper by calling the KeeperRegistry contract. Registered keepers independently monitor the Blend pool, detect liquidation opportunities, and compete to fill auctions. The admin can pause the registry in emergencies."
          details={[
            { label: "Contract", value: "KeeperRegistry (Soroban/Rust)" },
            { label: "Registration", value: "Permissionless self-registration" },
            { label: "Current Keepers", value: "2 (alpha + beta)" },
            { label: "Safety", value: "Admin emergency pause" },
          ]}
          codeSnippet={`// Register as a keeper operator
soroban contract invoke \\
  --id $REGISTRY_CONTRACT \\
  -- register \\
  --keeper $YOUR_ADDRESS \\
  --name "my-keeper"`}
        />

        {/* Feature 3: Liquidation Engine */}
        <FeatureSection
          number="03"
          title="Liquidation Engine"
          subtitle="Dutch Auction Monitoring & Execution"
          description="Keepers poll the Blend pool every few seconds for positions with health factor below 1.0. When found, they create an auction and evaluate profitability using the Dutch auction mechanics — collateral lot grows over 200 blocks while bid cost decreases. Keepers fill when the lot/bid ratio exceeds their threshold."
          details={[
            { label: "Protocol", value: "Blend Protocol Dutch Auctions" },
            { label: "Duration", value: "200 blocks (~16 minutes)" },
            { label: "HF Threshold", value: "< 1.0 triggers liquidation" },
            { label: "Profit Model", value: "Lot/bid ratio evaluation" },
          ]}
          flow={[
            "Monitor positions (poll every 5s)",
            "Detect HF < 1.0",
            "Create auction on Blend pool",
            "Evaluate lot/bid profitability",
            "Draw capital from NectarVault",
            "Fill auction (submit bid)",
            "Return capital + profit to vault",
          ]}
        />

        {/* Feature 4: Multi-Operator Competition */}
        <FeatureSection
          number="04"
          title="Multi-Operator Competition"
          subtitle="No Single Point of Failure"
          description="Multiple keepers detect and attempt to fill the same auction simultaneously. The first confirmed transaction wins. Others gracefully handle the 'already filled' response. This ensures liquidations happen even if one operator goes offline — the core innovation over single-bot systems."
          details={[
            { label: "Race Resolution", value: "First-confirmed wins" },
            { label: "Failure Handling", value: "Graceful ErrAlreadyFilled" },
            { label: "Capital Safety", value: "Drawn USDC returned on loss" },
            { label: "Redundancy", value: "N operators, any 1 suffices" },
          ]}
        />

        {/* Feature 5: Real-time Monitoring */}
        <FeatureSection
          number="05"
          title="Real-time Dashboard"
          subtitle="Live Keeper & Vault Monitoring"
          description="The frontend connects to the keeper API via Server-Sent Events (SSE) for real-time log streaming and polls REST endpoints for state updates. Monitor vault TVL, depositor positions, keeper stats, and liquidation history — all updating live."
          details={[
            { label: "Transport", value: "SSE + REST polling" },
            { label: "Metrics", value: "Prometheus /metrics endpoint" },
            { label: "Dashboard", value: "Performance + live log stream" },
            { label: "Max SSE Clients", value: "100 concurrent" },
          ]}
          actions={[
            { label: "View Dashboard", href: "/", primary: true },
            { label: "Performance", href: "/performance", primary: false },
          ]}
        />
      </div>

      {/* Getting Started */}
      <div
        style={{
          marginTop: "64px",
          border: "1px solid var(--border)",
          borderRadius: "4px",
          padding: "32px",
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <div style={{ fontSize: "11px", color: "var(--text-dim)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "24px" }}>
          GETTING STARTED
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "24px" }}>
          <GettingStartedCard
            title="As a Depositor"
            steps={[
              "Connect your Stellar wallet (Freighter/Albedo/xBull)",
              "Navigate to Vault → Deposit",
              "Enter USDC amount and confirm transaction",
              "Monitor your PnL on the Performance page",
              "Withdraw anytime by redeeming shares",
            ]}
          />
          <GettingStartedCard
            title="As a Keeper Operator"
            steps={[
              "Clone the repo and configure .env with your keypair",
              "Register on-chain: soroban contract invoke -- register",
              "Run the keeper binary: go run ./keeper",
              "Monitor via the dashboard or /metrics endpoint",
              "Compete for liquidation profits automatically",
            ]}
          />
          <GettingStartedCard
            title="Self-Host Everything"
            steps={[
              "Run scripts/testnet-setup.sh to provision wallets",
              "Deploy contracts with scripts/deploy.sh",
              "docker-compose up to launch keepers + frontend",
              "Seed vault with scripts/seed-vault.sh",
              "Monitor at localhost:3000",
            ]}
          />
        </div>
      </div>
    </div>
  );
}

function FeatureSection({
  number,
  title,
  subtitle,
  description,
  details,
  codeSnippet,
  flow,
  actions,
}: {
  number: string;
  title: string;
  subtitle: string;
  description: string;
  details: { label: string; value: string }[];
  codeSnippet?: string;
  flow?: string[];
  actions?: { label: string; href: string; primary: boolean }[];
}) {
  return (
    <div style={{ borderTop: "1px solid var(--border)", paddingTop: "32px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "32px" }}>
        {/* Left */}
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: "12px", marginBottom: "8px" }}>
            <span style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--accent)" }}>{number}</span>
            <h2 style={{ fontFamily: "var(--font-syne)", fontSize: "18px", fontWeight: 700, color: "var(--text)" }}>
              {title}
            </h2>
          </div>
          <div style={{ fontSize: "12px", fontFamily: "monospace", color: "var(--accent)", marginBottom: "12px" }}>
            {subtitle}
          </div>
          <p style={{ fontSize: "13px", fontFamily: "monospace", color: "var(--text-dim)", lineHeight: "1.7", marginBottom: "16px" }}>
            {description}
          </p>
          {actions && (
            <div style={{ display: "flex", gap: "8px" }}>
              {actions.map((a) => (
                <a
                  key={a.label}
                  href={a.href}
                  style={{
                    padding: "8px 16px",
                    fontSize: "12px",
                    fontFamily: "monospace",
                    textDecoration: "none",
                    border: a.primary ? "1px solid var(--accent)" : "1px solid var(--border)",
                    background: a.primary ? "var(--accent)" : "transparent",
                    color: a.primary ? "var(--bg)" : "var(--text-dim)",
                  }}
                >
                  {a.label}
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Right */}
        <div>
          {/* Details grid */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "8px",
              marginBottom: codeSnippet || flow ? "16px" : "0",
            }}
          >
            {details.map(({ label, value }) => (
              <div
                key={label}
                style={{
                  padding: "10px 12px",
                  border: "1px solid var(--border)",
                  borderRadius: "2px",
                  background: "rgba(255,255,255,0.02)",
                }}
              >
                <div style={{ fontSize: "10px", color: "var(--text-dim)", fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "2px" }}>
                  {label}
                </div>
                <div style={{ fontSize: "12px", color: "var(--text)", fontFamily: "monospace" }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          {/* Code Snippet */}
          {codeSnippet && (
            <div
              style={{
                padding: "12px 16px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "2px",
                overflow: "auto",
              }}
            >
              <pre style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--text-dim)", margin: 0, whiteSpace: "pre-wrap" }}>
                {codeSnippet}
              </pre>
            </div>
          )}

          {/* Flow */}
          {flow && (
            <div
              style={{
                padding: "12px 16px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: "2px",
              }}
            >
              {flow.map((step, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: i < flow.length - 1 ? "6px" : 0 }}>
                  <span style={{ fontSize: "10px", fontFamily: "monospace", color: "var(--accent)" }}>
                    {i < flow.length - 1 ? "├" : "└"}
                  </span>
                  <span style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--text-dim)" }}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GettingStartedCard({ title, steps }: { title: string; steps: string[] }) {
  return (
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "4px",
        padding: "20px",
        background: "rgba(255,255,255,0.02)",
      }}
    >
      <div style={{ fontSize: "13px", fontFamily: "monospace", color: "var(--text)", fontWeight: 600, marginBottom: "12px" }}>
        {title}
      </div>
      <ol style={{ margin: 0, paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
        {steps.map((step, i) => (
          <li key={i} style={{ fontSize: "11px", fontFamily: "monospace", color: "var(--text-dim)", lineHeight: "1.5" }}>
            {step}
          </li>
        ))}
      </ol>
    </div>
  );
}
