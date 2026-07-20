"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/lib/app";
import { useI18n, type I18nKey } from "@/lib/i18n";

const NAV: { href: string; key: I18nKey }[] = [
  { href: "/command-centre", key: "nav.commandCentre" },
  { href: "/field/scan", key: "nav.scan" },
  { href: "/cases", key: "nav.cases" },
  { href: "/digital-twins", key: "nav.twins" },
  { href: "/expert", key: "nav.expert" },
  { href: "/outbreaks", key: "nav.outbreaks" },
  { href: "/missions", key: "nav.missions" },
  { href: "/support", key: "nav.support" },
  { href: "/governance", key: "nav.governance" },
  { href: "/integrations", key: "nav.integrations" },
  { href: "/demo", key: "nav.demo" },
];

export function Wordmark() {
  return (
    <Link href="/command-centre" className="flex items-center gap-2.5 shrink-0" aria-label="FarmGraph Rakshak home">
      <svg width="30" height="30" viewBox="0 0 100 100" aria-hidden="true">
        <rect width="100" height="100" rx="16" fill="#17233b" />
        <rect x="20" y="20" width="26" height="26" rx="4" fill="#2f7d3a" />
        <rect x="54" y="20" width="26" height="26" rx="4" fill="#3f9a4d" />
        <rect x="20" y="54" width="26" height="26" rx="4" fill="#2f7d3a" />
        <rect x="54" y="54" width="26" height="26" rx="4" fill="#e08a00" />
        <rect x="20" y="48.5" width="60" height="3" fill="#faf7f1" />
      </svg>
      <span className="leading-tight">
        <span className="block text-[15px] font-extrabold tracking-tight text-ink-900">
          FarmGraph <span className="text-leaf-700">Rakshak</span>
        </span>
        <span className="hidden md:block text-[10px] font-medium text-ink-500">Offline Crop Health &amp; Outbreak Intelligence Grid</span>
      </span>
    </Link>
  );
}

export function TopBar() {
  const pathname = usePathname();
  const app = useApp();
  const { t, locale, setLocale } = useI18n();

  const apiBadge =
    app.apiMode === "api-connected"
      ? { text: "API connected — demo provider active", cls: "bg-leaf-100 text-leaf-700 border-leaf-600/40" }
      : app.apiMode === "api-fallback"
        ? { text: "Demo provider (API unreachable)", cls: "bg-saffron-100 text-saffron-700 border-saffron-500/40" }
        : { text: "Demo provider (browser)", cls: "bg-ink-800/10 text-ink-800 border-ink-800/20" };

  return (
    <header className="sticky top-0 z-40 border-b border-sand-200 bg-sand-50/95 backdrop-blur no-print">
      <div className="mx-auto max-w-[1440px] px-3 sm:px-5">
        <div className="flex h-14 items-center gap-3">
          <Wordmark />
          <nav aria-label="Primary" className="flex-1 overflow-x-auto">
            <ul className="flex items-center gap-1 text-[13px] font-semibold">
              {NAV.map((n) => {
                const active = pathname === n.href || pathname.startsWith(n.href + "/");
                return (
                  <li key={n.href}>
                    <Link
                      href={n.href}
                      aria-current={active ? "page" : undefined}
                      className={`block rounded-lg px-2.5 py-2 whitespace-nowrap min-h-[40px] ${
                        active ? "bg-ink-900 text-sand-50" : "text-ink-700 hover:bg-sand-200"
                      }`}
                    >
                      {t(n.key)}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="flex items-center gap-2 shrink-0">
            <span className={`chip hidden lg:inline-flex ${apiBadge.cls}`} title={app.apiUrl}>
              {apiBadge.text}
            </span>
            <span
              className={`chip ${app.effectiveOnline ? "bg-leaf-100 text-leaf-700 border-leaf-600/40" : "bg-alert-100 text-alert-700 border-alert-600/40"}`}
              title={app.simulateOffline ? "Simulated offline for demo" : "Network status"}
            >
              <span aria-hidden="true">{app.effectiveOnline ? "●" : "○"}</span>
              {app.effectiveOnline ? t("common.online") : t("common.offline")}
              {app.pendingOutbox > 0 && (
                <span className="ml-1 rounded-full bg-saffron-500 px-1.5 text-[10px] font-bold text-ink-950">
                  {app.pendingOutbox} {t("common.pendingSync")}
                </span>
              )}
            </span>
            <label className="hidden sm:flex items-center gap-1 text-xs font-semibold text-ink-600">
              <span className="sr-only">Demo persona (not production authentication)</span>
              <select
                className="rounded-lg border border-sand-300 bg-white px-2 py-2 text-xs min-h-[40px]"
                value={app.persona.id}
                onChange={(e) => app.setPersonaId(e.target.value)}
                title="Demo persona switcher — not production authentication"
              >
                {app.personas.map((p) => (
                  <option key={p.id} value={p.id}>{p.label}</option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="btn-secondary !min-h-[40px] px-2.5 text-xs"
              onClick={() => setLocale(locale === "en" ? "hi" : "en")}
              aria-label="Switch language"
            >
              {t("common.language")}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
