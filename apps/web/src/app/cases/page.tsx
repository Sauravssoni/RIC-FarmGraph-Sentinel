"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useDemoStore } from "@/lib/store";
import { CaseTable } from "@/components/CaseTable";
import { FilterBar, DEFAULT_FILTERS, type CaseFilters } from "@/components/FilterBar";
import { DemoBanner, SectionTitle } from "@/components/bits";
import { CROPS } from "@/lib/seed";

const CLOSED = new Set(["RESOLVED", "CLOSED_UNKNOWN", "CLOSED_DUPLICATE"]);

function RegisterInner() {
  const params = useSearchParams();
  const initial: CaseFilters = {
    ...DEFAULT_FILTERS,
    state: params.get("state") ?? "all",
    crop: params.get("crop") ?? "all",
    district: params.get("district") ?? "all",
  };
  const [filters, setFilters] = useState<CaseFilters>(initial);
  const sync = params.get("sync");
  const priority = params.get("priority");
  const open = params.get("open");

  const cases = useDemoStore((s) => s.getState().cases);
  const districts = useMemo(() => [...new Set(cases.map((c) => c.district))], [cases]);
  const states = useMemo(() => [...new Set(cases.map((c) => c.state))], [cases]);

  const filtered = useMemo(() => {
    let out = [...cases];
    if (open) out = out.filter((c) => !CLOSED.has(c.state));
    if (sync === "pending") out = out.filter((c) => c.pendingSync);
    if (priority === "high") out = out.filter((c) => c.diagnosis?.highSpreadRisk || c.state === "FIELD_VISIT_REQUIRED" || c.state === "NOT_IMPROVING");
    if (filters.crop !== "all") out = out.filter((c) => c.crop === filters.crop);
    if (filters.district !== "all") out = out.filter((c) => c.district === filters.district);
    if (filters.state !== "all") out = out.filter((c) => c.state === filters.state);
    if (filters.range !== "all") out = out.filter((c) => c.season === filters.range);
    if (filters.verified === "verified") out = out.filter((c) => c.expertConfirmedCondition && c.expertConfirmedCondition !== "unknown");
    if (filters.verified === "suspected") out = out.filter((c) => !c.expertConfirmedCondition);
    if (filters.search) {
      const q = filters.search.toLowerCase();
      out = out.filter((c) => [c.id, c.plotId, c.farmerId].some((v) => v.toLowerCase().includes(q)));
    }
    return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [cases, filters, sync, priority, open]);

  return (
    <div className="mx-auto max-w-[1440px] px-3 py-4 sm:px-5">
      <SectionTitle
        title="Case register"
        sub={`${filtered.length} of ${cases.length} demo cases — every record carries simulated provenance`}
      />
      <div className="mb-3"><DemoBanner /></div>
      <FilterBar filters={filters} onChange={setFilters} crops={CROPS.map((c) => c.id)} districts={districts} states={states} />
      <div className="mt-3"><CaseTable cases={filtered} /></div>
    </div>
  );
}

export default function CasesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-ink-500">Loading register…</div>}>
      <RegisterInner />
    </Suspense>
  );
}
