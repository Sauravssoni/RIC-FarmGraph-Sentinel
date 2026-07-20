"use client";
/**
 * Offline-first field layer: IndexedDB case drafts + outbox (Dexie).
 * A draft survives refresh; the outbox queues submissions until sync.
 */
import Dexie, { type EntityTable } from "dexie";

export interface ScanDraft {
  id: string; // "current"
  step: number;
  payload: Record<string, unknown>;
  updatedAt: string;
}

export interface OutboxItem {
  id?: number;
  kind: "case-report" | "observation" | "follow-up";
  payload: Record<string, unknown>;
  createdAt: string;
  attempts: number;
  lastError: string | null;
}

class FieldDB extends Dexie {
  drafts!: EntityTable<ScanDraft, "id">;
  outbox!: EntityTable<OutboxItem, "id">;

  constructor() {
    super("fgr-field");
    this.version(1).stores({ drafts: "id", outbox: "++id, createdAt" });
  }
}

let db: FieldDB | undefined;
export function getDB(): FieldDB {
  if (!db) db = new FieldDB();
  return db;
}

export async function saveDraft(draft: ScanDraft): Promise<void> {
  await getDB().drafts.put(draft);
}

export async function loadDraft(): Promise<ScanDraft | undefined> {
  return getDB().drafts.get("current");
}

export async function clearDraft(): Promise<void> {
  await getDB().drafts.delete("current");
}

export async function enqueue(item: Omit<OutboxItem, "id" | "createdAt" | "attempts" | "lastError">): Promise<number> {
  const id = await getDB().outbox.add({ ...item, createdAt: new Date().toISOString(), attempts: 0, lastError: null });
  return id as number;
}

export async function outboxItems(): Promise<OutboxItem[]> {
  return getDB().outbox.orderBy("createdAt").toArray();
}

export async function outboxCount(): Promise<number> {
  return getDB().outbox.count();
}

export async function removeOutbox(id: number): Promise<void> {
  await getDB().outbox.delete(id);
}

export async function markAttempt(id: number, error: string | null): Promise<void> {
  const item = await getDB().outbox.get(id);
  if (item) await getDB().outbox.update(id, { attempts: item.attempts + 1, lastError: error });
}
