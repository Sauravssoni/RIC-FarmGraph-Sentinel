import seedJson from "@data/demo/seed.json";
import taxonomyJson from "@data/demo/taxonomy.json";
import policyJson from "@data/demo/policy.json";
import integrationsJson from "@data/demo/integrations.json";
import type { DemoSeed } from "@contracts";

export const SEED = seedJson as unknown as DemoSeed;
export const TAXONOMY = taxonomyJson;
export const POLICY = policyJson;
export const INTEGRATIONS = integrationsJson;

export type ConditionMeta = (typeof TAXONOMY.conditions)[number];
export const CONDITIONS: Record<string, ConditionMeta> = Object.fromEntries(
  TAXONOMY.conditions.map((c) => [c.id, c]),
);
export const CROPS = TAXONOMY.crops;
export const SYMPTOMS = TAXONOMY.symptomCategories;

export function freshSeed(): DemoSeed {
  return JSON.parse(JSON.stringify(SEED)) as DemoSeed;
}

export function conditionLabel(id: string | null | undefined): string {
  if (!id) return "—";
  return CONDITIONS[id]?.labelEn ?? id;
}

export function cropLabel(id: string): string {
  return CROPS.find((c) => c.id === id)?.nameEn ?? id;
}
