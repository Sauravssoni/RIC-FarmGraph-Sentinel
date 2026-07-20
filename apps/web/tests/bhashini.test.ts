// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import {
  REGIONAL_GLOSSARY, TTS_KIND_LABELS, bhashiniStateFromError,
  dequeueTranscription, queueTranscription, transcriptionQueue,
} from "../src/lib/bhashini";
import { DemoStore } from "../src/lib/store";

describe("Bhashini client state mapping", () => {
  it("maps API error payloads to exact states — never fabricates success", () => {
    expect(bhashiniStateFromError(new Error('API /api/v1/bhashini/asr -> 409 {"code":"BHASHINI_CREDENTIALS_REQUIRED","detail":"..."}')))
      .toBe("BHASHINI_CREDENTIALS_REQUIRED");
    expect(bhashiniStateFromError(new Error("... BHASHINI_TIMEOUT ..."))).toBe("BHASHINI_TIMEOUT");
    expect(bhashiniStateFromError(new Error("... BHASHINI_CONFIGURATION_ERROR ..."))).toBe("BHASHINI_CONFIGURATION_ERROR");
    expect(bhashiniStateFromError(new Error("network down"))).toBe("BHASHINI_UNAVAILABLE");
  });

  it("TTS kind labels cover exactly the five allowlisted non-chemical kinds", () => {
    expect(Object.keys(TTS_KIND_LABELS).sort()).toEqual([
      "case_received", "expert_review_needed", "follow_up_reminder",
      "recapture_guidance", "safe_non_chemical_instruction",
    ]);
    // no free-text or chemical kind exists client-side either
    expect(TTS_KIND_LABELS["chemical_advisory"]).toBeUndefined();
  });
});

describe("offline transcription queue (recording is never lost)", () => {
  beforeEach(() => localStorage.clear());

  it("queues with PENDING_USER_APPROVAL and dequeues after confirmation", () => {
    const req = queueTranscription({
      voiceNoteId: "vn_abc", voiceNoteHash: "deadbeef", mime: "audio/webm",
      caseRef: "DRAFT-FIELD-CASE", consentRef: "scan-consent-ack", regional: false,
    });
    expect(req.status).toBe("PENDING_USER_APPROVAL");
    const q = transcriptionQueue();
    expect(q).toHaveLength(1);
    expect(q[0].voiceNoteId).toBe("vn_abc");
    expect(q[0].consentRef).toBe("scan-consent-ack"); // consent stays attached
    dequeueTranscription(req.id);
    expect(transcriptionQueue()).toHaveLength(0);
  });
});

describe("regional glossary (truthful accessibility support)", () => {
  it("is labelled DRAFT and claims no dialect ASR", () => {
    expect(REGIONAL_GLOSSARY.meta.status).toContain("DRAFT");
    expect(REGIONAL_GLOSSARY.meta.dialectAsrClaim).toContain("NONE");
  });

  it("covers the four pilot crops with Hindi phrases", () => {
    const en = REGIONAL_GLOSSARY.crops.map((c) => c.en).join(" ");
    for (const crop of ["bajra", "mustard", "guar", "cumin"]) expect(en).toContain(crop);
    for (const c of REGIONAL_GLOSSARY.crops) expect(c.hi.length).toBeGreaterThan(1);
  });

  it("has guided prompts for phrase-guided recording", () => {
    expect(REGIONAL_GLOSSARY.guidedPrompts.length).toBeGreaterThanOrEqual(3);
    for (const p of REGIONAL_GLOSSARY.guidedPrompts) {
      expect(p.hi.length).toBeGreaterThan(3);
      expect(p.en.length).toBeGreaterThan(3);
    }
  });
});

describe("standalone voice-transcript confirmation (DemoStore mirror)", () => {
  beforeEach(() => localStorage.clear());

  it("audits confirmation; regional routes case to human review", () => {
    const s = new DemoStore();
    const ok = s.confirmVoiceTranscript("C-2614", {
      transcript: "पत्तियों पर सफ़ेद धब्बे हैं",
      confirmationStatus: "CONFIRMED_AFTER_EDIT",
    });
    expect(ok).toBeDefined();
    const timeline = s.getCase("C-2614")!.timeline;
    expect(timeline.some((e) => e.type === "voice_transcript_confirmed" && e.summary.includes("after edit"))).toBe(true);

    s.confirmVoiceTranscript("C-2609", {
      transcript: "(Marwari note)", confirmationStatus: "CONFIRMED_AS_RETURNED", regional: true,
    });
    const regional = s.getCase("C-2609")!;
    expect(regional.state).toBe("AWAITING_EXPERT");
    expect(regional.timeline.some((e) => e.type === "regional_speech_review" && e.summary.includes("HUMAN REVIEW REQUIRED"))).toBe(true);
  });
});
