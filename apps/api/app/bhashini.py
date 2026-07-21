"""Bhashini (ULCA) Hindi PoC adapter — backend only (Task 003 Phase 2B).

No credentials in the frontend, static build, logs or repository. All values
come from environment variables (see docs/integrations/bhashini.md):

    BHASHINI_ENABLED          "1"/"true" to attempt live calls
    BHASHINI_USER_ID          ULCA user id (header: userID)
    BHASHINI_API_KEY          ULCA api key (header: ulcaApiKey)
    BHASHINI_PIPELINE_ID      pipeline id (MeitY consolidated pipeline)
    BHASHINI_CONFIG_URL       pipeline config endpoint (default: official)
    BHASHINI_TIMEOUT_SEC      per-request timeout (default 12)
    BHASHINI_CONFIG_CACHE_SEC pipeline-config cache TTL (default 300)

Official sequence implemented (documented ULCA flow):
  1. pipeline configuration (cached for a short TTL — not repeated per call)
  2. obtain callback/inference endpoint + auth header from the config response
  3. pipeline compute (ASR / TTS)

States (exact): LIVE_BHASHINI_POC, BHASHINI_CREDENTIALS_REQUIRED,
BHASHINI_CONFIGURATION_ERROR, BHASHINI_TIMEOUT, BHASHINI_UNAVAILABLE.
Client-side states OFFLINE_VOICE_NOTE_ONLY and BROWSER_DICTATION_FALLBACK are
declared in the web app — the browser Web Speech API is never labelled
Bhashini.

Safety invariant: TTS accepts only an allowlisted message KIND rendered from
fixed non-chemical Hindi templates. There is deliberately NO free-text TTS
endpoint, so an unlocked chemical advisory can never reach TTS.
"""
from __future__ import annotations

import hashlib
import json
import os
import socket
import time
import urllib.error
import urllib.request
from typing import Any, Callable, Optional

STATE_LIVE = "LIVE_BHASHINI_POC"
STATE_CREDS = "BHASHINI_CREDENTIALS_REQUIRED"
STATE_CONFIG_ERROR = "BHASHINI_CONFIGURATION_ERROR"
STATE_TIMEOUT = "BHASHINI_TIMEOUT"
STATE_UNAVAILABLE = "BHASHINI_UNAVAILABLE"

DEFAULT_CONFIG_URL = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline"
SETUP_DOC = "docs/integrations/bhashini.md"

# Fixed, non-chemical spoken-message templates (hi). Params are interpolated
# into safe slots only (case id, district) — never advisory chemistry.
TTS_TEMPLATES: dict[str, str] = {
    "recapture_guidance": "कृपया पत्ते की साफ़ तस्वीर दोबारा लें। पत्ती के नीचे की तरफ़ और पूरे पौधे की भी फ़ोटो लें।",
    "case_received": "आपकी रिपोर्ट दर्ज हो गई है। केस नंबर {case_id}। विशेषज्ञ समीक्षा के बाद सलाह दी जाएगी।",
    "expert_review_needed": "आपके केस {case_id} की विशेषज्ञ समीक्षा ज़रूरी है। कृपया कृषि विशेषज्ञ के संपर्क में रहें।",
    "safe_non_chemical_instruction": "तुरंत: प्रभावित पत्तियों को अलग करें, खेत में पानी जमने न दें, और फ़सल का निरीक्षण जारी रखें। कोई दवा विशेषज्ञ की सलाह के बिना न डालें।",
    "follow_up_reminder": "केस {case_id} की फ़ॉलो-अप जाँच का समय हो गया है। कृपया नई तस्वीरें अपडेट करें।",
}
TTS_KINDS = tuple(TTS_TEMPLATES.keys())

# Interpolation slots must stay non-chemical: only identifiers/place names.
TTS_SAFE_PARAM = ("case_id", "district")


class BhashiniError(Exception):
    def __init__(self, state: str, detail: str):
        super().__init__(detail)
        self.state = state
        self.detail = detail


# Transport signature: (url, payload, headers, timeout_sec) -> (status, body_dict)
Transport = Callable[[str, dict[str, Any], dict[str, str], float], tuple[int, dict[str, Any]]]


def _urllib_transport(url: str, payload: dict[str, Any], headers: dict[str, str], timeout: float) -> tuple[int, dict[str, Any]]:
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode(), method="POST",
        headers={"Content-Type": "application/json", **headers},
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:  # noqa: S310 (official endpoint only)
        return resp.status, json.loads(resp.read().decode())


