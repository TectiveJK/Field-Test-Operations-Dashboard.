# Field Test Operations Dashboard

[![CI](https://github.com/TectiveJK/Field-Test-Operations-Dashboard./actions/workflows/ci.yml/badge.svg)](https://github.com/TectiveJK/Field-Test-Operations-Dashboard./actions/workflows/ci.yml)

**Current version:** `0.2.31`

## Open the app

**[Open Field Test Operations Dashboard](https://tectivejk.github.io/Field-Test-Operations-Dashboard./)**

That is the live GitHub Pages app (**0.2.31**). GitHub `main` and Origin are on the same commit after `git push github main`. Use it in a desktop browser, or in **Safari** on iPhone / iPad (Share → Add to Home Screen). The header shows `v0.2.31`. Today shows the last **scored** SIM run from the Gitea SIM Flight Testing app on this computer, next to the latest field report. A save of **Last successful artifacts** in SIM is copied onto Today and Tests together within a second while that app is running on this computer, then shared with the iPhone. **Reports** reads the Linux reporter Export Report PDF (the `23-Oct-2026.pdf` Chromium format) and Share text. A PDF you import stays on Today even if a smaller Share paste was stamped today. Every page has **Export PDF**; Reports writes all pages into one file. If the iPhone home-screen copy looks old, open the `?ftod=0.2.31` Safari link under iPhone / iPad.

Daily command center for Tective field-test operations. Built for a Field Test Engineer / Operator working with **SkyCommand**, **SkyHive**, **PX4**, **QGroundControl** and **ReFly**.

This hub does **not** invent a test day. It only shows records that already exist in the Tective apps:

| This hub | Source |
| --- | --- |
| **Plan** | [Upcoming flights & tests](https://tectivejk.github.io/Upcoming-Test-Flights/) live board. Add, edit or remove flights and tests here; that board updates. |
| **Fleet / Deploy** | [Hardware locator](https://tectivejk.github.io/Updating-hardware/) company list (airframes, hive, rotator, batteries) plus [Drone Flight Test Reporter](https://tectivejk.github.io/drone-flight-test-reporter/) equipment names. Locations are read from and written to that same list, so Fleet and the locator stay in sync. |
| **Tests** | Field flights from [Drone Flight Test Reporter](https://tectivejk.github.io/drone-flight-test-reporter/) plus the [SIM Flight Testing](http://127.0.0.1:43147/) 20-mission catalog (Gitea: [sim-testing-app](https://git.tective.nl/JohnKokotinis/sim-testing-app)), last run, and `.deb` artifact names |
| **Issues / reports / runs** | Fail flights from the latest [Drone Flight Test Reporter](https://tectivejk.github.io/drone-flight-test-reporter/) campaign, and FAIL / BLOCKED missions from the last [SIM Flight Testing](http://127.0.0.1:43147/) run. That snapshot is shared between laptop and iPhone. Maintenance Assistant still has none stored. |

This app does **not** replace the existing tools. It connects them into one workspace so you can open it in the morning and immediately answer:

1. **What do I need to test today?**
2. **What problems are still unresolved?**
3. **What should we test next, based on previous flights?**

It is a responsive web app for **iPhone**, **iPad** and **Linux**. After the first load it works **offline**, so you can record results on the range without internet.

## Repositories

The same codebase lives in two places. They are in sync at `0.2.31`. Publish later Origin commits with `git push github main`.

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
| Reporting | [Drone Flight Test Reporter](https://tectivejk.github.io/drone-flight-test-reporter/) | Equipment list (ReFly / SkyHive / rotator / packs) and the latest multi-flight report (flights, overall result, Fail items). Import the Export Report PDF, Share text, or JSON on Reports. A save in the same laptop browser is read within a second. |
| Maintenance | [Drone Maintenance Assistant](https://tectivejk.github.io/drone-maintenance-assistant/) | Fleet, faults and inspections if that app has any. It currently stores none. |
| Planning | [Upcoming flights & tests](https://tectivejk.github.io/Upcoming-Test-Flights/) | The live shared board. This hub reads it and can add, edit or remove flights and tests. That app is not modified. |
| Simulator testing | [SIM Flight Testing](http://127.0.0.1:43147/) ([Gitea](https://git.tective.nl/JohnKokotinis/sim-testing-app)) | The 20 SkyCommand simulator missions, FAIL / BLOCKED items from the last scored run, and `.deb` names from **Last successful artifacts**. A save there is copied onto this hub immediately and shared with the iPhone. |
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
| **Reports** | Flight-report index, **Import field report** (Share paste, Print PDF, or JSON), evidence organizer (ULog / QGC / pcap names), knowledge notes. **Export PDF** writes **every page** into one file. |

A failed simulator or field run can create an issue, keep the ULog against that drone and build, show on Today as an outstanding retest, and later be compared with the next Jenkins build.

When SIM Flight Testing is running on this computer (`http://127.0.0.1:43147/`), FAIL and BLOCKED results from the last scored SIM run are copied into Issues, Tests and Reports. Saving **Last successful artifacts** updates Today and Tests on this hub within a second. This hub then publishes that snapshot to the shared list, so the iPhone receives it. The latest [Drone Flight Test Reporter](https://tectivejk.github.io/drone-flight-test-reporter/) campaign is copied when you open this hub on the laptop in the same browser as that app, and when you import a Share paste or Print PDF on Reports. The hub keeps its own copy, so **New Report** in the reporter app does not wipe Today. The 19 Oct 2026 Unmanned Valley / Field 10 campaign is the starting field report until a later save or import replaces it.

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
- **Laptop and iPhone share one live copy** of hub ticks, issues, the latest field report, the last SIM run, and SIM `.deb` artifact names. Hardware locations already use the locator list. **Add flight** / **Add test** on Plan writes the Upcoming board, so that app sees it too. Leave SIM Flight Testing running on the laptop. A scored run or a **Last successful artifacts** save is copied onto this hub immediately, then the phone picks it up. After a reporter save, open this hub on the laptop, or import the Share text / Print PDF on Reports. No login.
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
cd ~
cd field-test-dashboard
git remote add github https://github.com/TectiveJK/Field-Test-Operations-Dashboard..git
git push github main
```

If the `github` remote already exists, run this **inside the clone** (not from `/` or `~`). The branch is `main`, not `master`. If `ls` shows `Field-Test-Operations-Dashboard.` instead, `cd` into that folder:

```bash
cd ~
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

The iPhone home-screen app cannot read the local SIM Flight Testing server or Drone Flight Test Reporter storage directly. After you score a SIM run or save **Last successful artifacts**, leave SIM Flight Testing and this hub open on the laptop while online so the snapshot is published. After you save a field report, open this hub on the laptop in the same browser as the reporter, or import the Share text / Print PDF on Reports. Wait until Today shows **Last field report** and **Last SIM run**. Then reopen FTOD on the iPhone.

Safari keeps a home-screen copy of the app. After GitHub Actions is green, open this URL **in Safari** (not Chrome, and not the home-screen icon first):

https://tectivejk.github.io/Field-Test-Operations-Dashboard./?ftod=0.2.31

Pull down to refresh until the header shows `v0.2.31`. Then tap the menu (top left) → **Reset to source apps**. After that, open the **FTOD** home-screen icon. If it is still old:

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
src/lib/reporter-parse.ts   Share text / Print PDF / JSON import from that reporter app
src/lib/hardware.ts   Hardware locator list: read and write the existing company sheet
src/lib/hub-sync.ts   Shared laptop / iPhone snapshot (field report, last SIM run, hub ticks)
src/components/hardware-dialog.tsx  Update location / Add hardware
src/components/plan-dialog.tsx      Add / edit flights and tests on the Upcoming board
src/components/test-history-dialog.tsx  Done flights and tests after their day has passed
src/lib/sim-import.ts last SIM FAIL / BLOCKED run from the Gitea SIM app → issues, runs, reports, artifacts
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

**0.2.31** is live. Saving **Last successful artifacts** in SIM Flight Testing copies that `.deb` list onto Today and Tests together within a second, then shares it with the iPhone. A later in-flight refresh cannot replace that save with an older list. Header `v0.2.31`. Publish later Origin commits with `git pull && git push github main`.

## Links

- Live: https://tectivejk.github.io/Field-Test-Operations-Dashboard./
- GitHub: https://github.com/TectiveJK/Field-Test-Operations-Dashboard.
- Origin: https://cursor.com/codebase/john-kokotinis/field-test-dashboard
- SIM Flight Testing (this computer): http://127.0.0.1:43147/
- SIM Flight Testing source: https://git.tective.nl/JohnKokotinis/sim-testing-app
- Upcoming flights & tests: https://tectivejk.github.io/Upcoming-Test-Flights/
- Hardware locator: https://tectivejk.github.io/Updating-hardware/
- Origin CLI: https://cursor.com/docs/origin/cli
