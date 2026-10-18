# Deploying WeeklyView

Two ways to put WeeklyView online. Both use **Vercel** for the frontend and **MongoDB Atlas**
(the database you already set up) for data. They differ only in where the **backend (API)** runs.

| | **Option A: everything on Vercel** | **Option B: frontend on Vercel, API on Render** |
| --- | --- | --- |
| Payment card | Not needed (Vercel Hobby) | Render may ask for one |
| Backend runs as | Serverless function (starts per request when idle, 1–3 s) | Always-on server that **sleeps after 15 min idle** (30–60 s to wake) |
| Code needed | `server/api/index.js` + `server/vercel.json` (already in the repo) | Nothing extra |
| In the docs | **The owner's choice** (2026-10-18; `tech_stack.md` §7.5) | The original plan, kept as the alternative (`tech_stack.md` §7.3) |
| Good for | A portfolio project and small teams; no card | Same; matches the original design |

**Your choice: Option A** (owner decision, 2026-10-18). No card, and visitors don't wait a minute for
a sleeping server. Option B stays documented as the alternative.

> Vercel's **Hobby** plan is free and meant for personal, non-commercial projects. If a company
> starts using WeeklyView for real work, move to Vercel Pro, or use Option B.

---

## Contents
1. Before you start (both options)
2. Option A: frontend and backend on Vercel
3. Option B: frontend on Vercel, backend on Render
4. After deploying: first account and checks
5. Updating the live site
6. Troubleshooting
7. Optional: a custom domain

---

## 1. Before you start (both options)

**1.1 Merge everything into `main`.** Vercel and Render deploy from GitHub's `main` branch, so make
sure every PR you want live is merged.

**1.2 Atlas: allow connections from anywhere.** Vercel and Render have no fixed IP address.
1. Go to https://cloud.mongodb.com → your **WeeklyView** project.
2. **Security → Network Access**. `0.0.0.0/0` must be listed (you added it earlier). If not:
   **Add IP Address → Allow access from anywhere → Confirm**.

**1.3 The database: one shared `weeklyview` database (your choice for now).** The live site uses
the **same** `weeklyview` database on Atlas as the `MONGODB_URI` in your PC's `server\.env`. So what
you load from your PC is what the live site shows, and you switch it from your PC:
- **Sample data:** in the project folder on your PC, run `npm run db:sample`. It wipes the database
  and loads the fictional sample team, so the live site has something to show.
- **A fresh start:** run `npm run db:empty`. It wipes the database and loads nothing; the first
  person to sign up on the live site becomes the owner (section 4).
- **Both commands wipe the live site's data**, because the database is shared. Check `MONGODB_URI` in
  `server\.env` first. They only run from your PC, and refuse when `NODE_ENV` is `production` (keep
  `NODE_ENV=development` in your local `server\.env`).
- **Sample data shouldn't stay on a widely shared site.** Every sample account signs in with the
  password `weekly-view-dev`, and that password is written in this repository, so anyone who reads it
  can sign in as any sample person, the admin included. Share the address only with people you trust
  while sample data is loaded, or run `npm run db:empty`.
- **Once real people use it, give the live site its own database** (recommended). Then nothing you run
  on your PC can wipe their work:
  1. Atlas → **Security → Database Access** → your database user → **Edit** → add the privilege
     **readWrite** on a new database name, e.g. `weeklyview-live` → **Update User**.
  2. Vercel → API project → **Settings → Environment Variables** → edit `MONGODB_URI`: change
     `/weeklyview?` in the middle of the string to `/weeklyview-live?` → **Save** → redeploy the API
     (section 5). Leave your PC's `server\.env` on `weeklyview`.
  3. The new database starts empty, so the first sign-up becomes its owner.
- **If you forget the owner's password**, run `npm run owner:reset-link -- --url https://<your site>`
  from your PC (the `--` is required). It prints a one-time link for the owner, once. It uses the
  database in `server\.env`, which is the live one while the database is shared; once the live site
  has its own database, put that string in `server\.env` for the run and change it back afterwards.
  See the README.
