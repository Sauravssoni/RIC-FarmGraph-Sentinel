# FarmGraph Rakshak — Decision Intelligence Evidence Note

## Purpose

The Decision Intelligence layer turns FarmGraph from a case-recording dashboard into an operating system for district crop-health response. It is designed to reduce repetitive manual coordination while keeping agronomic decisions under expert control.

It answers four operational questions:

1. How many expert decisions are likely in the next 72 hours?
2. Which pilot district is genuinely trending upward?
3. Which KVK referrals are overdue or likely to breach within 24 hours?
4. Which three actions should the operating team take first?

The implementation is in `apps/web/src/lib/decisionIntelligence.ts` and is rendered in `/command-centre/`.

## Inputs

| Signal | Source | Role |
|---|---|---|
| Case creation and state history | FarmGraph case records | Seven-day trend, current backlog and district movement |
| Expert queue | Explainable expert-priority engine | Current structured decision load |
| Cluster temporal growth | Outbreak engine | Short-horizon growth uplift |
| Cluster weather suitability | IMD adapter hierarchy or clearly labelled fallback | Weather-context uplift; source state remains visible |
| Mission representative cases | Field-mission engine | Batching and avoided-repeat-visit estimate |
| Referral status and due time | KVK support workflow | Overdue and due-soon SLA detection |
| Pending offline sync | Offline outbox | Data-freshness risk and recovery action |

Government or public inputs are never silently treated as live. IMD, Bhashini, AGMARKNET/data.gov.in and authority-gated Rajasthan systems retain their live, cached, credentials-required, public-directory or awaiting-authority state.

## Operational clock

The deterministic seed contains a demo clock, but interactive case, review, follow-up, mission and referral actions may occur later. Decision Intelligence therefore anchors its windows to the latest recorded operational event across:

- case creation and update;
- observation, review, follow-up and timeline events;
- outcome updates;
- mission creation, completion and visits;
- referral creation and status history.

Future referral deadlines are deliberately excluded from the clock calculation. This keeps new interactive activity inside the forecast without moving the present time forward merely because a due date exists.

## 72-hour signal forecast

The forecast is deterministic and explainable.

```text
baseline daily signals
  = max(average reports over the last 3 observed days,
        open cases / 14)

growth uplift
  = clamp(0.25 × average active-cluster temporal growth
        + 0.15 × average active-cluster weather suitability,
          0,
          0.45)

forecast day d
  = round(baseline daily signals × (1 + growth uplift × d/3))
```

The command centre shows seven observed daily values and three forecast values. Forecast bars are visually distinct from observations.

## Expert workload forecast

```text
expert share
  = clamp(cases currently requiring expert review / open cases,
          0.25,
          0.80)

expected expert decisions in 72h
  = current ranked expert queue
    + round(sum of forecast signals × expert share)
```

This is an operational staffing forecast. It is not a disease-probability or epidemiological forecast.

## Rising-district detection

For each pilot district, the engine compares case creation in the latest 72 hours with the preceding 72 hours and retains:

- recent signals;
- previous signals;
- change;
- current open cases;
- current expert backlog.

Only districts with a strictly positive recent-versus-prior change are classified as rising. Rising districts are ranked by signal increase, then expert backlog, then open-case count. If all districts are flat or falling, the dashboard shows **No upward district trend** and does not emit a capacity-pre-positioning action.

## KVK SLA state

Open referrals are partitioned into two non-overlapping groups:

- **Overdue:** `dueAt <= operationalNow`.
- **Due soon:** `operationalNow < dueAt <= operationalNow + 24 hours`.

Overdue referrals receive an immediate recovery/escalation action. Due-soon referrals receive a preventative SLA-protection action. Completed and responded referrals are excluded.

## Ranked next-best actions

Actions are generated from auditable triggers:

| Trigger | Recommended action |
|---|---|
| Referral already overdue | Recover, reassign or update KVK referral immediately |
| Referral due within 24h | Protect or escalate KVK SLA before breach |
| Positive district signal growth | Pre-position expert capacity |
| Highest active cluster | Verify or contain representative cases |
| Pending offline reports | Recover sync backlog |
| Expert queue backlog | Clear the top ranked decisions |

The dashboard shows the input evidence beneath every recommendation and links directly to the workflow where the officer can act.

## Manual-overload reduction estimate

The displayed value is an explicit planning estimate per operating review cycle:

| Automated task | Assumption |
|---|---:|
| Expert-queue ranking | 5 minutes per queued case |
| Evidence-quality or duplicate pre-check | 4 minutes per affected case |
| Cluster synthesis | 10 minutes per active cluster |
| KVK referral-pack preparation | 8 minutes per open referral |
| Representative mission batching | 12 minutes per additional batched stop |

The estimate is recalculated from current state. It is labelled **estimated**, its assumptions are visible in the interface, and it must not be described as measured field impact until a pilot time-and-motion study is completed.

## Human control and safety

The intelligence layer may:

- forecast operational workload;
- rank review and coordination actions;
- distinguish overdue and due-soon SLA work;
- recommend mission batching;
- explain why an item is prioritised.

It may not:

- confirm a disease;
- prescribe a chemical;
- mark a KVK referral delivered;
- promote a model;
- override an expert review;
- treat simulated or cached government data as live.

## Verification

Unit coverage is in `apps/web/tests/decisionIntelligence.test.ts` and verifies:

- seven observed plus three forecast points;
- a fixed 72-hour horizon;
- forecast expert load not below the current queue;
- a non-zero workload estimate for the deterministic pilot;
- bounded ranked actions;
- critical prioritisation of an imminent KVK SLA risk;
- separate overdue-referral handling;
- advancement of the operational clock after an interactive post-seed event;
- no rising-district action when all district flow is flat;
- disclosure of deterministic-pilot limitations.

The final release gate must run lint, strict TypeScript, Vitest, production static export and browser E2E against the merged submission commit.

## Evaluator-safe claim

> FarmGraph Rakshak uses explainable decision intelligence to forecast short-horizon operating load, identify genuinely rising districts, separate overdue from due-soon KVK work, batch field response and rank the next best actions—reducing repetitive coordination while preserving expert control over agronomic decisions.
