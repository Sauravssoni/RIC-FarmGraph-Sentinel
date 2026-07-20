"use client";

export interface CaseFilters {
  crop: string;
  district: string;
  state: string;
  verified: "all" | "verified" | "suspected";
  range: "all" | "kharif-2026" | "rabi-2025-26";
  search: string;
}

export const DEFAULT_FILTERS: CaseFilters = { crop: "all", district: "all", state: "all", verified: "all", range: "all", search: "" };

export function FilterBar({
  filters, onChange, crops, districts, states,
}: {
  filters: CaseFilters;
  onChange: (f: CaseFilters) => void;
  crops: string[];
  districts: string[];
  states: string[];
}) {
  const set = (patch: Partial<CaseFilters>) => onChange({ ...filters, ...patch });
  return (
    <div className="card p-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <label className="block">
          <span className="label">Crop</span>
          <select className="input !py-2 text-sm" value={filters.crop} onChange={(e) => set({ crop: e.target.value })}>
            <option value="all">All crops</option>
            {crops.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="label">District</span>
          <select className="input !py-2 text-sm" value={filters.district} onChange={(e) => set({ district: e.target.value })}>
            <option value="all">All districts</option>
            {districts.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="label">Status</span>
          <select className="input !py-2 text-sm" value={filters.state} onChange={(e) => set({ state: e.target.value })}>
            <option value="all">All states</option>
            {states.map((s) => <option key={s} value={s}>{s.replaceAll("_", " ")}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="label">Verification</span>
          <select className="input !py-2 text-sm" value={filters.verified} onChange={(e) => set({ verified: e.target.value as CaseFilters["verified"] })}>
            <option value="all">Suspected + verified</option>
            <option value="verified">Expert-verified only</option>
            <option value="suspected">Suspected / unverified only</option>
          </select>
        </label>
        <label className="block">
          <span className="label">Season</span>
          <select className="input !py-2 text-sm" value={filters.range} onChange={(e) => set({ range: e.target.value as CaseFilters["range"] })}>
            <option value="all">All time</option>
            <option value="kharif-2026">Kharif 2026 (current)</option>
            <option value="rabi-2025-26">Rabi 2025–26</option>
          </select>
        </label>
        <label className="block">
          <span className="label">Search</span>
          <input className="input !py-2 text-sm" placeholder="Case / plot / farmer ID" value={filters.search} onChange={(e) => set({ search: e.target.value })} />
        </label>
      </div>
    </div>
  );
}
