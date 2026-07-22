# FarmGraph Rakshak — Decision Intelligence Evidence Note

## Purpose

The Decision Intelligence layer turns FarmGraph from a case-recording dashboard into an operating system for district crop-health response. It is designed to reduce repetitive manual coordination while keeping agronomic decisions under expert control.

It answers four operational questions:

1. How many expert decisions are likely in the next 72 hours?
2. Which pilot district is trending upward?
3. Which KVK referral SLA is likely to breach within 24 hours?
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
| Referral status and due time | KVK support workflow | 24-hour SLA-risk detection |
| Pending offline sync | Offline outbox | Data-freshness risk and recovery action |

Government or public inputs are never silently treated as live. IMD, Bhashini, AGMARKNET/data.gov.in and authority-gated Rajasthan systems retain their live, cached, credentials-required, public-directory or awaiting-authority state.

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

Districts are ranked by signal increase, then expert backlog, then open-case count. The highest-ranked district becomes a capacity-pre-positioning recommendation.

## KVK SLA-risk prediction

An open referral is marked at risk when its `dueAt` time falls within the next 24 hours. Completed and responded referrals are excluded. The action is ranked critical because it prevents an externally visible service-delivery failure.

## Ranked next-best actions

Actions are generated from auditable triggers:

| Trigger | Recommended action |
|---|---|
| Referral due within 24h | Protect or escalate KVK SLA |
| District signal growth | Pre-position expert capacity |
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
- detect SLA risk;
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
- critical prioritisation of an imminent KVK SLA breach;
- disclosure of deterministic-pilot limitations.

The final release gate must run lint, strict TypeScript, Vitest, production static export and browser E2E against the merged submission commit.

## Evaluator-safe claim

> FarmGraph Rakshak uses explainable decision intelligence to forecast short-horizon operating load, identify rising districts, protect KVK SLAs, batch field work and rank the next best actions—reducing repetitive coordination while preserving expert control over agronomic decisions.
