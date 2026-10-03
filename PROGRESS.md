# Build progress

> Updated by the agent at the end of every stage. `MASTER_PROMPT.md` defines the stages.

**Next stage: S3** (S1's Atlas check is still the owner's to run — see *Open questions*)

| Stage | What | Status |
| --- | --- | --- |
| S0 | Repo scaffold | done |
| S1 | Server foundation, models, test harness | done — Atlas check pending |
| S2 | Auth, users, links, leave, ownership | done |
| S3 | Projects, tasks, holidays, calendar | not started |
| S4 | Reports, days, submit, week reads | not started |
| S5 | Comments, review, "new" markers | not started |
| S6 | Dashboard, seed script | not started |
| C1 | Client foundation: lib, apiClient, auth, base UI, `/design` | not started |
| C2 | Shell, tables, filters, URL state | not started |
| C3 | Reading a week; comment components | not started |
| C4 | Writing: day panel, This week | not started |
| C5 | The weekly form | not started |
| C6 | History, team updates, review desk, review page | not started |
| C7 | Dashboard and charts | not started |
| C8 | Projects, users, holidays, people, profile, account | not started |
| C9 | "New" markers, system states, print | not started |
| C10 | Demo chooser and bar, landing page | not started |
| C11 | Verification, deployment, README | not started |

### S0 checks (2026-10-03)
- `npm install` in `server/` and `client/`: OK (lockfiles committed).
- `npm run lint`: clean. `npm test`: green (server 1, client 1 — both placeholders).
- Bare Express app: `node src/server.js` started; `GET /nowhere` → 404.
- Bare Vite page: dev server served `index.html` and `/src/main.jsx` (200); `vite build` OK.
  **Unverified:** the page was not rendered in a browser (no browser tool used).

### S1 checks (2026-10-03)
- `npm run lint`: clean. `npm test`: green — server 54 tests in `tests/foundation/`, client 1
  (placeholder parity test, unchanged until C1).
- **Indexes:** `tests/foundation/indexes.test.js` asserts every index in `database_schema.md` §6
  exists with its options (unique, sparse, partial `isOwner`, `en`/strength-2 collation), no
  others, and exactly the seven collection names (`seenMarks` included).
- **In memory:** tests run on a `mongodb-memory-server` replica set; `mongod` downloaded fine.
- **Real server, local Mongo:** `node src/server.js` against a local in-memory replica set
  printed "MongoDB connected", then `GET /api/health` → 200 `{ status: "ok" }`,
  `GET /api/nowhere` and `GET /api/auth/me` (stub router) → 404 `ROUTE_NOT_FOUND` in the envelope.
- Missing `MONGODB_URI` / `JWT_SECRET` → the process stops with the Zod error tree, exit 1.
- `utils/weeks.js` tests pass with `TZ` set to Los Angeles, Colombo and Kiritimati.
- **Atlas: not done.** First run: the cloud `MONGODB_URI` had no `@cluster…` host. The owner
  fixed it; second run (same day): the SRV lookup finds the cluster's 3 servers, but the TCP
  connection to port 27017 times out, and the server stops with
  `MongooseServerSelectionError` after 10 s. Either the Atlas IP access list doesn't admit
  this cloud container, or the cloud environment doesn't let database traffic out (it routes
  outbound HTTPS through a proxy). It can't be told apart from here. The value was never
  printed. The check moves to the owner's machine (steps under *Open questions*).

### S2 checks (2026-10-03)
- `npm run lint`: clean. `npm test`: green — server 129 (54 foundation, 20 in
  `tests/rbac/auth.test.js`, 55 in `tests/rbac/adminRoutes.test.js`), client 1.
- Tests cover `api_specification.md` §6.6 items 33–40 for the S2 routes and §6.7 items 41–42;
  the bootstrap race is tested twice: two real concurrent signups, and a forced race where
  both requests pass the emptiness check so the `isOwner` index is what closes it. Also:
  concurrent link accepts (one wins), re-issue kills the previous link, expired / unknown /
  used / wrong-purpose links give one identical `404 LINK_INVALID`, only the SHA-256 is stored.
- §6.1 has no items for S2 (all are `reportPolicy`, S4). §6.6 item 33's rows for U7, P2–P5,
  HD2–HD4 and D1–D8, and item 39's "weeks between periods are not expected (D1)", belong to
  the stages that build those routes (S3, S4, S6); each adds its rows to `adminRoutes.test.js`.
