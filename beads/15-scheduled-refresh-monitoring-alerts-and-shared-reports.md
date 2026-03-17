# Bead 15 — Scheduled refresh, monitoring, alerts, and shared reports

**Purpose**  
Add proactive operations only after the single-domain and portfolio workflows are already trusted.

**Prerequisites**  
Beads 11, 13, and 14, plus stable runtime cost and acceptable false-positive performance.

**Concrete change**  
Implement the first proactive layer:
- Scheduled refresh jobs for a narrow monitored set.
- Alert rules with suppression/deduplication.
- Shared read-only reports with bounded evidence views.
- Optional enrichment such as registration/expiry data if justified.

**Invariants**
- Monitoring must respect a defined noise budget.
- Alerts must never bypass review-only safeguards.
- Shared reports must not expose internal notes or imply completeness for unmanaged zones.
- Monitoring starts small and opt-in.

**Validation / tests**
- Scheduler and retry tests.
- Alert dedup/suppression tests.
- Report permission and redaction tests.
- Trial run on a narrow monitored subset to measure noise rate.

**Rollout or migration notes**
- Start with one alert channel and a small domain subset.
- Do not monitor the whole portfolio by default.

**Rollback plan**
- Disable schedules and alerts.
- Keep manual on-demand analysis and stored snapshots available.

**Definition of done**
- Monitoring has produced at least one validated proactive save without creating unsustainable alert noise.
