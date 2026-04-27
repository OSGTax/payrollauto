# Payroll: deploy this app, or finish the conversion tool?

> Status: brainstorm only. Decision deferred. Captured 2026-04-27. Re-read with fresh eyes before deciding.

## Two payroll-adjacent things in flight

1. **This Next.js app (`payrollauto`).** Mobile-first time tracking, manager approvals, admin tools. Originally a green-field build. As of late April 2026 it's far enough along that it's plausibly deployable as the primary payroll capture system.
2. **A separate "payroll conversion tool"** (not in this repo). Takes data exported from our current payroll application — BusyBusy — and converts it into a format Computerease can import.

Both exist because the destination is the same: get clean payroll data into Computerease. They're solving the problem from opposite ends.

## The question

If this app is close to deployable, do we still need to build the BusyBusy → Computerease converter? If we deploy this app instead, BusyBusy goes away as the payroll source of truth and the converter is moot.

Pushing this app to production is bigger than just "ship it" — it changes how time gets captured, how PMs interact with payroll, etc. The converter is smaller in scope but is throwaway work if we deploy.

## Bigger context: where does the AP invoice coding tool live?

See `ap-invoice-coding.md`. That tool is a separate workflow but shares some of the same machinery (Computerease export format, PM users, job/code reference data).

I want to merge these systems eventually. I'm worried about confusing or convoluting things if I try to merge too early — particularly if I'm still mid-flight on payroll.

Two shapes the merge could take:

- **Same repo, same app.** One codebase, multiple workflows under one auth/UI shell. Tighter integration with shared code (job codes, employee data, Computerease export). More risk of stepping on the in-flight payroll work.
- **Same repo, separate apps / packages.** Monorepo. Shared libs for the parts that overlap, separate deployable surfaces. More setup, less risk of cross-contamination.
- **Separate repos entirely.** Cleanest separation. Anything shared (master codes, Computerease mapping) gets duplicated or extracted into a tiny shared package later.

No decision yet. The decision is easier once we know whether this app is actually getting deployed as primary payroll, because that's what dictates how much shared infrastructure exists.

## Things to revisit when deciding

- How much of the payroll app is genuinely production-ready vs "feels close"? (Acceptance, edge cases, real device testing, real data load.)
- What does deploying this app cost in terms of the BusyBusy migration — data, training, change management?
- Is the converter useful as a fallback even if we deploy this app (e.g. transition period, parallel running)?
- What's the smallest thing the AP invoice coding tool needs from payroll? Employees? Jobs? Codes? Auth? Could those be shared without merging the whole UI?

## Out of scope for this file

- Actually deciding.
- Designing the merge.
- Estimating the converter or the deployment work.

This is a pin in the wall, not a plan.
