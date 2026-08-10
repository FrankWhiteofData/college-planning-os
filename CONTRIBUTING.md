# Contributing & Project Notes

Thanks for looking at **College Planning OS**. This document orients a new contributor (or an advisor reviewing the codebase) to how the project is structured and the principles it follows.

## Project layout

```
college-planning-os/
├── public/
│   └── index.html            # The entire front-end (single-page app, vanilla JS, no build step)
├── services/
│   └── collegeScorecard.js   # Reusable College Scorecard client (used by the Node server)
├── netlify/
│   └── functions/
│       └── api.js            # Serverless version of the /api proxy (for Netlify hosting)
├── server.js                 # Local/standalone Node server: serves the app + /api proxy
├── netlify.toml              # Netlify config (publish public/, run the function for /api/*)
├── .env.example              # Documents the COLLEGE_SCORECARD_API_KEY variable
├── .gitignore                # Excludes .env and secrets
├── DEPLOY.md                 # Non-technical GitHub → Netlify walkthrough
└── README.md
```

The app has two interchangeable back-ends that speak the same `/api/*` contract:
- **`server.js`** for running locally or on a Node host (Render, Railway, Fly, Heroku).
- **`netlify/functions/api.js`** for Netlify's serverless runtime.

The browser only ever calls same-origin `/api/*`; it never sees the API key.

## Core principles (please preserve)

1. **Missing data is better than wrong data.** Never fabricate statistics for real institutions. Unknown values render as *"Data not yet loaded"* or *"NOT REPORTED"* — never `0`, `0%`, `$0`, or `false`.
2. **Derived scores are gated.** Admissions Fit, College Fit, and list balance must not compute from missing inputs; they return *Insufficient Data* and show which factors were available.
3. **Provenance at the field level.** When you add a data source, attach `{ source, sourceYear, retrievedAt, verificationStatus }` and respect precedence (manual/verified/CDS values are not overwritten by older API data).
4. **The API key is server-side only.** Never place it in HTML, client JS, localStorage, URLs the browser generates, logs, or the repo.
5. **Demo data is clearly fictional.** Demonstration records use obviously fake institutions (e.g., "North Valley University") and are labeled `DEMO`.

## Data source roadmap (levels)

1. **College Scorecard** (implemented) — identity, enrollment, admission rate, ACT/SAT, cost, graduation, retention.
2. **IPEDS** — historical institutional statistics (import layer; matched on UNITID).
3. **Common Data Set** — detailed admissions factors ("what they value"), GPA/test distributions.
4. **Official university sources** — current-cycle requirements, deadlines, supplements, merit, majors.
5. **Manual verification** — user/admin overrides with a citation.

Levels 2–4 are scaffolded in the data model and UI and are intended to be layered in without changing the front-end contract.

## Running locally

```bash
cp .env.example .env      # then paste your key into .env
node server.js            # no dependencies to install
# open http://localhost:3000
```

## Style

- Front-end is dependency-free vanilla JS to keep it portable and auditable.
- Keep functions small and named by domain (e.g., `admissionsFit`, `collegeFitScore`, `dataCompleteness`).
- Prefer adding a data source behind the existing `/api/*` contract over calling third-party APIs from the browser.
