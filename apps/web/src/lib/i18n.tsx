"use client";
/**
 * English/Hindi strings for the golden path and app chrome.
 * Hindi strings marked UNREVIEWED in docs/known-limitations.md — community
 * review is required before field use. Regional vocabulary (Marwari/Mewari)
 * is a documented adapter boundary, not working ASR.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Locale = "en" | "hi";

const en = {
  "app.name": "FarmGraph Rakshak",
  "app.subtitle": "Offline Crop Health & Outbreak Intelligence Grid for Rajasthan",
  "app.tagline": "Every field seen. Every outbreak contained.",
  "nav.commandCentre": "Command centre",
  "nav.scan": "Field scan",
  "nav.cases": "Cases",
  "nav.expert": "Expert queue",
  "nav.outbreaks": "Outbreaks",
  "nav.missions": "Missions",
  "nav.governance": "Governance",
  "nav.integrations": "Integrations",
  "nav.demo": "Guided demo",
  "common.demoData": "Demo data",
  "common.simulated": "Simulated",
  "common.online": "Online",
  "common.offline": "Offline",
  "common.syncNow": "Sync now",
  "common.retry": "Retry",
  "common.pendingSync": "pending sync",
  "common.back": "Back",
  "common.next": "Next",
  "common.submit": "Submit report",
  "common.language": "हिंदी",
  "scan.title": "New crop-health report",
  "scan.step.consent": "Consent",
  "scan.step.crop": "Crop & stage",
  "scan.step.symptoms": "Symptoms",
  "scan.step.capture": "Capture",
  "scan.step.review": "Review & send",
  "scan.consent.title": "Farmer consent",
  "scan.consent.body": "I agree that this report and field photos may be used for crop-health advice and outbreak response for my plot. (Demo consent text)",
  "scan.consent.agree": "I agree",
  "scan.crop": "Crop",
  "scan.stage": "Crop stage",
  "scan.symptom": "What do you see?",
  "scan.note": "Short note (optional)",
  "scan.voice": "Voice input (Hindi)",
  "scan.voice.note": "Prototype: voice is a typed fallback. Marwari/Mewari speech recognition is a planned adapter, not working in this demo.",
  "scan.capture.title": "Guided photo checklist",
  "scan.capture.leafClose": "Close-up of affected leaf",
  "scan.capture.lowerLeaf": "Lower surface of leaf",
  "scan.capture.wholePlant": "Whole plant view",
  "scan.capture.lightingOk": "Good light (no shadow/glare)",
  "scan.capture.addPhoto": "Add photo (camera)",
  "scan.quality.fail": "Photo set needs improvement",
  "scan.quality.pass": "Photo quality accepted",
  "scan.quality.recapture": "Please capture again:",
  "scan.result.title": "Triage result (demo)",
  "scan.result.notExpert": "AI assistance is not expert confirmation. An expert will verify this report.",
  "scan.saved.offline": "Saved on this device. It will sync when connectivity returns.",
  "scan.synced": "Synced (simulated)",
  "field.case": "Case",
} as const;

export type I18nKey = keyof typeof en;

const hi: Record<I18nKey, string> = {
  "app.name": "फ़ार्मग्राफ़ रक्षक",
  "app.subtitle": "राजस्थान के लिए ऑफ़लाइन फ़सल स्वास्थ्य और प्रकोप सूचना ग्रिड",
  "app.tagline": "हर खेत की समय पर पहचान, हर प्रकोप पर प्रमाणित कार्रवाई।",
  "nav.commandCentre": "कमांड सेंटर",
  "nav.scan": "फ़ील्ड स्कैन",
  "nav.cases": "केस रजिस्टर",
  "nav.expert": "विशेषज्ञ कतार",
  "nav.outbreaks": "प्रकोप",
  "nav.missions": "मिशन",
  "nav.governance": "शासन",
  "nav.integrations": "एकीकरण",
  "nav.demo": "निर्देशित डेमो",
  "common.demoData": "डेमो डेटा",
  "common.simulated": "सिम्युलेटेड",
  "common.online": "ऑनलाइन",
  "common.offline": "ऑफ़लाइन",
  "common.syncNow": "अभी सिंक करें",
  "common.retry": "पुनः प्रयास",
  "common.pendingSync": "सिंक बाकी",
  "common.back": "पीछे",
  "common.next": "आगे",
  "common.submit": "रिपोर्ट भेजें",
  "common.language": "English",
  "scan.title": "नई फ़सल-स्वास्थ्य रिपोर्ट",
  "scan.step.consent": "सहमति",
  "scan.step.crop": "फ़सल और अवस्था",
  "scan.step.symptoms": "लक्षण",
  "scan.step.capture": "फ़ोटो",
  "scan.step.review": "जाँच और भेजें",
  "scan.consent.title": "किसान की सहमति",
  "scan.consent.body": "मैं सहमत हूँ कि मेरी रिपोर्ट और खेत की फ़ोटो का उपयोग मेरे खेत के लिए फ़सल-स्वास्थ्य सलाह और प्रकोप कार्रवाई में किया जा सकता है। (डेमो सहमति पाठ)",
  "scan.consent.agree": "मैं सहमत हूँ",
  "scan.crop": "फ़सल",
  "scan.stage": "फ़सल अवस्था",
  "scan.symptom": "आपको क्या दिख रहा है?",
  "scan.note": "छोटा नोट (वैकल्पिक)",
  "scan.voice": "वॉइस इनपुट (हिंदी)",
  "scan.voice.note": "प्रोटोटाइप: वॉइस अभी टाइप किए गए इनपुट से चलता है। मारवाड़ी/मेवाड़ी वाणी पहचान एक योजनाबद्ध एडाप्टर है, इस डेमो में काम नहीं करती।",
  "scan.capture.title": "फ़ोटो चेकलिस्ट",
  "scan.capture.leafClose": "प्रभावित पत्ती की क्लोज़-अप फ़ोटो",
  "scan.capture.lowerLeaf": "पत्ती की निचली सतह",
  "scan.capture.wholePlant": "पूरे पौधे की फ़ोटो",
  "scan.capture.lightingOk": "अच्छी रोशनी (छाया/चमक नहीं)",
  "scan.capture.addPhoto": "फ़ोटो जोड़ें (कैमरा)",
  "scan.quality.fail": "फ़ोटो सेट में सुधार चाहिए",
  "scan.quality.pass": "फ़ोटो गुणवत्ता स्वीकार",
  "scan.quality.recapture": "कृपया दोबारा लें:",
  "scan.result.title": "ट्रायाज परिणाम (डेमो)",
  "scan.result.notExpert": "AI सहायता विशेषज्ञ पुष्टि नहीं है। एक विशेषज्ञ इस रिपोर्ट की जाँच करेगा।",
  "scan.saved.offline": "इस डिवाइस पर सहेजा गया। कनेक्टिविटी मिलने पर सिंक होगा।",
  "scan.synced": "सिंक हो गया (सिम्युलेटेड)",
  "field.case": "केस",
};

const dictionaries: Record<Locale, Record<I18nKey, string>> = { en, hi };

interface I18nCtx {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (k: I18nKey) => string;
}

const Ctx = createContext<I18nCtx>({ locale: "en", setLocale: () => undefined, t: (k) => en[k] });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  useEffect(() => {
    const saved = window.localStorage.getItem("fgr-locale");
    if (saved === "hi" || saved === "en") setLocaleState(saved);
  }, []);
  const setLocale = (l: Locale) => {
    setLocaleState(l);
    window.localStorage.setItem("fgr-locale", l);
    document.documentElement.lang = l;
  };
  const t = (k: I18nKey) => dictionaries[locale][k] ?? en[k];
  return <Ctx.Provider value={{ locale, setLocale, t }}>{children}</Ctx.Provider>;
}

export function useI18n(): I18nCtx {
  return useContext(Ctx);
}
