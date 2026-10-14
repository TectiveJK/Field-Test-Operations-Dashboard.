# Field Test Operations Dashboard

Daily command center for Tective field testing. It does **not** replace the Flight Test Reporter or Maintenance Assistant. It connects those tools into one workspace and answers three questions the moment you open it:

1. What do I need to test today?
2. What problems are still unresolved?
3. What should we test next, based on previous flights?

Built as a responsive web app for iPhone, iPad and Linux. Data lives on the device (`localStorage`) so you can record results without internet. Install it to the home screen (Safari: Share → Add to Home Screen).

## Shared records

Every module uses the same objects:

| Record | Used for |
| --- | --- |
| **Drone** | Available / under test / grounded, hardware, parameters |
| **SoftwareBuild** | Jenkins, PX4, SkyCommand, SkyHive, QGC, autonomy-node |
| **TestCase** | Corridor, ROI, Go To, Resume, GNSS-denied, AprilTag, kill-switch |
| **TestRun** | Result against a drone + build + environment |
| **Issue** | Bug id, severity, steps, expected vs actual, retest |
| **FlightReport** | Index of a test day, linking runs and airframes |
| **Evidence** | ULog / QGC / pcap names tied to drone, run, build, issue |

A failed GNSS-denied run can open an issue, keep the ULog, show on the dashboard as a retest, and later compare against Jenkins 1855 on a different airframe.

## Modules

| Screen | What it is |
| --- | --- |
| **Today** | The three questions, daily summary, fleet snapshot, links to existing apps |
| **Plan** | Today’s sorties — tick Planned / In progress / Done / Skipped |
| **Tests** | Regression library, record a run, compare two runs of the same mission |
| **Fleet** | Airframe status, Jenkins builds, config diff between two drones |
| **Issues** | Bug tracker with retest queue |
| **Deploy** | Pre-departure checklist (Hive, Starlink, generator, QGC, packs) with who/when |
| **Reports** | Flight-report index, evidence organizer, knowledge notes |

## Existing apps (kept)

- [Flight Test Reporter](https://tectivejk.github.io/drone-flight-test-reporter/) — multi-flight PDF/JSON
- [Maintenance Assistant](https://tectivejk.github.io/drone-maintenance-assistant/) — inspections, batteries, faults

Planning and simulator/regression live in this hub so those records stay shared.

## Run locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43180](http://127.0.0.1:43180).

Works offline after the first load (service worker caches the shell). Use **Reset demo data** to restore the seeded Marknesse test day.

## Stack

Next.js, TypeScript, Tailwind CSS, shadcn/ui. No server database — field-first, local-first.
