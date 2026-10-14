# Field Test Operations Dashboard

Command board for Tective drone field-test days. It sits above the existing **Drone Flight Test Reporter** and **Drone Maintenance Assistant**: one screen for go/no-go, sorties, Refly/Skyhive readiness, the battery rack, and open issues.

The GitHub source repo (`TectiveJK/Field-Test-Operations-Dashboard.`) shipped empty. This app is the first working slice.

## What you can do

- See today’s campaign at NLR Marknesse (GNSS Denied + April Tag Landing)
- Change the test-day decision (GO / CONDITIONAL / NO-GO) and the reason
- Update flight results the same way the reporter does: Pending, Pass, Pass with observations, Fail, Aborted
- Filter and search sorties, airframes, and issues
- Log a new field issue and mark blockers resolved
- Reset local data back to the seeded test day

Data lives in the browser (`localStorage`). There is no server database.

## Run locally

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:43180](http://127.0.0.1:43180).

## Stack

Next.js (App Router), TypeScript, Tailwind CSS, and shadcn/ui.

Equipment names, flight modes, and result language match the Tective Flight Test Reporter: `refly-ibb-*`, `skyhive-sf-004`, `rotator 25`, Mission / Loiter / Posctl / Rtl / Land / Kill Switch.