- After `db:empty` or `db:sample`, a browser that was already signed in still holds an old sign-in.
  Sign out, or use a private window.

**1.4 Make a production JWT secret.** In PowerShell:
```
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the long line it prints into a note. It's your `JWT_SECRET` for the live site. Use a **new**
one, not the one in your local `server\.env`.

**1.5 Have your Atlas connection string ready**, the same `MONGODB_URI` as in your
`server\.env` (`mongodb+srv://<user>:<password>@<cluster>.mongodb.net/weeklyview?appName=weeklyview`).
Copy it from your own `.env` or from Atlas (**Connect → Drivers**). Never paste it into a chat or a
file in the repo.

**1.6 Sign in to Vercel** at https://vercel.com with **Continue with GitHub**, and allow Vercel to
access the `iamSahdoon/weekly-view` repository when asked.

---

## 2. Option A: frontend and backend on Vercel

You create **two Vercel projects from the same GitHub repo**: one for the API (folder `server`)
and one for the website (folder `client`). Do the **API first**, because the website needs its
address.

### 2.1 Deploy the API (backend)
1. On Vercel: **Add New… → Project**.
2. Find **weekly-view** in the list and click **Import**.
3. **Project Name:** `weeklyview-api` (any name; it becomes part of the address).
4. **Root Directory:** click **Edit**, choose **`server`**, then **Continue**.
5. **Framework Preset:** **Other**. If Vercel picks a different preset after you choose the folder,
   change it back to **Other**: the API is the function in `server/api/index.js`.
6. **Build and Output Settings:** leave everything empty or default. There's no build step;
   Vercel uses `server/api/index.js` and `server/vercel.json` automatically.
7. **Environment Variables:** add these one by one (Name → Value → **Add**):

   | Name | Value |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `MONGODB_URI` | your Atlas string (step 1.5) |
   | `JWT_SECRET` | the new secret from step 1.4 |
   | `JWT_EXPIRES_IN` | `5d` |
   | `CLIENT_URL` | `https://example.com` for now. You'll replace it in step 2.3 once you know the website's address. |

8. Click **Deploy** and wait for "Congratulations".
9. Copy the API's address from the project page, e.g. `https://weeklyview-api.vercel.app`.
10. **Test it:** open `https://weeklyview-api.vercel.app/api/health` in your browser. You should
    see `{"success":true,"data":{"status":"ok"},…}`.
11. **Put the API next to the database.** Find your Atlas region: Atlas → **Database** (Clusters) →
    the region shown on your cluster's card, e.g. *AWS / Mumbai (ap-south-1)*. Then on Vercel: API
    project → **Settings → Functions** → **Function Region** → choose the region closest to it (for
    Mumbai, *Mumbai, India (bom1)*) → **Save**. Redeploy the API (**Deployments → ⋯ → Redeploy**)
    so the change takes effect. Every request talks to the database, so this keeps each one fast.