class BhashiniAdapter:
    def __init__(self, env: Optional[dict[str, str]] = None, transport: Optional[Transport] = None):
        env = env if env is not None else os.environ
        self.enabled = env.get("BHASHINI_ENABLED", "").lower() in ("1", "true", "yes")
        self.user_id = env.get("BHASHINI_USER_ID", "")
        self.api_key = env.get("BHASHINI_API_KEY", "")
        self.pipeline_id = env.get("BHASHINI_PIPELINE_ID", "")
        self.config_url = env.get("BHASHINI_CONFIG_URL", DEFAULT_CONFIG_URL)
        self.timeout = float(env.get("BHASHINI_TIMEOUT_SEC", "12"))
        self.config_ttl = float(env.get("BHASHINI_CONFIG_CACHE_SEC", "300"))
        self.transport: Transport = transport or _urllib_transport
        self._config_cache: dict[str, tuple[float, dict[str, Any]]] = {}

    # ---------------- state ----------------
    def credentials_present(self) -> bool:
        return bool(self.enabled and self.user_id and self.api_key and self.pipeline_id)

    def status(self) -> dict[str, Any]:
        """Public status — NEVER echoes secret values, only their presence."""
        missing = [
            name for name, val in (
                ("BHASHINI_ENABLED", "1" if self.enabled else ""),
                ("BHASHINI_USER_ID", self.user_id),
                ("BHASHINI_API_KEY", self.api_key),
                ("BHASHINI_PIPELINE_ID", self.pipeline_id),
            ) if not val
        ]
        return {
            "state": STATE_LIVE if self.credentials_present() else STATE_CREDS,
            "enabled": self.enabled,
            "credentialsConfigured": self.credentials_present(),
            "missingEnv": missing,
            "pipelineIdConfigured": bool(self.pipeline_id),  # presence only
            "configUrl": self.config_url,
            "timeoutSec": self.timeout,
            "ttsKinds": list(TTS_KINDS),
            "languages": {"asr": ["hi"], "tts": ["hi"]},
            "regionalClaim": "No Marwari/Mewari ASR — regional speech routes to human review",
            "setupDoc": SETUP_DOC,
            "provenance": "ADAPTER_CONTRACT — live only when credentials are configured",
        }

    def _require_credentials(self) -> None:
        if not self.credentials_present():
            raise BhashiniError(STATE_CREDS, f"Bhashini credentials not configured — see {SETUP_DOC}")

    # ---------------- official sequence ----------------
    def _pipeline_config(self, task: str) -> dict[str, Any]:
        cached = self._config_cache.get(task)
        if cached and time.monotonic() - cached[0] < self.config_ttl:
            return cached[1]
        payload = {
            "pipelineTasks": [{"taskType": task, "config": {"language": {"sourceLanguage": "hi"}}}],
            "pipelineRequestConfig": {"pipelineId": self.pipeline_id},
        }
        headers = {"userID": self.user_id, "ulcaApiKey": self.api_key}
        try:
            status, body = self.transport(self.config_url, payload, headers, self.timeout)
        except (socket.timeout, TimeoutError) as exc:
            raise BhashiniError(STATE_TIMEOUT, f"pipeline config timed out after {self.timeout}s") from exc
        except (urllib.error.URLError, OSError, json.JSONDecodeError) as exc:
            raise BhashiniError(STATE_UNAVAILABLE, f"pipeline config unreachable: {exc}") from exc
        if status != 200:
            raise BhashiniError(STATE_CONFIG_ERROR, f"pipeline config rejected (HTTP {status})")
        endpoint = body.get("pipelineInferenceAPIEndPoint") or {}
        callback = endpoint.get("callbackUrl")
        key = endpoint.get("inferenceApiKey") or {}
        # service id for the task (first offered for hi)
        service_id = None
        for cfg in body.get("pipelineResponseConfig") or []:
            if cfg.get("taskType") == task:
                options = cfg.get("config") or []
                if options:
                    service_id = options[0].get("serviceId")
        if not callback or not key.get("value"):
            raise BhashiniError(STATE_CONFIG_ERROR, "pipeline config missing callbackUrl or inference key")
        parsed = {"callbackUrl": callback, "authHeader": key.get("name", "Authorization"),
                  "authValue": key["value"], "serviceId": service_id}
        self._config_cache[task] = (time.monotonic(), parsed)
        return parsed

    def _compute(self, cfg: dict[str, Any], payload: dict[str, Any]) -> tuple[dict[str, Any], str, float]:
        t0 = time.monotonic()
        try:
            status, body = self.transport(
                cfg["callbackUrl"], payload,
                {cfg["authHeader"]: cfg["authValue"]}, self.timeout)
        except (socket.timeout, TimeoutError) as exc:
            raise BhashiniError(STATE_TIMEOUT, f"inference timed out after {self.timeout}s") from exc
        except (urllib.error.URLError, OSError, json.JSONDecodeError) as exc:
            raise BhashiniError(STATE_UNAVAILABLE, f"inference endpoint unreachable: {exc}") from exc
        latency_ms = round((time.monotonic() - t0) * 1000)
        raw_hash = hashlib.sha256(json.dumps(body, sort_keys=True).encode()).hexdigest()
        if status != 200:
            raise BhashiniError(STATE_UNAVAILABLE, f"inference rejected (HTTP {status})")
        return body, raw_hash, latency_ms

    # ---------------- operations ----------------
    def asr(self, audio_b64: str, mime_type: str, *, consent_ref: str, case_ref: str) -> dict[str, Any]:
        """Hindi ASR. Transcript is ALWAYS UNREVIEWED — never auto-verified."""
        self._require_credentials()
        cfg = self._pipeline_config("asr")
        audio_format = "wav" if "wav" in mime_type else ("mp3" if "mp3" in mime_type or "mpeg" in mime_type else "webm")
        payload = {
            "pipelineTasks": [{"taskType": "asr", "config": {
                "language": {"sourceLanguage": "hi"},
                **({"serviceId": cfg["serviceId"]} if cfg.get("serviceId") else {}),
                "audioFormat": audio_format,
            }}],
            "inputData": {"audio": [{"audioContent": audio_b64}]},
        }
        body, raw_hash, latency_ms = self._compute(cfg, payload)
        transcript = ""
        confidence = None
        for task in body.get("pipelineResponse") or []:
            if task.get("taskType") == "asr":
                out = (task.get("output") or [{}])[0]
                transcript = out.get("source", "")
                confidence = out.get("confidence")  # only if Bhashini returns it
        if not transcript:
            raise BhashiniError(STATE_UNAVAILABLE, "inference returned no transcript")
        return {
            "state": STATE_LIVE,
            "transcript": transcript,
            "serviceId": cfg.get("serviceId"),
            "pipelineIdConfigured": True,  # presence only — id never echoed
            "sourceLanguage": "hi",
            "latencyMs": latency_ms,
            **({"confidence": confidence} if confidence is not None else {}),
            "at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "rawResponseHash": raw_hash,
            "consentRef": consent_ref,
            "caseRef": case_ref,
            # honesty contract: ASR output is unreviewed until the field worker
            # confirms or edits it; confirmation is a separate audited step.
            "confirmationStatus": "UNREVIEWED",
            "verified": False,
        }

    def tts(self, kind: str, params: Optional[dict[str, str]] = None) -> dict[str, Any]:
        """Hindi TTS for allowlisted non-chemical messages only (no free text)."""
        self._require_credentials()
        if kind not in TTS_TEMPLATES:
            raise BhashiniError("BAD_TTS_KIND",
                                f"kind must be one of {list(TTS_KINDS)} — free-text TTS is deliberately unsupported")
        params = params or {}
        unknown = set(params) - set(TTS_SAFE_PARAM)
        if unknown:
            raise BhashiniError("BAD_TTS_PARAM", f"unsafe TTS params: {sorted(unknown)} (allowed: {list(TTS_SAFE_PARAM)})")
        text = TTS_TEMPLATES[kind]
        for k, v in params.items():
            text = text.replace("{" + k + "}", str(v))
        cfg = self._pipeline_config("tts")
        payload = {
            "pipelineTasks": [{"taskType": "tts", "config": {
                "language": {"sourceLanguage": "hi"},
                **({"serviceId": cfg["serviceId"]} if cfg.get("serviceId") else {}),
            }}],
            "inputData": {"input": [{"source": text}]},
        }
        body, raw_hash, latency_ms = self._compute(cfg, payload)
        audio_b64 = ""
        for task in body.get("pipelineResponse") or []:
            if task.get("taskType") == "tts":
                audio_b64 = ((task.get("audio") or [{}])[0]).get("audioContent", "")
        if not audio_b64:
            raise BhashiniError(STATE_UNAVAILABLE, "inference returned no audio")
        return {
            "state": STATE_LIVE,
            "kind": kind,
            "spokenText": text,
            "audioBase64": audio_b64,
            "audioFormat": "wav",
            "serviceId": cfg.get("serviceId"),
            "latencyMs": latency_ms,
            "at": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
            "rawResponseHash": raw_hash,
            "chemicalContent": False,
        }


def adapter_from_env() -> BhashiniAdapter:
    """Per-request factory — env is read at call time (matches the demo
    security module pattern and keeps tests on monkeypatch.setenv simple)."""
    return BhashiniAdapter()
