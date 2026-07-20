import { SEED } from "@/lib/seed";
import { CaseDetail } from "./CaseDetail";

export const dynamicParams = false;

export function generateStaticParams() {
  return SEED.cases.map((c) => ({ id: c.id }));
}

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CaseDetail id={id} />;
}
