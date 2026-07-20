import { SEED } from "@/lib/seed";
import TwinDetail from "./TwinDetail";

export const dynamicParams = false;

export function generateStaticParams() {
  return SEED.plots.map((p) => ({ plotId: p.id }));
}

export default async function Page({ params }: { params: Promise<{ plotId: string }> }) {
  const { plotId } = await params;
  return <TwinDetail plotId={plotId} />;
}
