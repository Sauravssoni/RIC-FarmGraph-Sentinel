import { expect, test } from "@playwright/test";

test("connected browser handoff preserves evidence through KVK pack", async ({ page }) => {
  await page.goto("/release-proof/");
  await expect(page.getByRole("heading", { name: "Connected evidence handoff proof" })).toBeVisible();
  await expect(page.getByText("Connected demo backend")).toBeVisible({ timeout: 20_000 });

  const result = await page.evaluate(async () => {
    const api = "http://127.0.0.1:8000";
    const consentRef = `consent-connected-e2e-${Date.now()}`;

    const health = await fetch(`${api}/api/v1/release/health`, {
      headers: { "X-Demo-Role": "officer" },
    });
    if (!health.ok) throw new Error(`release health ${health.status}`);

    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 384;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("canvas unavailable");
    context.fillStyle = "#3d6f32";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#d8ddcb";
    for (let y = 0; y < canvas.height; y += 7) {
      for (let x = 0; x < canvas.width; x += 9) context.fillRect(x, y, 2, 2);
    }
    const imageBlob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("image encode failed")), "image/jpeg", 0.85),
    );
    const voiceBlob = new Blob(["connected-e2e-voice-evidence"], { type: "audio/webm" });

    async function upload(kind: "image" | "voice", blob: Blob, filename: string) {
      const form = new FormData();
      form.set("kind", kind);
      form.set("consentRef", consentRef);
      form.set("file", blob, filename);
      const response = await fetch(`${api}/api/v1/release/evidence`, {
        method: "POST",
        headers: { "X-Demo-Role": "field_worker" },
        body: form,
      });
      if (!response.ok) throw new Error(`${kind} upload ${response.status}: ${await response.text()}`);
      return await response.json() as { ref: string; sha256: string };
    }

    const image = await upload("image", imageBlob, "connected-leaf.jpg");
    const voice = await upload("voice", voiceBlob, "connected-voice.webm");
    const idempotencyKey = `connected-browser-${image.sha256.slice(0, 16)}-${voice.sha256.slice(0, 16)}`;
    const body = {
      idempotencyKey,
      case: {
        farmerId: "RJ-DEMO-F1042",
        plotId: "RJ-DEMO-PLOT-118",
        crop: "bajra",
        cropStage: "vegetative",
        season: "kharif-2026",
        district: "Jodhpur",
        block: "Balesar",
        lat: 26.391,
        lon: 72.946,
        areaAcres: 2.6,
        createdOffline: true,
        consent: { given: true, channel: "typed", ref: consentRef },
        observation: {
          symptomCategory: "white_downy_growth",
          symptomNote: "पत्ते के नीचे सफेद परत दिखाई दे रही है",
          checklist: { leafClose: true, lowerLeaf: true, wholePlant: true, lightingOk: true },
          imageHashes: [image.sha256],
          evidenceRefs: [image.ref],
          pixelQuality: { score: 0.9, passed: true, failedChecks: [], recaptureInstructions: [] },
          edgeInference: {
            providerId: "pixfeat-v0",
            providerKind: "EDGE_HEURISTIC",
            modelVersion: "0.2.0",
            runtime: "typescript-canvas",
            durationMs: 14,
            topClass: "downy_mildew_suspect",
            topScore: 0.71,
            uncertainty: 0.33,
            abstain: false,
            abstainReasons: [],
            at: new Date().toISOString(),
          },
          voiceEvidenceRef: voice.ref,
          voiceHash: voice.sha256,
          transcript: {
            provider: "HUMAN_CONFIRMED_VOICE_NOTE",
            providerState: "OFFLINE_VOICE_NOTE_ONLY",
            serviceId: null,
            rawResponseHash: null,
            originalTranscript: "पत्ते के नीचे सफेद परत दिखाई दे रही है",
            confirmedTranscript: "पत्ते के नीचे सफेद परत दिखाई दे रही है",
            confirmationStatus: "CONFIRMED_AS_RETURNED",
            consentRef,
            voiceNoteHash: voice.sha256,
            confirmedAt: new Date().toISOString(),
          },
        },
      },
      kvkId: "KVK-JODHPUR-1",
      referralReason: "Connected browser evidence requires KVK verification",
      referralNote: "Task 004 full-stack test",
      urgency: "PRIORITY",
    };

    const handoff = await fetch(`${api}/api/v1/release/handoff`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Demo-Role": "officer" },
      body: JSON.stringify(body),
    });
    if (!handoff.ok) throw new Error(`handoff ${handoff.status}: ${await handoff.text()}`);
    const applied = await handoff.json();

    const replay = await fetch(`${api}/api/v1/release/handoff`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Demo-Role": "officer" },
      body: JSON.stringify(body),
    });
    if (!replay.ok) throw new Error(`replay ${replay.status}`);
    const replayed = await replay.json();

    return { applied, replayed, image, voice };
  });

  expect(result.applied.status).toBe("applied");
  expect(result.replayed.status).toBe("already_applied");
  expect(result.replayed.case.id).toBe(result.applied.case.id);
  expect(result.applied.pack.packVersion).toBe("kvk-referral-pack/v2");
  expect(result.applied.pack.imageHashes).toEqual([result.image.sha256]);
  expect(result.applied.pack.evidenceRefs).toEqual([result.image.ref]);
  expect(result.applied.pack.voiceEvidence.ref).toBe(result.voice.ref);
  expect(result.applied.pack.transcript.confirmationStatus).toBe("CONFIRMED_AS_RETURNED");
  expect(result.applied.pack.inference.provider).toBe("pixfeat-v0");
  expect(result.applied.case.observations.at(-1).voiceEvidenceRef).toBe(result.voice.ref);
  expect(result.applied.case.timeline.some((event: { type: string }) => event.type === "connected_evidence_preserved")).toBe(true);
});
