# Field Test Operations Dashboard

**Current version:** `0.1.0`

**Live site:** https://tectivejk.github.io/Field-Test-Operations-Dashboard./

Daily command center for Tective field-test operations. Built for a Field Test Engineer / Operator working with **SkyCommand**, **SkyHive**, **PX4**, **QGroundControl** and **ReFly**.

This app does **not** replace the existing tools. It connects them into one workspace so you can open it in the morning and immediately answer:

1. **What do I need to test today?**
2. **What problems are still unresolved?**
3. **What should we test next, based on previous flights?**

It is a responsive web app for **iPhone**, **iPad** and **Linux**. After the first load it works **offline**, so you can record results on the range without internet.

Repository: https://github.com/TectiveJK/Field-Test-Operations-Dashboard.

## Why this exists

Four tools already cover reporting, maintenance, planning and simulator testing:

| Area | Tool | Role |
| --- | --- | --- |
| Reporting | [Drone Flight Test Reporter](https://tectivejk.github.io/drone-flight-test-reporter/) | Multi-flight PDF / JSON / evidence ZIP |
| Maintenance | [Drone Maintenance Assistant](https://tectivejk.github.io/drone-maintenance-assistant/) | Inspections, batteries, faults, log retrieval |
| Planning | **This hub → Plan** | Today’s sorties, so nothing is forgotten |
| Simulator testing | **This hub → Tests** | Regression library, Jenkins builds, retests |

The fifth piece is the operations dashboard: one home screen for the day, with the other modules sharing the same records.

## Modules

| Screen | What you use it for |
| --- | --- |
| **Today** | The three questions, GO / CONDITIONAL / NO-GO, daily summary, fleet snapshot, links to the existing apps |
| **Plan** | Planned flights and tests. Mark Planned / In progress / Done / Skipped |
| **Tests** | Reusable cases (corridor, ROI, Go To, Resume, GNSS-denied, AprilTag, kill-switch). Record a run. Compare two runs of the same mission |
| **Fleet** | Drones available, under test or grounded. Jenkins / PX4 / SkyCommand / SkyHive / QGC versions. Compare two airframes |
| **Issues** | Bug tracker: id, severity, drone, build, steps, expected vs actual, assignee, retest |
| **Deploy** | Pre-departure checklist: drones, packs, Hive, tracking antenna, Starlink, generator, QGC, joysticks, SIM/GCS laptop, weather and safety. Who ticked it, and when |
| **Reports** | Flight-report index, evidence organizer (ULog / QGC / pcap names), knowledge notes |

A failed simulator or field run can create an issue, keep the ULog against that drone and build, show on Today as an outstanding retest, and later be compared with the next Jenkins build.

## Shared records

Every module uses the same objects. That is the foundation for adding more later without duplicating data.

| Record | Holds |
| --- | --- |
| **Drone** | Id, family (ReFly IBB / SF, SkyHive), status, hardware, parameters, current build |
| **SoftwareBuild** | Jenkins number, PX4, SkyCommand, SkyHive, GCS package, autonomy-node |
| **TestCase** | Numbered steps, mission type, field / simulator |
| **TestRun** | Result (pass / fail / blocked / not-run / aborted / observations), measurements, links to drone + build + issues + evidence |
| **Issue** | Unique id, severity, reproduce steps, expected vs actual, retest result |
| **FlightReport** | Test-day summary linking runs and airframes |
| **Evidence** | ULog, QGC screenshot, Wireshark, video or note, tied to drone, run, build and issue |

## Features that matter in the field

- Automatic **daily summary**: completed tests, failures, open issues, remaining plan
- **Evidence organizer**: attach a filename on the pad even when you cannot upload the file
- **Test comparison**: two runs of the same mission, including result, configuration and measurements (manual entry now; ULog parsing later)
- **Config diff**: if one drone passes and another fails, compare firmware and parameters instead of guessing
- Local storage only — no server, no login. **Reset demo data** restores the seeded Marknesse test day

## Setup

Linux laptop (or any machine with Node 22):

```bash
git clone https://github.com/TectiveJK/Field-Test-Operations-Dashboard..git
cd Field-Test-Operations-Dashboard.
npm install
npm run dev
```

Open http://127.0.0.1:43180

The GitHub repo name ends with a period, so the clone URL has two dots before `git`.

### iPhone / iPad

Open this address in **Safari** (not Chrome):

https://tectivejk.github.io/Field-Test-Operations-Dashboard./

Then Share → **Add to Home Screen**. The app opens as FTOD. Data stays on that device until you export or reset.

### Offline

The first online load caches the app shell. After that you can still:

- change GO / NO-GO
- tick plan and deploy checklist items
- record a test result
- log an issue and attach evidence names

A banner appears when there is no network.

## Project structure

```
src/app/            routes: Today, Plan, Tests, Fleet, Issues, Deploy, Reports
src/components/     boards, dialogs, shell
src/lib/types.ts    shared records
src/lib/seed.ts     Marknesse demo day (ReFly / SkyHive / Jenkins 1855)
src/lib/store.tsx   local persistence
public/sw.js        offline cache
```

## Scripts

```bash
npm run dev        # http://127.0.0.1:43180
npm run build
npm run start
npm run lint
npm run typecheck
```

## Status

Active development. Current slice is the operations hub with shared records. Existing Reporter and Maintenance apps stay as they are. Next steps that fit this structure: import Flight Test Reporter JSON, attach real ULogs, and automate daily summary from those files.

## GitHub

- Source: https://github.com/TectiveJK/Field-Test-Operations-Dashboard.
- Live: https://tectivejk.github.io/Field-Test-Operations-Dashboard./

GitHub Pages deploys from `main` via `.github/workflows/pages.yml`.
