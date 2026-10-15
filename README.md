# Field Test Operations Dashboard

[![CI](https://github.com/TectiveJK/Field-Test-Operations-Dashboard./actions/workflows/ci.yml/badge.svg)](https://github.com/TectiveJK/Field-Test-Operations-Dashboard./actions/workflows/ci.yml)

**Current version:** `0.2.8`

## Open the app

**[Open Field Test Operations Dashboard](https://tectivejk.github.io/Field-Test-Operations-Dashboard./)**

That is the live GitHub Pages app (**0.2.8**). GitHub `main` and Origin are on the same commit. Use it in a desktop browser, or in **Safari** on iPhone / iPad (Share → Add to Home Screen). If an older seed is still on the device, hard-refresh or tap **Reset to source apps**.

Daily command center for Tective field-test operations. Built for a Field Test Engineer / Operator working with **SkyCommand**, **SkyHive**, **PX4**, **QGroundControl** and **ReFly**.

This hub does **not** invent a test day. It only shows records that already exist in the Tective apps:

| This hub | Source |
| --- | --- |
| **Plan** | [Upcoming flights & tests](https://tectivejk.github.io/Upcoming-Test-Flights/) live board. Add, edit or remove flights and tests here; that board updates. |
| **Fleet / Deploy** | [Hardware locator](https://tectivejk.github.io/Updating-hardware/) company list (airframes, hive, rotator, batteries) plus [Drone Flight Test Reporter](https://tectivejk.github.io/drone-flight-test-reporter/) equipment names. Locations are read from and written to that same list. The locator app is not modified. |
| **Tests** | [SIM Flight Testing](https://tectivejk.github.io/sim-testing-app/) 20-mission catalog, last run, and `.deb` artifact names |
| **Issues / reports / runs** | Failed and blocked missions from the last [SIM Flight Testing](https://tectivejk.github.io/sim-testing-app/) run. That snapshot is shared between laptop and iPhone. Maintenance Assistant still has none stored. |

This app does **not** replace the existing tools. It connects them into one workspace so you can open it in the morning and immediately answer:

1. **What do I need to test today?**
2. **What problems are still unresolved?**
3. **What should we test next, based on previous flights?**

It is a responsive web app for **iPhone**, **iPad** and **Linux**. After the first load it works **offline**, so you can record results on the range without internet.

## Repositories

The same codebase lives in two places. They are in sync at `0.2.8`. Publish later Origin commits with `git push github main`.

| Copy | URL | Role |
| --- | --- | --- |
| **Live app** | https://tectivejk.github.io/Field-Test-Operations-Dashboard./ | GitHub Pages site |
| **GitHub** | https://github.com/TectiveJK/Field-Test-Operations-Dashboard. | Public source of truth, CI, Pages |
| **Origin** | https://cursor.com/codebase/john-kokotinis/field-test-dashboard | Private Cursor copy |

Origin visibility is **private**. Change that in settings on the browse page.

A push to GitHub `main` builds the static app and publishes the `gh-pages` branch.

## Why this exists

Five tools already cover reporting, maintenance, planning, simulator testing and hardware locations:

| Area | Tool | What this hub uses from it |
| --- | --- | --- |
| Reporting | [Drone Flight Test Reporter](https://tectivejk.github.io/drone-flight-test-reporter/) | Equipment list (ReFly / SkyHive / rotator / packs). Saved flight reports stay in that app until imported. |
| Maintenance | [Drone Maintenance Assistant](https://tectivejk.github.io/drone-maintenance-assistant/) | Fleet, faults and inspections if that app has any. It currently stores none. |
| Planning | [Upcoming flights & tests](https://tectivejk.github.io/Upcoming-Test-Flights/) | The live shared board. This hub reads it and can add, edit or remove flights and tests. That app is not modified. |
| Simulator testing | [SIM Flight Testing](https://tectivejk.github.io/sim-testing-app/) | The 20 SkyCommand simulator missions, FAIL / BLOCKED items from the last scored run, and `.deb` artifact names. That snapshot is shared between laptop and iPhone. |
| Locations | [Hardware locator](https://tectivejk.github.io/Updating-hardware/) | Live company list. This hub reads it and can update location / who / note, or add an item. The locator app itself is unchanged; phones keep using it. |

The operations dashboard is the home screen for the day, with the other modules sharing the same records.

## Modules

| Screen | What you use it for |
| --- | --- |
| **Today** | Tective banner, GO / CONDITIONAL / NO-GO, the three questions, **Add flight** / **Add test** (including on “What should we test next?”), daily summary, fleet snapshot, links to the existing apps |
| **Plan** | Shared Upcoming board. **Add flight** / **Add test**, edit or remove, and mark Planned / In progress / Done / Skipped |
| **Tests** | SIM Flight Testing catalog. Record a run here if you want it on this hub |
| **Fleet** | Aircraft, hive, rotator and batteries from the Hardware locator list. **Update location** / **Add hardware** writes that company list. Airframes also show available / under test / grounded. |
| **Issues** | Bug tracker: id, severity, drone, build, steps, expected vs actual, assignee, retest |
| **Deploy** | Pre-departure checklist with live locations; **Update location** on aircraft, packs and rotator |
| **Reports** | Flight-report index, evidence organizer (ULog / QGC / pcap names), knowledge notes |

A failed simulator or field run can create an issue, keep the ULog against that drone and build, show on Today as an outstanding retest, and later be compared with the next Jenkins build.

When this hub and SIM Flight Testing share the GitHub Pages origin (`tectivejk.github.io`), FAIL and BLOCKED results from the last SIM run are copied into Issues, Tests and Reports. Open this hub on the laptop after a SIM run (or leave it open) so the iPhone receives the same snapshot.

Hardware locations use the same Google Sheet the locator app writes. You can **Update location** on Fleet or Deploy, or **Add hardware** on Fleet. Phones that still open the locator see those changes. This repo does not change the locator app. **Out of service** is shown as grounded.

## Shared records

Every module uses the same objects. That is the foundation for adding more later without duplicating data.

| Record | Holds |
| --- | --- |
| **Drone** | Id, family (ReFly IBB / SF, SkyHive, rotator, battery), status, hardware, location, holder, gimbal, parameters, current build |
| **SoftwareBuild** | Jenkins number, PX4, SkyCommand, SkyHive, GCS package, autonomy-node |
| **TestCase** | Numbered steps, mission type, field / simulator |
| **TestRun** | Result (pass / fail / blocked / not-run / aborted / observations), measurements, links to drone + build + issues + evidence |
| **Issue** | Unique id, severity, reproduce steps, expected vs actual, retest result |
| **FlightReport** | Test-day summary linking runs and airframes |
| **Evidence** | ULog, QGC screenshot, Wireshark, video or note, tied to drone, run, build and issue |

## Features that matter in the field

- Automatic **daily summary**: completed tests, failures, open issues, remaining plan, grounded airframes
- **Evidence organizer**: attach a filename on the pad even when you cannot upload the file
- **Test comparison**: two runs of the same mission, including result, configuration and measurements (manual entry now; ULog parsing later)
- **Update location** on Fleet and Deploy writes the company Hardware locator list (phones still see it). The locator app is not modified. Fleet shows every locator item, not only airframes.
- **Laptop and iPhone share one live copy** of hub ticks, issues, the last SIM run, and SIM `.deb` artifact names. Hardware locations already use the locator list. **Add flight** / **Add test** on Plan writes the Upcoming board, so that app sees it too. Open this hub on the laptop after a SIM run (or leave it open) so the phone can pick up SIM results. No login.
- **Reset to source apps** reloads Reporter equipment, Hardware locator locations, the SIM catalog, the Upcoming flights board, and the last shared SIM FAIL / BLOCKED items. It does not invent a test day.

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

### Publish Origin commits to GitHub Pages

This is the path that works from an Origin clone. Add the GitHub remote once, then push `main`:

```bash
cd field-test-dashboard
git remote add github https://github.com/TectiveJK/Field-Test-Operations-Dashboard..git
git push github main
```

If the `github` remote already exists:

```bash
git pull
git push github main
```

GitHub Actions then publishes https://tectivejk.github.io/Field-Test-Operations-Dashboard./

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

Hub ticks, the last SIM run, and artifact names are shared with the laptop. Flights and tests you add on Plan write the Upcoming board, so that app and other phones see them. If the home-screen copy looks old, hard-refresh or tap **Reset to source apps**.

### Offline

The first online load caches the app shell. After that you can still:

- change GO / NO-GO
- tick plan and deploy checklist items
- record a test result
- log an issue and attach evidence names

**Update location**, **Add hardware**, **Add flight** / **Add test**, and sharing the last SIM run with the iPhone need a network connection. A banner appears when there is no network. Hardware locations, the Upcoming board, and the shared hub snapshot refresh when you are online again, and when you reopen the app.

## Project structure

```
src/app/              routes: Today, Plan, Tests, Fleet, Issues, Deploy, Reports
src/components/       boards, dialogs, shell
src/lib/types.ts      shared records
src/lib/from-apps.ts  Reporter equipment, SIM catalog, Upcoming board, locator
src/lib/hardware.ts   Hardware locator list: read and write the existing company sheet
src/lib/hub-sync.ts   Shared laptop / iPhone snapshot (last SIM run, hub ticks)
src/components/hardware-dialog.tsx  Update location / Add hardware
src/components/plan-dialog.tsx      Add / edit flights and tests on the Upcoming board
src/lib/sim-import.ts last SIM FAIL / BLOCKED run → issues, runs, reports, artifacts
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

**0.2.8 is live on GitHub Pages.** Today shows the Tective company photo instead of “What needs attention”, and **Add test** is on “What should we test next?”. **Add flight** / **Add test** still write the Upcoming board. Hub ticks, the last SIM run, and artifact names stay shared between laptop and iPhone.

## Links

- Live: https://tectivejk.github.io/Field-Test-Operations-Dashboard./
- GitHub: https://github.com/TectiveJK/Field-Test-Operations-Dashboard.
- Origin: https://cursor.com/codebase/john-kokotinis/field-test-dashboard
- Upcoming flights & tests: https://tectivejk.github.io/Upcoming-Test-Flights/
- Hardware locator: https://tectivejk.github.io/Updating-hardware/
- Origin CLI: https://cursor.com/docs/origin/cli
