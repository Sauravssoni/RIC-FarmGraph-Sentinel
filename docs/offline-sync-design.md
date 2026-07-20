# Offline & Sync Design

## Principle

In the pilot districts, **offline is the normal state**. The design target: a field worker can complete the entire capture workflow with zero connectivity and lose nothing — including across an accidental refresh.

## Layers

1. **App shell (service worker).** `public/sw.js` precaches the shell and cache-first serves `_next/static` assets (`fgr-shell-v1`); navigations are network-first with cache fallback (`fgr-runtime-v1`). Demo-grade, transparent, versioned manually.
2. **Draft (IndexedDB `drafts`).** The scan form autosaves (400 ms debounce) to a single `current` draft. A refresh shows a restore banner with the draft's timestamp; submitting or discarding clears it.
3. **Outbox (IndexedDB `outbox`).** Completed submissions enqueue as `case-report` items with `attempts` and `lastError`. Sync removes items on success; failure records the attempt and keeps the item. Retry is explicit (the worker sees *what* is pending and *why it failed*).
4. **Demo state (localStorage overlay).** The whole demo dataset persists as seed + overlay keyed to `demoNow`; a stale overlay (different scenario timestamp) is discarded automatically.

## Sync semantics (deliberately boring)

- `pendingSync=true` is set at creation when offline; **only** an explicit successful sync clears it (`markSynced`) — adding evidence to a case never silently "syncs" it.
- Pending count in the top bar = outbox items + pendingSync cases; it is a number the worker can act on, not decoration.
- There is **no conflict model** in Task 001 (single-writer demo). Task 002 defines server-authoritative merge: cases are append-only streams, so sync = ordered replay with idempotency keys (`caseId + observationN`); state transitions are validated server-side.

## What "offline-first" explicitly includes here

| Requirement | Where |
|---|---|
| Real PWA manifest + SW | `public/manifest.webmanifest`, `public/sw.js` |
| IndexedDB draft survives refresh | `src/lib/offline.ts`, scan page restore banner |
| Outbox with retry + failure record | `enqueue / markAttempt / removeOutbox` |
| Online indicator + pending-sync count | `TopBar` chip |
| Low-bandwidth mode | `AppProvider` toggle: defers map + heavy panels |
| Simulate-offline switch | demo honesty: judges can watch the outbox fill and drain |
| Draft/queue unit tests | `tests/offline.test.ts` (fake-indexeddb) |

## Explicitly not claimed

- No background-sync API magic (patchy support; explicit sync is more honest for a demo).
- No multi-device conflict resolution (Task 002).
- No claim that the SW makes *government APIs* available offline — only the app shell and demo data.
