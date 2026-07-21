"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/lib/app";
import { useI18n, type I18nKey } from "@/lib/i18n";

const PRIMARY_NAV: { href: string; key: I18nKey }[] = [
  { href: "/command-centre", key: "nav.commandCentre" },
  { href: "/field/scan", key: "nav.scan" },
  { href: "/cases", key: "nav.cases" },
  { href: "/outbreaks", key: "nav.outbreaks" },
];

const SECONDARY_NAV: { href: string; key: I18nKey }[] = [
  { href: "/digital-twins", key: "nav.twins" },
  { href: "/expert", key: "nav.expert" },
  { href: "/missions", key: "nav.missions" },
  { href: "/support", key: "nav.support" },
  { href: "/learning", key: "nav.learning" },
  { href: "/governance", key: "nav.governance" },
  { href: "/integrations", key: "nav.integrations" },
];

export function Wordmark() {
  return (
    <Link href="/command-centre" className="flex shrink-0 items-center gap-2.5" aria-label="FarmGraph Rakshak home">
      <svg width="34" height="34" viewBox="0 0 100 100" aria-hidden="true" className="shadow-sm">
        <rect width="100" height="100" rx="22" fill="#17233b" />
        <path d="M22 67V35l28-15 28 15v32L50 82 22 67Z" fill="none" stroke="#f4efe3" strokeWidth="5" />
        <path d="M35 57c8-20 20-20 30-1-8 17-22 19-30 1Z" fill="#3f9a4d" />
        <path d="M50 42v28" stroke="#f4efe3" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <span className="leading-tight">
        <span className="block text-[15px] font-extrabold tracking-tight text-ink-950">
          FarmGraph <span className="text-leaf-700">Rakshak</span>
        </span>
        <span className="hidden text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-400 sm:block">
          Rajasthan crop response grid
        </span>
      </span>
    </Link>
  );
}

export function TopBar() {
  const pathname = usePathname();
  const app = useApp();
  const { t, locale, setLocale } = useI18n();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeFor = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const status = app.apiMode === "api-connected"
    ? { label: "Connected", dot: "bg-leaf-500", text: "text-leaf-700" }
    : app.apiMode === "api-fallback"
      ? { label: "Fallback", dot: "bg-saffron-500", text: "text-saffron-700" }
      : { label: "Demo", dot: "bg-ink-400", text: "text-ink-600" };

  return (
    <header className="sticky top-0 z-40 border-b border-sand-200/80 bg-white/95 shadow-[0_1px_10px_rgba(16,26,46,0.04)] backdrop-blur no-print">
      <div className="mx-auto max-w-[1480px] px-3 sm:px-5">
        <div className="flex h-16 items-center gap-4">
          <Wordmark />

          <nav aria-label="Primary" className="hidden flex-1 items-center justify-center gap-1 lg:flex">
            {PRIMARY_NAV.map((item) => {
              const active = activeFor(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-xl px-3 py-2 text-[13px] font-bold transition-colors ${
                    active ? "bg-ink-900 text-white" : "text-ink-600 hover:bg-sand-100 hover:text-ink-950"
                  }`}
                >
                  {t(item.key)}
                </Link>
              );
            })}

            <details className="group relative">
              <summary className="cursor-pointer list-none rounded-xl px-3 py-2 text-[13px] font-bold text-ink-600 hover:bg-sand-100 hover:text-ink-950">
                More <span aria-hidden="true" className="ml-1 text-ink-400">⌄</span>
              </summary>
              <div className="absolute left-1/2 top-12 w-[380px] -translate-x-1/2 rounded-2xl border border-sand-200 bg-white p-3 shadow-[0_18px_50px_rgba(16,26,46,0.16)]">
                <div className="grid grid-cols-2 gap-1">
                  {SECONDARY_NAV.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={`rounded-xl px-3 py-2.5 text-sm font-semibold ${activeFor(item.href) ? "bg-sand-100 text-ink-950" : "text-ink-600 hover:bg-sand-50 hover:text-ink-950"}`}
                    >
                      {t(item.key)}
                    </Link>
                  ))}
                  <Link
                    href="/release-proof"
                    className={`col-span-2 mt-1 rounded-xl border px-3 py-2.5 text-sm font-bold ${activeFor("/release-proof") ? "border-saffron-500 bg-saffron-100 text-saffron-700" : "border-saffron-500/40 bg-saffron-50 text-saffron-700 hover:bg-saffron-100"}`}
                  >
                    Connected evidence proof →
                  </Link>
                </div>
                <div className="mt-3 border-t border-sand-200 pt-3">
                  <label className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-ink-400">Demo role</label>
                  <select
                    className="mt-1 w-full rounded-xl border border-sand-300 bg-white px-3 py-2 text-sm font-semibold text-ink-800"
                    value={app.persona.id}
                    onChange={(e) => app.setPersonaId(e.target.value)}
                    title="Demo persona switcher — not production authentication"
                  >
                    {app.personas.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                  </select>
                </div>
              </div>
            </details>
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2">
            <span className={`hidden items-center gap-2 rounded-full border border-sand-200 bg-sand-50 px-3 py-1.5 text-xs font-bold md:inline-flex ${status.text}`} title={app.apiUrl}>
              <span className={`h-2 w-2 rounded-full ${status.dot}`} aria-hidden="true" />
              {status.label}
              {app.pendingOutbox > 0 && <span className="text-saffron-700">· {app.pendingOutbox} pending</span>}
            </span>

            <Link href="/demo" className="hidden rounded-xl bg-saffron-500 px-3.5 py-2 text-sm font-extrabold text-ink-950 shadow-sm transition hover:bg-saffron-600 sm:inline-flex">
              Run demo
            </Link>

            <button
              type="button"
              className="rounded-xl border border-sand-300 bg-white px-3 py-2 text-xs font-extrabold text-ink-700 hover:bg-sand-50"
              onClick={() => setLocale(locale === "en" ? "hi" : "en")}
              aria-label="Switch language"
            >
              {locale === "en" ? "हिं" : "EN"}
            </button>

            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-sand-300 bg-white text-lg text-ink-800 lg:hidden"
              onClick={() => setMobileOpen((v) => !v)}
              aria-expanded={mobileOpen}
              aria-label="Open navigation"
            >
              {mobileOpen ? "×" : "☰"}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="border-t border-sand-200 pb-4 pt-3 lg:hidden">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {[...PRIMARY_NAV, ...SECONDARY_NAV].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-xl px-3 py-2.5 text-sm font-bold ${activeFor(item.href) ? "bg-ink-900 text-white" : "bg-sand-50 text-ink-700"}`}
                >
                  {t(item.key)}
                </Link>
              ))}
              <Link href="/demo" onClick={() => setMobileOpen(false)} className="rounded-xl bg-saffron-500 px-3 py-2.5 text-sm font-extrabold text-ink-950">Run demo</Link>
              <Link href="/release-proof" onClick={() => setMobileOpen(false)} className="rounded-xl border border-saffron-500/40 bg-saffron-50 px-3 py-2.5 text-sm font-extrabold text-saffron-700">Connected proof</Link>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
