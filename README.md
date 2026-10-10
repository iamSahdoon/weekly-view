# WeeklyView

Every team member posts a short daily update and files one weekly report built from those
days. Managers read the days as they come in, comment, and approve or send back the weekly
report. A dashboard shows the team's week and its projects.

MERN: React + Vite on Vercel, Express 5 + Mongoose 8 on Render (or Vercel), MongoDB Atlas M0.
To put it online, follow `docs/DEPLOYMENT.md`.
The planning documents are in `docs/`; build progress is in `PROGRESS.md`.

## Layout

| Folder    | What                                     | Deploys to                |
| --------- | ---------------------------------------- | ------------------------- |
| `client/` | React app, landing page and browser demo | Vercel (root `client`)    |
| `server/` | REST API under `/api`                    | Render (root `server`)    |
| `docs/`   | Planning documents                       | —                         |

Each folder is self-contained, with its own `package.json`, lockfile and `.env.example`.
Nothing imports across them. The root `package.json` only forwards scripts.

## Running locally

Requires Node 20 or later.

```bash
npm --prefix server install
npm --prefix client install
```

Copy `server/.env.example` to `server/.env` and `client/.env.example` to `client/.env`, then
fill in the server values (`MONGODB_URI`, and a `JWT_SECRET` of 32+ random characters).
Never commit `.env`.

```bash
npm --prefix server run dev        # API on :5000
npm --prefix client run dev        # Vite on :5173
npm test                           # server and client tests
npm run lint
```

## Atlas network access is `0.0.0.0/0` — on purpose

Render's free instances have no static outbound IP, so there is no address to allowlist.
The cluster's network access is therefore open to all addresses. This is a deliberate
tradeoff, not an oversight. It is compensated by:

- a long, unique database password;
- a least-privilege database user (read/write on the `weeklyview` database only);
- the credentials living only in Render's environment settings, never in the repository.

Atlas M0 has no automated backups. The seed script can rebuild the demo dataset, which is
acceptable until a real team files real reports.
