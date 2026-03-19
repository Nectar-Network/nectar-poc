"use client";

import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { label: "Features", href: "/features" },
  { label: "Vault", href: "/vault" },
  { label: "Performance", href: "/performance" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4"
      style={{
        background: "rgba(10, 11, 14, 0.85)",
        backdropFilter: "blur(12px)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div className="flex items-center gap-3">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <polygon
            points="12,2 22,7 22,17 12,22 2,17 2,7"
            stroke="var(--accent)"
            strokeWidth="1.5"
            fill="none"
          />
          <circle cx="12" cy="12" r="3" fill="var(--accent)" />
        </svg>
        <a
          href="/"
          className="font-syne font-700 tracking-widest text-sm"
          style={{ color: "var(--text)", letterSpacing: "0.2em", textDecoration: "none" }}
        >
          NECTAR
        </a>
      </div>

      <div className="flex items-center gap-5">
        {NAV_LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <a
              key={link.href}
              href={link.href}
              className="text-xs font-mono transition-colors duration-200"
              style={{
                color: active ? "var(--accent)" : "var(--text-dim)",
                borderBottom: active ? "1px solid var(--accent)" : "1px solid transparent",
                paddingBottom: "2px",
              }}
              onMouseEnter={(e) => {
                if (!active) e.currentTarget.style.color = "var(--text)";
              }}
              onMouseLeave={(e) => {
                if (!active) e.currentTarget.style.color = "var(--text-dim)";
              }}
            >
              {link.label}
            </a>
          );
        })}
        <a
          href="https://x.com/nectar_xlm"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono transition-colors duration-200"
          style={{ color: "var(--text-dim)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
        >
          Twitter
        </a>
        <a
          href="https://github.com/nectar-network/nectar-poc"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-mono transition-colors duration-200"
          style={{ color: "var(--text-dim)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-dim)")}
        >
          GitHub
        </a>
      </div>
    </nav>
  );
}
