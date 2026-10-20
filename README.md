# Field Test Operations Dashboard

[![CI](https://github.com/TectiveJK/Field-Test-Operations-Dashboard./actions/workflows/ci.yml/badge.svg)](https://github.com/TectiveJK/Field-Test-Operations-Dashboard./actions/workflows/ci.yml)

**Current version:** `0.2.25`

## Open the app

**[Open Field Test Operations Dashboard](https://tectivejk.github.io/Field-Test-Operations-Dashboard./)**

That is the live GitHub Pages app after you publish this Origin commit with `git pull origin main && git push github main` (**0.2.25**). GitHub `main` and Origin should then be on the same commit. Use it in a desktop browser, or in **Safari** on iPhone / iPad (Share → Add to Home Screen). The header shows `v0.2.25`. Today shows the last **scored** SIM run. If SIM Flight Testing has 20/20 recorded (including fails) and the shared copy is still empty, this hub merges those scores from the laptop SIM store. Every page has **Export PDF**; Reports writes all pages into one file. If the iPhone home-screen copy looks old, open the `?ftod=0.2.25` Safari link under iPhone / iPad.

Daily command center for Tective field-test operations. Built for a Field Test Engineer / Operator working with **SkyCommand**, **SkyHive**, **PX4**, **QGroundControl** and **ReFly**.

This hub does **not** invent a test day. It only shows records that already exist in the Tective apps:

| This hub | Source |
| --- | --- |
| **Plan** | [Upcoming flights & tests](https://tectivejk.github.io/Upcoming-Test-Flights/) live board. Add, edit or remove flights and tests here; that board updates. |
| **Fleet / Deploy** | [Hardware locator](https://tectivejk.github.io/Updating-hardware/) company list (airframes, hive, rotator, batteries) plus [Drone Flight Test Reporter](https://tectivejk.github.io/drone-flight-test-reporter/) equipment names. Locations are read from and written to that same list, so Fleet and the locator stay in sync. |
| **Tests** | Field flights from [Drone Flight Test Reporter](https://tectivejk.github.io/drone-flight-test-reporter/) plus the [SIM Flight Testing](https://tectivejk.github.io/sim-testing-app/) 20-mission catalog, last run, and `.deb` artifact names |
| **Issues / reports / runs** | Fail flights from the latest [Drone Flight Test Reporter](https://tectivejk.github.io/drone-flight-test-reporter/) campaign, and FAIL / BLOCKED missions from the last [SIM Flight Testing](https://tectivejk.github.io/sim-testing-app/) run. That snapshot is shared between laptop and iPhone. Maintenance Assistant still has none stored. |

This app does **not** replace the existing tools. It connects them into one workspace so you can open it in the morning and immediately answer:

1. **What do I need to test today?**
2. **What problems are still unresolved?**
3. **What should we test next, based on previous flights?**

It is a responsive web app for **iPhone**, **iPad** and **Linux**. After the first load it works **offline**, so you can record results on the range without internet.

## Repositories

The same codebase lives in two places. Publish later Origin commits with `git push github main` so they stay in sync at `0.2.25`.

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
| Reporting | [Drone Flight Test Reporter](https://tectivejk.github.io/drone-flight-test-reporter/) | Equipment list (ReFly / SkyHive / rotator / packs) and the latest saved multi-flight report (flights, overall result, Fail items). Open this hub on the laptop after you save a report so the iPhone receives it. |
| Maintenance | [Drone Maintenance Assistant](https://tectivejk.github.io/drone-maintenance-assistant/) | Fleet, faults and inspections if that app has any. It currently stores none. |
| Planning | [Upcoming flights & tests](https://tectivejk.github.io/Upcoming-Test-Flights/) | The live shared board. This hub reads it and can add, edit or remove flights and tests. That app is not modified. |
| Simulator testing | [SIM Flight Testing](https://tectivejk.github.io/sim-testing-app/) | The 20 SkyCommand simulator missions, FAIL / BLOCKED items from the last scored run, and `.deb` artifact names. That snapshot is shared between laptop and iPhone. |
| Locations | [Hardware locator](https://tectivejk.github.io/Updating-hardware/) | Live company list. Change a location here or in the locator; both apps update. |

The operations dashboard is the home screen for the day, with the other modules sharing the same records.

## Modules

| Screen | What you use it for |
| --- | --- |
| **Today** | GO / CONDITIONAL / NO-GO, **Last field report** (Unmanned Valley flights, overall result, equipment), **Last SIM run** (score and `.deb` names), the three questions, **Edit title** next to each flight or test on questions 1 and 3, **Add flight** / **Add test**, **Test history** of Done items after their day, skipped items carried into “What should we test next?”, **Latest results** from today’s reporter flights, daily summary, fleet snapshot, **Export PDF** of this page |
| **Plan** | Shared Upcoming board. **Add flight** / **Add test**, edit or remove, and mark Planned / In progress / Done / Skipped. Below that, **What should we test next?** lists the same skipped / next items as Today question 3. **Export PDF** of this page. |
| **Tests** | Field flights from Drone Flight Test Reporter plus the SIM Flight Testing catalog. Record a run here if you want it on this hub. **Export PDF** of this page. |
| **Fleet** | Aircraft, hive, rotator and batteries from the Hardware locator list. **Update location** / **Add hardware** writes that company list. Airframes also show available / under test / grounded. **Export PDF** of this page. |
| **Issues** | Bug tracker: id, severity, drone, build, steps, expected vs actual, assignee, retest. Fail items from the latest field report and FAIL / BLOCKED from the last SIM run. **Export PDF** of this page. |
| **Deploy** | Pre-departure checklist with live locations; **Update location** on aircraft, packs and rotator. **Export PDF** of this page. |
| **Reports** | Flight-report index, evidence organizer (ULog / QGC / pcap names), knowledge notes. **Export PDF** writes **every page** into one file. |

A failed simulator or field run can create an issue, keep the ULog against that drone and build, show on Today as an outstanding retest, and later be compared with the next Jenkins build.

When this hub, Drone Flight Test Reporter and SIM Flight Testing share the GitHub Pages origin (`tectivejk.github.io`), the latest saved field report and the last SIM FAIL / BLOCKED results are copied into Issues, Tests and Reports. Open this hub on the laptop after you save a reporter campaign or score a SIM run (or leave it open) so the iPhone receives the same snapshot. The 19 Oct 2026 Unmanned Valley / Field 10 campaign is the starting field report when the reporter store has not been read yet. Later saves in the reporter app replace it.

Hardware locations use the same Google Sheet the locator app writes. **Update location** on Fleet or Deploy, or **Add hardware** on Fleet, and the locator app shows it. Change a location in the locator and Fleet updates. On GitHub Pages they also share a same-origin cache, so the other tab updates immediately. **Out of service** is shown as grounded.

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
- **Update location** on Fleet and Deploy writes the company Hardware locator list. The locator app updates too, and a location change in the locator shows on Fleet. Fleet shows every locator item, not only airframes.
- **Laptop and iPhone share one live copy** of hub ticks, issues, the latest field report, the last SIM run, and SIM `.deb` artifact names. Hardware locations already use the locator list. **Add flight** / **Add test** on Plan writes the Upcoming board, so that app sees it too. Open this hub on the laptop after you save a reporter campaign or score a SIM run (or leave it open) so the phone can pick up those results. No login.
- **Reset to source apps** reloads Reporter equipment and the latest field report, Hardware locator locations, the SIM catalog, the Upcoming flights board, and the last shared SIM FAIL / BLOCKED items. It does not invent a test day.
- **Export PDF** on Today, Plan, Tests, Fleet, Issues and Deploy writes that page. **Export PDF** on Reports writes all seven pages.
- Header **weather** for the Delft site: condition, °C, wind m/s and gusts from Open-Meteo. Last reading is kept for offline.

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

If the `github` remote already exists, run this **inside the clone** (not from `~`). The branch is `main`, not `master`:

```bash
cd field-test-dashboard
git fetch origin
git checkout main
git pull origin main
git push github main
```

If `git checkout main` fails because this copy only has `master`:

```bash
git fetch origin
git checkout -B main origin/main
git push github main
```

If GitHub rejects the push (`fetch first`), GitHub has a commit this clone does not. Pull it, then push:

```bash
git fetch github
git merge github/main
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

Hub ticks, the latest field report, the last SIM run, and artifact names are shared with the laptop. Flights and tests you add on Plan write the Upcoming board, so that app and other phones see them.

The iPhone home-screen app cannot read Drone Flight Test Reporter or SIM Flight Testing storage directly. After you save a field report or score a SIM run (or change packages), open this hub **on the laptop in the same browser as those apps** while online. Wait until Today shows **Last field report** and **Last SIM run**. Then reopen FTOD on the iPhone.

Safari keeps a home-screen copy of the app. After GitHub Actions is green, open this URL **in Safari** (not Chrome, and not the home-screen icon first):

https://tectivejk.github.io/Field-Test-Operations-Dashboard./?ftod=0.2.25

Pull down to refresh until the header shows `v0.2.25`. Then tap the menu (top left) → **Reset to source apps**. After that, open the **FTOD** home-screen icon. If it is still old:

1. Swipe FTOD out of the app switcher, then open it again.
2. Last resort: delete the home-screen icon and Add to Home Screen from Safari again.

### Offline

The first online load caches the app shell. After that you can still:

- change GO / NO-GO
- tick plan and deploy checklist items
- record a test result
- log an issue and attach evidence names

**Update location**, **Add hardware**, **Add flight** / **Add test**, and sharing the latest field report or last SIM run with the iPhone need a network connection. A banner appears when there is no network. Hardware locations, the Upcoming board, and the shared hub snapshot refresh when you are online again, and when you reopen the app.

## Project structure

```
src/app/              routes: Today, Plan, Tests, Fleet, Issues, Deploy, Reports
src/components/       boards, dialogs, shell
src/lib/types.ts      shared records
src/lib/from-apps.ts  Reporter equipment, SIM catalog, Upcoming board, locator
src/lib/reporter-import.ts  latest Drone Flight Test Reporter campaign → runs, issues, reports
src/lib/hardware.ts   Hardware locator list: read and write the existing company sheet
src/lib/hub-sync.ts   Shared laptop / iPhone snapshot (field report, last SIM run, hub ticks)
src/components/hardware-dialog.tsx  Update location / Add hardware
src/components/plan-dialog.tsx      Add / edit flights and tests on the Upcoming board
src/components/test-history-dialog.tsx  Done flights and tests after their day has passed
src/lib/sim-import.ts last SIM FAIL / BLOCKED run → issues, runs, reports, artifacts
src/lib/weather.ts    Delft Open-Meteo reading (condition, °C, wind, gusts)
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

**0.2.25** merges pass / fail / blocked missions from the SIM Flight Testing laptop store into the shared snapshot, so a 20/20 scored run is not replaced by an earlier all-not-tested copy of the same run. Header `v0.2.25`. After you score a run, open this hub on the laptop in the same browser as SIM Flight Testing (while online), then publish from the clone: `cd ~/field-test-dashboard` (or wherever you cloned it), `git pull origin main && git push github main`.

## Links

- Live: https://tectivejk.github.io/Field-Test-Operations-Dashboard./
- GitHub: https://github.com/TectiveJK/Field-Test-Operations-Dashboard.
- Origin: https://cursor.com/codebase/john-kokotinis/field-test-dashboard
- Upcoming flights & tests: https://tectivejk.github.io/Upcoming-Test-Flights/
- Hardware locator: https://tectivejk.github.io/Updating-hardware/
- Origin CLI: https://cursor.com/docs/origin/cli
