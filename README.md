# College Planning OS

> A personalized **college-planning operating system** for a high-school student and their family — from early research through enrollment.

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/YOUR-USERNAME/college-planning-os)

<sub>↑ After you push this repo to GitHub, replace `YOUR-USERNAME` in the button link above with your GitHub username. Clicking it lets anyone deploy their own copy in a couple of clicks (they'll add their own `COLLEGE_SCORECARD_API_KEY` in Netlify).</sub>

A student-centered platform that unifies **college discovery, a list manager, admissions-fit analysis, an application tracker, a unified deadline center, an essay manager, scholarships, costs & aid, career/major exploration, campus visits, and a decision dashboard** — powered by a **secure College Scorecard integration**.

### Why it's different
- **Data integrity first.** Real colleges show only real data (API / official / verified / manual) or *"Data not yet loaded."* Derived scores refuse to compute from missing inputs. *Missing data is better than wrong data.*
- **Field-level provenance.** Every statistic carries its source, data year, retrieval date, and verification status.
- **Secure by design.** The College Scorecard API key lives only in a server-side environment variable — never in the browser, bundle, or repo.
- **One student, deeply personalized.** Admissions fit, college fit, and list balance are computed against the student's own profile.

### Screens
Dashboard · My Colleges · Find Colleges · Compare · Applications · Deadlines · Scholarships · Essays · Academics · Career & Majors · Visits · Costs & Aid · Tasks · Resources · Settings

- **Front-end:** `public/index.html` — a single-page app. Your planning data is saved privately in your own browser (localStorage).
- **Back-end:** `server.js` — a tiny Node server (no dependencies) that (1) serves the app and (2) proxies the U.S. Dept. of Education **College Scorecard** API so the API key stays server-side.

> **Core rule:** *Missing data is better than wrong data.* Real colleges show only real data (API / official / verified / manual) or “Data not yet loaded.” Derived scores (Admissions Fit, College Fit, list balance) refuse to compute from missing inputs. Clearly-fictional **DEMO** colleges are included only to demonstrate the engines.

---

## The API key (important)

The key is read from an **environment variable** named:

```
COLLEGE_SCORECARD_API_KEY
```

It is loaded **only by the server** from a local `.env` file (which is **git-ignored**). It is **never** placed in HTML, JavaScript, the browser, localStorage, URLs the browser sees, logs, or Git.

`.env.example` documents the structure. **Do not commit `.env`.**

---

## Run it locally (no build, no install)

1. Install **Node.js 18 or newer** (https://nodejs.org — the “LTS” installer).
2. In this folder, create your `.env`:
   - Copy `.env.example` to a new file named `.env`
   - Open `.env` and replace `PASTE_KEY_HERE` with your key.
3. Start the server:
   ```
   node server.js
   ```
   (or `npm start`)
4. Open **http://localhost:3000** in your browser.
5. Verify: **Settings → Data Sources → Test Connection**. Success shows “✓ College Scorecard connected.”

There are **no dependencies to install** — the server uses only Node’s built-in modules.

---

## Deploy it (so it’s online)

Because there is a server, it needs a **Node host** (a static drag-and-drop host like Netlify Drop will *not* run the server). Easiest options:

### Render.com (recommended, has a free tier)
1. Push this folder to a GitHub repo (the `.gitignore` keeps `.env` out — good).
2. Render → **New → Web Service** → connect the repo.
3. **Build Command:** *(leave blank)* · **Start Command:** `node server.js`
4. **Environment → Add Environment Variable:**
   - Key: `COLLEGE_SCORECARD_API_KEY`
   - Value: *(your key)*
5. Create the service. Render gives you a public URL.

### Netlify (works with the included `netlify.toml` + function)
Plain drag-and-drop of `public/` alone will show the app but **not** run the API. To get both the app **and** the secure key proxy on Netlify:
1. Deploy the **whole project folder** (it contains `netlify.toml`, which tells Netlify to publish `public/` and run the `/api/*` proxy as a serverless function). Easiest reliable path: push the folder to a GitHub repo, then Netlify → **Add new site → Import from Git**. (Drag-and-drop of the whole folder also works, but Git is more predictable for functions.)
2. In Netlify: **Site configuration → Environment variables → Add a variable**
   - Key: `COLLEGE_SCORECARD_API_KEY`
   - Value: *(your key)*
3. **Deploy** (or “Trigger deploy” after adding the variable). The app is at your Netlify URL; `/api/*` runs as a function with the key server-side.

If you saw a **“Page not found” 404** on Netlify, it’s because the publish folder had no `index.html` at its root — deploying the whole project (so `netlify.toml`’s `publish = "public"` applies) fixes it.

### Railway.app / Fly.io / Heroku
Same idea: deploy the repo, set **Start Command** `node server.js`, and add the environment variable `COLLEGE_SCORECARD_API_KEY` in the project’s **Variables/Config Vars** settings. Never paste the key into code.

---

## API endpoints (served by `server.js`)

| Endpoint | Purpose |
|---|---|
| `GET /api/status` | Data-source status (no key ever returned) |
| `GET /api/colleges/search?name=&state=&control=` | Search College Scorecard |
| `GET /api/colleges/:id` | One institution by Scorecard/UNITID |
| `GET /api/colleges/:id/programs` | Programs (CIP) for an institution |
| `GET /api/colleges/test` | Harmless test request for “Test Connection” |

All College Scorecard values are stored with **field-level provenance**: `source = COLLEGE_SCORECARD`, `dataYear`, `retrievedAt`, `verificationStatus = API_DATA`. Missing values stay **null → “NOT REPORTED”** (never 0). API data never overwrites manually-verified or Common-Data-Set values.
