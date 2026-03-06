export default function Architecture() {
  return (
    <section
      id="architecture"
      className="py-24 px-6"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <div className="max-w-6xl mx-auto">
        <p
          className="text-xs font-mono mb-12"
          style={{ color: "var(--text-dim)", letterSpacing: "0.12em" }}
        >
          ARCHITECTURE
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* SVG Diagram */}
          <div>
            <svg
              viewBox="0 0 480 320"
              width="100%"
              xmlns="http://www.w3.org/2000/svg"
              style={{ maxWidth: "560px" }}
            >
              <defs>
                <marker
                  id="arrow"
                  viewBox="0 0 10 10"
                  refX="10"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(220, 15%, 30%)" />
                </marker>
                <marker
                  id="arrow-accent"
                  viewBox="0 0 10 10"
                  refX="10"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto"
                >
                  <path d="M 0 0 L 10 5 L 0 10 z" fill="hsl(160, 90%, 52%)" />
                </marker>
              </defs>

              {/* On-chain label */}
              <text x="10" y="18" fill="hsl(220,10%,40%)" fontSize="9" fontFamily="DM Mono, monospace" letterSpacing="1.5">
                SOROBAN TESTNET
              </text>
              <rect x="8" y="24" width="270" height="120" rx="2" fill="none" stroke="hsl(220,15%,16%)" strokeWidth="1" />

              {/* KeeperRegistry box */}
              <rect x="20" y="38" width="110" height="88" rx="1" fill="hsl(220,12%,10%)" stroke="hsl(220,15%,20%)" strokeWidth="1" />
              <text x="75" y="58" textAnchor="middle" fill="hsl(220,20%,75%)" fontSize="9" fontFamily="DM Mono, monospace" fontWeight="500">KeeperRegistry</text>
              <text x="75" y="74" textAnchor="middle" fill="hsl(220,10%,40%)" fontSize="8" fontFamily="DM Mono, monospace">register()</text>
              <text x="75" y="87" textAnchor="middle" fill="hsl(220,10%,40%)" fontSize="8" fontFamily="DM Mono, monospace">deregister()</text>
              <text x="75" y="100" textAnchor="middle" fill="hsl(220,10%,40%)" fontSize="8" fontFamily="DM Mono, monospace">get_keepers()</text>
              <text x="75" y="113" textAnchor="middle" fill="hsl(220,10%,40%)" fontSize="8" fontFamily="DM Mono, monospace">pause()</text>

              {/* Blend Pool box */}
              <rect x="155" y="38" width="110" height="88" rx="1" fill="hsl(220,12%,10%)" stroke="hsl(220,15%,20%)" strokeWidth="1" />
              <text x="210" y="58" textAnchor="middle" fill="hsl(220,20%,75%)" fontSize="9" fontFamily="DM Mono, monospace" fontWeight="500">Blend Pool</text>
              <text x="210" y="74" textAnchor="middle" fill="hsl(220,10%,40%)" fontSize="8" fontFamily="DM Mono, monospace">new_auction()</text>
              <text x="210" y="87" textAnchor="middle" fill="hsl(220,10%,40%)" fontSize="8" fontFamily="DM Mono, monospace">submit()</text>
              <text x="210" y="100" textAnchor="middle" fill="hsl(220,10%,40%)" fontSize="8" fontFamily="DM Mono, monospace">get_positions()</text>

              {/* Oracle box */}
              <rect x="80" y="156" width="140" height="42" rx="1" fill="hsl(220,12%,10%)" stroke="hsl(38,40%,20%)" strokeWidth="1" />
              <text x="150" y="172" textAnchor="middle" fill="hsl(38,95%,55%)" fontSize="9" fontFamily="DM Mono, monospace">Mock Oracle</text>
              <text x="150" y="186" textAnchor="middle" fill="hsl(220,10%,40%)" fontSize="8" fontFamily="DM Mono, monospace">set_price(asset, price)</text>

              {/* Oracle → Blend arrow */}
              <line x1="210" y1="156" x2="210" y2="127" stroke="hsl(220,15%,30%)" strokeWidth="1" markerEnd="url(#arrow)" />
              <text x="216" y="145" fill="hsl(220,10%,35%)" fontSize="7" fontFamily="DM Mono, monospace">prices</text>

              {/* Off-chain label */}
              <text x="10" y="228" fill="hsl(220,10%,40%)" fontSize="9" fontFamily="DM Mono, monospace" letterSpacing="1.5">
                OFF-CHAIN
              </text>
              <rect x="8" y="234" width="462" height="80" rx="2" fill="none" stroke="hsl(220,15%,16%)" strokeWidth="1" />

              {/* Keeper A */}
              <rect x="20" y="248" width="200" height="56" rx="1" fill="hsl(220,12%,10%)" stroke="hsl(160,40%,22%)" strokeWidth="1" />
              <text x="120" y="264" textAnchor="middle" fill="hsl(160,90%,52%)" fontSize="9" fontFamily="DM Mono, monospace">Keeper #1 (keeper-alpha)</text>
              <text x="120" y="278" textAnchor="middle" fill="hsl(220,10%,40%)" fontSize="8" fontFamily="DM Mono, monospace">monitor → detect → fill</text>
              <text x="120" y="292" textAnchor="middle" fill="hsl(220,10%,40%)" fontSize="8" fontFamily="DM Mono, monospace">Operator A keypair</text>

              {/* Keeper B */}
              <rect x="248" y="248" width="200" height="56" rx="1" fill="hsl(220,12%,10%)" stroke="hsl(160,40%,22%)" strokeWidth="1" />
              <text x="348" y="264" textAnchor="middle" fill="hsl(160,90%,52%)" fontSize="9" fontFamily="DM Mono, monospace">Keeper #2 (keeper-beta)</text>
              <text x="348" y="278" textAnchor="middle" fill="hsl(220,10%,40%)" fontSize="8" fontFamily="DM Mono, monospace">monitor → detect → fill</text>
              <text x="348" y="292" textAnchor="middle" fill="hsl(220,10%,40%)" fontSize="8" fontFamily="DM Mono, monospace">Operator B keypair</text>

              {/* Keeper A → Registry */}
              <line x1="75" y1="234" x2="75" y2="127" stroke="hsl(160,90%,52%)" strokeWidth="1" strokeDasharray="4 3" markerEnd="url(#arrow-accent)" />

              {/* Keeper A → Blend Pool */}
              <line x1="140" y1="248" x2="200" y2="127" stroke="hsl(160,90%,52%)" strokeWidth="1" strokeDasharray="4 3" markerEnd="url(#arrow-accent)" />

              {/* Keeper B → Blend Pool */}
              <line x1="340" y1="248" x2="235" y2="127" stroke="hsl(160,90%,52%)" strokeWidth="1" strokeDasharray="4 3" markerEnd="url(#arrow-accent)" />
            </svg>
          </div>

          {/* Description */}
          <div className="space-y-6">
            {[
              {
                title: "KeeperRegistry",
                desc: "Soroban contract storing registered keeper operators. Any operator can self-register. Admin can pause in emergencies. On-chain source of truth for who is participating.",
              },
              {
                title: "Blend Pool Monitor",
                desc: "Each keeper independently polls the Blend pool for user health factors using PositionsEstimate. When HF drops below 1.0, both keepers detect it simultaneously.",
              },
              {
                title: "Auction Execution",
                desc: "Blend uses Dutch auctions — collateral lot grows over 200 blocks while bid cost decreases. Keepers evaluate profitability and fill when lot/bid ratio exceeds threshold.",
              },
              {
                title: "Multi-Operator Race",
                desc: "Both keepers submit fill transactions. One wins (first confirmed). The other handles the failure gracefully, logging 'already filled by another keeper'.",
              },
            ].map((item, i) => (
              <div key={i} className="border-l-2 pl-4" style={{ borderColor: "var(--border)" }}>
                <div
                  className="text-sm font-syne font-600 mb-1"
                  style={{ color: "var(--text)" }}
                >
                  {item.title}
                </div>
                <div
                  className="text-xs font-mono leading-relaxed"
                  style={{ color: "var(--text-dim)" }}
                >
                  {item.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
