# Mobile and Offline Field Validation Protocol

## Evidence status

FarmGraph Rakshak has two separate mobile evidence layers:

1. **Automated browser-device proof** — executable in Playwright using the Pixel 7 device profile. It validates the PWA manifest, service-worker control, command-centre rendering, absence of horizontal overflow and a hard offline reload at both the domain root and GitHub Pages project subpath.
2. **Physical-device field proof** — must be performed on a real Android phone before claiming field-device validation. This document is the sign-off protocol; an unchecked item is not a claim.

Automated evidence is produced by `tests/e2e/mobile-offline.spec.ts` and retained in the `browser-evidence-root-*` and `browser-evidence-subpath-*` CI artifacts.

## Required physical test devices

Minimum release evidence:

| Device class | Browser | Network conditions | Required |
|---|---|---|---|
| Android 10+ budget phone, ≤4 GB RAM | Current Chrome | Wi-Fi, 4G, airplane mode | Yes |
| Android 13+ mid-range phone | Current Chrome | Wi-Fi, throttled 3G, airplane mode | Yes |
| Desktop/laptop | Chrome or Edge | Online and offline | Yes |

Record the exact device model, Android version, browser version, date, tester and deployed commit.

## Physical test procedure

### A. Installation and first load

- [ ] Open the deployed URL from a clean browser profile.
- [ ] Confirm the page identifies itself as a simulated/standalone demo when no API is configured.
- [ ] Confirm the PWA install option is available.
- [ ] Install the PWA and open it from the home-screen icon.
- [ ] Confirm the command centre loads without horizontal scrolling.
- [ ] Capture a screenshot including the device status bar and app content.

### B. Field capture and persistence

- [ ] Give explicit demo consent.
- [ ] Select or capture a real non-sensitive crop image.
- [ ] Confirm the image is re-encoded and a hash/quality result appears.
- [ ] Record a Hindi voice note.
- [ ] Confirm the recording persists after leaving and returning to the page.
- [ ] Enter or confirm the transcript.
- [ ] Confirm no Aadhaar, Jan Aadhaar, name or phone number is requested.

### C. Hard offline operation

- [ ] Load the command centre once online.
- [ ] Enable airplane mode and verify mobile data and Wi-Fi are both disabled.
- [ ] Force-close and reopen the installed PWA.
- [ ] Confirm the command centre still renders.
- [ ] Open the previously visited field-capture route.
- [ ] Confirm existing local evidence remains available.
- [ ] Create a new offline draft and verify a pending-sync state is shown.
- [ ] Capture screenshots of the offline indicator, draft and pending-sync state.

### D. Recovery and idempotency

- [ ] Restore connectivity.
- [ ] Confirm the app reports online status.
- [ ] Trigger the pending sync once.
- [ ] Confirm the same evidence is not duplicated after refresh or repeated sync.
- [ ] Confirm the final state remains traceable in the case timeline.

### E. Accessibility and language

- [ ] Verify touch targets are usable without zoom.
- [ ] Verify text remains legible at 200% Android font scaling.
- [ ] Verify Hindi labels/transcript controls render correctly.
- [ ] Verify Marwari/Mewari is labelled as recorded regional speech requiring human review; do not claim dialect ASR.
- [ ] Verify screen-reader focus order on the primary capture controls.

### F. Performance and failure recovery

- [ ] Record cold-load time on 4G and throttled 3G.
- [ ] Confirm a corrupt or unsupported file is rejected with a clear message.
- [ ] Confirm a dark/blurred frame produces recapture guidance.
- [ ] Confirm the app recovers after the browser is killed during an offline draft.
- [ ] Confirm storage-full or permission-denied errors are visible and do not silently discard evidence.

## Sign-off record

Complete one table per device:

| Field | Value |
|---|---|
| Commit SHA | |
| Deployment URL | |
| Device / Android | |
| Browser version | |
| Test date and timezone | |
| Tester | |
| Installation | PASS / FAIL |
| Online capture | PASS / FAIL |
| Hard offline reopen | PASS / FAIL |
| Offline draft persistence | PASS / FAIL |
| Recovery / no duplicate | PASS / FAIL |
| Hindi rendering | PASS / FAIL |
| Accessibility | PASS / FAIL |
| Evidence folder / link | |
| Open defects | |
| Final sign-off | APPROVED / BLOCKED |

## Claim rule

Only after the required physical-device tables are completed and evidence is retained may the submission say:

> Validated on physical Android devices under online, degraded-network and airplane-mode conditions.

Until then, the accurate wording is:

> Pixel-class automated PWA and hard-offline browser tests are implemented; physical Android field sign-off is pending.
