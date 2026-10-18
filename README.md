# WeeklyView

Every team member posts a short **daily update**: a few work lines (task, type, what was done,
hours) and any blockers. Friday's **weekly report** builds itself from those days; the author adds
task statuses and notes and submits it. Managers read the days as they come in, comment, and
approve or send back the weekly report. A dashboard shows the team's week and its projects.

- **Landing page** (`/`): what WeeklyView is, for someone who hasn't signed in.
- **Demo** (`/demo`): the whole app in the browser, on a fictional team, as a member, a manager or
  an admin. Nothing is saved and no server is needed. Its **guided tour** walks through every
  feature in one team's week (72 steps, about 15 minutes); each step that asks you to do something
  also offers **Do it for me**, and the **Tour** button in the demo bar jumps to any part.
- **User manual:** [`docs/USER_MANUAL.md`](docs/USER_MANUAL.md), every screen and rule in plain
  language.

MERN: React + Vite, Express 5 + Mongoose 8, MongoDB Atlas M0. Both the website and the API run on
**Vercel** (the API as a serverless function). The planning documents are in `docs/`; build
progress is in `PROGRESS.md`.

## Layout

| Folder    | What                                     | Deploys to                                            |
| --------- | ---------------------------------------- | ----------------------------------------------------- |
| `client/` | React app, landing page and browser demo | Vercel (root `client`)                                |
| `server/` | REST API under `/api`                    | Vercel (root `server`, `api/index.js`); or Render     |
| `docs/`   | Planning documents, manual, deployment   | —                                                     |

Each folder is self-contained, with its own `package.json`, lockfile and `.env.example`.
Nothing imports across them. The root `package.json` only forwards scripts.

## Setting up on Windows

Requires **Node 20 or later** and Git. In PowerShell, in the project folder:

```powershell
cd server
npm install
cd ..\client
npm install
cd ..
```

Use `cd` and then `npm install`. **Don't** use `npm --prefix client install`: on Windows it adds a
stray `file:..` line to `client/package.json` (if it appears, run `git restore client/package.json`).

Then copy each example file and fill in the server's values:

```powershell
copy server\.env.example server\.env
copy client\.env.example client\.env
```

**Never commit `.env`** (`.gitignore` already excludes it).

### Environment variables

`server/.env`

| Name | Example | What it is |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development` on your PC. `production` only on the host |
| `PORT` | `5000` | The local API port (hosts set their own) |
| `MONGODB_URI` | `mongodb+srv://<user>:<password>@<cluster>.mongodb.net/weeklyview?appName=weeklyview` | Your Atlas connection string. Ask the owner; never paste it into a chat or a file in the repo |
| `JWT_SECRET` | 64 random hex characters | Signs sign-ins. At least 32 characters, and in production never the example value; make one with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
| `JWT_EXPIRES_IN` | `5d` | How long a sign-in lasts |
| `CLIENT_URL` | `http://localhost:5173` | The website's exact address, for CORS (no trailing slash) |

The API refuses to start if a value is missing or invalid (for example a `JWT_SECRET` shorter than
32 characters, or a `CLIENT_URL` that isn't a full address), and prints which one.

`client/.env`

| Name | Example | What it is |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:5000/api` | The API's address plus `/api`. Built into the website, so a change needs a rebuild |

### Running it

Two PowerShell windows, both in the project folder:

```powershell
npm --prefix server run dev        # API on http://localhost:5000
npm --prefix client run dev        # website on http://localhost:5173
```

Checks (both must pass before a change is merged):

```powershell
npm test                           # server and client tests
npm run lint
```

**The tests never touch Atlas.** They start their own in-memory MongoDB and ignore `MONGODB_URI`.

## Database commands

Run from the project folder. They use the database that `server/.env` points at.

```powershell
npm run db:empty     # wipes everything and inserts nothing
npm run db:sample    # wipes everything, then loads the sample team and six weeks of reports
```

- **Both wipe the target database.** Check `MONGODB_URI` in `server/.env` first. For now the live
  site uses the same `weeklyview` database (owner decision), so these commands switch the **live
  site** between a fresh start and sample data (`docs/DEPLOYMENT.md` §1.3). Neither runs when
  `NODE_ENV` is `production`.
- `db:empty` leaves a blank database. The first person to sign up becomes the owner.
- `db:sample` loads a fictional team, relative to the current week. Every sample account signs in
  with the **public** password `weekly-view-dev`: the owner and admin `sanduni@example.com`, the
  managers `nadia@` and `ruwan@`, and the members `imali@`, `tharindu@`, `ayesha@`, `dinesh@` and
  `malith@example.com`. Anyone who reads this repository knows that password, so don't leave sample
  data on a site whose address is widely shared, and never load it into a database real people use.
- A browser that was signed in before the reset still holds a sign-in for a person who no longer
  exists. Sign out, or open a private window.

`npm run seed` (and `seed:reset` in `server/`) still work as older names for `db:sample`.

## If the owner forgets their password

The owner is protected, so no admin can reset their password, and nothing is emailed. Whoever
holds the database string (`MONGODB_URI` in `server/.env`) can print the owner a one-time reset
link from their own PC:

```powershell
npm run owner:reset-link
npm run owner:reset-link -- --url https://your-site.vercel.app    # a link for the live site
```

- It uses the database `server/.env` points at, and works whatever `NODE_ENV` is. Without `--url`
  the link starts with `CLIENT_URL`, which on your PC is `localhost`; for the live site pass
  `--url`. The `--` before it is required.
- It prints the owner's name, email, the expiry and the link, **once**. The link works once,
  expires in 24 hours, and replaces any earlier reset link. It changes no password by itself and
  touches nobody else. Treat the output like a password and don't paste it anywhere shared.
- It refuses if there is no owner yet or the database can't be reached.

Everyone else gets a reset link from an admin (**Users → ⋯ → Password reset link**); an admin gets
theirs from the owner. The sign-in page's **Forgot your password?** says the same.

## The demo and the guided tour

Open `/demo` (or **See the live demo** on the landing page) and pick **Team member**, **Manager**
or **Admin**, or **Take the guided tour**. The demo runs entirely in the browser on hard-coded
data: it works with the API stopped, every perspective can do what its role can, and a refresh
starts it over. The dark bar at the top shows who you are, with **Switch**, **Tour**, **Start over**
and **Sign in**. The manual (§49, "The demo (and the guided tour)") describes every control.

## Deployment

Follow [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md). **Option A is recommended and is the owner's
choice:** the website and the API as two Vercel projects from this repository, no payment card.
Option B (the API on Render) stays documented as the alternative.

### Atlas network access is `0.0.0.0/0`, on purpose

Vercel's functions (and Render's free instances) have no fixed outbound IP address, so there is
no address to allowlist, and the cluster's network access is open to all addresses. This is a
deliberate tradeoff, not an oversight. It is compensated by:

- a long, unique database password;
- a least-privilege database user (read/write on WeeklyView's database only);
- the credentials living only in the host's environment settings and your local `server/.env`,
  never in the repository.

Atlas M0 has no automated backups. `npm run db:sample` can rebuild the sample dataset, which is
acceptable until a real team files real reports; by then the live site should have its own
database (`docs/DEPLOYMENT.md` §1.3).
