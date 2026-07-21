"use client";
/**
 * AGMARKNET mandi prices — client side (Task 003 Phase 2D/2F).
 * Connected: API adapter (authoritative). Standalone: mirror over the bundled
 * labelled SAMPLE shape — never presented as CACHED_MANDI_DATA.
 */
import sample from "@data/reference/agmarknet-sample-rajasthan.json";
import aliasesDoc from "@data/reference/agmarknet-crop-aliases.json";
import { getJson } from "./httpProvider";

export interface MandiQuote {
  mandi: string; district: string; state: string; crop: string;
  variety: string; arrivalDate: string;
  minPriceInrQuintal: number | null; modalPriceInrQuintal: number | null; maxPriceInrQuintal: number | null;
  unit: string; marketType: string;
}

export interface MandiResult {
  state: string; crop: string; quotes: MandiQuote[]; recordCount: number;
  attribution: string; provenance: string; stateDetail?: string;
}

export function getMandiPrices(crop: string, district?: string): Promise<MandiResult> {
  const q = district ? `&district=${encodeURIComponent(district)}` : "";
  return getJson(`/api/v1/integrations/mandi?crop=${encodeURIComponent(crop)}${q}`);
}

/** Standalone mirror of apps/api/app/agmarknet.py over the SAMPLE shape. */
export function standaloneMandiPrices(crop: string, district?: string): MandiResult {
  const aliases = (aliasesDoc.aliases as Record<string, string[]>)[crop.toLowerCase()];
  if (!aliases) {
    return {
      state: "NO_MANDI_DATA_FOR_CROP", crop, quotes: [], recordCount: 0,
      attribution: "Source: AGMARKNET via data.gov.in (Open Government Data Platform, Government of India)",
      provenance: "mandi mapping exists only for pilot crops (bajra, mustard, guar, cumin)",
    };
  }
  const aliasLc = new Set(aliases.map((a) => a.toLowerCase()));
  let records = sample.records.filter((r) => aliasLc.has(r.commodity.toLowerCase()));
  if (district) records = records.filter((r) => r.district.toLowerCase() === district.toLowerCase());
  const quotes: MandiQuote[] = records.map((r) => ({
    mandi: r.market, district: r.district, state: r.state, crop,
    variety: r.variety, arrivalDate: r.arrival_date,
    minPriceInrQuintal: Number(r.min_price) || null,
    modalPriceInrQuintal: Number(r.modal_price) || null,
    maxPriceInrQuintal: Number(r.max_price) || null,
    unit: "INR/quintal", marketType: "APMC mandi (AGMARKNET)",
  }));
  return {
    state: "MANDI_CREDENTIALS_REQUIRED", crop, quotes, recordCount: quotes.length,
    attribution: "Source: AGMARKNET via data.gov.in (Open Government Data Platform, Government of India)",
    provenance: "SAMPLE SHAPE — awaiting first keyed capture (not official data)",
    stateDetail: "DATAGOV_API_KEY not configured — get a free key from data.gov.in",
  };
}
