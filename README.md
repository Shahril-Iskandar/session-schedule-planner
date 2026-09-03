# Session Schedule Planner

A small, dependency-free web app that calculates the full Hip Osteoarthritis Gait Intervention Program schedule from one starting date.

The schedule follows the supplied session pattern:

- Session 2: starting date
- Session 3: 1 week later
- Session 4: 3 weeks after the start
- Session 5: 6 weeks after the start
- Session 6: 9 weeks after the start
- Session 7: 11 weeks after the start
- Session 8: nearest matching weekday to 3 calendar months after Session 7
- Session 9: nearest matching weekday to 1 calendar year after Session 2

Estimated appointment durations are about 1 hour for Sessions 2–6 and about 2 hours for Sessions 7–9.

## Run locally

Open `index.html` in a browser. No installation or build step is needed.

For a local development server, run:

```sh
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

## Features

- Uses one date to calculate all eight sessions
- Preserves the same weekday for all intervention and follow-up sessions
- Displays session dates in month-by-month calendars
- Shows the estimated duration for every session
- Copies the full schedule to the clipboard
- Downloads all sessions as an `.ics` calendar file
- Builds timed lab bookings from a subject ID and appointment start time
- Starts each calendar booking one hour early for lab setup
- Adds `s5424179@griffithuni.edu.au` as the attendee
- Responsive and printable layout
