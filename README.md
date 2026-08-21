# Session Schedule Planner

A small, dependency-free web app that calculates six session dates from one starting date.

The schedule follows the supplied session pattern:

- Session 1: starting date
- Session 2: 1 week later
- Session 3: 3 weeks after the start
- Session 4: 6 weeks after the start
- Session 5: 9 weeks after the start
- Session 6: 11 weeks after the start

## Run locally

Open `index.html` in a browser. No installation or build step is needed.

For a local development server, run:

```sh
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

## Features

- Uses one date to calculate all six sessions
- Preserves the weekday for every session
- Copies the full schedule to the clipboard
- Downloads all sessions as an `.ics` calendar file
- Responsive and printable layout
