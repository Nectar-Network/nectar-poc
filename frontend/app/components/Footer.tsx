"use client";

export default function Footer() {
  return (
    <footer
      className="py-12 px-6"
      style={{ borderTop: "1px solid var(--border)" }}
    >
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <p
          className="text-xs font-mono"
          style={{ color: "var(--text-dim)" }}
        >
          Built on Soroban testnet · 29projects Lab · MIT License
        </p>
        <div className="flex items-center gap-6 text-xs font-mono">
          {[
            { label: "GitHub", href: "https://github.com/nectar-network/nectar-poc" },
            { label: "SCF #42", href: "https://dashboard.communityfund.stellar.org" },
            { label: "Blend Protocol", href: "https://blend.capital" },
          ].map((link) => (
            <a
              key={link.label}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-colors duration-150"
              style={{ color: "var(--text-dim)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
            >
              {link.label}
            </a>
          ))}
        </div>
      </div>
    </footer>
  );
}
