// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  clearDraft, enqueue, loadDraft, markAttempt, outboxCount, outboxItems, removeOutbox, saveDraft,
} from "../src/lib/offline";

describe("offline field layer (IndexedDB)", () => {
  beforeEach(async () => {
    for (const i of await outboxItems()) await removeOutbox(i.id!);
    await clearDraft();
  });

  it("draft survives save → reload (refresh simulation)", async () => {
    await saveDraft({
      id: "current", step: 2,
      payload: { crop: "bajra", district: "Jodhpur", symptomCategory: "pale_streaking", note: "north edge" },
      updatedAt: new Date().toISOString(),
    });
    const d = await loadDraft();
    expect(d?.payload.crop).toBe("bajra");
    expect(d?.payload.note).toBe("north edge");
    expect(d?.updatedAt).toBeTruthy();
  });

  it("outbox: enqueue → count → failed attempt recorded → success removes item", async () => {
    const id1 = await enqueue({ kind: "case-report", payload: { crop: "guar" } });
    await enqueue({ kind: "case-report", payload: { crop: "mustard" } });
    expect(await outboxCount()).toBe(2);
    // simulated sync failure keeps the item and records the attempt
    await markAttempt(id1, "network unavailable (simulated)");
    const after = (await outboxItems()).find((i) => i.id === id1)!;
    expect(after.attempts).toBe(1);
    expect(after.lastError).toContain("simulated");
    // successful sync removes it
    await removeOutbox(id1);
    expect(await outboxCount()).toBe(1);
  });
});