- **Walkthrough on the real server** (`node src/server.js` against a local in-memory replica
  set, driven with curl): A1 `available: true` → A2 201 → second A2 `403 SIGNUP_CLOSED` →
  A3 200 → U3 201 with `linkUrl` → A7 200 `{ purpose: "invite", email, role }` → A8 201 →
  the same A8 again `404 LINK_INVALID` → the invitee logs in → U1 lists both. Wrong role
  (member → U1) `403 FORBIDDEN`; bad signup / invite bodies `422` with per-field messages;
  remove → the removed person's token `401`; the database rows matched the responses
  (status, `tokenVersion`, work periods, leave, no link fields left after accept). The raw
  link token never appeared in the server's morgan log.
- Atlas still not exercised (see *Open questions*); nothing in S2 needs it.

## Decisions made while building
- S0 placeholders, replaced by later stages: `server/src/app.js` is a bare `express()` and
  `server/src/server.js` listens on a fixed 5000 with no `process.env` read (S1 adds
  `config/env.js`, `env.PORT` and the Mongo connection); `client/index.html` and
  `client/src/main.jsx` render a bare page (C1); `constants.parity.test.js` asserts nothing
  real yet (becomes the five-enum check once S1 and C1 create both constants files).
  Touches `project_structure.md` §2.3, §3.1, §7.1.
- `client/.prettierrc.json` loads `prettier-plugin-tailwindcss` without `tailwindStylesheet`;
  C1 should point it at `src/styles/index.css` once that file exists, so class sorting knows the
  custom `@theme`. Touches `tech_stack.md` §1.3.
- ESLint configs follow Vite's React template (`no-unused-vars` ignores `^[A-Z_]`, since there is
  no `eslint-plugin-react` to mark JSX usage). Touches `tech_stack.md` §1.3.

- S1: the Mongo duplicate-key mapping lives in one table in `middleware/errorHandler.js`
  (`MASTER_PROMPT` S1), not in each service as `api_specification.md` §1.9 words it. It maps
  exactly the four §1.9 cases (`isOwner` → `SIGNUP_CLOSED`, `email` → `USER_EXISTS`,
  `holidays.date` → `HOLIDAY_EXISTS`, `projects.name` → `PROJECT_NAME_TAKEN`); any other E11000
  is a 500, so context-dependent ones (two first posts of a week, two submits) stay the
  services' job. Reversible: services may still catch and rethrow.
- S1: `timestamps: true` on the seven collection schemas. Subdocument schemas carry only the
  dates the schema doc lists; thread `createdAt` is written by the service from its own clock,
  because the 10-minute window (and its injected-clock test) is measured against it.
- S1: subdocument `_id`s are kept on lines, blockers, achievements, threads and replies (the
  docs reference or serve them) and turned off on days (keyed by weekday), `content.tasks`,
  links, work and leave periods, plan, plan history, blocker resolutions and `latestComment`.
- S1: Mongoose collection names are set explicitly; its default would have named the last one
  `seenmarks`, not `seenMarks`.
- S1: `users.linkTokenHash` must be cleared with `$unset`, never set to `null` — the unique
  sparse index only skips documents where the field is absent. Commented in `userModel.js`.
- S1: `authorize(minimumRole)` takes one role and admits it and everything above
  (`api_specification.md` §1.2); `tech_stack.md` §3 writes `authorize(roles)`.
- S1: `validate(schema)` takes one `z.object({ params, query, body })` per route; failures are
  `422 VALIDATION_FAILED` with `fields` keyed by the path inside its part (`email`,
  `days.0.lines.1.hours`). A body that isn't JSON is also `422 VALIDATION_FAILED` (§1.9 has
  no 400).
- S1: `AppError(status, message, code, extra)` — the optional fourth argument carries
  `fields` / `status` / `reason` into `error`.
- S1: `GET /api/health`'s handler is a one-liner inside `routes/index.js` (the tree has no
  health controller). Every other router is an empty stub for its stage.
- S1: `utils/weeks.js` converts each UTC calendar date to a local date with the same
  year/month/day before calling date-fns, so week keys don't depend on the machine's zone.
  It judges a `Date` by its UTC day; which zone defines "today" is for `calendarService` (S3).
- S1: constants export frozen arrays `REPORT_STATUSES`, `ROLES`, `TASK_TYPES`,
  `TASK_STATUSES`, `WEEKDAYS` — what C1's parity test reads.
- S1: test env values live in `vitest.config.js` (`test.env`); its `MONGODB_URI` is a
  placeholder nothing connects to, so tests never reach Atlas even when a real URI is set.
  `testAuth.createUser` puts users on the team from 2026-01-05.

- S2: `reportsFiled` on a U1 item counts the person's reports with `revisionNumber > 0`
  (submitted at least once, whatever the status now); `lastActivityAt` is the latest
  `lastActivityAt` across their reports. The spec names both fields without a formula.
- S2: `linkExpiresAt` is served for any unused invite link, past or not, so the client can
  show `Invite expired` (`frontend_architecture.md` §9.12) — §2.2's "set only for a live
  invite link" read as "an invite link that hasn't been used yet".
