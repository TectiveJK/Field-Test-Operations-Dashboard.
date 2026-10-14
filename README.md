# Field Test Operations Dashboard

[![CI](https://github.com/TectiveJK/Field-Test-Operations-Dashboard./actions/workflows/ci.yml/badge.svg)](https://github.com/TectiveJK/Field-Test-Operations-Dashboard./actions/workflows/ci.yml)

**Current version:** `0.2.3`

## Open the app

**[Open Field Test Operations Dashboard](https://tectivejk.github.io/Field-Test-Operations-Dashboard./)**

That is the live GitHub Pages app. Use it in a desktop browser, or in **Safari** on iPhone / iPad (Share → Add to Home Screen). If an older seed is still on the device, hard-refresh or tap **Reset to source apps**.

Daily command center for Tective field-test operations. Built for a Field Test Engineer / Operator working with **SkyCommand**, **SkyHive**, **PX4**, **QGroundControl** and **ReFly**.

This hub does **not** invent a test day. It only shows records that already exist in the Tective apps:

| This hub | Source |
| --- | --- |
| **Plan** | [Upcoming flights & tests](https://tectivejk.github.io/Upcoming-Test-Flights/) live board |
| **Fleet / Deploy** | [Drone Flight Test Reporter](https://tectivejk.github.io/drone-flight-test-reporter/) equipment list, plus live locations from [Hardware locator](https://tectivejk.github.io/Updating-hardware/) |
| **Tests** | [SIM Flight Testing](https://tectivejk.github.io/sim-testing-app/) 20-mission catalog |
| **Issues / reports / runs** | Failed and blocked missions from the last [SIM Flight Testing](https://tectivejk.github.io/sim-testing-app/) run in this browser. Maintenance Assistant still has none stored. |

This app does **not** replace the existing tools. It connects them into one workspace so you can open it in the morning and immediately answer:

1. **What do I need to test today?**
2. **What problems are still unresolved?**
3. **What should we test next, based on previous flights?**

It is a responsive web app for **iPhone**, **iPad** and **Linux**. After the first load it works **offline**, so you can record results on the range without internet.

## Repositories

The same codebase is kept in two places. GitHub is the public source of truth and publishes Pages. Origin is the private Cursor copy used by agents.

| Copy | URL | Role |
| --- | --- | --- |
| **Live app** | https://tectivejk.github.io/Field-Test-Operations-Dashboard./ | GitHub Pages site |
| **GitHub** | https://github.com/TectiveJK/Field-Test-Operations-Dashboard. | Public source, CI, Pages |
| **Origin** | https://cursor.com/codebase/john-kokotinis/field-test-dashboard | Private Cursor copy |

Origin visibility is **private**. Change that in settings on the browse page.

A push to GitHub `main` builds the static app and publishes the `gh-pages` branch.

## Why this exists

Five tools already cover reporting, maintenance, planning, simulator testing and hardware locations:

| Area | Tool | What this hub uses from it |
| --- | --- | --- |
| Reporting | [Drone Flight Test Reporter](https://tectivejk.github.io/drone-flight-test-reporter/) | Equipment list (ReFly / SkyHive / rotator / packs). Saved flight reports stay in that app until imported. |
| Maintenance | [Drone Maintenance Assistant](https://tectivejk.github.io/drone-maintenance-assistant/) | Fleet, faults and inspections if that app has any. It currently stores none. |
| Planning | [Upcoming flights & tests](https://tectivejk.github.io/Upcoming-Test-Flights/) | The live shared board (TALON, ReLION, Arctus, and so on). |
| Simulator testing | [SIM Flight Testing](https://tectivejk.github.io/sim-testing-app/) | The 20 SkyCommand simulator missions, plus FAIL / BLOCKED items from the last scored run. |
| Locations | [Hardware locator](https://tectivejk.github.io/Updating-hardware/) | Live company list: where each airframe, pack, hive and rotator is. This hub only reads it. |

The operations dashboard is the home screen for the day, with the other modules sharing the same records.

## Modules

| Screen | What you use it for |
| --- | --- |
| **Today** | The three questions, GO / CONDITIONAL / NO-GO, daily summary, fleet snapshot, links to the existing apps |
| **Plan** | Copied from Upcoming flights & tests. Mark Planned / In progress / Done / Skipped |
| **Tests** | SIM Flight Testing catalog. Record a run here if you want it on this hub |
| **Fleet** | Drones available, under test or grounded, plus Hardware locator location / holder / gimbal. Compare two airframes |
| **Issues** | Bug tracker: id, severity, drone, build, steps, expected vs actual, assignee, retest |
| **Deploy** | Pre-departure checklist with live locations on aircraft and packs |
| **Reports** | Flight-report index, evidence organizer (ULog / QGC / pcap names), knowledge notes |

A failed simulator or field run can create an issue, keep the ULog against that drone and build, show on Today as an outstanding retest, and later be compared with the next Jenkins build.

When this hub and SIM Flight Testing share the GitHub Pages origin (`tectivejk.github.io`), FAIL and BLOCKED results from the last SIM run are copied into Issues, Tests and Reports automatically.

Hardware locations refresh from the same Google Sheet the locator app writes. **Out of service** is shown as grounded. Change a location in the locator, not here.

## Shared records

Every module uses the same objects. That is the foundation for adding more later without duplicating data.

| Record | Holds |
| --- | --- |
| **Drone** | Id, family (ReFly IBB / SF, SkyHive), status, hardware, location, holder, gimbal, parameters, current build |
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
- Local storage only — no server, no login. **Reset to source apps** reloads Reporter equipment, Hardware locator locations, the SIM catalog, the Upcoming flights board, and the last SIM FAIL / BLOCKED items. It does not invent a test day.

## Clone from GitHub

The GitHub repo name ends with a period, so the clone URL has two dots before `git`.

```bash
git clone https://github.com/TectiveJK/Field-Test-Operations-Dashboard..git
cd Field-Test-Operations-Dashboard.
npm install
npm run dev
```

Open http://127.0.0.1:43180

## Clone from Origin

Private Cursor copy. Origin CLI docs: https://cursor.com/docs/origin/cli

```bash
# Install the Origin CLI
curl -fsSL https://downloads.cursor.com/origin/install.sh | sh

# Sign in (also sets up git credentials)
origin auth login

# Clone the repository
origin repo clone john-kokotinis/field-test-dashboard
```

If `origin` is not found after install, persist `~/.local/bin` on PATH:

```bash
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

Then:

```bash
cd field-test-dashboard
npm install
npm run dev
```

### Keep GitHub and Origin on the same commit

From a GitHub clone, after Origin has newer commits:

```bash
git remote add origin-cursor https://origin.cursor.com/john-kokotinis/field-test-dashboard.git
git fetch origin-cursor
git merge origin-cursor/main
git push origin main
```

### iPhone / iPad

1. Open **Safari** (not Chrome).
2. Go to https://tectivejk.github.io/Field-Test-Operations-Dashboard./
3. Tap Share → **Add to Home Screen**.
4. Open **FTOD** from the home screen.

Data stays on that device until you export or reset.

### Offline

The first online load caches the app shell. After that you can still:

- change GO / NO-GO
- tick plan and deploy checklist items
- record a test result
- log an issue and attach evidence names

A banner appears when there is no network.

## Project structure

```
src/app/              routes: Today, Plan, Tests, Fleet, Issues, Deploy, Reports
src/components/       boards, dialogs, shell
src/lib/types.ts      shared records
src/lib/from-apps.ts  Reporter equipment, SIM catalog, Upcoming board, locator
src/lib/hardware.ts   live Hardware locator list (read-only)
src/lib/sim-import.ts last SIM FAIL / BLOCKED run → issues, runs, reports
src/lib/seed.ts       hub snapshot built from those apps
src/lib/store.tsx     local persistence
public/sw.js          offline cache
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

Active development. The hub does not invent a test day. Plan, fleet, locations and the SIM catalog come from the Tective apps. Issues also include FAIL / BLOCKED missions from the last SIM Flight Testing run stored in this browser (same GitHub Pages origin). Next: import Reporter JSON and Maintenance SQLite when those files are available.

## Links

- Live: https://tectivejk.github.io/Field-Test-Operations-Dashboard./
- GitHub: https://github.com/TectiveJK/Field-Test-Operations-Dashboard.
- Origin: https://cursor.com/codebase/john-kokotinis/field-test-dashboard
- Origin CLI: https://cursor.com/docs/origin/cli
