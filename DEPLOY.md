# Deploy College Planning OS to Netlify (with live College Scorecard)

This gets your app online **and** runs the secure API proxy, with your key stored safely in Netlify (never in the code). Plan for ~10 minutes.

You do **not** need to be a developer. Follow the steps in order.

---

## What you need (one-time)
- A free **GitHub** account: https://github.com/join
- A free **Netlify** account: https://app.netlify.com/signup (choose “Sign up with GitHub” — it links the two for you)
- **Git** installed on your computer: https://git-scm.com/downloads
- Your **College Scorecard API key** (from https://api.data.gov/signup)

---

## Step 1 — Create an empty GitHub repository
1. Go to https://github.com/new
2. **Repository name:** `college-planning-os`
3. Leave everything else default. **Do NOT** check “Add a README.”
4. Click **Create repository**.
5. On the next page, copy the URL that ends in `.git` (looks like
   `https://github.com/YOUR-USERNAME/college-planning-os.git`). You'll paste it in Step 2.

---

## Step 2 — Push this folder to GitHub (copy-paste)
Open **Terminal** (Mac) or **Git Bash / Command Prompt** (Windows), then:

```bash
# 1) go into the unzipped project folder (drag the folder into the terminal
#    after typing "cd " to auto-fill the path, then press Enter)
cd path/to/college-planning-os

# 2) set up git and make the first commit
git init
git add .
git commit -m "College Planning OS — initial commit"
git branch -M main

# 3) connect to YOUR GitHub repo (paste the URL you copied in Step 1)
git remote add origin https://github.com/YOUR-USERNAME/college-planning-os.git

# 4) upload
git push -u origin main
```

> Your API key is **not** uploaded — the `.gitignore` excludes `.env`. (You configure the key in Netlify in Step 4, not here.)

**Prefer no terminal?** Install **GitHub Desktop** (https://desktop.github.com), choose *File → Add local repository*, pick this folder, click *Publish repository*. Same result.

---

## Step 3 — Import the repo into Netlify
1. Go to https://app.netlify.com → **Add new site → Import an existing project**.
2. Choose **GitHub**, authorize if asked, and pick your `college-planning-os` repo.
3. Netlify auto-detects the settings from `netlify.toml` — **leave build command blank**, publish directory `public`. Click **Deploy**.

---

## Step 4 — Add your API key in Netlify (this is the secure part)
1. In your new site: **Site configuration → Environment variables → Add a variable**.
2. Key: `COLLEGE_SCORECARD_API_KEY`   ·   Value: *(paste your key)*   ·   Save.
3. Go to **Deploys → Trigger deploy → Deploy site** (so the new variable takes effect).

---

## Step 5 — Confirm it works
1. Open your Netlify site URL.
2. Go to **Settings → Data Sources → Test Connection**.
3. Success = **“✓ College Scorecard connected”** and status **CONNECTED**.
4. Go to **Find Colleges**, search e.g. `University of Florida`, and **Add** it — real stats populate with a source + data year.

If Test Connection says **“Invalid or unauthorized API key”**, the key is wrong/expired — get a new one at https://api.data.gov/signup, update the Netlify variable, and Trigger deploy again.

---

## Making changes later
Edit files, then:
```bash
git add .
git commit -m "describe your change"
git push
```
Netlify redeploys automatically within a minute.
