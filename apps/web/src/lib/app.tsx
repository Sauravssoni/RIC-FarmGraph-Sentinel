"use client";
/**
 * App-level context: demo persona, connectivity (real + simulated-offline
 * override for demos), API data-source mode (visible in the header), and
 * low-bandwidth mode. Also registers the PWA service worker.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { Persona } from "@contracts";
import { SEED } from "./seed";
import { outboxCount } from "./offline";

export type ApiMode = "demo-provider" | "api-connected" | "api-fallback";

interface AppCtx {
  persona: Persona;
  setPersonaId: (id: string) => void;
  personas: Persona[];
  online: boolean;
  simulateOffline: boolean;
  setSimulateOffline: (v: boolean) => void;
  effectiveOnline: boolean;
  apiMode: ApiMode;
  apiUrl: string;
  lowBandwidth: boolean;
  setLowBandwidth: (v: boolean) => void;
  pendingOutbox: number;
  refreshOutbox: () => void;
}

const Ctx = createContext<AppCtx | null>(null);

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function AppProvider({ children }: { children: ReactNode }) {
  const personas = SEED.personas;
  const [personaId, setPersonaId] = useState<string>("district-officer");
  const [online, setOnline] = useState(true);
  const [simulateOffline, setSimulateOffline] = useState(false);
  const [apiMode, setApiMode] = useState<ApiMode>("demo-provider");
  const [lowBandwidth, setLowBandwidth] = useState(false);
  const [pendingOutbox, setPendingOutbox] = useState(0);

  const refreshOutbox = useCallback(() => {
    outboxCount().then(setPendingOutbox).catch(() => setPendingOutbox(0));
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem("fgr-persona");
    if (saved && personas.some((p) => p.id === saved)) setPersonaId(saved);
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    setOnline(navigator.onLine);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    refreshOutbox();
    const t = window.setInterval(refreshOutbox, 5000);
    // API health probe — decides the visible data-source mode.
    fetch(`${API_URL}/api/v1/health`, { signal: AbortSignal.timeout(1500) })
      .then((r) => setApiMode(r.ok ? "api-connected" : "api-fallback"))
      .catch(() => setApiMode("api-fallback"));
    // PWA service worker (demo-grade runtime caching; see docs/known-limitations)
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.clearInterval(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persona = personas.find((p) => p.id === personaId) ?? personas[0];
  const setPersonaIdPersist = (id: string) => {
    setPersonaId(id);
    window.localStorage.setItem("fgr-persona", id);
  };

  return (
    <Ctx.Provider
      value={{
        persona, setPersonaId: setPersonaIdPersist, personas,
        online, simulateOffline, setSimulateOffline, effectiveOnline: online && !simulateOffline,
        apiMode, apiUrl: API_URL, lowBandwidth, setLowBandwidth,
        pendingOutbox, refreshOutbox,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useApp(): AppCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp outside AppProvider");
  return ctx;
}