### 2.2 Deploy the website (frontend)
1. On Vercel: **Add New… → Project** → **weekly-view** → **Import** again (same repo, second project).
2. **Project Name:** `weeklyview` (this becomes `https://weeklyview.vercel.app` if it's free).
3. **Framework Preset:** **Vite** (usually detected automatically).
4. **Root Directory:** **Edit** → **`client`** → **Continue**.
5. **Build and Output Settings:** Build Command `npm run build`, Output Directory `dist` (the
   defaults for Vite).
6. **Environment Variables:**

   | Name | Value |
   | --- | --- |
   | `VITE_API_BASE_URL` | your API address **plus `/api`**, e.g. `https://weeklyview-api.vercel.app/api` |

7. Click **Deploy**.
8. Copy the website's address, e.g. `https://weeklyview.vercel.app`.

### 2.3 Connect the two (CORS)
The API only accepts requests from the website's exact address, which is set by `CLIENT_URL`.
1. Open the **API project** (`weeklyview-api`) → **Settings → Environment Variables**.
2. Edit `CLIENT_URL` and set it to the website's address, **with no slash at the end**, e.g.
   `https://weeklyview.vercel.app`. Save.
3. **Redeploy the API**: go to **Deployments**, open the **⋯** menu on the newest deployment,
   choose **Redeploy**, and confirm. Environment changes only apply after a redeploy.

Continue with section 4.

**Good to know (Option A):**
- **Preview deployments** (for branches and PRs) get different addresses. The live API only
  accepts the production website address, so test previews against your local API, or only use
  the production site.
- When nobody has used the API for a while, the first request takes **1–3 seconds** while the
  function starts. The app's "Starting up" message covers this.
- Vercel limits how long one request may run. WeeklyView's requests take well under a second, so
  this is fine.

---

## 3. Option B: frontend on Vercel, backend on Render

The original plan in `tech_stack.md` §7. **Render** (https://render.com) runs the API as an
always-on server on its free plan.

### 3.1 Deploy the API on Render
1. Go to https://render.com → **Sign in with GitHub**. Allow access to `iamSahdoon/weekly-view`.
2. **New → Web Service** → choose the **weekly-view** repository → **Connect**.
3. Fill in:

   | Field | Value |
   | --- | --- |
   | Name | `weeklyview-api` |
   | Region | the one closest to your Atlas region |
   | Branch | `main` |
   | Root Directory | `server` |
   | Runtime | **Node** |
   | Build Command | `npm install` |
   | Start Command | `node src/server.js` |
   | Instance Type | **Free** |

4. **Environment Variables** (**Add Environment Variable**):

   | Key | Value |
   | --- | --- |
   | `NODE_ENV` | `production` |
   | `MONGODB_URI` | your Atlas string |
   | `JWT_SECRET` | the new secret from step 1.4 |
   | `JWT_EXPIRES_IN` | `5d` |
   | `CLIENT_URL` | `https://example.com` for now (fixed in step 3.3) |

   Don't add `PORT`; Render sets it itself.
5. **Advanced → Health Check Path:** `/api/health`.
6. Click **Create Web Service**. If Render asks for a card and you don't want that, use Option A.
7. When it says **Live**, copy the address (e.g. `https://weeklyview-api.onrender.com`) and test
   `…/api/health` in your browser.

### 3.2 Deploy the website on Vercel
Follow **2.2** exactly, but set `VITE_API_BASE_URL` to the **Render** address plus `/api`, e.g.
`https://weeklyview-api.onrender.com/api`.

### 3.3 Connect the two
1. On Render: your service → **Environment** → edit `CLIENT_URL` to the website's address (no
   trailing slash), e.g. `https://weeklyview.vercel.app` → **Save Changes**. Render redeploys
   automatically.

**Good to know (Option B):** the free Render server **sleeps after about 15 minutes** without
visitors, and the next visit waits **30–60 seconds** while it wakes ("Starting up"). Don't add an
uptime pinger: Render's free plan doesn't allow enough hours for 24/7, and it's against its
spirit. The **demo** never needs the server, so it's always instant.

---

## 4. After deploying: first account and checks

1. Open the website address (e.g. `https://weeklyview.vercel.app`) in a **private window**.
2. **The landing page** should appear (green). If the database is empty, the main button reads
   ***Create your account***.
3. **Create the owner account:** click ***Create your account***, and enter your name, email and a
   strong password. You're now the owner and an admin. Sign-up closes after this; everyone else
   joins by invite.
   - (If you loaded the sample data instead, sign-up is closed: sign in with `sanduni@example.com` /
     `weekly-view-dev`. Every other sample account keeps that public password, so see step 1.3
     before sharing the address.)
4. **Check these:**
   - [ ] `…/api/health` on the API address shows `success: true`.
   - [ ] You can sign out and sign in again.
   - [ ] **Users → Invite person** creates a link, and opening it in another private window
         lets that person join.
   - [ ] Post a daily update on **This week**; refresh: it's still there.
   - [ ] Open `https://<your-site>/review` (or any deep page) directly and **refresh**: no 404.
         `client/vercel.json` handles this.
   - [ ] **`/demo`** works, and keeps working even if the API is stopped.
   - [ ] On a phone, the site works and the landing page is readable.

---

## 5. Updating the live site

- **Every merge to `main` redeploys automatically**: Vercel (and Render) watch the repository.
- **Changing an environment variable** needs a **redeploy** to take effect:
  - Vercel: **Deployments → ⋯ → Redeploy**.
  - Render: it redeploys on save.
- **`VITE_API_BASE_URL` is baked into the website at build time**, so after changing it, redeploy
  the website project.
- **Rolling back** on Vercel: **Deployments** → pick an older one → **⋯ → Promote to Production**.

---

## 6. Troubleshooting

| What you see | Likely cause | Fix |
| --- | --- | --- |
| Website loads, but sign-in says it can't reach the server; the browser console mentions **CORS** | `CLIENT_URL` on the API doesn't exactly match the website address. (Option A: a database error also shows up as a CORS error, so open `…/api/health` directly to tell them apart) | Set it to the exact address (https, no trailing slash) and **redeploy the API** |
| API `/api/health` shows `"The service could not reach its database"` (Option A) | Wrong `MONGODB_URI`, password with special characters, or Atlas network access | Check the string (step 1.5), and Atlas **Network Access → 0.0.0.0/0** |
| Option A: `/api/health` shows Vercel's **500** page (`FUNCTION_INVOCATION_FAILED`), and the API's **Logs** say "Invalid environment configuration". Option B: the Render deploy fails with that message | A variable is missing, `JWT_SECRET` is shorter than 32 characters or is still the example value from `server/.env.example`, `CLIENT_URL` isn't a full URL, or `NODE_ENV` isn't one of `development`, `production`, `test`. The log names the setting, never its value | Add or fix it in Environment Variables, then redeploy. (On Vercel the deployment itself still says "Ready": the API checks its settings when the first request arrives) |
| Option B: the Render deploy fails with "Could not connect to MongoDB" | Wrong `MONGODB_URI`, or Atlas network access | Check the string (step 1.5), and Atlas **Network Access → 0.0.0.0/0** |
| Refreshing a page like `/review` gives Vercel's **404** | The website project's Root Directory isn't `client` (so `vercel.json` isn't used) | Settings → General → Root Directory → `client`, then redeploy |
| "Starting up" for a minute (Option B) | The Render server was asleep | Normal on the free plan; it wakes by itself |
| Website calls `http://localhost:5000` | `VITE_API_BASE_URL` wasn't set when the site was built | Set it on the website project, then **redeploy** |
| You can't sign up ("sign-up is closed") | An account already exists in that database | Sign in, or ask the owner for an invite |
| The owner forgot their password | The owner is protected, so no admin can reset it, and WeeklyView sends no email | On the PC that holds `server/.env` with the live `MONGODB_URI`, run `npm run owner:reset-link -- --url https://your-site-address` (the `--` is required). It prints a one-time link for the owner, once. Send it to the owner or open it yourself. See the README |
| Another member or admin forgot theirs | — | An admin issues a reset link from **Users** (the owner, for an admin) |

**Where to look:** Vercel → project → **Logs** (or **Deployments → a deployment → Functions /
Runtime Logs**); Render → service → **Logs**. Logs never contain passwords, tokens or the database
string.

---

## 7. Optional: a custom domain

1. Buy a domain (any registrar).
2. Vercel → website project → **Settings → Domains → Add**, and follow the DNS instructions shown.
3. Update `CLIENT_URL` on the API to the new domain (e.g. `https://weeklyview.yourname.com`) and
   redeploy the API.
4. Optionally give the API its own subdomain (e.g. `api.yourname.com`, added to the API project),
   then update `VITE_API_BASE_URL` on the website and redeploy it.