- S2: link verification also requires the person's status to fit the purpose (an invite
  link needs `invited`, a reset link `active`), on top of hash, purpose and expiry. A7 on a
  reset link returns `{ purpose, email }` (no `role`, which §2.1 gives for invites only).
- S2: A8 on an invite without `name` → `422 VALIDATION_FAILED` with `fields.name`; the
  validator can't know the purpose, so the service checks it.
- S2: signup maps **any** duplicate key to `SIGNUP_CLOSED` in the service, so a race between
  two signups with the same email is also the 403, not `USER_EXISTS`.
- S2: login validates shape only (non-empty strings); a malformed email is
  `401 INVALID_CREDENTIALS`, not 422, so login has one failure answer. An unknown email still
  costs one bcrypt comparison (against a fixed dummy hash). bcrypt cost is 10.
- S2: U12 to the address the person already has is a 200 no-op (no `tokenVersion` bump),
  like U5's same-role no-op.
- S2: U9 checks the role gate (self, or a manager or admin) before loading the target, so a
  member gets `403` for any id; a manager gets `404` for an unknown one.
- S2: U5 and U6 accept an `invited` target (the spec rejects only `removed`). U4 has no
  self/owner rules: the target must be `invited`, and the owner never is.
- S2: U1's name sort is case-insensitive (`en`, strength 2) with `_id` as the tie-break.
  Unknown body keys are stripped by Zod, not rejected (A5 ignores an `email` in its body).

## Open questions for the owner
- **S2 — a non-owner admin can invite at role `admin`.** U3 lists no owner rule, but U5
  says only the owner may make someone an admin (`403 OWNER_ONLY`). Built as written (U3 has
  no gate), so an admin can invite a new admin they couldn't promote. If U3 should match U5,
  it is one check in `userService.invite` plus a test row; say which you want.
- **S2 — removal doesn't close an open leave period.** `database_schema.md` §3.3's removal
  writes status, work period, `tokenVersion` and link fields only. A person removed while on
  leave keeps an open period, so their U1 item shows `onLeave: true` (U10 lists active people
  only, so it is unaffected). Built as written; closing it on removal would be one `$set`.
- **S1 Atlas check — needs you.** The cloud value is now complete, but this cloud session
  can't reach Atlas on port 27017. Run the check on Windows:
  1. Atlas → **Database** → your cluster → **Connect** → **Drivers** → copy the string. Replace
     `<db_password>` with the database user's password and put `/weeklyview` just before the `?`.
  2. Atlas → **Network Access** → **Add IP Address** → **Add current IP address** (or
     `0.0.0.0/0`, as the README explains for Render).
  3. In a terminal in the repo: `git pull`, then `cd server`, then `copy .env.example .env`.
  4. Open `server\.env` and set `MONGODB_URI=` to the string from step 1, and `JWT_SECRET=` to
     the output of `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
  5. `npm install`, then `npm run dev`. Expect `MongoDB connected` and `API listening on :5000`.
  6. Open http://localhost:5000/api/health — expect `{"success":true,"data":{"status":"ok"},…}`.
     If it stops at step 5 instead, the error line names the cause (an IP not allowed, a wrong
     password).
  Starting the S1 server creates nothing on Atlas: no model is loaded until S2.
- `npm ci` fails in `client/` on npm 10.9 ("lock file's ajv@6.15.0 does not satisfy
  ajv@8.20.0"); `server/` is fine. This session used `npm install --no-save`, which left the
  lockfile untouched. If `npm ci` also fails on your machine, C1 should regenerate
  `client/package-lock.json` with `npm install`.
- ~~Blocks S1's tests~~ **Resolved:** the owner allowed `fastdl.mongodb.org` in the
  environment's network settings, so `mongodb-memory-server` can download `mongod`. The
  owner's Atlas string goes in the environment variable `MONGODB_URI`, never in chat.
- `npm audit` reports 2 moderate advisories in both projects, in dev-only `vitest`
  (`@vitest/mocker`, GHSA-82fw-gwwq-j7x9). The fix is vitest 5, a major outside
  `tech_stack.md` §9–§10 (`^3`). Left at `^3`; it never ships to Vercel or Render.
- `npm` warns that `eslint@9` is no longer supported upstream. `tech_stack.md` pins `^9`; left as is.

## Departures from `docs/project_structure.md`
- Added `server/eslint.config.js`, `client/eslint.config.js`, `client/.prettierrc.json` (the trees
  had no lint/format configs; noted in §2.1 and §3.1).
- ~~Temporary: `server/tests/smoke.test.js`~~ — deleted in S1.
- S1 added `server/tests/foundation/` (five test files proving the stage's *done* list);
  noted in `project_structure.md` §2.1 and §6.
