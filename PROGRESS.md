# Build progress

> Updated by the agent at the end of every stage. `MASTER_PROMPT.md` defines the stages.

**Next stage: C11**

| Stage | What | Status |
| --- | --- | --- |
| S0 | Repo scaffold | done |
| S1 | Server foundation, models, test harness | done |
| S2 | Auth, users, links, leave, ownership | done |
| S3 | Projects, tasks, holidays, calendar | done |
| S4 | Reports, days, submit, week reads | done |
| S5 | Comments, review, "new" markers | done |
| S6 | Dashboard, seed script | done |
| C1 | Client foundation: lib, apiClient, auth, base UI, `/design` | done |
| C2 | Shell, tables, filters, URL state | done |
| C3 | Reading a week; comment components | done |
| C4 | Writing: day panel, This week | done |
| C5 | The weekly form | done |
| C6 | History, team updates, review desk, review page | done |
| C7 | Dashboard and charts | done |
| C8 | Projects, users, holidays, people, profile, account | done |
| C9 | "New" markers, system states, print | done |
| C10 | Demo chooser and bar, landing page | done |
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
  printed. The check moves to the owner's machine.
- **Atlas: passed on the owner's Windows machine (2026-10-04)** — `npm run dev` printed
  `MongoDB connected`, and `/api/health` returned `success: true`.

### S2 checks (2026-10-03)
- `npm run lint`: clean. `npm test`: green — server 131 (54 foundation, 20 in
  `tests/rbac/auth.test.js`, 57 in `tests/rbac/adminRoutes.test.js`), client 1. The last two
  are the owner decisions below; both fail against the code without the change.
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
- Atlas was not exercised in S2; nothing in S2 needs it (S1's check later passed on the
  owner's machine).

### S3 checks (2026-10-03)
- `npm run lint`: clean. `npm test`: green — server 191 (54 foundation, 15 in
  `tests/calendar/calendarService.test.js`, 20 in `tests/rbac/auth.test.js`, 73 in
  `tests/rbac/adminRoutes.test.js`, 29 in `tests/rbac/projects.test.js`), client 1.
- **Done list, as tests** (`projects.test.js`, "S3 done list", the clock frozen with
  `vi.useFakeTimers({ toFake: ["Date"] })`): a 20-day plan from Monday 7 Sep 2026 shows
  1 used / 19 left that Monday and 18 on Tuesday; day 20 (Fri 2 Oct) shows 0 left, day 21
  (Mon 5 Oct) "overdue by 1"; a holiday added on Tue 8 Sep takes that day back out and moves
  day 21 to Tue 6 Oct; removing it restores the count; projects, reports, tasks and users are
  deep-equal before the holiday, after adding it and after removing it.
- §6.6 item 33's S3 rows are in `adminRoutes.test.js`: member → P2–P5 `403 FORBIDDEN`,
  manager and member → HD2–HD4 `403 FORBIDDEN` (nothing written), manager and admin → P2–P5
  succeed. No §6.1–§6.5 item belongs to S3.
- **Walkthrough on the real server** (`node src/server.js` against a local in-memory replica
  set, driven with curl; today was Sat 3 Oct 2026): owner signs up, invites a manager and a
  member (A8); P2 as the manager with a plan from Mon 28 Sep → 201, 5 used / 15 left; as the
  member → `403 FORBIDDEN`; `CLIENT A` → `409 PROJECT_NAME_TAKEN`; P1 as the assigned member
  serves the base shape plus `progress`, no manager fields; HD2 as the manager → 403; as the
  owner on Tue 29 Sep → 201 with `createdBy` as a UserRef, and progress drops to 4 used;
  Saturday → `422` `fields.date`; P4 to 25 days → the old plan in `planHistory` with
  `changedBy`; HD4 → 200 and progress is back to 5; P5 twice → `inactive` both times and the
  default P1 list is empty; P3 on an unknown id → `404 PROJECT_NOT_FOUND`. The database rows
  matched (plan and history stored, membership on the member only, no holiday left).
- `hoursLogged`, T1's `hoursTotal` and `lastWeekKey` are tested against reports inserted
  directly; nothing writes lines until R5 (S4).

### S4 checks (2026-10-04)
- `npm run lint`: clean. `npm test`: green — server 282 (54 foundation, 15 calendar,
  20 `auth`, 74 `adminRoutes`, 29 `projects`, 32 in `tests/policy/reportPolicy.test.js`,
  4 in `tests/policy/submitRules.test.js`, 21 in `tests/rbac/dailyUpdates.test.js`, 25 in
  `tests/rbac/reportAccess.test.js`, 8 in `tests/rbac/scopeParity.test.js`), client 1.
- **Once, not reproduced:** the first full run after writing the suites failed
  `auth.test.js` at file level (its 20 tests skipped, no assertion failed) — a setup
  failure, most likely one of the 14 parallel in-memory replica sets starting slowly. The
  full runs after it (nine) were green. If it shows up again, cap Vitest's file parallelism.
- **Tests per `api_specification.md` §6:** §6.1 items 1–8 (all ten policy functions,
  plus `contentScope` and `buildReportScope`); §6.2 items 9–10 (R1 and U7 rows carrying
  content = `canReadContent` = the Mongo `contentScope`, for member, manager and admin;
  every read endpoint — R1, R4, R8, R9, R12, U7, U8 — searched for markers placed in each
  private layer, as a teammate, a manager and an admin); §6.3 items 11–14 and 18; §6.4
  items 19–25, including two concurrent R7 → one 200, one 409, one revision; §6.6 item 33's
  U7 row. **Not yet:** §6.3 items 15–17 (comments, the 10-minute window) and §6.2 item 9's
  V3 rows need C1–C5 and V3 — S5 adds them.
- **Done list, as tests** (`reportAccess.test.js`, "S4 done list"): five days posted,
  statuses set, submitted (revision 1 stored with content and days, no comments; the
  task's `doneAt` set); a teammate gets the days and `content: null`; a manager reading a
  Draft gets days only (`contentSource: "withheld"`); a manager reading a
  `needs_correction` report gets the sent-back revision's content while the author gets
  the live correction. Send-back is V2 (S5), so the tests and the walkthrough make that
  transition with the send-back's own database writes (`tests/helpers/testWeeks.js`).
- **Walkthrough on the real server** (`node src/server.js` against a local in-memory replica
  set, driven with `fetch`; real clock, Sunday 4 Oct 2026 07:00 UTC): owner signs up,
  invites a manager and two members (U3 → A8); their work periods were then backdated to
  1 Sep in the database, since people who join on a Sunday have no writable week yet. R3 on
  2026-W40 → `not_started`, `report: null`; R5 Monday (new task) → Draft created, Tue–Fri
  → 200, `submitBlockers: ["One task has no status."]`; R5 on W41 → `422 WEEK_OUT_OF_RANGE`
  (+14 h is still Sunday); R6 → `canSubmit: true`; teammate R12 and U8 → X's days, no
  content (searched for the private marker); manager R4 on the Draft → withheld; teammate
  R6 → `403 REPORT_FORBIDDEN`; two concurrent R7 → 200 and `409 REPORT_STATE_CHANGED`
  (`status: submitted`), one revision in the database; manager R8 → one revision; teammate
  R8 → 403; after a database send-back, the author's correction stayed hidden from the
  manager (revision 1 served) and visible to the author; resubmit → revision 2,
  `latestComment: null`, task `doneAt` set; R10 teammate → 403, manager → 200; R11 → 200;
  R13 → one seen mark; U7 as the manager → W40 submitted and W36–W39 `not_started`; U7 as
  a member → `403 FORBIDDEN`; R1 and R2 matched the database. No raw link token appeared in
  the server's log.

### S5 checks (2026-10-04)
- `npm run lint`: clean. `npm test`: green — server 328 (54 foundation, 15 calendar,
  20 `auth`, 74 `adminRoutes`, 29 `projects`, 33 `reportPolicy`, 4 `submitRules`,
  33 `dailyUpdates`, 25 `reportAccess`, 8 `scopeParity`, 18 in
  `tests/rbac/reviewAccess.test.js`, 15 in `tests/rbac/markers.test.js`), client 1.
- **Tests per `api_specification.md` §6:** §6.5 items 26–32 (`reviewAccess.test.js`),
  including two concurrent approvals → one 200, one 409, the winner's `reviewedBy`
  standing, and an approve racing a send-back → exactly one outcome; §6.3 items 15–17
  (`dailyUpdates.test.js`), the 10-minute window on an injected clock (`vi.setSystemTime`:
  9 min 59 s → 200, 10 min 1 s → 403 for both edit and delete, a reply's own window);
  §6.2 item 9's V3 rows and item 10's V3, V4 and N1 reads (`scopeParity.test.js`). Also the
  week-comment rules, V3's filters, sort and paging, V4, and the `isNew` / N1 rules
  (`markers.test.js`, including that week threads a reader can't read never make a row new).
- **Done list, as a test** (`reviewAccess.test.js`, "S5 done list"): the full correction
  cycle of `database_schema.md` §3.4 — five days, submit asking for approval (rev 1),
  manager A sends back (rev 1 `changes_requested` with its comment, `latestComment`, a
  `send_back` week thread), the author replies and corrects content and Friday's day, a
  manager reads revision 1 while the author reads the live correction, resubmit (rev 2,
  `latestComment: null`), manager B approves rev 2; rev 1 keeps C1 and D1, rev 2 holds C2
  and D2, R8 lists both with their outcomes, `lastActivityAt` follows submit and review.
- `testWeeks.sendBack` now calls V2 instead of writing to the database, so the S4 suites
  run their send-backs through the real endpoint (all still green).
- One S4 assertion changed: `dailyUpdates.test.js` expected `isNew: false` on a manager's
  comment on the author's day; with markers built it is `true` (the author hasn't opened
  the week since), which is the specified behaviour.
- **Walkthrough on the real server** (`node src/server.js` against a local in-memory replica
  set, driven with `fetch`; real clock, Sunday 4 Oct 2026 13:39 UTC; work periods
  backdated to 1 Sep as in S4): X posts W40 and submits asking for approval → V3 as A
  lists X `isNew: true`, as a member `403 FORBIDDEN`; `?sort=bogus` → 422; V4 `{count: 1}`
  = N1 `reviewRequests`; V1 by a member → 403; V2 with 9 characters → 422
  `fields.comment`, without `revisionNumber` → 422; valid V2 → `needs_correction` and a
  `send_back` thread, the database revision carrying the action, comment and reviewer;
  X's N1 `thisWeek: true` (Sunday counts W40, see decisions) and R1 `isNew: true` → R13 →
  false; C1 by Y on a closed day → 403, after R11 → 201; C3 by X → 201; C4 by X on Y's
  comment → `403 EDIT_WINDOW_CLOSED`, by Y → 200 with `editedAt`; C5 on a comment with a
  reply → 409, on the send-back → 409; C2 by B → 201 (`kind: comment`, rev 1); C3 by Y on
  a week thread → 403; R4 as Y → `weekComments: null`, `content: null`; R4 as B → revision
  1's content; resubmit → rev 2; B approving with pin 1 → `409 REPORT_STATE_CHANGED`
  (`status: submitted`); A and B approving rev 2 at once → 200 and 409; R8 and the database
  agree (rev 1 `changes_requested`, rev 2 `approved`, threads `send_back`, `comment`,
  `approval`, `latestComment: null`); V4 back to 0. No raw link token in the server log.

### S6 checks (2026-10-04)
- `npm run lint`: clean. `npm test`: green — server 381 (328 before S6, plus 32 in
  `tests/rbac/dashboard.test.js` and 21 in `tests/seed/seed.test.js`), client 1.
- **Tests:** `dashboard.test.js` — the role gate on all eight endpoints (401 signed out,
  403 for a member, 200 for manager and admin); validation (`weekKey`, `weeks ∈ {4, 8, 12}`,
  D2's `sort`, `status`, `limit`, a malformed D7 id); D1 built users-first (people who
  filed nothing are expected, leave is not, an all-holiday week expects nobody and its rate
  is `null`), the trailing rate, open blockers falling when one is resolved, `status` never
  moving the headline numbers, the person filter, the project filter per row (I11); D2 rows
  for Not started and On leave with `report: null`, a draft's `tasksDone: null`, no content
  or task note anywhere in the body, a Needs-correction row read from the sent-back revision
  (I13), sorts, paging, the comma `status` list; D3's window and per-person series,
  Drafts not counted; D4's seven fixed types, D5's order; D6 capped at eight, newest first,
  ignoring `weekKey`; D7's numbers over a work period with a holiday week; D8's plan-only,
  active-only rows and this-week versus total hours. `seed.test.js` — see below.
- **Seed** (`npm run db:sample`; `seed` and `seed:reset` are kept as aliases): deterministic (the same week builds
  byte-identical documents, ids and password hash included), relative to the week it runs in
  (re-run across the 2026 → 2027 boundary in a test), and idempotent. 11 users (the 8-name cast,
  an invited person with a live link, a removed person, a re-hired person with two periods and
  a gap), 5 projects, 28 tasks, 50 reports, 50 revisions, 8 holidays, 5 seen marks.
  The current week holds Approved (asked and not asked), Submitted (asked and not asked),
  Needs correction, Draft, Not started and On leave, with a holiday on Wednesday; week −6 is a
  Holiday week; the weeks before hold a leave week, a Not-started week, and the correction
  cycle (three revisions, two sent back, the third approved, the comment on a specific one),
  an approval with a comment and a reply, a day open to the team with a teammate's comment and
  a reply, a resolved blocker, a carried-over blocker. Plans: Client A on track with planned
  hours, R&D overdue, Marketing starting in the future, Internal Tooling extended (one
  `planHistory` entry), Legacy Portal inactive but named by older tasks.
  `seed.test.js` reads all of it back through D1, D2, D8, U7, R12 and N1 — no write.
- **Manual backend checks on a real server** (`node src/server.js` and `npm run db:sample` against a
  local `mongod` of the same version the tests download; real clock, Sunday 4 Oct 2026):
  `seed` and `seed:reset` (now aliases of `db:sample`) both wipe and refill; `NODE_ENV=production npm run db:sample` refuses.
  Logging in as the seeded manager, admin and a member: every dashboard endpoint → 200 / 200 /
  403, signed out → 401, a missing or invalid `weekKey`, `sort=bad` → 422, D7 for an unknown id →
  404. D1 for W40: filed 5 of 8, 1 on leave, 1 needing correction, 3 open blockers raised by 3
  people. `status=approved` on D1 returns the same numbers (the filter moves D2 only: it
  lists Imali J. and Sanduni B.). `person=Imali,Tharindu` → 2 of 2; `project=R&D` → 2 of 2 and
  62 of 186 hours; D3 with `trendPerson` returns both series; D8 lists four projects
  (Client A on track, Internal Tooling 3 days left, Marketing 0 days used, R&D overdue by 7). The
  server log holds no link token. **Unverified:** nothing on a screen — S6 has no UI.

### C1 checks (2026-10-04)
- `npm run lint`: clean (client and server). `npm test`: green — server 381 (unchanged), client 30:
  `constants.parity.test.js` 5 (the five enums, read from `server/src/constants/`; a renamed
  task type was tried and fails it), `demoCoverage.test.js` 10 (every `authService` function
  answered by the demo adapter, plus "an unknown route is the 404 envelope"), `dates` 6,
  `urlParams` 3, `normalizeError` 3, `authReducer` 3. `vite build` OK; a production build has
  no `/design` chunk.
- `npm ci` now works in `client/`: `client/package-lock.json` was regenerated with
  `npm install` (the S0 open question). No dependency was added or changed in `package.json`.
- **Off-system classes:** `@apply bg-indigo-500`, `text-sm` and `p-18` each stop the build
  ("Cannot apply unknown utility class"). **`rounded-lg` compiles** — to
  `border-radius: var(--radius-lg)`, which `@theme` sets to `0px`. See *Open questions*.
- **Walkthrough in a real browser** (Playwright's Chromium, headless; the API on a local
  in-memory replica set, Vite dev server, an empty database): sign up the first account →
  "/" signed in as owner, token stored; sign out → `/signin`, token gone; `/signup` now shows
  the closed state; a wrong password shows the strip, no dialog; sign in → "/"; `/signin`
  while signed in → "/". **Mid-page expiry:** the password was changed from outside
  (`tokenVersion` + 1), then a request from the open page → the token is cleared and the
  session-expiry modal opens over the page, which stays at "/"; a wrong password shows the
  strip inside the modal; the right one closes it, same page, same person. **Stale token at
  boot:** a junk `wv_token` and a reload → `/signin`, and a MutationObserver counted **zero**
  dialogs on that load. Invite (U3) → `/invite/:token` shows email and role read-only →
  accept → signed in as the invitee; the same link again → the one expired state. Reset link
  (U13) → `/reset/:token` → mismatched confirm shows the field error → save → signed in.
  `/demo` boots the adapter chunk and makes no request to the API. No JavaScript errors; the
  only console errors were the expected 401/404 responses. The server log holds no link token.
- **Visual checks — rendered and looked at** (screenshots, 1280px and 360px): the four auth
  screens and their error, closed and expired states; the modal; `/design` in light and dark,
  after a reload (the theme persisted, no flash path exercised beyond the inline script);
  the toast and tooltip in dark. Fonts loaded (Chivo, Instrument Sans, JetBrains Mono) —
  served to the headless browser through Node's verified fetch, since it doesn't read the
  container's proxy trust store. No horizontal overflow at 360px.
- **Still unverified, for the owner to look at** in a real browser: hover and press states
  (the screenshots are static), the 120–200ms enter/exit animations, keyboard use of every
  primitive beyond the modal (focus goes to the first field, Esc returns focus to the opener,
  Esc is ignored while a confirm is pending — those three were checked), screen-reader
  output, the boot splash's 3-second "Starting up" line and its error panel (needs the API
  stopped at boot), and Safari/Firefox. Open `npm --prefix client run dev` → `/design`.

### C2 checks (2026-10-04)
- **Owner note (2026-10-04):** the three seed failures below do not reproduce elsewhere — all 21
  `seed.test.js` tests pass on `main` on the owner's machine. They were this cloud container
  (Mongo connection timeouts), not the code.
- `npm run lint`: clean (client and server). `npm test`: **client green, server not fully green in
  this container** — client 48 (30 from C1, plus 18); server 378 of 381. The three that fail are the
  last three of `server/tests/seed/seed.test.js` ("has seen marks…", "every report's revisions
  match…", "reseeding across a year boundary…"): `MongooseError: Connection operation buffering
  timed out after 10000ms`. They fail the same way in every run, and on an untouched
  `origin/main` checked out in a clean worktree. C2 changes nothing under `server/`; the
  first full run had six failures in that file, so it is timing-dependent. S6 recorded 381
  green. Cause not investigated (the file freezes `Date` with fake timers around
  mongodb-memory-server; this container's Node / driver timing is the first suspect). The client's 18 new tests: `routeGuards.test.jsx` 8 (a member at `/review` gets the 403 state and none of
  the page; the admin line; a manager is let in; a bad `:week` is the not-found page; the Sidebar's
  markup per role has no manager or admin item for a member, and marks one item current, People on a
  person's week, This week on the edit route), `navItems.test.js` 4, `routeParams.test.js` 3, and
  3 more in `urlParams.test.js`. `vite build` OK. No service function was added, so
  `demoCoverage.test.js` is unchanged and green.
- **Walkthrough in a real browser** (Playwright's Chromium, headless; the API on a local in-memory
  replica set, Vite dev server; an owner, a manager and a member made through the API). Every line
  below was asserted by the script, which exited 0:
  - *Guards:* a member at `/review` → the 403 state **inside the shell**, URL unchanged, the top
    bar reads "No access", and the sidebar's DOM holds exactly *This week · My reports · Team
    updates* — no *Review desk, Team dashboard, People, Projects, Users, Holidays* anywhere in
    `<aside>`. `/users` for a member and for a manager → "This area is for admins." `/reports/2026-W99`,
    `/people/nothex/reports/2026-W40` and `/nowhere` → the 404 state inside the shell. A manager's
    groups are *Review · Team · My work* (My work last), an admin's *Review · Team · Admin · My
    work*. Signed out: `/review` → `/signin`; `/nowhere` → a standalone 404 with no shell.
  - *URL state* (the `/design` "Table, filter bar, pagination" section is wired to `useUrlFilters`):
    typing in the search is debounced (nothing in the URL at 100 ms, `?q=nad` after 250 ms) and
    **replaces** history; a sort header click writes `?sort=hours&dir=asc` and `aria-sort`
    follows, a second click flips it (`dir=desc` is the default, so it leaves the URL); `Clear (n)`
    removes the filters and keeps the sort; the multi-select writes nothing until `Apply`
    (`?project=a,b`); `Next page` → `?page=2` and the range text → "21–32 of 32"; changing a
    filter drops `page`; **Back** returns to page 2 with the same first row; a **reload** keeps
    the URL, the rows and the filter triggers' state; a hand-edited
    `?sort=bogus&dir=up&page=-3&limit=7&person=,,` reads as the defaults with no error; rows per
    page → `?limit=50`.
  - *Shell:* ≥ 1280 px sidebar 240 px and top bar 62 px; collapse → 62 px rail, labels become
    tooltips, `wv.nav.collapsed` stored and honoured after a reload; at 1100 px a stored
    "expanded" choice wins over the automatic rail and with no choice it is the rail; below
    1024 px there is no `<aside>` in the DOM, the hamburger opens a 280 px drawer, focus goes to
    the first nav link, **Esc**, a backdrop click and a route change each close it, and focus
    returns to the hamburger. Signed in through the real form → `/` in the shell; navigating
    between pages keeps the same sidebar node (no remount) and sets `document.title` to
    "{title} · WeeklyView"; Back works; Sign out from the user popover → `/signin`, token gone.
    The user popover opens upward (*Account · Appearance · Sign out*); Dark sets
    `<html data-theme>` and `wv.theme`; Esc closes it and returns focus to the trigger. Offline
    (browser context offline) → the strip under the top bar, gone when online. First Tab lands on
    "Skip to content", visible; Enter moves to `#main`.
  - *Week picker:* `‹` steps back, `›` is disabled at the current week, `‹` disables at `min`;
    the popover is a Mon–Fri grid; `→` moves the highlighted week and focus, `Enter` selects and
    closes, `Esc` closes and returns focus to the trigger.
  - *360 px:* no horizontal overflow on a shell page or on `/design`; the table is stacked cards
    (no `<table>` in that section), `Rows per page` is hidden, the filter bar is search + `Filters`,
    whose sheet holds a `Sort` select and both multi-selects; picking a sort there writes
    `?sort=hours&dir=asc`.
  - No JavaScript errors in any run. The only console errors were the container's blocked
    Google Fonts requests (`ERR_CERT_AUTHORITY_INVALID`) and the expected 401 / 403 / 404s.
  - `/demo` boots, makes no API request, and (signed out) has no shell.
- **Screenshots looked at** (1400 px light and dark, 900 px drawer, 360 px cards): the shell, 403 and
  404 states, the multi-select, the week picker, the table and stacked cards. **The container
  blocks Google Fonts, so every screenshot used the fallback sans-serif and monospace**:
  layout, spacing, colour and states were looked at; Chivo / Instrument Sans / JetBrains Mono
  metrics were not.
- **Still unverified, for the owner to look at** in a real browser: the three fonts at their real
  metrics (top-bar title, nav items, the table's header and mono cells); hover, press and
  focus-visible states (the screenshots are static); the motion — the drawer's 200 ms slide, the
  tab bar's slide, the route's 140 ms fade, the sidebar's 160 ms width change — which was run but
  not watched; the 44 × 44 touch targets below 1024 px (the CSS is there; no touch device or
  hit-test measured); keyboard use of the multi-select and the Tabs / SegmentedControl arrows
  beyond what is listed; screen-reader output; Safari and Firefox. Open
  `npm --prefix client run dev` → `/design` (the last two sections are new).

### C3 checks (2026-10-04)
- `npm run lint`: clean (client and server). `npm test`: green — server 381 (unchanged), client 101
  (64 before C3, plus 37): `permissions.test.js` 9 (the week-thread gates of G1, the 10-minute
  countdown arithmetic, version labels), `demoWeeks.test.js` 14 (the layers of a week through the
  demo adapter, resolve and team-comment rules, week comments, the 10-minute window on a frozen clock
  — 9 min 59 s edits, 10 min 1 s is `EDIT_WINDOW_CLOSED` for edit and delete —, comments with
  replies, the "new" markers), `ReportDetailPage.test.jsx` 8, and 8 new cases in `demoCoverage.test.js`
  (every function in `reportService`, `reviewService` and `userService`, 17 in all, is answered by
  the demo). `vite build` OK.
- **The table of `frontend_architecture.md` §9.4, against the real API** (Playwright's Chromium,
  headless; the API on a local in-memory replica set seeded with `npm run db:sample`; Vite dev server).
  Every line below was asserted by the script, which exited 0 on a freshly reseeded database:
  - *Teammate* (a member on a Needs-correction week): the five days, the `--tint` note "Weekly
    reports are shared with managers only.", none of sections 01–06, no *Overall comments* or
    *Versions* in the rail, **no request to `/revisions`**, U8 used, no resolve toggle, no JS error.
  - *Manager on a Draft*: the days, "Weekly report not submitted yet." naming the author, no
    document, no revisions request, the breadcrumb `People / Ayesha C. / Week 40`.
  - *Manager on Needs correction*: API `contentSource: "revision"`; the correcting banner with the
    sent-back date; all six sections, showing revision 1's text and not the author's correction;
    the rail's thread labelled `rev 1 · sent back`.
  - *Author* on her Needs-correction week: R3 used, the live document, `Edit report` in the top bar
    linking to `/reports/:week/edit`, the `Carried over` label, R13 sent **exactly once** (StrictMode
    included), "new" markers on first open. Reply (C3) → shown with its `N min left` countdown →
    Edit (C4) → `edited` → Delete (C5, through the confirm) → gone; no Delete on the manager's
    send-back. The team-comments switch flips at once, R11 is sent, and the state survives a reload.
  - *Manager on a Submitted week*: the live document; `Comment` opens a week thread (C2) that carries
    `rev 1`, and is deleted inside the window; a blocker toggle flips at once, R10 is sent, and it
    flips back; a resolved blocker reads `Resolved 2 Oct` for a manager.
  - *Revisions rail* (a report with three versions, two sent back): `rev 3 current · rev 2 sent back ·
    rev 1 sent back`; choosing rev 2 requests R9 and shows "Viewing rev 2 — sent back" over that
    snapshot; `Back to current` returns.
  - *Edges*: no report → "No report for week 20." and `Back`; an unknown person → the not-found page;
    `/people/:me/reports/:week` replaces itself with `/reports/:week`; at 1400 px the rail is the
    280 px right column, at 360 px it sits above the document with no horizontal overflow.
- **Screenshots looked at** (1280 px and 360 px): teammate, manager on a Draft, manager on Needs
  correction, author, manager on a Submitted week, a revision view, no report. **The container blocks
  Google Fonts, so every screenshot used the fallback sans-serif and monospace.** Found and fixed by
  looking: each day's table sized its columns on its own (now a fixed layout), and at 360 px the
  table scrolled sideways and hid the hours (below 640 px each line now stacks).
- **Not done / unverified:** the failure toast on the two toggles (owner's answer, below) is checked
  by unit tests on the mutation options only — it was not provoked in a browser. The demo was exercised through its adapter in tests only — there is no
  demo chooser until C10, so no page was driven in the browser at `/demo`. Hover, press and
  focus-visible states, the confirm dialog's focus return, keyboard use of the versions list, the
  countdown ticking in a real clock (the shared ticker is unit-checked by arithmetic only), screen
  readers, the fonts' real metrics and Safari / Firefox are unverified. **"New" on reopening:** the
  page follows §9.4 exactly (R13 invalidates `newMarks`, `reports`, `reviewDesk`, never `week` or
  `report`), so a week reopened inside the 30 s `staleTime` is served from the cache with the
  markers it loaded with; that is C9's done item ("shows its markers once and not on reopening") and
  was not exercised here.

- **C3 fix (2026-10-04, found by the owner):** with the API stopped, a failed toggle's
  invalidation refetched the week, the refetch failed and the whole page became "This week didn't
  load". Now the error state shows only when there is no data yet: `QueryView` and
  `ReportDetailPage` (the week, the versions list and a chosen version) test
  `isError && data === undefined`, so a failed background refetch keeps the loaded week on screen.
  Tests: `ReportDetailPage.test.jsx` (a cached week plus a failed refetch renders exactly as before;
  a week that never loaded still shows the error with `Try again` — the first fails without the fix)
  and `components/ui/__tests__/QueryView.test.jsx` (2).

### C4 checks (2026-10-04)
- **Owner answers, second round (2026-10-05):** lint clean; client 147 green; the leave confirm
  walked in a browser (see *Decisions*). Server suite not re-run (no server change).
- **Owner answers (2026-10-05):** `npm run lint` clean; client 145 green (after the fixture fix
  below). Server: 376–380 of 381 in this container, across runs. The failures are only in
  `tests/seed/seed.test.js` — `MongooseError: Connection operation buffering timed out` — the
  container issue recorded in C2 (nothing under `server/` changed). The drafts move and the auth
  forms' timing were not re-walked in a browser.
- `npm run lint`: clean (client and server). `npm test`: green — server 381 (unchanged), client 145
  (105 after the C3 fix, plus 40): `weekActions.test.js` 9 (the top-bar action's priority order and
  the panel's button), `reportSchema.test.js` 6 (ids round-trip so a blocker keeps its resolution,
  empty blockers dropped, `newTask`, the four field messages, quarter hours, R5 path mapping),
  `demoDays.test.js` 10 (on a frozen Wednesday: the first post creates the Draft, lines on two
  projects and a new task, the new task in T1, editing keeps line and blocker ids and the
  resolution, dropping a blocker prunes it, future / holiday / out-of-range / frozen-week /
  someone else's task / done task / bad hours refused with the server's codes, holidays in
  `dayStates` and HD1, leave on and off through U9 / U10, project progress, R1 and R2),
  `ThisWeekPage.test.jsx` 7 (the day panel's composer / posted / missing / frozen / holiday /
  future states, the page, and the first-week panel), and 8 new cases in `demoCoverage.test.js`
  (every new service function is answered by the demo). `vite build` OK.
- **The done list, in a real browser against the real API** (Playwright's Chromium, headless; the
  API on a local in-memory replica set, `npm run db:sample`, Vite dev server; today was a Sunday, so the
  current week's Wednesday holiday and four past days were in play). Every line below was asserted
  by the script, which exited 0 on a freshly reseeded database:
  - *Post a day with lines on two projects and a new task* (Malith, Not started, every day missing):
    the top bar read `Fill in Monday`; the holiday cell is `aria-disabled`; Monday opened in the
    composer with "Monday’s update is missing — your report can’t be submitted without it."; line 1
    an existing task (Internal Tooling) picked from the combobox, line 2 "Start a new task…" chosen
    with the keyboard, named, on Client A; a blocker; the live total read 5.5 h. `Post update` → R5
    200 → the posted view shows both projects, the new task and the blocker; the strip's Monday
    shows 5.5 h; the top bar moved to `Fill in Tuesday`; the week's panel reads Draft (the first post
    created the report).
  - *Edit it*: `Edit` → change a line → `Post update` → the new text with "· edited".
  - *Switch days without losing unposted text*: Monday's unposted lines (both tasks, the new task's
    name, the blocker) survived a switch to Tuesday and back, and Tuesday's typed text survived a
    switch back to it. Navigating to another page with unposted text opened "Leave this page?";
    Cancel stayed.
  - *The top-bar primary action follows the week's state*: Ayesha (Draft, Friday missing)
    `Fill in Friday`; Tharindu (Needs correction) `Fix and resubmit`, with the correction panel
    ("Sent back by Ruwan P." · date · rev 1); Nadia (Submitted) no primary, the panel offers
    `View report`; Dinesh (on leave) "You’re on leave · Turn off".
  - A blank line posted shows "Choose a task." / "Choose a type." / "Say what you did." / "Enter
    the hours." and sends nothing. At 360 px there is no horizontal overflow and a line stacks.
    No page errors.
  - *The C3 fix*: with every API request aborted, the week page's team-comments switch reverted
    with the toast, and after the failed refetch the week was still on screen (no "This week
    didn’t load.").
- **Found by looking at the screenshots and fixed:** every native `<select>` had a dashed border —
  Chromium matches a select as `:read-only`, which picked up the read-only look in
  `ui/inputClasses.js` (a C1 bug, on every Select); and a line's "Choose a type." stayed after a
  type was chosen (RHF's `onBlur` mode re-validates on change only after a submit — now
  `onTouched`, which is design §4.10's rule). Both re-checked by the script.
- **Screenshots looked at** (1280 px and 360 px): composing, posted, Needs correction, a 360 px
  composer. The container blocks Google Fonts, so the fallback fonts were used.
- **Not done / unverified:** the demo was exercised through its adapter in tests only (no chooser
  until C10). Not clicked in the browser: `Save`, the correction panel's `Reply`, `Turn off`
  leave, the Days | Hours toggle, the holiday cell's tooltip, `Cancel` on an edit. The browser's
  own tab-close prompt (`beforeunload`) can’t be shown headless — the listener has no test and is
  unverified. Hover / focus states, screen readers, the combobox with a screen reader, real
  fonts, Safari and Firefox are unverified.
- **Environment note:** this container has a `MONGODB_URI` environment variable set to an Atlas
  cluster, and it takes precedence over `server/.env`. The first `npm run db:sample` tried it and
  could not connect (nothing was written). Every later run set `MONGODB_URI` to the local
  in-memory server explicitly.

### C5 checks (2026-10-05)
- `npm run lint`: clean (client and server). Client `npm test`: green — 181 (147 before C5, plus
  34): `submitChecklist.test.js` 6, `useAutosave.test.js` 6 (the autosave's state machine on fake
  timers: 1200 ms after the last change, one request in flight, one trailing save with the latest
  values, `failed` keeps the edits and `Retry` sends them), 7 new cases in `reportSchema.test.js`
  (form values from a report, no default status, empty rows dropped, a half-typed link held back,
  a removed key blocker sent as null, one key achievement, R7's 422 mapping),
  `demoContent.test.js` 7 (R6 and R7 in the demo with the server's checks and codes),
  `ReportEditPage.test.jsx` 6 (static renders), and 2 new cases in `demoCoverage.test.js`.
  Server: 380 of 381 in this container — the one failure is `tests/seed/seed.test.js`
  "reseeding across a year boundary" with `MongooseError: Connection operation buffering timed
  out`, the container issue recorded in C2 and C4. Nothing under `server/` changed.
- **The done list, in a real browser against the real API** (Playwright's Chromium, headless;
  the API on a local in-memory replica set; Vite dev server). **Per the owner, the seed was not
  run and no Atlas / `MONGODB_URI` database was touched** — the container's `MONGODB_URI` (an
  Atlas string) was overridden in-process. The data was written through the API by a scratch
  script: an owner (Priya A.) and an invited member (Kamal M.), work periods backdated three
  weeks in the in-memory database, Priya's W39 (Mon–Thu posted) and W40 (all five days, two
  tasks, two blockers), Kamal's W40 submitted with approval asked and sent back by Priya. Today
  was Monday, 5 Oct 2026. Every line below was asserted by the script, which exited 0 on a fresh
  database:
  - *Submit disabled with a named reason*: W39 — `Submit` is `aria-disabled`, its tooltip reads
    "Friday has no update.", the rail's checklist has "Every working day has an update" unticked
    with a `Friday` link. W40 — "2 tasks have no status.", then "One task has no status." after
    one status.
  - *A blocked submit scrolls to and focuses the first problem*: clicking the disabled `Submit`
    on W39 focused the Friday cell of the week summary (it sits at 122 px — the page can't scroll
    further up); on W40 it focused the first task's Select at exactly 140 px from the top,
    `aria-invalid="true"`, with "Choose a status." under both tasks and the rail's `01 Tasks` in
    the error colour. Choosing a status clears its message.
  - *Enabled the moment the last status is set*: `aria-disabled` was gone while the indicator
    still read "Unsaved changes" — before any autosave was sent.
  - *Autosave, all four states, never a toast*: opens "Saved 08:00"; typing → "Unsaved changes";
    after 1.2 s → "Saving…" (the request held open by the script) → "Saved HH:MM"; with R6
    aborted → "Not saved" + `Retry`, no toast in the DOM; leaving then asks "Leave this page?"
    and `Cancel` stays; `Retry` → "Saved", and the content was in the database. `Save` flushes.
  - *Typing during a refetch changes nothing*: while a save was held open, the script added a task
    to Friday through R5 and kept typing in Notes. When the save returned, the new task appeared
    as a row with no status, the typed text and the two chosen statuses were untouched, a
    trailing save stored the full text, and `Submit` went back to disabled ("One task has no
    status.").
  - Key blocker: radio semantics (choosing Thursday's unflags Tuesday's), stored by R6. Key
    achievement: a second click clears it. A link "example.com/spec" shows "Use a link that starts
    with http:// or https://." on blur and is held back (R6 never 422'd); once valid it is stored.
  - *First submit with "Ask for approval"*: ticked → `/reports/2026-W40`, Submitted, rev 1,
    `approvalRequested: true`, no toast. `/reports/2026-W40/edit` on a filed report → the
    document; `/reports/2026-W38/edit` with no report → `/?week=2026-W38`.
  - *Resubmit* (Kamal, Needs correction, via `Fix and resubmit` on This week): the correction
    panel above section 01 without `Open and fix`, `Resubmit` enabled, statuses from the report,
    "Ask for approval" unticked. A status and a note changed just before `Resubmit` were flushed
    first: rev 2, Submitted, `approvalRequested: false`, the note stored.
  - *A full week at 360 px*: no horizontal overflow; the rail is gone; tasks are cards with
    full-width 44 px Selects at 16 px; the bar is 88 px with "Friday has no update." above it;
    statuses, a planned item and a link saved. No page errors anywhere.
- **Screenshots looked at** (1440 px and 360 px): the open form, the blocked submit, "Not saved",
  the bar with "Ask for approval" ticked and its hint, the correction form, 360 px top and full.
  The container blocks Google Fonts, so the fallback fonts were used. Found by looking and fixed:
  the 140 px status Select cut "Choose a status" off — the placeholder is now "Set status"; the
  hint had been inside the checkbox's label, so the box's name was the whole sentence — the hint
  now sits outside the label and is wired by `aria-describedby`.
- **Not done / unverified:** the R7 422 path (server disagrees with the client checklist) and the
  409 toast are unit-tested in their mapping only, not provoked in the browser. The `online`
  retry, the tab-close prompt and the IntersectionObserver's "current" row while scrolling were not
  exercised (the current row was seen correct in screenshots only). The demo was exercised through
  its adapter in tests only (no chooser until C10). Hover / focus-visible looks beyond the
  approval hint, screen readers, real fonts, Safari and Firefox are unverified.

### Owner: test by hand (C5)
Run `npm run db:sample` locally first; every seed account's password is `weekly-view-dev`.
**First submit** — Malith W. has a past week with no report (three weeks back), so he can fill
it and submit:
1. Sign in as `malith@example.com`.
2. On This week, open the week picker in the top bar and choose the week three weeks back
   (it has no report: every day shows as missing).
3. Post each missing day: click the day in the strip, add a line (task, type, what you did,
   hours), `Post update`. Do this for every day that isn't a holiday.
4. Click `Review and submit` in the top bar. The form opens.
5. Look at the bar at the bottom: `Submit` is greyed and hovering it says how many tasks have no
   status. Click it anyway: the page scrolls to the first task and its status box turns red with
   "Choose a status.".
6. Choose a status for every task. `Submit` turns blue the moment the last one is chosen.
7. Type in "Planned for next week" and watch the bottom-left: "Unsaved changes" → "Saving…" →
   "Saved 14:32". No pop-up message should appear.
8. **Check the "Ask for approval" box**: it sits left of `Save`, framed like a button; hovering
   it shows the explanation; ticking it fills it blue. Tick it.
9. Click `Submit`. You land on the filed week; it says Submitted, and the week should now be on
   the review desk for Nadia F. / Ruwan P.
**Resubmit** — Tharindu S.'s current week was sent back:
10. Sign in as `tharindu@example.com`. This week shows the correction panel; click
    `Fix and resubmit`.
11. The panel "Sent back by Ruwan P." sits above section 01. The bottom bar says `Resubmit`, and
    **"Ask for approval" starts unticked** even though the first version asked for it.
12. Add a note to the CSV export task, tick "Ask for approval", click `Resubmit`. You land on the
    filed week, Submitted.
**Narrow screen**:
13. In the browser's device toolbar choose a 360 px-wide phone and open any Draft's form (Ayesha C.,
    `ayesha@example.com`, this week): tasks are cards, nothing scrolls sideways, and the bar shows
    the save state and "Ask for approval" on one line, `Save` and `Submit` below, with the reason
    Submit is disabled above it.

### C6 owner answers (2026-10-05)
- **Open blockers only.** "Only blockers" on Team updates now keeps only days with an **open**
  (unresolved) blocker, as design §3.16 says. `reportService.teamUpdates` (R12) and the demo handler
  both drop a day whose blockers are all resolved; `api_specification.md` R12 carries a one-line
  owner-decision note. Tests: the R12 RBAC case resolves and reopens a blocker and sees the day
  leave and re-enter the feed; `demoReview.test.js` does the same in the demo (Imali's Monday
  blocker is resolved in the fixtures, Nadia's Thursday one is open). Also checked against the real
  API in a browser run.
- **The review action panel is pinned.** Wide (≥ 1024 px): the rail is a sticky column whose blocks
  (person, status, versions, comments) scroll on their own while the panel stays at its foot. Narrow:
  the blocks come first and the panel is the last child of the page grid, stuck to the bottom of
  the screen. Checked with 14 overall comments on the report at **1440 × 900** and **360 × 780**:
  `Approve` … `Comment only` are inside the viewport at the top of the page, scrolled down and at
  the page bottom, no horizontal overflow, no page errors; screenshots looked at. At 360 px the
  panel takes about a third of the screen height while it is pinned.
- **Other C6 decisions accepted as built** (so decision 1's People note and decision 4 stand).
- **For C10:** the demo's `fixtures.js` must include **at least one Submitted report that asks for
  approval**, written by someone other than the demo's reviewing perspectives, so the demo's review
  desk (default "Asked for approval" view) is not empty. Today only Nadia's W-1 report is Submitted,
  and it did not ask, so Nadia sees "Nothing waiting." and the admin sees it only under "All
  submitted". Add it with the cast in brand §10 and keep `demoReview.test.js` green (its desk cases
  set `approvalRequested` themselves and assume the current fixtures otherwise).
- Lint clean; client 241 green; server 377 of 381 here — the failures are `tests/seed/seed.test.js`
  "Connection operation buffering timed out", the container issue recorded in C2 / C4 / C5; the same
  two-to-five fail with my changes stashed, and nothing in the seed changed.

### C6 checks (2026-10-05)
- `npm run lint`: clean (client and server, 0 warnings). Client `vite build`: OK. Client `npm test`:
  green — 241 (181 before C6, plus 60): `demoReview.test.js` 17 (the desk lists what asked and
  `all` adds the rest; **your own report is never on your desk, under five filter combinations**;
  person / role / project / week-range filters; a member is refused; approve with and without a
  comment; send back with the 9-character 422 and the `send_back` thread; `SELF_REVIEW_FORBIDDEN`;
  a report that isn't Submitted; **the pinned revision — sent back, resubmitted, a decision on the
  old version is `REPORT_STATE_CHANGED`, and only one of two decisions on the same version wins**;
  R12's order, filters, leave and holiday states; U1 and "no token in the list"),
  `ReviewPages.test.jsx` 17 (the four pages as static renders over the demo's answers on a frozen
  Wednesday: the review page for someone else's report, your own, an already approved one, a
  sent-back one and a Draft; the desk's states and columns; history's rows, `Editable` hints,
  first-time and filtered-empty states; Team updates' tabs, order and closed-to-teammates line),
  `updatesDay.test.js` 9, `reviewDeskParams.test.js` 6, `reviewOutcome.test.js` 4, 2 new cases in
  `useReportQueries.test.js` (the feed flips with the week and restores on failure), and 5 new
  cases in `demoCoverage.test.js` (every new service function is answered by the demo). Server:
  381 of 381 green in this container (nothing under `server/` changed).
- **The done list, in a real browser against the real API** (Playwright's Chromium, headless; the
  API on a local in-memory replica set; Vite dev server). **Per the owner, the seed was not run and
  no Atlas / `MONGODB_URI` database was touched.** The data was written through the API by a scratch
  script: an owner (Sanduni B.), managers Nadia F. and Ruwan P., members Imali J., Tharindu S. and
  Ayesha C., work periods backdated eight weeks; W39 and W40 posted and submitted, Tharindu's W39
  being the oldest request; Ruwan's W40 left a Draft. Three scripts asserted every line below and
  exited 0 on a fresh database (walk 1, walk 2) and again for the 360 px pass:
  - *The review desk never lists your own report.* Nadia's desk: three asked reports, oldest first
    (Tharindu W39, Imali W40, Tharindu W40), Nadia's own W40 absent; `All submitted` adds Ayesha's
    (who didn't ask) and still not Nadia's; `?approval=all&person=<Nadia>` is empty with the
    header kept; person, week-range filters, the New markers (an opened request has none).
  - *Approve pins the revision.* Approve with a comment → the panel becomes "Approved by Nadia F.
    at HH:MM" with the chip Approved and the comment in the rail. **Stale version, 409 path:** with
    Tharindu's W40 open at version 1, Ruwan sent it back and Tharindu resubmitted (version 2) through
    the API; Nadia's `Approve` was refused, the banner "Tharindu submitted a new version. Reload to
    review it." appeared, **both buttons disabled, the typed text kept**, the failure inline above
    the buttons; `Reload` re-pinned (the page showed rev 2), `Approve` worked, the server held
    Approved on rev 2. **Stale version, refetch path:** the same with Imali's W40 — `Comment only`
    (which invalidates the report) refetched it and raised the banner.
  - *Send back.* `Send back` is disabled with no comment and with 9 characters, enabled at 10; the
    confirm names "Send week 40 back to Ayesha C.?" and shows the comment; `Cancel` kept the text;
    confirming gave "Sent back by Nadia F. at …"; the server held Needs correction with a
    `send_back` thread. `Comment only` added a thread, cleared the textarea and left the panel.
  - *"Next in review desk".* From a desk filtered to Tharindu, Approve on W39 → Next went to
    Tharindu's W40, not Imali's (the filters travel in the link's state); with nothing left the link
    went to `/review` and its "Nothing waiting."; the back link in the top bar returns to the desk
    with its filters.
  - *Your own report on the review page:* the strip "You can't review your own report.", no action
    panel in the page; the server also refuses it (`SELF_REVIEW_FORBIDDEN`). A member at `/review`
    gets the 403 page.
  - *C3's §9.4 table, finally by clicking.* Team updates → a name → Imali as a teammate sees
    Nadia's week ("Weekly reports are shared with managers only.", days present); Nadia clicking
    Imali's name sees the document; clicking Ruwan's Draft shows "Weekly report not submitted yet.";
    your own name goes to `/reports/:week`.
  - *My reports:* three weeks newest first, the eight columns of §3.3, `Editable` and the form link
    on the Draft, `Approval asked`, sort and status / week-range filters in the URL, the filtered-
    empty state with the header kept and `Clear filters`. *Team updates:* five tabs, Tue–Fri
    disabled on a Monday, the viewer first, "Not posted yet" one-liners, the blocker, Nadia's
    comment on Imali's day, `Only blockers` and the project filter in the URL.
  - **At 360 px** history, Team updates, the desk and the review page have no horizontal overflow.
    No page errors or failed API calls other than the ones the checks provoke (409, 403).
- **Found by running it and fixed:** the review page asked for a Draft's versions, which the server
  withholds (`403` on R8) — it now asks only when the content is readable, as the week page does; the
  action panel's region was named "Overall comment" twice (now "Review"); the status column wrapped
  "Approval asked" onto two lines (now `nowrap`, 230 px).
- **Screenshots looked at** (1440 px and 360 px): history, the filtered-empty state, Team updates,
  the desk, the review page with the stale banner, the send-back confirm, the mobile desk. The
  container blocks Google Fonts, so the fallback fonts were used.
- **Not done / unverified:** the demo was exercised through its adapter in tests only (no chooser
  until C10; the demo's fixtures hold no approval-asked report, so its default desk reads "Nothing
  waiting." — `All submitted` shows Nadia's; see the C10 note above). The week-range popover's *inner* week pickers were not
  clicked (the `Choose a week` default and `Apply` were). Not clicked: the desk's `Role` filter
  through its popover, the mobile `Filters` sheet, `Reply` on a rail thread, the Team updates
  `Open to team comments` switch and `Resolve`. Hover / focus-visible looks, screen readers, real
  fonts, Safari and Firefox are unverified. (The action panel's position was settled in the owner answers: pinned.)

### Owner: test by hand (C6)
Run `npm run db:sample` locally first; every seed account's password is `weekly-view-dev`. The seed's
current week holds: Nadia F. Submitted and **asked**, Ruwan P. Submitted (not asked), Tharindu S.
Needs correction, Imali J. and Sanduni B. Approved, Ayesha C. Draft; earlier weeks hold some
Submitted-and-unreviewed reports. Use two browsers (or one normal and one private window) for the
last block.
**My reports** (as Ayesha):
1. Sign in as `ayesha@example.com` and click **My reports**. The newest week is a Draft; it shows
   `Editable` beside its chip. Click it: the weekly form opens. Go back.
2. Click the **Week** column header twice: the order flips and the address bar gains `sort=…&dir=…`.
3. Click **Status**, tick **Approved**, **Apply**: only approved weeks stay. Click **Weeks**, choose
   a week for **From week**, **Apply**. Click **Clear (n)** at the right of the bar to reset.
4. Set a filter nothing matches (e.g. Status: Draft plus a week range ending before this week):
   the header stays and **Clear filters** appears.
**Team updates and a person's week** (the teammate and manager views, §9.4):
5. Sign in as `imali@example.com`, click **Team updates**. You are listed first, then the others by
   name; people who haven't posted today are one line. Days after today are greyed.
6. Click the week picker's **‹** to go to last week and click **Mon**. Click **Nadia F.**: you land on
   her week and see her daily updates plus "Weekly reports are shared with managers only."
7. Back on Team updates, click your own name: you go to your own week page.
8. Tick **Only blockers** and pick a project in the project box: the list narrows and both are in
   the address bar.
9. Sign out, sign in as `nadia@example.com`, **Team updates**, last week, click **Imali J.**: you see
   the whole document (tasks, next week, hours by type). Do the same for **Ayesha C.** on the current
   week (a Draft): you see her days and "Weekly report not submitted yet."
   (The **People** page — the other way to reach a person's week — is built in C8; it will link to
   the same address.)
**Review desk and review page** (as Ruwan P.):
10. Sign in as `ruwan@example.com`, click **Review desk**. You see requests oldest first, Nadia F.'s
    current week among them, and **no row for Ruwan P.** Click **All submitted**: still none of your own.
11. Click the Nadia F. row. Look at the right-hand column: person, status, versions, and the box at
    the bottom. Type `short` — **Send back** stays grey. Type ten or more characters — it turns on.
12. Click **Send back**: a window asks "Send week N back to Nadia F.?" and repeats your comment.
    Click **Cancel** (your text is still there). Click **Approve** instead: the box is replaced by
    "Approved by Ruwan P. at …" and a **Next in review desk** link. Click it: you go to the next
    request (or back to the desk's empty state).
13. Use the desk's **Person** filter to pick one person, open a row from there and approve it: **Next
    in review desk** respects that person filter.
**A report that changes while you read it** (two windows):
14. Window 1: sign in as `sanduni@example.com`, open **Review desk**, open Nadia F.'s current-week
    request (or any Submitted one) and type a comment — don't click anything.
15. Window 2: sign in as `ruwan@example.com`, open the same request, type 10+ characters and **Send
    back** → confirm. Then sign in as `nadia@example.com` (a third window, or sign out), **This week**
    → **Fix and resubmit** → **Resubmit**.
16. Window 1: click **Approve**. A banner says "Nadia submitted a new version. Reload to review it.",
    both buttons are grey and your text is still in the box. Click **Reload**, then **Approve**.

### Seed tests made reliable (2026-10-05, before C7)
`tests/seed/seed.test.js` had failed intermittently in cloud containers ("Connection operation
buffering timed out after 10000ms"; recorded in C2, C4, C5 and C6). **Not parallelism** — it failed
about one run in four with the file run on its own. The cause, reproduced on demand:
- Suites freeze `Date` (`vi.useFakeTimers({ toFake: ["Date"] })`) at a week of their own; the seed
  suite freezes at 2026-10-01 (and 2027-01-06), which is now **before the real date**.
- The MongoDB driver stamps each heartbeat with `Date.now()`. Mongoose's `connection.readyState`
  getter compares that stamp with the *real* clock (it snapshots the native `Date`); a stamp made
  under a clock frozen days ago looks stale (older than two heartbeats), so `readyState` reads
  `disconnected` while the raw state is still `connected`.
- `Model.syncIndexes()` — which `runSeed` calls on every seeding — waits on that getter and buffers
  for 10 s, then throws. Plain queries don't, so only the seed file failed. Repro: freeze the clock
  in the past, wait one heartbeat, call `User.syncIndexes()` → the same error, every time.
The fix, with no test skipped or weakened:
- `tests/helpers/testDb.js` connects with `heartbeatFrequencyMS: 500` and defines
  `_lastHeartbeatAt` as a null accessor, so the stale-heartbeat check can never fire under a faked clock.
- New `tests/foundation/testDb.test.js`: freeze the clock in 2020, let heartbeats land, expect
  `readyState === 1` and `syncIndexes()` to resolve. It **fails with the accessor removed**
  (`expected +0 to be 1`) and passes with it.
- Also seen on the first run in this container: with an **empty mongod cache** every worker started
  the same download at once (`ENOENT … .downloading`, `ETXTBSY`; three files failed). New
  `tests/helpers/globalSetup.js` downloads once before the workers start. A cold-cache run (cache
  moved aside, then a full suite) passed 19 files / 382 tests.
- **Five full server runs in a row, after the fix: 5 of 5 green** — 19 files, 382 tests each
  (46–50 s). Before it, one or more seed tests failed in most full runs here.
- Departure: `tests/helpers/globalSetup.js` and `tests/foundation/testDb.test.js`
  are new; `project_structure.md` §2.1 notes them.

### C7 checks (2026-10-05)
- `npm run lint`: clean (client and server, 0 warnings). Client `vite build`: OK (the dashboard, with
  Recharts, is its own lazy chunk, 408 kB). Client `npm test`: green — **339** (241 before C7, plus 98):
  `TeamDashboardPage.test.jsx` 33 (the seven blocks in the order of design §3.7; every block failing on
  its own beside blocks that loaded; the team table's columns, row links, `Approval asked`, status
  filter and filtered-empty state; the five-day strip; the metric strip's four cells, its single
  coloured number and its omitted sub-lines; the projects table's units, overdue words, disclosure
  rows and `onExtend`; the feed's eight rows; the tooltip; and a **source check** — no hex / `rgb()` /
  `hsl()` in `components/dashboard/`, `chartTheme.js` or the page, no library legend, every tooltip
  `content={<ChartTooltip/>}`, every drawn series `isAnimationActive={hasMounted}`, no pie),
  `demoDashboard.test.js` 24 (D1–D6, D8 by the server's rules; a member is refused on all seven),
  `dashboardParams.test.js` 12 (**`status` is in D2's params and no other block's**; D8 takes the week
  only), `dashboardData.test.js` 17, `chartTheme.test.js` 5 (**the seven task-type colours are the same
  object the day panel and the form use**; every colour is `var(--token)`), and 7 new cases in
  `demoCoverage.test.js`. Server: 382 of 382 (the five-run proof is under *Seed tests made reliable*).
- **The done list, in a real browser against the real API** (Playwright's Chromium, headless; the API
  on a **local in-memory replica set**, filled by the repo's seed; Vite dev server). **No Atlas /
  `MONGODB_URI` database was touched or connected to.** One script asserted every line below and ended
  `ALL PASSED`; screenshots at 1440, 800 and 360 px, light and dark, were looked at.
  - *The `status` URL parameter changes the team table and nothing else.* Ticking Draft in the table's
    own filter wrote `?status=draft`, sent exactly **one** request (D2, with `status=draft`), left the
    metric strip's text identical, and narrowed the table to the API's 2 Drafts. The filter reads
    `Status: Draft`. Clearing it removed the parameter.
  - *The page-level filters.* Person reached D1, D2, D3, D4 and D5 and **not** D8 or D6; the week
    picker made D1–D5 and D8 ask again and **not** D6. The trend's window (`trendWeeks=4`) sent one
    request (D3, `weeks=4`) and the axis showed four weeks; choosing a person drew a second line and a
    legend (`Team`, `Imali J.`); the `Days | Hours` control rewrote the progress words and
    `unit=hours`; a project row opened to show each person, hours this week and in total, last day.
  - *Each block fails independently.* With D4 and D1 answered `500`, the Hours chart and the metric
    strip each showed their inline error (the chart's at its real 240 px, title and scope kept) while
    the team table, workload chart and feed loaded; `Try again` recovers a block.
  - *No hex, no default legend or tooltip.* Every `fill` / `stroke` in the three charts' SVG is a
    `var(--token)`; there is no `.recharts-legend-wrapper` or `.recharts-default-tooltip`; hovering a bar
    or the line shows our tooltip (a dark surface, mono header, swatch, tabular value) in both themes.
  - *The seven colours match the day panel and the form.* The dashboard's legend swatches and the
    weekly form's task-type swatches (`/reports/<week>/edit`) have the same computed colour for all
    seven categories; the hours bars carry `var(--c1) … var(--c7)` in the task types' order.
  - Heights: plots are 260 / 240 / 240 px; the feed holds 352 px (eight rows). **No horizontal overflow
    at 1440, 800 or 360 px**, and no page errors. A member at `/team` gets the 403 state and no
    `Team dashboard` link in the nav.
- **Found by running it and fixed:** (1) the hidden chart summary was a `<table class="sr-only">`,
  which doesn't clip, so a wide one scrolled the page 314 px sideways at 360 px — now a clipping
  wrapper; (2) the metric strip stayed 2×2 at 1440 px (Tailwind sorts `min-[900px]:` before `sm:`) —
  now `grid-cols-4` stepped down with `max-[899px]` and `max-[639px]`; (3) the workload chart lost the
  total label on rows whose last task type had no hours — a hair-wide trailing bar now carries it;
  (4) the hours axis ended at the raw maximum (85 h) — it now uses a rounded one; (5) in the dark
  theme the tooltip was unreadable (see decision 2).
- **Not done / unverified:** the demo was exercised through its adapter in tests only (no chooser until
  C10). Not clicked: the Person popover's search, the `Filters` sheet below 900 px, the week picker's
  popover grid, keyboard walks of the project disclosure rows, reduced motion. Real fonts (the container
  blocks Google Fonts), Safari, Firefox and screen readers are unverified. The chart's *animation* (320 ms
  on a filter change, none on mount) is configured and source-checked, not seen.

### C7 decisions — all twelve accepted as built (owner, 2026-10-07)
1. **`Extend plan` is not in the projects table yet.** Design §3.7 puts it in the row menu and opens
   `PlanModal`, which is C8's. `ProjectsTable` takes `onExtend` and shows the button only when the page
   passes it; C8 wires it.
2. **The tooltip's surface is `--d-panel`, not `--ink`** (design §7.3 says `--ink` with `--d-text`).
   `--ink` turns light in the dark theme, which left `--d-text` text unreadable; `--d-panel` is the
   near-black the Toaster and Tooltip already use and is the same colour as `--ink` in the light theme.
3. **The trend's empty text** is "No data for W34–W41." (the window), since design §7.3's "No data for
   week 38." names one week and the trend spans several. D3 can't tell "no data" from "zero Done tasks",
   so it is shown when every week is zero.
4. **`useWeekParam.setWeek` also drops `page`**, as it already drops `day`: a page of the team table
   belongs to the week it was chosen in.
5. **The "no team" state** (design §3.7) is D2 with no person, project or status filter returning zero
   people; it replaces the strip, tables and charts. `Invite people` (admin only) links to `/users`.
6. **The page-level filter count and `Clear` cover person and project only**; `status`, the trend's
   window and person, and `unit` belong to their blocks. Changing the trend's or the unit's control keeps
   the team table on its page; changing the status filter resets it.
7. **The team table's status filter** reads `Status: Draft` or `Status: 2` (the shared `MultiSelect`),
   not the list of names design §3.7's example shows.
8. **The workload chart's header is two lines tall** at ≤ 1440 px: seven legend items don't fit beside
   the title in a six-column panel, so its header is taller than the feed's beside it.
9. **The feed hides its status chip below 640 px** so the names aren't cut to two letters.
10. **Own rows link to `/reports/:week`**, not `/people/:you/reports/:week`, as on Team updates. The feed's
    rows link to the report's author's week; the table's Submitted rows of someone else go to review.
11. **D7** (the profile's strip) and its demo handler wait for the profile page (C8); `dashboardService`
    has D1–D6 and D8 only.
12. **Seed note, not changed (S6):** the seed puts the current week's events on days that may still be
    ahead of today, so on an early-week day the metric strip can say "oldest sent back in 4 days" and
    the feed shows later dates. Real data never has a future time.

### Owner: test by hand (C7)
Run `npm run db:sample` locally first (**local database only**); every seed account's password is
`weekly-view-dev`. Seed week: Nadia F. Submitted and asked, Ruwan P. Submitted, Tharindu S. Needs
correction, Imali J. and Sanduni B. Approved, Ayesha C. Draft; one person on leave, one not started.
**The page** (as Nadia, a manager):
1. Sign in as `nadia@example.com` and click **Team dashboard**. From the top: four numbers in one panel
   (Filed blue, Compliance green, Needs correction red, Open blockers amber), the **Team** table,
   **Projects**, then two charts and the activity list.
2. In the **Team** table, click the **Person** column header once: the order reverses and the address gains `dir=desc`.
   Click **Status** (the button above the table, right side), tick **Draft**, **Apply**. Only the table
   changes; the four numbers do not. Reload: the filter is still there. Open the button again, **Clear**.
3. In the **Updates** column a solid cobalt square is a posted day, a red-tinted square with a thick red
   edge and an × is a missing day (the same red as a Needs correction chip), a hollow cobalt-outlined
   one is today (not posted yet), a diagonal grey hatch is **on leave**, a grey dot grid is a
   **holiday**, and a faint hollow one is later in the week; the six-entry legend is under the table.
   Squint (or use a greyscale filter): solid, ×, hollow-thick, hatch, dots and hollow-faint still differ.
   (Dinesh K. is on leave and every person has the seed's holiday on Wednesday, so all six show.)
   Check dark mode and a 360 px phone too. Click any row: a Submitted report that isn't yours opens the
   review page; your own row and anyone else's go to that person's week.
4. **Projects:** click **Hours**, then **Days**. Click a project's name: it opens to show who worked on
   it, with hours this week and in total. "overdue by N days" is red.
5. **Tasks completed:** open **8 weeks** and choose **4 weeks**: the line has four points. Open **Team
   only**, choose a person: a second line and a legend appear. Hover the line: a dark box names the
   week and the numbers.
6. **Hours by task type** and **Workload by project:** each bar and each row ends in its total in bold
   ("92.5 h"); the line under each title says so, and the axis top is only the scale. Hover a bar. The
   seven colours (Development blue, Testing sky blue, Meetings green, Documentation slate, Review red,
   Research & study amber, Other purple) are the ones on the weekly form's hours grid — open **This
   week** → the form to compare. **Tasks completed** says "Tasks marked Done in submitted reports."
   under its title.
7. Click the top bar's week **‹**: every block but **Recent activity** changes. Click **Person** in the
   filter bar at the top, tick one person, **Apply**: the numbers, table and charts narrow; **Projects** and
   **Recent activity** do not. **Clear (1)** resets it.
8. Switch to dark (the theme button in the sidebar): charts, the tooltip, the chips and the squares
   stay readable. Also look at the status chips (Draft amber, Submitted blue, Needs correction red,
   Approved green) on the other pages — the tokens are app-wide.
**Narrow screen and a member:**
9. In the browser's device toolbar choose a 360 px phone: the table is cards, nothing scrolls sideways,
   the charts are one column.
10. Sign out, sign in as `imali@example.com` (a member): there is no **Team dashboard** in the nav and
    typing `/team` shows the "You don't have access" page inside the shell.

### C7 owner feedback (2026-10-07)
Owner testing on their machine produced six requests, all done on this branch.
1. **Audit (client).** `npm audit fix` (no `--force`) updated `seroval` and `seroval-plugins` 1.5.6 → 1.6.8
   (and `solid-js` 1.9.15 → 1.9.16, which they pull in through the Query devtools); only
   `package-lock.json` changed. **Left alone, as asked:** `tinypool` (≤ 2.1.1, critical, prototype
   pollution → RCE in its worker options) and `@vitest/mocker` (2.1.0 – 4.1.10, moderate, path traversal
   in its redirect mock). Both are reached only through `vitest` 3, so they wait for the planned vitest
   upgrade (`npm audit fix --force` would install vitest 5, a breaking change). They are test-runner
   dependencies, not shipped in the client bundle. `npm audit` now reports 3 findings (those two and
   `vitest`, which depends on them).
2. **Updates squares readable at a glance** — *first version (green and purple), superseded by the
   second round below.* Shape differed for every state, all tokens, with a legend under the table.
   (Design §3.7 amended with an owner-decision note.)
3. **Vibrancy (owner decision).** More saturated status chips and chart colours, same hue per task type,
   in both themes; the four metric numbers are coloured (Filed blue, Compliance green, Open blockers
   amber, Needs correction red). The values are in `tokens.css` **and** in `product_design_system.md`
   §9.3 (with the owner-decision note and amended §3.7 / §7.1). The day panel, the weekly form and every
   chart read the same `--c1`…`--c7`, so their swatches changed together and still match (checked: the
   dashboard legend and the form's swatches have the same computed colour). **The status tokens are
   app-wide**, so every chip and `--st-corr-*` strip in the app is stronger too; the seven values for
   light (and dark): Development `#1f44d6` (`#7b93ff`), Testing `#2e9ad8` (`#4fb4f0`), Meetings `#1e8f43`
   (`#52c27a`), Documentation `#7a8794` (`#9aa7b5`), Review `#d6342b` (`#ff6b5e`), Other `#8f3fb5`
   (`#b979e0`), Research & study `#d49a0c` (`#f2b932`) — `--c7` was approved by the owner as built (second round, below).
4. **Value labels.** Each bar in Hours by task type and each row in Workload by project ends in its total
   (bold, `--ink`, 12 px mono) and the line under each title says "Each number is that … total", so the
   axis top (90 h, 105 h) can't be read as a target. The trend's last week label is no longer clipped.
5. **"Tasks completed"** has the one-line explanation under its title: "Tasks marked Done in submitted
   reports." All three charts have a one-line subtitle, so the panels' headers line up.
6. **Note for after C10 — one "visual polish" session for the whole app** (colour tokens, contrast,
   emphasis, the squares and chips in context), **reviewed with the owner** before it is merged. C7's
   vibrancy change is a first pass on the dashboard and the shared tokens only.
- **Checks:** lint clean; client **344** tests (339 + 5: the strip's four colours, the squares' shapes and
  how they differ without colour, the legend and its place, and the chart subtitles); client build OK.
  Re-walked in headless Chromium against the real API on a local in-memory database (not Atlas; the
  repo's seed on that database): the earlier walk (status only on D2, the page-level filters, independent
  failures, no hex or default tooltip, fixed heights, no overflow) ended **ALL PASSED** again, and
  screenshots at **1440 and 360 px, light and dark** were looked at. Unverified: real fonts (blocked
  here), a greyscale view of the squares by eye (checked by their patterns in a test), other browsers.

### C7 owner feedback, round two (2026-10-07): squares and legend in the system's palette
The green and the purple of round one felt outside the design system, so the Updates squares and their
legend now use only the product's own palette (cobalt, the Needs-correction red, cool neutrals), square
corners, 1–2px edges. Design §3.7 carries the owner-decision note (and says this is the second
version).
- **Posted:** solid `--acc` (cobalt). **Missing:** `--st-corr-bg` tint, 2px `--st-corr-fg` edge and an ×,
  consistent with the Needs correction chip. **Not posted yet today:** hollow, 2px `--acc` outline.
  **Later this week:** hollow, faint 1px `--hair` outline.
- **Leave and holiday are two separate indicators** (they were one in round one): **on leave** = a
  diagonal hatch of `--mut` stripes on `--tint2`; **holiday** = a grid of `--mut` dots on `--tint2`. Both
  are neutral, with a 1px `--hair2` edge, and differ from each other and from every other state by
  pattern, so they read at a glance and without colour. (A day before the person joined is a dashed
  `--hair2` outline; it is not in the legend since it is rare.)
- **Legend, six entries:** Posted · Missing · Not posted yet today · On leave · Holiday · Later this
  week, the same cells as the table, under it. The hidden sentence now says "on leave Wed; holiday Thu".
- **`--c7` (Research & study) approved by the owner as built** — `tokens.css` and design §0.3 / §9.3 no
  longer say "needs sign-off" for it (the three dark chart colours `--c1`, `--c4`, `--c6` still do; the
  vibrancy values replaced their old ones).
- **Checks:** lint clean; client **345** tests (the squares' tests rewritten: cobalt, the red ×, the
  cobalt outline, hatch against dots, no green or purple left, six distinct shapes without colour, the
  six-entry legend and its place under the table). Browser (headless Chromium, real API on a local
  in-memory database, repo seed): all six states appear in the real table, the legend reads as listed,
  **no overflow and no errors at 1440 and 360 px, light and dark**; screenshots of all four looked at.
  Unverified: a greyscale rendering by eye (the six shapes are asserted by a test), other browsers.

### C8 checks (2026-10-08)
- `npm run lint`: clean. `npm test`: green — server 383 (adminRoutes gained the U2 leave-history
  test), client 434 (was 346; new: `pages/__tests__/PeoplePages.test.jsx` 19,
  `demo/__tests__/demoPeople.test.js` 25, `hooks/__tests__/useUserQueries.test.jsx` 3, and
  `permissions`, `dates`, `peopleParams`, `passwordStrength` tests; `demoCoverage.test.js` has a case
  for each of the 17 new service functions, run as the perspective that may call them).
- **Done list:** a link never appears in a cache after its modal closes — `useUserQueries.test.jsx`
  runs the three link mutations and checks no mutation or query holds the URL once the caller has
  read it and reset; in the browser the URL was in no page DOM, storage or request URL after `Done`.
  Admin-vs-owner rows match §11.2–§11.3 — `permissions.test.js` (`userActions`) and, in a browser, a
  non-owner admin sees the owner's and another admin's controls disabled with their reasons. **Make
  owner** works and the actor's `Me` refreshes — seen in a browser: Sanduni made Nadia the owner, the
  `Owner` chip moved, `Make owner` left Sanduni's menus and her Account page then named Nadia.
- **Walked in a real browser** (Chromium; the real API and Vite client; a *local in-memory* MongoDB
  replica set, seeded; Atlas and `MONGODB_URI` were never used) at 1440 px and 360 px (no horizontal
  overflow on Projects, Users, People, Holidays, Account or a profile), as Sanduni (owner/admin),
  Nadia (manager), Imali (member): Projects (extend a plan and see "Earlier plans", the finish line,
  new project with a taken name, delete, Days | Hours in the URL), the dashboard's `Extend plan`,
  Holidays (add, duplicate date, delete, year), Users (inline role change with `Saved`, row menus and
  their reasons, invite → link state → `Copied` → `Done`, re-issue, reset link, edit email with an
  address in use, leave on / off with the confirm, remove, filters), People (week links, the search
  override and its note), a profile (header, This week squares, figures, leave history, every week
  with non-clickable rows, the leave toggle with its confirm), Account (name, password with the meter
  and every error, Appearance, the Leave switch with its confirm). Console: no errors but the missing
  `favicon.ico` (it was there before C8) and the expected 409/422s.
- **Not looked at:** the dark theme on the new pages beyond Account (tokens only, no hex); a real
  clipboard on a machine without permission (the URL is selectable text then); the demo (the
  handlers are tested; the demo bar and chooser are C10).

### C8 decisions — all twelve accepted as built (owner, 2026-10-09)
1. **U2 serves the leave history** (`leaveHistory`, newest first, `{ from, to, setBy: UserRef }`) — the
   owner asked for it and no endpoint had it, so this adds one field to U2 only (not to U1's rows),
   in `userService.getUser`, in `api_specification.md` §2.2, tested in `adminRoutes.test.js` and the
   demo. It is additive and manager-only like the rest of U2; remove the field to undo it.
2. **The profile's top bar** holds the leave toggle and, for an admin, `Manage` → `/users?q={email}`.
   The status and week-range filters sit in the history table's own header, not in a filter bar above
   the person's header (they filter that table only).
3. **This week on the profile** (new, small): the five Updates squares and the week chip from U8, with
   `Open W41` to the same address Team updates uses. It is where the C7 squares appear in C8; History
   rows carry only the status chip, because a `ReportRow` knows which days were posted but not why the
   others weren't (missing, holiday or leave), so squares there would mislead.
4. **No per-day content in C8's pages**, so the day-card style has nothing to be applied to: People and
   the profile link to the week page, which already shows the days as cards.
5. **People:** a `This week` column (not in design §3.15) holds the link to each active person's
   week; status is a single Select (Active default · Invited · Removed · All) rather than a multi.
   `Reports filed` / `Last activity` / name sort from the headers.
6. **Users:** no status filter value means all three statuses (removed people included, with the
   `Removed` chip, no menu and no role Select); the design gives no default. Only the owner can pick
   `Admin` in a role Select or an invite (the option is disabled for other admins).
7. **A disabled menu item prints its reason** beneath it instead of a tooltip (a disabled item gets no
   hover); a disabled role Select has the reason as a tooltip and as hidden text.
8. **Project edit** sends only what changed — P3 for name, description and people, then P4 for a
   changed plan — one after the other; if the second fails the first has already been saved and the
   modal stays open with the error. A project with no plan edits and sets one in the same modal.
9. **The projects list shows overdue like the dashboard** (the figure in `--st-corr-fg`), where design
   §3.9 says `--ink`; one look for one fact across the two tables. Change in `ProjectsListTable.jsx`.
10. **New shared pieces:** `ui/DropdownMenu` (Radix, in the §3.1 tree), `ui/DatePicker` (Monday–Friday
    calendar built on date-fns, in the tree), `ui/Meter`, `lib/passwordStrength.js` (a length-first
    heuristic; the server's only rule is 8–72 characters), and a fix to `inputClasses.js` so the
    read-only dashed look no longer applies to a `<button>` (the date field).
11. **The demo's links are sample URLs** (`weeklyview.example/invite/…`) that open nothing; the demo has
    no email and `/invite` is not a demo route. Its leave history, plan history and holidays are kept
    in the store like the rest.
12. `PendingPage.jsx` is deleted — C8 was the last stage with a route on it.

**Owner: how to test C8 by hand** (local; the seed **wipes** the database it points at — use a local
Mongo or a throw-away Atlas database, never one you want to keep)
1. `npm run db:sample`, then `npm --prefix server run dev` and `npm --prefix client run dev`.
2. Sign in at http://localhost:5173/signin as `sanduni@example.com` (admin, the owner), password
   `weekly-view-dev`.
3. **Projects:** open **Projects**. On **Client A** click **Extend plan**, change **Working days** to
   25: "From 20 to 25 working days." appears and the finish line moves. **Save plan**; the row now reads
   "of 25". Open **Extend plan** again: **Earlier plans** lists the old plan with your name.
4. Click **New project**, type `Client A` as the name and **Create project**: a field error says the name
   is taken. Use `Atlas rebuild`, 10 working days, create it, then **Delete** it and read the confirm.
5. Open **Team dashboard**, and in the projects table click **Extend plan** on **R&D**: the same modal.
6. **Holidays:** **Add holiday**, pick Wed 7 Oct (already a holiday): the error shows on the date. Pick a
   free weekday, name it, add it, then **Delete** it. Change the year in the top bar.
7. **Users:** change **Ayesha C.**'s role to Manager (`Saved` shows for a moment), then back. Open the **⋯**
   menu on **Nadia F.**: Edit email, Password reset link, Mark as on leave, Make owner, Remove.
8. **Invite person**: `new.hire@example.com`, role Manager, **Create invite link**. The modal swaps to the
   link with **Copy link** (it reads **Copied** briefly). Click **Done**. Re-open **⋯ → Re-issue invite**
   on that row: confirm, and a different link appears.
9. **⋯ → Password reset link** on **Imali J.**: confirm, link, **Done**. **⋯ → Edit email** on
   **Tharindu S.** with `imali@example.com`: "Someone on the team already uses that email."
10. **⋯ → Mark as on leave** on **Ayesha C.** (the chip appears at once), then **⋯ → End leave**: a confirm
    asks first; **Cancel** keeps her on leave.
11. **People:** open **People**. Click **W41** on Imali's row: her week opens (yours opens at /reports/…).
    Type `chamari` in the search: Chamari L. (removed) appears with "Showing matches in all statuses."
    and the Status control still says Active; clear the search and she goes.
12. Click **Dinesh K.**: the profile shows **On leave since …**, This week's squares, the four figures,
    **Leave** (each period's start, end and who set it) and **Every week**; away and holiday weeks are
    not links. Click **End leave**: the confirm names Dinesh; **Turn off leave**; the period gets an end
    date. **Mark as on leave** starts a new one at the top.
13. **Make owner (last — it moves your protection):** **Users → ⋯ → Make owner** on **Nadia F.**, read
    the confirm, **Make owner**. The **Owner** chip moves to Nadia; **Account** now says to ask Nadia.
14. Sign in as `imali@example.com`: **Account** — change the name, set a new password (watch the meter and
    the errors), switch **Dark**, then the **I'm on leave** switch (turning it off asks first).
15. As `nadia@example.com` (manager now, or admin after step 13), **People** has no `Manage users` button
    for a manager; as an admin it does. A member visiting `/people` or `/users` gets the forbidden page.

### C8 follow-up: loading states, faster Users list, planned-hours hint (2026-10-10)
Owner feedback after testing C8. Local in-memory MongoDB only (Atlas and `MONGODB_URI` never used).

**1. Loading states.** The blank Users page was the lazily loaded route chunk behind a
`Suspense` fallback of `null`. Fixed for every route:
- `components/shell/RouteFallback.jsx`: each routed page now loads behind its own frame — the
  title in the top bar and a skeleton in its shape (`table`, `panels` or `dashboard`, at the page's
  width); `AuthFallback` for sign-in, sign-up, invite and reset. The route table (`routes/index.jsx`),
  `IndexRoute` (This week) and the auth routes all use them; no `fallback={null}` is left in the source
  (a test fails if one comes back).
- Checked every route two ways in Chromium, light and dark: with its page chunk held back for 2.5 s,
  and with every API call held back for 2.5 s. 15 shell routes and 4 auth screens: each showed its title
  and a skeleton at 500–700 ms, none blank. Every `QueryView` already had a skeleton (17 of 17); the
  in-page pending branches of This week, the week page, the edit form, the review page and the
  profile were already skeletons.
- **Also found:** even with the chunk in the browser, `React.lazy` suspends on its first render and
  React 19 then holds a revealed page back until 300 ms after its fallback committed. So
  `routes/lazyPage.jsx` renders a page at once once its chunk has loaded, `routes/pages.js` names every
  routed page, and `routes/prefetch.js` loads the chunks a role may open next, one at a time when the
  browser is idle after sign-in.

**2. Why Users was slow — measured** (this machine; Vite 7 dev server, seeded data, API on the same
machine; milliseconds from the sidebar click, medians of repeated runs):

| | before | after |
| --- | --- | --- |
| **(a) Vite dev, first visit** (cache cleared): the page module and its 15 imports | `UsersPage.jsx` 28 ms, then 15 imports in parallel 56–92 ms each; the graph was ready ~200 ms after the click | the same files, now fetched when the browser is idle after sign-in, before anyone clicks |
| Blank content area (dev, click straight after sign-in) | 288 ms (first skeleton at 349–362) | **0** (first skeleton at 18 ms; title at 3–18 ms) |
| Content on screen, Users / People (dev, click straight after sign-in) | 571–576 / 461 | 549 / 496 |
| Content on screen, Users / People (dev, after the idle prefetch) | 542 / 461 (Vite warm) | **255 / 165** |
| **(b) Production build**: `UsersPage` chunk | 36.8 kB, 13.1 kB gzip, ~24 ms to fetch locally | unchanged |
| Production, blank area, Users / People | 336 / 304 (top-bar title blank until 353 / 329) | **0** (skeleton and title at 10–23) |
| Production, content, click straight after sign-in / after prefetch | 403 / 365 (Users / People, blank ~300 of it) | 392 / 390, **skeleton shown throughout** / **70 / 73** |
| **(c) U1 in the browser**, seeded (11 people) | 19–35 ms | 14–25 ms |
| **U1 on the server**, seeded: median | 11–13 ms | 11–12 ms |
| **U1 on the server**, 2,000 people and 80,000 reports (a scratch database, not the seed): by name / joined | 557–589 ms | **15–20 ms** |
| same, sorted by Reports filed or Last activity | 537–588 ms | 236–262 ms |

Plainly: **the API was not the cause** — U1 takes about 12 ms on the seeded team. The 1–2 s the owner
saw was the lazily loaded route chunk (in development, Vite compiling and serving ~16 modules on the
first visit to a page, slower on a slower machine) shown as a blank page, plus React's 300 ms hold. The
production chunk is 13 kB gzip. What stays: with no prefetch yet (a click in the first second after
sign-in) a page still takes ~300–550 ms to arrive, but behind its skeleton now.

**U1 was still worth fixing.** It computed every person's report stats (a `$lookup` per user) *before*
sorting and paging, so it cost the same for page 1 of 20 as for all 2,000 people. `queryUserItems` now
sorts and pages the users first (name and joined: `.lean()`, the collation, `_id` as the tiebreak),
then reads the stats for the page's people in **one** grouped query over the `{ author, weekKey }`
index; the two stat sorts group for everyone matched in one query and sort in memory. **The response
is byte-identical**: 17 requests (every sort and direction, filters, pages, U2) compared before and
after on the seed and on the 2,000-person set. New tests in `adminRoutes.test.js` cover the stat sorts
(nulls lowest, ties by `_id`, paging, a draft not counting as filed) and the joined sort. **Not done:**
the stat sorts still read everyone's reports (~250 ms at 2,000 people); a covered index on
`{ author, revisionNumber, lastActivityAt }` would cut it, but `database_schema.md` §6 fixes the index
set and a test checks it, so that is a change for the owner to approve.

**3. Planned hours hint.** Under Planned hours, in `PlanModal` and the project modal (one shared
`PlanFields`): "Optional. Total hours for the whole project, all people combined. Compared with the
hours logged." It wires to the input (`aria-describedby`) and gives way to an error message when there
is one. The right-hand "Optional" marker on that label is gone (the hint says it), and Working days and
Planned hours are now stacked rather than side by side, so the hint has the width.

**Decisions to confirm:** (1) the prefetch and `lazyPage` above (three new files in `routes/`; every
page chunk is fetched in the background after sign-in — about 400 kB gzip in all, 118 kB of it the
dashboard's charts, for a manager); (2) a fallback's title for a parameter route is generic ("Week",
"Person", "Review") until the page loads and names it; (3) the covered-index question above.

**Checks:** `npm run lint` clean; `npm test` green (server 385, client 444).

**Owner: how to check these three by hand**
1. `npm run db:sample`, then `npm --prefix server run dev` and `npm --prefix client run dev`; sign in at
   http://localhost:5173/signin as `sanduni@example.com` (password `weekly-view-dev`).
2. *Loading states.* In the browser's developer tools open **Network**, tick **Disable cache** and set
   throttling to **Slow 4G**. Immediately after the page that follows sign-in appears, click each sidebar
   item in turn: **Users**, **People**, **Projects**, **Holidays**, **Team dashboard**, **Review desk**,
   **My reports**, **Team updates**. Each shows its title in the top bar and grey skeleton blocks at once;
   at no point is the area blank. Then wait a few seconds on any page and click **Users** again: it opens
   with almost no wait.
3. Open a person from **People**, a week from their profile, and **Account**: same, skeleton first.
4. Sign out, keep the throttling, and open `/signin`: the card shows skeleton fields, not an empty page.
5. Switch **Appearance → Dark** (your name at the bottom of the sidebar) and repeat step 2 for two pages;
   the skeletons stay on the dark surface.
6. *Planned hours.* **Projects → Extend plan** on **Client A**: under **Planned hours** the line reads
   "Optional. Total hours for the whole project, all people combined. Compared with the hours logged."
   Close it and click **New project**: the same line. Type `-5` in Planned hours and create: the error
   replaces the line. Check both in Light and Dark.
7. *The Users list.* Open **Users**, sort by **Joined** and by name from the headers, page through with
   a smaller page size; the order and rows are the ones you had before.

### C9 checks (2026-10-10)
Local, on a throw-away **in-memory** MongoDB (a `MongoMemoryReplSet` on 127.0.0.1, seeded with the repo's
seed; `MONGODB_URI` overridden for those processes only). Atlas, `server/.env` and `npm run db:sample` against it
were never used. Every server started was stopped (the API, Vite and the in-memory Mongo).
- `npm run lint`: clean. `npm test`: green — server 385 (unchanged), client **473** (was 444; new:
  `demo/__tests__/demoMarkers.test.js` 7, `lib/__tests__/clearMarkers.test.js` 8,
  `components/shell/__tests__/SidebarMarks.test.jsx` 5, `components/shell/__tests__/ErrorBoundary.test.jsx` 7,
  and two cases in `demoCoverage.test.js` for `markerService.getNewMarks` and `reviewService.getReviewDeskCount`).
  `vite build` OK.
- **What was built:** `markerService.getNewMarks` (N1) and `reviewService.getReviewDeskCount` (V4); `useNewMarks`,
  `useNavMarks` (feeds both `Sidebar`s from `AppShell`: a dot on **This week** / **My reports**, the count on
  **Review desk**, nothing while loading or failed) and `useReviewDeskCount` (managers only, refetched on window
  focus, never polled); the demo answers N1 and V4 by the server's rules (`isReportNew` in `demoWeekView.js`, also
  used for the History rows); `ErrorBoundary` + `ErrorStates`; `useRouteFocus`; document titles on the auth
  screens and the standalone 404 / 500 (every shell page already had one through `PageHeader`); `styles/print.css`,
  `usePrintTheme`, `PrintFooter`. `isNew` markers were already drawn everywhere design §6.24 places them (week
  rows, day comment counts, threads, desk rows); C9 supplied what fed the sidebar and fixed reopening.
- **Done item — "opening a week shows its markers once and not on reopening",** in a browser against the real
  API (Imali, whose W38 had a new manager comment, and W36 / W37 / W39 new through approvals): the history list marks
  W38; opening it shows two markers (the day's comment count and the thread); leaving and coming back **inside the
  30 s cache window** shows **zero**; the history row's marker is gone; the **My reports** dot went when the last new
  week (W36) was opened. This was the gap C3 left: the cached week was served with the markers it loaded with.
  Now `useSeenOnOpen` (week page and review page) sends R13 once, keeps the open page's markers (FA11 stands), and
  once the page is left clears the cached week and report in place (`lib/clearMarkers.js`); the lists, the team
  feed and the review desk are cleared in place the moment R13 lands.
- **Sidebar, as a manager** (Ruwan): **Review desk** showed `5` equal to V4 and to the number of marked desk rows;
  opening one request dropped it to 4 and cleared its row. Dots and the count looked at in light and dark
  (screenshots, 1280 px).
- **Error boundary,** with a temporary `throw` in a page (reverted): the shell stayed (sidebar present), the top
  bar read "Something went wrong", the panel read "This page ran into a problem." with `Try again`; with the cause
  removed `Try again` brought the page back; navigating to another page cleared a failed one.
- **Focus on route change:** after a sidebar click `document.activeElement` is the top bar's `<h1>`
  (`#page-title`) and `document.title` is "{page} · WeeklyView". (A first version used `requestAnimationFrame`,
  which does not fire while the Browser pane is hidden; it is a `setTimeout` now.) A change of query string alone
  does not move focus — by construction (it watches the path); not exercised in the browser.
- **Print,** in headless Chrome driven over its debugging protocol (print media emulated at 718 px, the
  `beforeprint` event fired by hand), the week page as Imali in the **dark theme**: the theme switched to light for
  the print and back after; sidebar, top bar, rail and every button, textarea and switch gone; document full width;
  hairlines light grey; day cards, the Holiday card, the status text and the type swatches as on screen;
  "Status: Submitted" as text under the heading; the footer "Week 38 · Imali J. · rev 1 · Printed 10 Oct 2026" as
  the last line. A real `Page.printToPDF` also ran without error. **Not looked at:** the real page breaks
  (nothing here could render the PDF, so `break-inside: avoid` on day cards is unverified), a physical or
  black-and-white print, Firefox and Safari, and the Needs-correction / Draft variants of the page in print.
- **Not verified:** the demo in a browser (there is no chooser until C10; N1 and V4 are covered by
  `demoMarkers.test.js` and the coverage test); the 500 state in the dark theme (its pieces are the existing
  `InlineError`); 360 px for the sidebar markers; screen-reader output of the focus move.
- **One observation I could not explain:** the first of three headless screenshots of Ruwan's Review desk showed a
  `This week` dot; the next two, and three direct N1 calls, did not (Ruwan's W41 is not new). Nothing was written
  between them. Worth a look if the owner ever sees a dot appear by itself.
- **Left running:** a `mongod` process (pid 5860) was running on this machine when I finished. Its command line and
  path are hidden from me and nothing listens on the port my in-memory server used, so I take it not to be mine and
  did not touch it.

### C9 decisions — all six accepted as built (owner, 2026-10-10)
1. **The error boundary is in `AppShell` as well as `RootLayout`.** `frontend_architecture.md` §9.17 puts the
   page-level boundary in `RootLayout`; a boundary there would replace the whole shell on a crash, contradicting
   "so one broken page leaves the shell usable". So `AppShell` wraps its `<Outlet/>` (keyed by the route, so
   navigating away clears it) and `RootLayout` keeps an outer one for signed-out pages or the shell itself,
   which resets on a path change. Both use `ErrorStates.jsx`.
2. **The page `<h1>` now lives in `TopBar`** (always present, `id="page-title"`, `tabIndex=-1`); `PageHeader`
   portals the title text into it instead of an `<h1>` per page. That is what makes focus-on-route-change work
   while a lazy page replaces its fallback.
3. **`useMarkSeen` also clears the lists, the team feed and the desk in place** (§5.7 only says invalidate),
   and the week/report caches are cleared when the page is left (see above). The open page still keeps its
   markers (FA11). `useSeenOnOpen` is in `hooks/useNewMarks.js`, where the structure doc put "marking a week seen".
4. **N1 supplies the two dots and V4 supplies the count** (N1's `reviewRequests` equals V4; V4 is used because its
   key is the one the review actions already invalidate, and members never ask it).
5. **Print:** the page prints on the light theme by switching `<html data-theme>` on `beforeprint` (no dark
   colours restated); hairlines are `color-mix(ink 20%, white)` rather than the literal `#CCC` the design names
   (no hex outside `tokens.css`); backgrounds that carry meaning (chips, tinted days, the Missing bar) print
   (`print-color-adjust: exact`) as on screen, per your note on the C7 status colours and the day-card style;
   the footer's date is taken when printing starts. The rail (and so the overall comments and versions) is not
   printed, as the design says. The review page prints like the week page, without its action panel. A day's
   "Open to team comments" switch and its label are not printed (the switch is a control; its label alone would
   read as "open" on every day).
6. **Demo's marker rule:** a new `isReportNew` in `demoWeekView.js`; the History rows in the demo now use it, so
   a week a manager approved shows "new" for its author until opened (as the server does). In the demo,
   Imali's last week (sent back) starts marked.

**Owner: how to test C9 by hand** (local; the seed **wipes** the database it points at — use a local Mongo or a
throw-away Atlas database, never one you want to keep; password for every account `weekly-view-dev`)
1. `npm run db:sample`, then `npm --prefix server run dev` and `npm --prefix client run dev`; open http://localhost:5173/signin.
2. **Dots:** sign in as `tharindu@example.com`. The sidebar shows a small blue square at the right edge of the item
   whose page holds something new (their last week was sent back, so **My reports** and/or **This week**). Open
   that week from **My reports**: the sent-back thread is marked. Click **Team updates**, then **My reports**,
   then the same week again: **no marker anywhere**, and the sidebar square is gone once nothing new is left.
3. **A comment as a marker:** sign in as `nadia@example.com`, open **Team updates** → a person's day → comment on a
   day. Sign in as that person: **My reports** has a square; the week's row in the list has one; open the week: the
   day's comment count and the thread are marked. Go back to **My reports** and open it again: nothing is marked.
4. **Review desk count:** sign in as `ruwan@example.com` (manager). **Review desk** shows a number. Open a request and
   come back: the number is one lower and that row has no square. Switch to another browser tab for a moment,
   comment as the author elsewhere if you like, and return to the tab: the count refreshes when the window regains
   focus.
5. **Focus:** with the keyboard, tab to a sidebar link and press Enter: the page title in the top bar is focused (no
   ring is drawn on it). Tab once: focus moves into the page. Switching a week with the week picker does not move
   focus.
6. **Titles:** the browser tab reads "Users · WeeklyView", "Week 40 · WeeklyView", "Sign in · WeeklyView"; signed
   out, a wrong address (`/nowhere`) reads "Page not found · WeeklyView".
7. **Print:** as `imali@example.com` open **My reports** → any week. Press Ctrl+P: the preview shows only the report
   (no sidebar, top bar, buttons or right-hand column), a white page, "Status: …" under the title, and a last line
   "Week N · Imali J. · rev R · Printed <today>". Tick **Background graphics** to see the chips and tinted days;
   untick it to see the black-and-white version. Check that no day card is split across two pages. Repeat with
   **Appearance → Dark**: it still prints on white.
8. **Error state:** to see it, in `client/src/pages/TeamUpdatesPage.jsx` add `throw new Error("test");` as the first
   line of `TeamUpdatesPage`, and open **Team updates**: the sidebar stays, the title reads "Something went wrong"
   and the panel offers **Try again**. Remove the line and click **Try again**. (Revert the edit afterwards.)
9. Do steps 2, 4 and 7 in the **dark** theme too, and step 2 in a 360 px-wide window.

### C10 checks (2026-10-10)
Local only. No database was used at all: the demo and the landing page need no API, and the one server started
was Vite. Atlas, `MONGODB_URI`, `server/.env` and `npm run db:sample` were never touched; the server's tests ran on
their in-memory MongoDB as always. Vite was stopped and the throw-away `client/.env` (a copy of `.env.example`,
git-ignored) deleted at the end.
- `npm run lint`: clean. `npm test`: green — server 385 (unchanged), client **511** (was 473; new:
  `demo/__tests__/demoCast.test.js` 10, `demo/__tests__/demoEntry.test.jsx` 9,
  `components/marketing/__tests__/LandingPage.test.jsx` 10, `styles/__tests__/landingIsolation.test.js` 9, and one
  changed assertion in `demoCoverage.test.js`). `vite build` OK: the landing page is its own chunk with its own
  stylesheet, `DemoEntryPage` and the demo are chunks the main bundle does not contain, and the main stylesheet
  holds no `--l-*` token, no `.landing` rule and no `Bricolage`.
- **The done-when grep:** `grep -ril "Bricolage\|#123F35\|#F2B880" client/src` matches `styles/landing.css`,
  `pages/LandingPage.jsx` and the tests that name them, nothing else (`landingIsolation.test.js` asserts it).
- **What was built**
  - *Demo.* `DemoEntryPage` (the chooser), `DemoBar` (36 px, in `AppShell`, which now sets `--demo-h` to 36 px under
    `/demo` and 0 elsewhere), `SampleDataPill` + `useIsDemo` + `Panel`'s `sample` prop (the pill is in the header of
    the dashboard's four charts, team table, projects table and activity feed, This week's week and projects panels,
    its recent weeks, the daily updates block, and the leave history), `useDemoSignIn`, `IndexRoute` (landing /
    chooser / This week). The fixtures hold the **cast of brand §10** — Imali J., Nadia F., Sanduni B. and now Ruwan P.,
    Tharindu S., Ayesha C., Dinesh K., Malith W. — with two more projects (Internal tools, Marketing), their tasks, and
    weeks on dates relative to the day the demo starts.
  - *Landing page.* `LandingPage`, `layouts/MarketingLayout.jsx`, eight section components, `CtaPill`, `Words`,
    `hooks/useLandingMotion.js`, `styles/landing.css`. The markup, CSS and both scripts of
    `landing-reference/index.html` were converted by a throw-away script and then read, not retyped.
- **Fidelity to the reference, measured.** With the reference opened from disk and the port served by Vite, same
  Chromium, fonts blocked in both: full-page screenshots at **1440, 1024 and 360 px with reduced motion are
  pixel-identical** (0 differing pixels in 9444, 12159 and 13885 px of page). With motion on, viewport screenshots at
  every 90 % of a screen of scroll — 15 stops at 1440 × 900 (the typed blocker, the pinned week, the folding problem,
  the opening monitor, the ledger) — are **identical**; at 360 × 780, 19 of 20 are identical and the 20th differs by 0.24 %
  of its pixels, the server-check dot caught at a different moment of its timed run. No page errors.
- **The call to action, in a browser.** API unreachable (aborted): the demo is primary, no `/signup` link anywhere on the
  page. Bootstrap answered `available: true` (mocked): the nav, the hero and the final band lead with **Create your
  account**, with **See the live demo** beside the hero's and the final band's; the FAQ's last answer no longer says
  signup is closed. A sleeping API shows the demo primary until the answer arrives.
- **Isolation, in a browser.** On the landing page the theme toggle's value is `dark` and the page stays green;
  `<html>` carries `landing-active` while it is mounted. Following **Sign in** (a full page load) the new page has no
  Bricolage link, no `.landing` rule in any stylesheet, no `html` class, Chivo in its `<h1>`.
- **The demo, checked at 1440 × 900 and 360 × 780, light and dark** (headless Chromium; each page opened as the
  perspective that has it): the chooser; member — This week, My reports; manager — This week, Team dashboard, Review desk,
  Team updates, Projects; admin — Users, Holidays, People. **No horizontal overflow, no page errors, `--demo-h` 36 px, the
  bar 36 px high, no request to any API** (the demo ran with nothing listening). Screenshots were looked at for the
  chooser (1440 light, 360 dark), the dashboard (1440 light scrolled and not, 360 light), This week (1440 and 360 dark),
  the Review desk (360 dark), the review page (1440 light), Team updates (1440 light), Users (1440 dark), Holidays (360
  dark), Projects (1440 dark), the 360 drawer with the bar above it, and the dashboard's loading state (the skeletons
  show: each handler waits 150 ms). The rest of the 44 captures were checked by their measurements only.
- **The flow, in a browser:** manager → Review desk shows 2 rows and a `2` in the sidebar → open Ruwan P.'s week →
  Approve → the desk lists one row and the sidebar reads `1 waiting` → **Switch** → chooser → Team member (the bar now reads
  Imali J., Member) → **refresh** → the chooser, no bar → manager again → the desk is back at 2 → **Start over** → the chooser at
  `/demo`.
- **Not verified:** the real fonts (Google Fonts is blocked on this machine, so every screenshot is in the fallback faces —
  Bricolage, Chivo, Instrument Sans and JetBrains Mono were not seen, and the landing page's line breaks will move a
  little with them); Firefox and Safari; touch; the real API's bootstrap answer (the open state used a mocked response, the
  closed state an unreachable API); screen-reader output of the chooser and the bar; hover and press states of the bar
  and the chooser rows, and the focus ring on the bar's buttons, by eye; the page at widths between 360 and 1440
  other than 1024; the landing page in Firefox's and Safari's reduced-motion modes.
- **Weekends:** as first built, a Saturday or Sunday showed everyone's Friday as **Missing**; fixed on owner request — see *C10 owner answers*. On a Friday the holiday is still next Monday, so it shows on Holidays and not in that week's squares.

### C10 decisions — all twelve accepted as built (owner, 2026-10-10)
1. **The fixtures have eight people; the unit tests keep three.** `buildFixtures(now, { team: false })` (through
   `createDemoStore(undefined, { team: false })`) leaves only the three perspectives, and the existing demo and page tests
   use it, so each rule is still read on the smallest data. `demoCast.test.js` reads the real fixtures on a frozen
   Wednesday and on every day of a week. Your C6 note is done: **Ruwan P. and Ayesha C. are Submitted, asked for approval,
   and are not the reviewing perspectives**, so the desk's default view has two rows for Nadia and for Sanduni, and the
   sidebar's `2` and the new squares show.
2. **The cast's shape.** All five new people are members. Last week: Ruwan Submitted (asked), Ayesha Submitted (asked),
   Tharindu Approved by Nadia, Malith Approved by Sanduni, Dinesh no report. This week: Drafts for everyone with days behind
   them; **Ayesha misses the first of them** (the Missing square), **Dinesh has posted nothing** (Not started, all
   Missing), **Malith is on leave from Monday** (On leave, the hatched squares), and there is one **Company day off** (the
   holiday square) on the next working day. Nadia and Sanduni also have a Draft this week, so the table has a square row
   for everyone. Two projects added: Internal tools (a plan, 40 days) and Marketing (no plan, so "Set plan" shows).
3. **The demo bar is `--d-panel`, not `--ink`.** Design §3.14 says `--ink` with `--d-text`; in the dark theme `--ink`
   is near-white and the text would vanish. `--d-panel` is the dark band `tokens.css` reserves for the demo bar and is the same in
   both themes; it has a hairline under it. Its two buttons are drawn from `--d-*` tokens, not the `inverted` `Button`
   (which flips with the theme).
4. **The bar's way out is always `Sign in`.** The demo answers A1 "bootstrap closed" (C1), so §3.14's "Create your account or
   Sign in" resolves to `Sign in`, a plain link to `/signin`. Below 640 px the bar drops "Demo · you're" and the role (it
   keeps the name); at 360 px all of SAMPLE DATA, the name, `Switch`, `Start over` and `Sign in` fit in the one 36 px row.
5. **`Switch` signs out of the demo session and goes to the chooser; the store stays**, so what the visitor did is there
   for the next person they pick. `Start over` is a full load of `/demo`; so is a refresh (FA1).
6. **Where the SAMPLE DATA pill sits.** §3.14 says "every data panel"; the pages that are tables in the page itself (Reports,
   Review desk, Users, Holidays, People, Projects) have no panel header, so they carry the pill through the demo bar only.
   The chooser says "Back to the start page" (a plain link to `/`) — a line the design does not have.
7. **Layout under the bar.** The shell's height is `100dvh - --demo-h`, the mobile drawer starts under the bar (the bar stays
   visible and clickable above the backdrop), and the review and week pages' pinned rails subtract `--demo-h` from their
   `max-h`. `--demo-h` is removed when the shell unmounts.
8. **Landing: every link out is a plain `<a>`** — the demo (a different page load by design), and also `/signin` and
   `/signup`. That keeps `landing.css` and the Bricolage link from ever being in a session that goes on to the app. The
   page brings its own skip link; the app's (`wv-skip`) is hidden on it.
9. **Landing: the reference's `html` classes (`js`, `motion`, `ready`) are on the `.landing` root**, the only place its
   selectors read them. `.landing-active` on `<html>` is the one thing outside the root (the green behind and beyond the
   page, the smooth scroll and its scroll padding). The reference's `window.WV` global is gone, its two scripts are one
   effect (`useLandingMotion`) that undoes everything it adds, and the two split headings are `Words` in the markup, not a
   script that rewrites React's text.
10. **Landing: the open state's extras.** Brand §6.3 wants "Create your account" primary and the demo secondary. The hero gets
    an outlined `See the live demo` pill and the line "Set up your first week in minutes. No sign-up to explore the demo."
    (the brand's microcopy); the final band gets the same pair; the nav pill is the signup. The FAQ's last answer reads
    "This copy has no account yet, so you can create the first." instead of "…signup here is closed" — otherwise the page
    would say closed under a button that says create. The closed state is the reference as built.
11. **`landing.css` is in `client/.prettierignore`** so it stays as the reference formats it (one line per rule) and can be
    diffed against it. The scoping is `.landing` + one class (so +1 specificity everywhere, order unchanged) with five small
    additions at the foot (Bricolage on h1–h4 against the app's global heading rule, underlined links against the app's reset,
    the ghost pill, the hidden skip link, `html.landing-active` background).
12. **The tab title** of the chooser is "Demo · WeeklyView"; the landing page's is the reference's "WeeklyView: one update,
    both sides of the desk", with its description, and both are restored on leave.

### C10 owner answers (2026-10-10)
- **Decisions:** all twelve accepted as built (above).
- **Weekend-aware fixtures.** On a Saturday or Sunday the whole week is behind the visitor, so the team table showed
  everyone's Friday as Missing, which read as broken. `buildFixtures` now treats the week as fully behind on Sat/Sun
  (`pastDays` is 5): Friday is posted for everyone who posts the other days. What stays missing is deliberate and
  unchanged — **Ayesha C.'s Monday**, **Dinesh K.'s whole week** (Not started), **Malith W.** (on leave). The holiday stays
  next Monday on a weekend (a weekday this week otherwise). Weekdays are unchanged (Friday still the day not yet posted).
- **The member can still show submitting.** Imali's this-week Draft now has five posted days but no task statuses, so the
  submit rules still refuse it (`VALIDATION_FAILED`) until a status is set on each task; then R7 accepts the week.
  `demoCoverage.test.js`'s `submitReport` case still refuses (its comment now names the statuses, not Friday).
- **Test:** `demoCast.test.js` has a case for a frozen **Saturday** and **Sunday**: the five squares posted for everyone but
  the three deliberate cases, Friday missing only for Dinesh, the holiday on the Monday after, and Imali refused, then
  setting statuses and submitting. Lint clean; server 385, client **513** (was 511).
- **To look at by hand on a weekend:** open the demo as Manager → **Team dashboard**: Friday's square is blue for everyone
  except Dinesh K. (red ×); Ayesha C.'s first square is a red ×; Malith W. is hatched. As Team member → **This week**: five
  day cards; open the week's report and set a status on each task to submit. (Not looked at in a browser this round: only the
  fixtures and the adapter's answers were tested.)

### C10 fix: landing pills fit their text (2026-10-10)
Owner report: the dashed SAMPLE DATA pill's text overflowed its rounded border with the real Bricolage Grotesque.
- **Cause (in the reference too):** the ledger's column-title rule `.lhead span` (padding `0 0 18px`, 15 px, weight 650) also
  matched the SAMPLE DATA pill inside the ledger's middle column, and out-ranked `.samp`. The pill lost its side padding, grew
  to the title's size and bold weight and became 39 px tall, so the text touched the curved ends. The fallback face hid it
  only because it is narrower than Bricolage.
- **Fix, in `landing.css` only:** one rule, `.landing .lhead .samp`, restores the pill's own padding (`3px 10px`), 12 px,
  weight 700, line-height 1.4 and `nowrap`. It has no width or height, so it is as wide and tall as its text in any font. The
  dashed border and the pill radius are as the reference has them.
- **How it was checked, without relying on the real font or screenshots:** a Playwright check (run from the scratchpad, not part
  of the repo, because it needs a browser) forced each of **DejaVu Sans, Verdana's fallback, DejaVu Sans Mono and Liberation
  Serif** onto every landing element, at **1440, 1024 and 360 px**, with the sign-up closed and open. For every pill, chip,
  button, link and tag it checked that the text's box lies inside the element's box, that `scrollWidth` is not larger than
  `clientWidth` (4 px of slack for an underlined button), and that a pill-shaped element (radius ≥ half its height, no icon) has at
  least 35 % of its height of space between the text and each curved end. Elements: `.samp`, `.samp-u`, `.pill` (nav, hero, final
  band, sm and xl, solid and ghost), `.chip`, `.fbtn` (the manager table's filter buttons), `.door`, `.replay`, `.vd`, `.tt`,
  `.dayrail li`, `.dr-rep`, `.srv-node`, `.sel`, `.post`, `.ubtn`, `.faq summary`, `.lic`, `.fcount`, the nav and account links.
  **Before the fix it failed once per run** (the `.samp` at 1440: 39.5 px tall, text 1 px from each end); **after, nothing
  overflows in any font, width or state.** No other pill, button or link needed a change.
- **The app's own dashed tag** (`SampleDataPill`, eight of them on the team dashboard) and the demo bar's tag, `Switch`, `Start
  over` and `Sign in` were run through the same check in the demo at 1440 and 360 px with the same four faces: they fit, with
  no change (the pill is `inline-flex` with side padding and no fixed size).
- **A test keeps the CSS honest:** `landingIsolation.test.js` has three cases — the pills, chips, tags and filter buttons carry
  padding and no `width` / `height`; the `.lhead .samp` guard exists with its padding, size and `nowrap`; `.samp` keeps its dashed
  border, radius and `nowrap`. (The text-against-border check itself needs a browser and is the one above.) Lint clean;
  server 385, client **516** (was 513).
- **Still not seen:** the real Bricolage Grotesque (blocked here), so the fix is proven for wide fallback faces, not by eye
  with the actual font.

### C10 owner copy: plain-language "Who can do what" (2026-10-10)
Owner decision: the block was too technical for non-technical visitors and its first example was misleading (it read as if
a teammate opening a report were the only thing the page checked). Only the words changed, plus one added row; layout, styles
and colours are as they were.
- **Copy (landing, `LimitsSection.jsx`):** heading "Who can do what" (kept); subtitle "WeeklyView checks every action, so
  people can only do what their role allows."; top box **WeeklyView checks** / "who you are and what you're allowed to do";
  five rows — Tharindu (teammate) reads Imali's daily updates · *Allowed*; Tharindu (teammate) tries to open Imali's weekly
  report · *Not allowed: managers only*; Nadia (manager) comments on Imali's weekly report · *Allowed*; Nadia (manager) tries to
  change Imali's report · *Not allowed: comments only*; Nadia (manager) tries to approve her own report · *Not allowed: no one
  approves their own*. The hidden sentence for screen readers reads "Examples of what WeeklyView allows and what it refuses."
  The server-check animation walks all five rows (it reads the list, so nothing in the script changed). Owner-decision line added
  to `brand_design_strategy.md` §7.9.
- **The pills.** `.vd` is `width:max-content; max-width:100%` with its `3px 10px` padding, no fixed width or height: one line,
  as wide as its text in any font, and when the row's text leaves no room it drops whole onto its own line. Only when one line of
  it is wider than the column does its text wrap inside it, so it cannot overflow. **This is not `white-space:nowrap`** as
  asked: with `nowrap` the longest verdict ("Not allowed: no one approves their own") overflowed the column in a wide font (the
  check below caught it at 1440 and 360 px). A verdict's `max-content` width also made the grid column refuse to shrink in a wide
  font (page-wide sideways scroll at 360 px), so `.mx > div` has `min-width:0`. Both are in `landing.css` under `.landing`.
- **Checked in a browser at 1440, 1024, 360 and 320 px, sign-up closed and open,** with DejaVu Sans, DejaVu Sans Mono, Liberation
  Serif and Inter forced onto every landing element: no pill, chip, button, link or tag overflows its box, the text clears each
  pill's curved ends (the check now measures the curve's inset at each line of text, not a fixed fraction), and the page has no
  sideways scroll. Screenshots of the block were looked at at 1440 px, 360 px, and 360 px in DejaVu Sans: five rows, each verdict
  on the row's line or its own line, the longest verdict wrapping inside its pill only at 360 px in the fallback face.
- **Tests:** `LandingPage.test.jsx` has four new cases (the heading, subtitle and top box; the five rows with their verdicts in
  order, `ok` / `no`; the names in bold; no "server", "request", "refused", "Imali J." or "week 38" left in the block). The old
  copy was not asserted anywhere. `landingIsolation.test.js` asserts the verdict pill's `max-content` sizing, its padding and radius
  and the absence of `nowrap`; the generic pill rule now allows `width:max-content` and nothing else. Lint clean; server 385,
  client **521** (was 516: four cases in `LandingPage.test.jsx`, one in `landingIsolation.test.js`).
- **Not seen:** the real Bricolage Grotesque (blocked here). The line breaks, and so which verdicts sit beside the text and which
  drop to their own line, will move a little with it.

### C10 owner feedback: privacy statement placement; mock-ups match the app (2026-10-10)
Both are owner decisions, noted as rules 8 and 9 of `brand_design_strategy.md` §6.0.
- **Privacy statement.** "No activity tracking, no screenshots, no idle timers. Only what people choose to write." is now inside
  the right-hand column of the "Who can do what" block (`.mx-right`), under the permissions table, centred in the height that
  column has left beside the list (auto margins). From **1024 px** up the block is two columns (the collapse used to be at
  1060 px); below it, the list, the table and then the statement stack. Typography unchanged. Looked at 1440 and 1024 px.
- **Palette.** `landing.css` now carries the app's light palette as **`--l-app-*`** tokens (paper … rule, acc, the four status
  sets and the dashed none chip, the seven type colours c1–c7), scoped to `.landing`. The reference's `--l-u-*` / `--l-st-*`
  names alias them, so every mock-up reads one palette. No app CSS is imported; no landing token reaches the app. A test
  (`landingIsolation.test.js`, 35 cases) asserts each `--l-app-*` equals the same token in `tokens.css`.
- **What changed per mock-up** (size, placement, framing, tilt/fan and the animations are as they were):
  - *Hero laptop (the manager's dashboard):* sidebar is the app's (Review desk with its `2`, Team dashboard active with the left
    bar, People, Projects, This week, My reports, Team updates); the three invented metrics became the app's four coloured ones —
    **Filed** blue, **Compliance** green, **Needs correction** red, **Open blockers** amber (the counter that the update flies
    into); the Mon–Fri squares are the app's six states (posted cobalt, missing red ×, today blue outline, leave hatch, holiday
    dots, later faint outline) with a small legend; Dinesh's Monday is the red ×, Ayesha's Tuesday and Dinesh's Tuesday are "today,
    not posted yet", Imali's Tuesday fills as the update lands; column "Mon to Fri" is "Updates"; chips are the current, stronger
    status colours. The "Posted today" and "Week so far" cells are gone (not in the app), so the script's hours counter went too.
  - *Hero phone:* the bottom tab bar is gone (the app has none); the top bar is the app's (menu, "This week"); the day strip is the
    app's week strip (Tue selected with the ink bar and today's blue bar); the panel header is "Tue 15 Sep · 7 h · Not posted" and the
    "Not posted" turns to "Posted 17:42" when the update is sent (the button is the app's plain primary `Post update`, not a
    morphing label); "What did you do?", type marks inside the Task and Type fields, "Blockers · Optional" with the app's
    placeholder "What is holding work up?", the "Open to team comments" checkbox, `Save` and `Post update`. The flying note carries
    the blocker style (key bar).
  - *Week scene, the five day cards:* the app's day card — weekday, date and hours in the header, a strip with the comment count
    and the "Open to team comments" switch, work lines as task over project, the type with its **colour mark** (not a grey tag),
    what was done, hours right-aligned; the Tuesday blocker is the app's **key blocker** row (2 px cobalt bar, resolve box, `Key`)
    under a "Blockers" label; the comment is a **conversation** (avatar, name, `Manager` chip, time, text, and Imali's reply hanging
    off a hairline — the reply is hidden on viewports shorter than 820 px so the card fits). The "report is built from these five
    days" line is the landing's own caption and is as it was.
  - *Week report:* **"Set status"** (was "Set a status"), the **Draft chip** in the current yellow, **"Ask for approval"** framed like
    the app's button (ticked, cobalt edge and tint), type colour marks under each task, `Submit` in the app's primary.
  - *Single-day card (problem section):* the same day card in small — weekday, date and hours, task with project and the type mark,
    hours right, the key-blocker row; the `SAMPLE DATA` tag is the app's dashed tag.
  - *Manager's monitor:* the four coloured metrics with the app's sub-lines ("2 not yet filed", "this week", "raised by 3 people");
    Compliance added (75 %); the squares, the legend, status chips (Approved / Needs correction / Submitted / Draft / dashed Not
    started) in the app's colours; Person cells have the app's square initials; columns read "Updates" and "Projects"; Ayesha's
    Friday and all five of Dinesh's days are the red ×. The filter buttons and the "Open blockers" list are the page's own interactive
    story and are as they were. At 360 px the metrics are 2 × 2 and the chips take the app's small size so none is clipped.
  - *Ledger pieces:* the daily update has type marks and the key-blocker row; the weekly report shows the Draft chip and the app's
    task-status chips (`In progress`, `Done` in green); the four status chips are the current colours; the revision comment shows
    avatar, name, `Manager` chip and "rev 1 · sent back" (it stays on the tint, as overall comments do in the app, design §3.4);
    "Not started" is the dashed chip with the square initials.
  - *Checked and left alone:* the "Open blockers" side list, the filter buttons, the day rail, the "who can do what" table and rows
    (the page's own UI, not the product's).
- **Pills and chips fit their text.** Chips: `min-height` (18 px, or 22 px for the `md` size), side padding, `nowrap`, no fixed width
  or height; the status chips in the narrow table are the small size. The browser fit check (DejaVu Sans, DejaVu Sans Mono,
  Liberation Serif and Inter forced onto the page; 1440, 1024, 360 and 320 px; sign-up closed and open; reduced motion on, and
  motion on for DejaVu Sans) found **no overflow and no sideways scroll**, covering every `.pill`, `.chip`, `.tchip`, `.samp`,
  `.samp-u`, `.vd`, `.fbtn`, `.ucheck`, `.ubtn`, `.usec`, `.post`, role chip and legend item. It first caught the narrow table's
  "Needs correction" chip clipped at 360 px; fixed as above.
- **Looked at** (headless Chromium, fallback fonts): 1440 px with motion — the hero, the week at Tue and the report, the monitor,
  the ledger, the "who can do what" block; 1366 × 768 and 1024 × 800 — the pinned week at Tue and the report (the Tuesday card fits;
  this is why the reply hides on short screens); 360 px with motion — the hero, the week cards, the monitor, the single-day card, the
  "who can do what" block; 1024 px — the hero and the block; static (reduced motion) at 1440 and 1024 — the day cards as rows. **Not
  looked at by eye:** the static 360 px layout of the hero and ledger (measured only), the other status states the mock-ups do not
  show, hover and focus states, and the real Bricolage Grotesque (blocked here; line breaks will move).
- **Fonts, as I read the instruction.** "Mock-ups use the app's fonts as the landing reference already does": the reference draws its
  mock-ups in the page's own typeface, and the landing checklist (brand §12) forbids Chivo, Instrument Sans and JetBrains Mono on
  the page, so the mock-ups stay in Bricolage Grotesque, with tabular figures where the app uses mono. If you meant the product's
  three families inside the frames, that is a separate change (it loads fonts on the landing page).
- **Tests:** `LandingPage.test.jsx` (`m-hrs` removed from the ids the motion needs; seven cases for the mock-ups: the squares in the
  monitor and the hero, the legend, the four metrics and sidebar, the day cards, the report, the single card and ledger, and the
  privacy statement's place) and `landingIsolation.test.js` (35 palette cases, the reference names reading that palette, the pill
  rule list now naming `tchip`). Lint clean; server 385, client **564** (was 521).

**Owner: how to test C10 by hand** (the demo and the landing page need no database; steps 1–9 need only the client)
1. In a terminal: copy `client/.env.example` to `client/.env` if you have not, then `npm --prefix client run dev`, and open
   http://localhost:5173/ **with the API not running**. You should see the green landing page, and the one big button reads
   **See the live demo**. Look for any "Create your account" button anywhere: there should be none.
2. Scroll from top to bottom, first at a wide window, then at 360 px wide (browser dev tools → device toolbar). Check: the hero's
   typed blocker plays once and **Play it again** replays it; on a wide window the week section pins and walks Monday to Friday;
   the manager table's **Needs correction / Not started / Has blocker** buttons filter it; the FAQ questions open; no sideways
   scrolling at 360 px. Then switch your system to "reduce motion" and reload: everything is there, nothing moves or hides.
3. **The signed-up state** (optional, needs the API): start `npm --prefix server run dev` against a **local, empty,
   throw-away** MongoDB (not Atlas, not a database you keep), reload the landing page: the nav, the hero and the last band now
   read **Create your account**, with **See the live demo** beside the first and last. Stop the API and reload: back to demo-only.
4. Click **See the live demo**. The address is `/demo` and you see "Try WeeklyView" with three choices. Click **Manager**.
5. In the sidebar, **Review desk** shows `2`. Open it: two reports (Ruwan P. and Ayesha C.). Open Ruwan's, type nothing, click
   **Approve**. Go back to **Review desk**: one is left, and the sidebar says `1`. Open **Team dashboard**: a row of squares per
   person — blue posted, red × missing, hatched on leave (Malith W.), and a dotted square for the day off on a weekday.
6. Click **Switch** (top bar, next to your name) → the chooser → **Team member**. **My reports** has a small blue square (last
   week was sent back); **This week** shows day cards. Post or edit a day, open a comment, and notice nothing is "saved":
   press F5 and you are back at the chooser.
7. Choose **Admin**: open **Users** and **Holidays**, add a holiday, change a person's role in the Role column, and open a
   person's `⋯` menu. Click
   **Start over** in the bar: you are at the chooser and everything you did is gone.
8. **Dark theme:** inside the demo, bottom of the sidebar → your name → **Appearance → Dark**. The demo bar stays the same dark
   band, the pages are dark, the dashed **SAMPLE DATA** tags show on the panels. Open http://localhost:5173/ in the same
   browser: the landing page is still green (it ignores the theme).
9. **Narrow:** at 360 px wide the bar is one row (SAMPLE DATA, your name, Switch, Start over, Sign in); open the menu
   (☰): the drawer slides in under the bar.
10. **Nothing leaks:** from the landing page click **Sign in**: the ordinary sign-in screen (cobalt, Chivo headings, no green). In dev tools → Network, filter "Bricolage": it appears on `/` only, not on `/signin` and not on `/demo`.

### Landing revamp: guided scroll story and plain-language copy (owner request, 2026-10-10)
Not a stage. Owner problem: visitors did not understand what WeeklyView is or why they would want it. Branch
`claude/landing-story-revamp` from `main`. The new order and every line of copy are recorded as owner decisions in
`brand_design_strategy.md` §6.0 rule 10 (rule 9 is marked superseded; rule 6 now names the Privacy section);
`frontend_architecture.md` §9.16 points to it where it said "keep its copy".
- **Design references.** `emilkowalski/skills` was cloned into the scratchpad (outside the repo) and read —
  `apple-design`, `emil-design-eng`, `animate`, the performance cheatsheet. Applied: transform/opacity only on
  scroll, no reads in the scroll path, strong ease-out, nothing from `scale(0)` (the dashboard squares now start at
  `scale(.6)` + transparent), short staggers, restraint (the tally, the ledger and the server-check animation are
  gone), reduced motion = final states. **21st.dev could not be reached from this environment** (the proxy refused
  the tunnel, 403); the patterns used (sticky scroll story, product-tour spotlight, typed caption) are ideas only.
  No dependency was added; Motion was not needed (the existing vanilla kit does it).
- **What changed.** Section order: hero → before/after → the team member's week → the manager's side → Private
  where it matters → demo invitation → FAQ → final. New: `PrivacySection.jsx` (from `LimitsSection.jsx`),
  `DemoSection.jsx`, `StoryCaptions.jsx`, `storySteps.js`; removed: `SidesSection.jsx`, `LimitsSection.jsx`.
  `WeekSection`, `DeskSection`, `ProblemSection`, `HeroSection`, `QuestionsSection`, `FinalSection`, the nav, the
  tab title and description are rewritten; `useLandingMotion.js` keeps reveals, headings, the hero's typed blocker
  and the filters, drops the old week, problem, monitor, ledger and server scripts, and adds the two stories.
- **The stories.** From 1000px with motion: the week pins for 8 steps, the dashboard for 10. Each step types one
  caption (an `aria-hidden` copy over the real sentence, which stays in the DOM), draws a sand line to its target
  and rings it; the dashboard dims the rest and its Show buttons switch Everyone → Needs correction → Not started →
  Has blocker. The dashboard keeps a 1240px design width while pinned and is scaled to fit. Below 1000px and under
  reduced motion: numbered captions above each mock-up, nothing pinned, typed or drawn.
- **Checks.** `npm run lint` clean. `npm test`: server 385 (unchanged), client **574** (was 564):
  `LandingPage.test.jsx` 30 (the order, the hero's what/who, the before/after, the old copy gone, ≤15-word
  captions, the steps' order and filters, one target per step, real caption text in the DOM with the typed copy
  `aria-hidden`, Tuesday's teammate comment, the privacy cards and closed disclosure, the demo's three links, plus
  the CTA, honesty and mock-up cases kept); `landingIsolation.test.js` 50 (the Sides/Limits pill guards removed with
  their elements; three new: the stacked fallback, the 1000px pin, the overlay caption). `vite build` OK.
- **Looked at in headless Chromium** (fonts blocked, so the fallback face): 1440×900 every step of both stories;
  1024×768 every step of both; 360×780 the hero, the before/after and the stacked stories; reduced motion full page
  at 1440 and 360; the hero at 1440, 1024, 360. **Wide font:** DejaVu Sans forced on every landing element at
  1024×768 (every step) and 360 (sections; reduced-motion full page): captions fit their column, no sideways scroll.
  **No sideways scroll** at 1440, 1024, 360 (one 10px overflow at 360 from a reveal's start offset was fixed with
  `overflow-x:clip` on the sections). **Sign-up open** (bootstrap mocked `available: true`): three "Create your
  account" links (nav, hero, final). **Performance:** scrolling through both stories and back up at 60–80px steps
  logged no long task (>50ms) and no page error; scrolling back restores the right day and caption.
- **Not verified:** the real Bricolage Grotesque (line breaks will move a little); Firefox and Safari; touch
  scrolling on a real phone; a screen reader reading the captions; widths between 1000 and 1024 and above 1440;
  very short desktop windows under 700px tall (the dashboard scales down to fit, untested by eye); the typing's feel
  at full speed by eye (screenshots catch it mid-way).

**Owner: how to check the revamp by hand** (no API or database needed)
1. In a terminal: copy `client/.env.example` to `client/.env` if you have not, then run `npm --prefix client run dev`
   and open http://localhost:5173/ in a wide window (1280px or more).
2. **Hero:** you should read, top to bottom, "A web app for daily updates and weekly reports", "Short daily notes. A
   weekly report that builds itself.", and "For teams and their managers…". The phone types the blocker and it flies
   to the laptop, as before.
3. Scroll once: **"From scattered updates to one short note a day."** — two cards, *Before / In most teams…* and
   *After / With WeeklyView…*, with an arrow between them.
4. Keep scrolling into **"Follow one person's week."** The section stays put while you scroll. Check, step by step
   (the counter under the caption reads 1/8 … 8/8): Monday's header is ringed; then the first work line; then the
   "7.5 h" (the line goes over the top of the card); Tuesday arrives and its blocker is ringed; then Tharindu's
   comment; the day rail runs to Friday; the cards stack and the **Week 38 report** rises; the statuses fill in and
   the line points at *Ask for approval* and *Submit*. Each caption types itself once per step.
5. Scroll **back up** a little: the previous step's caption and line come back.
6. Keep going into **"The manager's side"**. The dashboard pins with a caption above it (1/10 … 10/10): the four
   numbers are ringed in turn and the rest of the dashboard dims; then the Updates column; then the legend; then the
   **Show** buttons switch by themselves — Everyone, Needs correction (one row), Not started (Dinesh), Has blocker
   (three rows). After the pin ends you can still click the buttons yourself.
7. **Private where it matters:** three cards and the line "No activity tracking…". Click **See exactly who sees
   what**: the table opens; click again to close.
8. **Try both sides yourself:** three role cards; click one — the address is `/demo` and the chooser opens. Go back.
9. **FAQ**: open two or three questions. **Final band**: "Write the day. Read the week." and the demo button.
10. **Phone width:** dev tools → device toolbar → 360px wide, reload. Nothing pins: each group of numbered captions
    sits above the card it explains, the dashboard has its numbered list above it, and nothing scrolls sideways.
11. **Reduced motion:** turn on your system's "reduce motion" (Windows: Settings → Accessibility → Visual effects →
    Animation effects off), reload at a wide window. Nothing pins, types or draws; every caption is shown as a list
    above its mock-up and every mock-up is in its final state.
12. **With the real font**, look at the headlines and captions for awkward line breaks (they were only seen in a
    fallback face here). Then open http://localhost:5173/signin: it is the ordinary cobalt sign-in, no green.

### Landing polish: centred layout, GSAP scroll stories, new footer (owner request, 2026-10-10)
Not a stage. Branch `claude/landing-polish-motion` from `main`. Recorded as owner decisions in
`brand_design_strategy.md` §6.0 rule 11 (layout, motion, footer) and `tech_stack.md` §10 (`gsap`, landing only);
`frontend_architecture.md` §9.16 and the `useLandingMotion.js` line of `project_structure.md` point to them. Copy and
section order are rule 10's, unchanged (the footer's links and line are new).
- **Design references.** `emilkowalski/skills` cloned again into the scratchpad (outside the repo); `apple-design`
  read and applied: transform/opacity only, strong ease-out and no overshoot on anything that is not thrown,
  interruptible scroll-linked motion (the scrub follows the scroll both ways), reduced motion = final states,
  restraint (one short entrance per element, nothing loops).
- **Layout (owner bug).** Hero: `min-height: 100svh`, content centred under the nav (top and bottom space equal at
  1440 and 1920; at 1280×720 it fits with ~40px to spare). Week story: heading + caption + counter are one group
  (the caption sits a fixed gap under the meta line, no longer pushed to the middle), centred against the
  mock-up; the stage is as tall as its tallest card or the report, the cards share a top edge and the row moves so
  the card in front (then the report) is centred, with the day rail riding just above it. Dashboard: scaled to the
  room under its heading, and the heading and dashboard are centred as one group.
- **GSAP (new dependency, owner-approved).** `gsap@^3.15` in `client/package.json`, imported only by
  `hooks/useLandingMotion.js` (a test asserts this and that only `LandingPage` imports the hook). The build puts it
  in the `LandingPage` chunk only (193 kB, 65.7 kB gzipped; the app's entry chunk holds just the lazy `import()`).
  What it runs: the two stories (scrub 0.6 s, snapping to a resting point in each step, both directions, no
  momentum projection so no step is skipped); each line drawn along its path and drawn back as its step ends, the
  head last, the ring settling onto its target (scale 1.12 → 1 + fade), the dashboard's spotlight gliding between
  targets; the typed captions, timed to the step; heading groups, cards, line icons, counters (0.6 s, 16–20px,
  70–80 ms stagger); the closing arc drawn with the scroll; a 28px / 72px parallax on the hero's laptop / phone;
  the footer's week and wordmark; in-page links glide (ScrollTrigger's snapping turns CSS smooth scroll off, so the
  old `scroll-behavior: smooth` rule is gone). Everything lives in one `gsap.matchMedia()`, reverted on unmount.
- **One deliberate change from the brief: the pin is CSS `position: sticky`, not ScrollTrigger's `pin`.** Both
  were built and measured. ScrollTrigger's `pin` switches the panel between the page and `position: fixed`;
  frame-by-frame it held still once `anticipatePin` (which pinned 50px early) was removed, but Chrome's
  layout-shift score was **7.78** for one pass down and up through the stories, against **0.0008** with sticky,
  with identical frame times. That score feeds Core Web Vitals (search ranking) for a public page, so the
  panels are sticky and ScrollTrigger does the scrub and snap. Reversible: passing `pin: panel` and an `end`
  back to `pinStory` and dropping the sticky heights restores ScrollTrigger pinning (see *Open questions*).
- **Footer.** Under the closing band: "One square a day" with five squares (Mon–Fri: posted, posted, missing,
  posted, holiday) that fill in on view and a Posted · Missing · Holiday legend that lights with them; link columns
  **Product** (The week, For managers, Privacy, FAQ) and **Get started** (Live demo, Sign in); a WeeklyView wordmark
  fitted to the column's width in any typeface (`aria-hidden`), rising into place as the page ends; and © year ·
  "No activity tracking. Ever." · "Every name on this page belongs to a fictional sample team."
- **Checks.** `npm run lint` clean. `npm test`: server 385 (unchanged), client **580** (was 574): the GSAP-import
  isolation test, four footer tests and the heading-group test. `vite build` OK.
- **Looked at in headless Chromium** (Google Fonts blocked, so a fallback face), motion on: 1440×900 hero and
  steps of both stories; 1920×1080, 1280×720 and 1024×768 the hero, week steps 2/5/6/8 and dashboard steps 4/10;
  360×780 the hero, stacked stories, privacy and footer; the footer at 1440 and 360. Motion off (reduced motion):
  1440 full page and 360 full page: no pin, nothing hidden or drawn, every caption listed. **Wide font** (DejaVu
  Sans forced): 1440 week step 4, dashboard step 4 and footer; 1024 week step 5 and footer; 360 footer — nothing
  clips, the wordmark still fits. **No sideways scroll** at any of these.
  **Measured:** scrolling both stories down and back with wheel input: 60 fps (frame p50 and p95 16.7–16.8 ms),
  no long task, no page error, layout shift 0.0008; the panel's on-screen position matched the expected value on
  every frame entering and leaving the pin; after scrolling the whole page no entrance target is left hidden (1440
  and 360), the counters end on their values; a nav link glides to its section and moves focus there.
  **Cleanup:** navigating inside the app from `/` to `/signin` leaves 0 ScrollTriggers, no pin spacer, no
  `landing-active` class and no inline style on `<html>`/`<body>`; going back re-creates them and the stories
  work.
- **Not verified:** the real Bricolage Grotesque; Firefox and Safari; trackpad and touch momentum on a real
  device (snap feel); a screen reader on the footer; the feel of the timings at full speed by eye (screenshots
  freeze them); windows shorter than 700px.

**Owner: how to check the landing polish by hand** (no API or database needed)
1. In a terminal at the repo root: `npm --prefix client install` (adds `gsap`), copy `client/.env.example` to
   `client/.env` if you have not, then `npm --prefix client run dev`. Open http://localhost:5173/ in a window
   1440px wide or more.
2. **Hero:** the copy and the laptop/phone sit in the middle of the first screen, with about the same space above
   (under the nav) and below. The headline's words rise in, then the line under it, the button and the two doors.
   Scroll a little: the phone drifts up faster than the laptop.
3. Scroll to **"Follow one person's week."** It stays put while you scroll. The heading, the caption and the
   "1 / 8" counter are one block on the left, level with the day card on the right; the Mon–Fri rail sits just
   above the card. Stop scrolling anywhere: the page settles on the nearest step in the direction you were going.
4. Step through to 8 / 8: each caption types itself; a sand line draws from the caption to its target, the arrow
   arrives last and a ring settles on the target. Scroll **back up**: the line draws itself back and the previous
   step returns.
5. **"The manager's side":** the heading and caption sit above the dashboard and the whole group is centred. Each
   step dims the rest of the dashboard; the bright area glides to the next target. The Show buttons switch by
   themselves at steps 7–10.
6. Keep scrolling: section headings (small label, heading, line under it) rise in together, cards arrive one after
   another, the icons draw themselves, and the closing arc draws as you approach "Write the day. Read the week."
7. **Footer:** the five squares fill in Monday to Friday (posted, posted, missing, posted, holiday) and the legend
   lights with them; the big WeeklyView rises into place as you reach the bottom. Click **Privacy** in the footer:
   the page glides up to that section.
8. Click **FAQ** in the top nav from the top of the page: the page glides there.
9. Try **1280×720** (dev tools → device toolbar → responsive, type the size): the hero and both stories still fit
   the screen, nothing cut off at the bottom.
10. **Phone:** responsive 360 wide, reload. Nothing pins; the stories are numbered lists above their cards; the
    footer stacks (squares, then the two link columns side by side, then the wordmark, then the bottom row) and
    nothing scrolls sideways.
11. **Reduced motion:** Windows Settings → Accessibility → Visual effects → Animation effects **off**; reload at a
    wide window. Nothing moves, pins or types; every caption is listed; the footer's squares are already filled.
    Turn animation effects back on.
12. **Leaving the page:** click **Sign in**: the ordinary cobalt sign-in screen, no green. In dev tools → Network,
    filter "gsap" or "LandingPage": the landing chunk (which holds GSAP) is loaded on `/` only, not when you open
    `/signin` or `/demo` directly in a new tab.
13. **With the real font** (Bricolage loads on your machine), look at the headlines, captions and the footer's
    wordmark: it should run edge to edge of the content column without being cut off.

### Polish: whole-app UI/UX pass (owner request, 2026-10-10)
Not a stage; **C11 is still next.** The planned "visual polish after C10" (see *C7 owner feedback*, item 6),
on branch `claude/app-polish`, **for the owner to review before merging**. Inside the product design system
(cobalt on cool neutrals, Chivo / Instrument Sans / JetBrains Mono, square corners, hairlines, tokens only, no
hex in components). Every rule or motion change is recorded as an owner decision in `product_design_system.md`
(§1.3, §3.0, §3.1, §3.12, §6.1, §6.9, §6.17 and the new **§8.5**). No behaviour, route, API call, button label
or page name changed; the landing page, `server/api/`, `server/vercel.json` and `docs/DEPLOYMENT.md` were not
touched. References: Emil Kowalski's skills (`apple-design`, `emil-design-eng`, `animate`,
`find-animation-opportunities`) were read and applied; **21st.dev was unreachable** from this environment (the
proxy refused the connection), so no patterns were taken from it. Motion (already in the stack) is used; no
dependency was added.

**Across the app**
- **Press feedback on every button** (all variants, and links drawn as buttons): `scale(.97)` on pointer-down,
  120ms. The old press was on primary and inverted only, and never eased (Tailwind 4 sets `scale`, the
  transition named `transform`) — fixed.
- **Sidebar:** the active item's tint and cobalt bar slide to the page you open (200ms).
- **Segmented controls** (Days | Hours, Asked for approval | All submitted, Light | Dark): the selection slides.
- **Popovers and menus** grow 2% from their trigger instead of the middle.
- **Light ↔ dark** cross-fades over 200ms instead of flashing.
- **Empty states** carry the product's own mark: five small Updates squares above the title (the first in the
  "today" cobalt outline for a list nothing has filled yet; dashed for "nothing matches these filters"; plain
  for a page that isn't there or isn't yours). Not an icon or illustration; §6.17 amended.
- **Page alignment:** a page's content now starts under its top-bar title instead of centring. Holidays and
  Account (narrow pages) no longer float in the middle of a wide screen.
- **Panel headers** wrap their actions under the title on a phone, so "My projects" no longer breaks onto two
  lines next to the SAMPLE DATA pill and the Days | Hours switch.
- **Route focus:** the page title no longer shows a focus box when a page opens (the heading is focused for
  screen readers; the ring there was a side effect).
- **Reduced motion** respected throughout: the slides jump, the day switch is a fade only, row and comment
  entrances are cut to nothing; checked in the browser with `prefers-reduced-motion: reduce`.

**Per page**
- **This week:** each day in the week strip shows its Updates square (posted, missing ×, today outline, leave
  hatch, holiday dots, later) — the dashboard's language — and days you can open answer the pointer. Picking a day
  slides the 2px bar and fades the new day in from the side it came from. The leave and holiday line leads each
  item with its square (no stray "·" when it wraps on a phone). The *Week N* panel: figures in three columns at
  14px, *Days posted* with the week's five squares, *Key blocker* on its own row.
- **The weekly form:** a plan item, achievement or link you add settles into place; the autosave line leads with
  a small square — hollow while saving, cobalt once saved — and each state fades in. The strip above uses the
  squares too.
- **A week (yours, a teammate's, a person's):** comments you post settle in; the day cards are unchanged.
- **Day panel (This week):** a work line or blocker you add settles into place.
- **My reports, Review desk, People, Users, Person profile:** the "no matches" and "nothing yet" states carry
  the mark; tables, filters and chips unchanged.
- **Team updates:** switching day fades the new day's updates in from its side once they arrive (the old day
  stays, dimmed, while they load); the day tabs fit at 360px.
- **Review page, Team dashboard, Projects:** press feedback, segmented slide and empty states as above; the
  C7 colours, squares and legend are unchanged.
- **Holidays, Account:** aligned under the page title.
- **Sign in, Create account, Join the team, Choose a new password:** the column starts 18% down the screen
  instead of hugging the top.
- **Demo chooser:** same placement; each choice gets the cobalt bar and a chevron that moves on hover.
- **Demo bar:** unchanged.
- **404 / No access:** centred in the content area (a little above the middle) with the mark; standalone
  versions centred on the screen.

**Files:** new `components/ui/ContentSwap.jsx` and `hooks/useAppendMotion.js` (both in
`project_structure.md`); `UpdatesCell.jsx` now exports `DaySquare`, used by the week strip, the leave line and
the week panel. `USER_MANUAL.md` §14 and §37 mention the squares in the strip (no label changed).

**Checks**
- `npm run lint`: clean. `npm test`: green — server 385 (unchanged), client 580 (unchanged in number; one dashboard
  test kept passing by keeping the squares' `size-[14px]` class on the shared `DaySquare`).
- **Browser** (Playwright's Chromium, headless; API and Vite on this machine, a local in-memory MongoDB with the
  repo's seed — Atlas and `MONGODB_URI` never used): 26 views — This week (approved and draft), the weekly form,
  a week, a person's week, My reports, Team updates, Review desk, the review page, Team dashboard, Projects, Users,
  Holidays, People, a profile, Account, the four sign-in screens, the demo chooser, the demo as a member, 404 and
  No access — at **1440 and 360 px, light and dark** (104 screenshots), looked at; no horizontal overflow and no
  page errors. Motion measured in the page: the sidebar highlight, the strip bar and the segmented fill move
  over their duration and land on the new item; the day panel starts at opacity 0 and 8px off and settles; a
  pressed button reads `scale: 0.97`; with reduced motion the three slides jump and the day panel has no
  offset.
- **Not verified:** how the motion *feels* (judged from measurements and stills, not watched); Safari and
  Firefox; real touch devices; a screen reader; print (unchanged code, not re-checked).

**Owner: how to check the polish by hand** (local, on your machine)
1. Use a local or throw-away database — `npm run db:sample` **wipes** the one in `server/.env`. Then `npm run db:sample`,
   and in two terminals `npm --prefix server run dev` and `npm --prefix client run dev`.
2. Open http://localhost:5173/signin. The sign-in card sits in the upper middle of the window, not at the top.
   Sign in as `imali@example.com`, password `weekly-view-dev`.
3. **This week:** each day in the strip has a small square (blue = posted; Wednesday's dotted square is the
   holiday). Click **Tue**, then **Mon**: the black bar along the top slides, and the day below fades in from the
   right, then from the left. The grey line under the strip starts each item with its square.
4. In the **Week 41** panel, *Days posted* shows "4 of 4" with five squares, and the figures sit in three columns.
5. Press and hold **View report**: the button gives slightly under the pointer. Release; the week opens.
6. Click **My reports**, then **Team updates** in the sidebar: the blue highlight slides from item to item.
7. On **Team updates**, click **Mon 5**, then **Fri 9**: the updates fade in from the side of the day you picked.
8. Your name (bottom of the sidebar) → **Appearance → Dark**: the colours ease over instead of flashing. Then
   **Account**: the panels line up under the "Account" title on the left.
9. Back on **This week**, under **My projects**, click **Hours**, then **Days**: the blue fill slides.
10. Sign out; sign in as `ayesha@example.com`. Open **This week**, pick **Mon**, **Edit**, **Add a line**: the new
    line settles into place. Cancel. Click **Review and submit**: type in *Planned for next week*; the line at the
    bottom left shows a hollow square with "Saving…" and then a blue square with "Saved hh:mm". Click **Add an item**:
    the new row settles in.
11. Open a day with comments (Imali's Tuesday as Ayesha, under **Team updates**, **Tue 6**), post a comment: it
    settles in.
12. Go to http://localhost:5173/nowhere: "That page doesn't exist." sits in the middle of the page under five
    small squares.
13. On **My reports**, filter **Status → Needs correction**: "No reports match these filters." with dashed squares.
14. Sign out; open http://localhost:5173/demo. Hover each choice: a blue bar on the left and the arrow moves.
15. Turn on reduced motion (Windows: **Settings → Accessibility → Visual effects → Animation effects**, off) and
    repeat 3 and 6: the bar and highlight jump, the day just fades.
16. Narrow the window to about 360 px (or the device toolbar) and repeat 3, 4 and 7: nothing runs off the side,
    "My projects" stays on one line, and all five day tabs fit.

### Landing: text-only wordmark in header and footer (owner request, 2026-10-10)
Not a stage; **C11 is still next.** Branch `claude/landing-wordmark` from `main`. Recorded as an owner decision in
`brand_design_strategy.md` §6.0 rule 12 (§1.3 points to it). Only the landing page's nav brand and footer wordmark
changed; the app's `BrandMark` (sidebar, sign-in screens, boot splash, error pages) keeps the glyph, and no landing
colour, font, token or other motion changed.
- **Header.** The `[ | ]` SVG is gone; the link reads "WeeklyView" and keeps `href="#top"` and
  `aria-label="WeeklyView home"`. The bar's row is now a grid that puts the wordmark, the section links, "Sign in"
  and the pill's text on **one baseline** and centres the row in the bar (before, each box was centred, which left
  the larger wordmark's baseline 2px below the links'). Its left edge is the `.wrap` edge at every width.
- **Footer.** The SVG and its gap are gone; the text spans the column. CSS sizes it to the column first
  (`clamp(40px, 19.2cqi, 240px)` on the footer's `.wrap` as an inline-size container), then `useLandingMotion`
  fits it exactly in whatever face loaded. Two bugs in the old fit were fixed on the way: (1) it scaled in one
  step, but Bricolage's optical-size axis draws small sizes wider, so at 360px it overflowed by 15px and the "w"
  was cut off — the fit now refines until it settles and never ends wider than the column; (2) under
  reduced motion, the page-wide 1ms transition meant the fit measured the old size and left the wordmark about
  half the column wide — the wordmark now has no transitions. The last letter's negative tracking is given back as
  right padding so its ink is not clipped (it was, at 1440). The gap to the rule above the © line is now set from
  the descender: about 39 / 33 / 28 / 20px at 1440 / 1024 / 768 / 360 (it was 37px at 1440 but 9px at 360).
  `aria-hidden="true"`, `data-wordmark` and the rise into place are kept.
- **CSS removed:** `.mark svg` (both sizes), `.mark`'s `gap`/`margin-right:auto`, `.ft-mark svg` and the span's
  flex/gap.
- **Checks.** `npm run lint` clean. `npm test`: server 385, client 580 (unchanged counts; isolation tests green).
  `vite build` OK.
- **Looked at in headless Chromium, with the real Bricolage Grotesque** (Google Fonts loaded this time): header and
  footer at 1440, 1920, 1200, 1024, 768 and 360. Measured: header baselines equal (wordmark, links, Sign in;
  the pill's text within 0.13px); wordmark's left edge = `.wrap` edge; footer wordmark one line, box edges on the
  column's edges, ink within 1–3px of each edge (the letters' side bearings), no overflow, no sideways scroll.
  **Wide font** (DejaVu Sans forced on every landing element): same widths — fits on one line, no overflow, the
  "y" descender not clipped. **Reduced motion** at 1440, 1024, 768, 360: same sizes as with motion.
- **Not verified:** Firefox and Safari; Windows font rendering; widths between the ones listed.

**Owner: how to check the wordmark by hand** (no API or database needed)
1. In a terminal at the repo root: `git fetch origin` then `git checkout claude/landing-wordmark`.
2. If you have not before: copy `client/.env.example` to `client/.env`, then run `npm --prefix client install`.
3. Run `npm --prefix client run dev` and open http://localhost:5173/ in Chrome, in a window 1440px wide or more.
4. **Header:** top left reads just **WeeklyView**, with no bracket icon. Its left edge lines up with the left edge of
   the hero's text below it. Look along the bar: the bottoms of the letters in "WeeklyView", "Why it helps",
   "Sign in" and "See the live demo" sit on one line.
5. Click **WeeklyView** in the header after scrolling down: the page glides back to the top.
6. Scroll to the bottom. The big **WeeklyView** has no icon in front of it; its "W" starts at the left edge of the
   squares above it and its last "w" ends at the right edge of "Live demo"/"Get started" — nothing is cut off, no
   gap at the start. It rises into place as you reach the bottom.
7. Below it, the line and "© 2026 WeeklyView" sit a short, even distance under the tail of the "y".
8. Open dev tools (F12) → the device toolbar icon (Ctrl+Shift+M) → **Responsive**, and type widths **1024**, **768**
   and **360** in turn (reload each time). At each: the header wordmark starts at the content edge and is level with
   the button; the footer wordmark is one line, edge to edge, not cut off; nothing scrolls sideways.
9. **Reduced motion:** Windows Settings → Accessibility → Visual effects → **Animation effects off**; reload at a
   wide window and at 360. The footer wordmark is still edge to edge (before this change it was about half
   width). Turn animation effects back on.
10. **The app keeps its glyph:** open http://localhost:5173/signin — the cobalt sign-in screen still shows the
    bracket icon next to WeeklyView. Open http://localhost:5173/demo, pick a role: the sidebar shows it too.

### Owner decision: database commands `db:empty` and `db:sample` (2026-10-16)
Not a stage; a small change the owner asked for.
- Two documented commands, in `server/package.json` and forwarded from the root:
  `npm run db:empty` (`node src/seed/index.js --empty`) wipes the seven collections, syncs
  their indexes and inserts nothing, then prints "Database emptied. The first person to sign
  up becomes the owner."; `npm run db:sample` (`node src/seed/index.js`) is the existing
  sample seed, unchanged.
- Both refuse when `NODE_ENV` is `production`, before connecting to anything.
- `seed` and `seed:reset` stay in both `package.json` files as undocumented aliases of
  `db:sample`, so old instructions still work. Every other mention of `npm run seed` /
  `seed:reset` in the docs now says `db:sample` (`db:empty` where relevant);
  `docs/reconciliation_changelog.md` is history and was not edited.
- The README, `docs/DEPLOYMENT.md` and the owner's section of `docs/USER_MANUAL.md` document
  both commands and warn that they wipe whatever database `server/.env` points at, that a
  browser still signed in afterwards should sign out (or use a private window), and that the
  sample accounts share the public password `weekly-view-dev`.
- Tests (`server/tests/seed/seed.test.js`, in-memory database only): `--empty` leaves all
  seven collections empty with the indexes intact, the bootstrap check reports sign-up open
  and the first sign-up becomes the owner; both commands exit 1 under `NODE_ENV=production`
  and touch nothing; the 21 existing sample-seed tests are unchanged and green. No Atlas or
  `MONGODB_URI` database was connected to or written.
- Earlier entries in this file that say `npm run seed` were renamed to `npm run db:sample`
  in place; what they record was run under the old name.

### Owner decision: redesigned sign-in pages, landing sign-in link, first-week message (2026-10-17)
Not a stage; **C11 is still next.** Branch `claude/auth-pages` from `main`. Recorded as owner decisions in
`product_design_system.md` §3.1 (empty state), §3.12, §8.5 (entry 32) and §9.4 (`--text-title`),
`brand_design_strategy.md` §6.0 rule 13, `frontend_architecture.md` §9.15–§9.16, `project_structure.md` and
`docs/USER_MANUAL.md` §4, §5, §13 and §48. No server code, rule, route, API call shape or error message changed.
1. **First-week message.** Someone who joined after the shown week's Friday (the owner signing up on a Saturday)
   had five "Not on the team" days under "Your first week starts here. Post what you did today." Now, when every
   day of the week is `not_on_team` (or a holiday) and the join date is after that Friday, the panel says "Your
   first week starts Mon 19 Oct." / "You joined on Sat 17 Oct, after this week's working days. Your daily updates
   start that Monday, and your weekly report builds itself from them." and offers `Go to that week` once that
   week has begun (before then the week picker can't open it, so no link is shown). The usual case is unchanged.
   The rule lives in `lib/weekActions.js` (`joinedAfterWeek`), read from the server's `dayStates`. No demo
   handler was needed: no new request, and `demoCoverage.test.js` is green.
2. **Landing hero.** Sign-up open → `Create your account` first (unchanged). Sign-up known closed → under the demo
   pill, "Already on a team? **Sign in**" (underlined link to `/signin`, `.landing .hsign`, landing tokens and
   font only). The demo caption is now "No account needed. Nothing is saved." in every non-open state (so the
   pending → closed swap only adds the line). Pending or failed → the demo pill only, as before (FA14).
3. **A way back.** "← Back to home" (to `/`) at the top of every auth screen: on the form side from 1024px, in the
   slim header below. The auth routes are real-only, so it never appears inside `/demo`; the demo's chooser keeps
   its own frame. "Forgot your password?" is a panel on sign in, not a page, and stays so.
4. **Split auth layout** (sign in, create account open and closed, accept invite, reset password, and the
   expired-link state). From 1024px: form side on `--paper` (back link, 40px Chivo heading, form, links) and a
   sticky `--card` brand panel (wordmark; a Mon–Fri strip of 22px Updates squares that fill in once — 200ms each,
   120ms apart, drawn filled under reduced motion; "One short update a day." and one plain line). Below 1024px a
   52px header (wordmark, back link) and the form first. Headings: "Sign in to WeeklyView" (tab: "Sign in"),
   "Create the owner account" + "…Everyone else joins with an invite link from you."; the others unchanged. Sign
   in shows "No team here yet? Create the owner account" only when A1 says `available: true` — **this adds the
   cached A1 request to `/signin`**; pending or failed, nothing is offered. The layout's `<main>` now carries
   `id="main"`, so the skip link works on these screens (it pointed nowhere before).
   Restraint and motion followed Emil Kowalski's `apple-design` skill: one quiet entrance, opacity and a small
   scale only, no overshoot, nothing looping, the final state at once under reduced motion.
- **Files.** New: `components/auth/AuthBrandPanel.jsx`, `components/auth/__tests__/AuthScreens.test.jsx`. Changed:
  `layouts/AuthLayout.jsx`, `components/auth/AuthScreen.jsx` (larger heading, `title` prop), `SignInPage`,
  `SignUpPage`, `ThisWeekPage`, `lib/weekActions.js`, `HeroSection`, `LandingPage`, `landing.css`, `index.css`
  (`--text-title`), `lib/cn.js`. No new dependency.
- **Checks.** `npm run lint` clean. `npm test`: server 389, client 597 (17 new: 8 auth screens, 4 hero, 3
  `joinedAfterWeek`, 2 This week). `vite build` OK. The new This week test fails against the old code (it showed
  "Your first week starts here.").
- **Looked at in headless Chromium** (real fonts, local API on an in-memory MongoDB — no Atlas or `MONGODB_URI`
  database was touched; the container's clock was Saturday 17 Oct 2026): `/signin`, `/signup`, a real
  `/invite/…` link and an expired `/reset/…` link at 1440, 1024 and 360, light and dark, with sign-up open and
  closed; the landing hero at 1440, 1024 and 360 open and closed; This week for an owner created that Saturday at
  1440 and 360, light and dark; the brand panel mid-animation (Mon–Tue, then Mon–Thu filled) and under reduced
  motion (all filled at once). No sideways scroll anywhere. Driven in the browser: the hero's "Sign in" → `/signin`;
  "Back to home" → `/`; wrong password → "That email and password don't match."; right password → This week with
  the new message.
- **Not verified:** the `Go to that week` link in a browser (it needs a later date; covered by a static-render test
  on a frozen Tuesday); Firefox and Safari; Windows font rendering; widths other than those listed; screen readers.

**Auth pages: owner decisions accepted (PR #27 review, 2026-10-17).** All three accepted as built; no code changed.
1. ~~**The brand panel's squares fill in on open**~~ *(replaced in round three by a light looping preview — see
   below)* — an owner-approved exception to design §8.4 (no page-load
   entrance): it plays once, it is subtle, and it is skipped under reduced motion. Recorded in design §8.4 and
   §8.5 (entry 32).
2. **`/signin` asks the bootstrap check (A1)** — the same check the landing page uses, only to show or hide "No
   team here yet? Create the owner account". Recorded in `frontend_architecture.md` §9.15.
3. **"Forgot your password?" stays a panel on the sign-in page** — no new route. Recorded in design §3.12.

**Owner: how to check by hand** (Windows; a local database only)
1. In a terminal at the repo root: `git fetch origin` then `git checkout claude/auth-pages`.
2. Run `npm --prefix server install` and `npm --prefix client install` (once for this branch).
3. Make sure `server/.env` points at a database you are happy to wipe. Run `npm run db:empty`.
4. Start the API: `npm --prefix server run dev`. In a second terminal start the app: `npm --prefix client run dev`.
5. In a private Chrome window open http://localhost:5173/. The hero's main button is **Create your account**, with
   the demo beside it; there is no "Already on a team?" line.
6. Click **Create your account**. Wide window (1440px or more): the form on the left under "← Back to home", a
   large "Create the owner account" heading and the line ending "Everyone else joins with an invite link from
   you."; on the right the WeeklyView panel, whose five squares fill in Mon → Fri once.
7. Click **← Back to home**: you are on the landing page. Go to http://localhost:5173/signin: under the form,
   "Forgot your password?" and "No team here yet? Create the owner account".
8. Press F12 → device toolbar (Ctrl+Shift+M) → Responsive → type **1024**, then **360**, reloading each time: at
   1024 the two halves remain; at 360 a slim bar (WeeklyView left, "← Back to home" right) sits above the form,
   nothing scrolls sideways.
9. Create the owner account. **If today is a Saturday or Sunday**, This week shows five "Not on the team" days
    and "Your first week starts Mon … You joined on Sat …". On a weekday it shows the usual "Your first week
    starts here." with **Post today's update**.
10. Dark mode (the app keeps its own setting, not Windows'): click your name at the bottom of the sidebar →
    **Appearance** → Dark. Then sign out (same menu → **Sign out**): the sign-in screen is dark on both halves,
    the squares cobalt. Switch back to Light the same way after signing in again if you prefer.
11. Still signed out, open http://localhost:5173/ (a new private window works too): under **See the live demo** (and "No account needed. Nothing is saved.") the line "Already on a
    team? **Sign in**" is underlined; click it and you reach the sign-in screen. `/signin` no longer offers
    "Create the owner account"; `/signup` says "This team is invite-only."
12. Stop the API (Ctrl+C), run `npm run db:sample`, start it again. Sign in at `/signin` as a sample person (the
    README lists them; password `weekly-view-dev`) and check This week looks as before.
13. Reduced motion: Windows Settings → Accessibility → Visual effects → **Animation effects off**; reload
    `/signin` at full width: the five squares are already filled. Turn animation effects back on.
14. Open http://localhost:5173/demo and pick a role: the demo's chooser and the app have no "Back to home".

### Auth pages, round two: balanced layout, hero copy, sign-up recovery (owner feedback on PR #27, 2026-10-17)
Same branch, `claude/auth-pages`. Recorded in `product_design_system.md` §3.12 (round-two block) and §8.5 entry 32,
`brand_design_strategy.md` §6.0 rule 13, `frontend_architecture.md` §9.15, `tech_stack.md` (dev reload),
`project_structure.md` and `docs/USER_MANUAL.md` §4 and §48.
1. **Hero copy.** Sign-up open: the two buttons only — "Set up your first week in minutes. No sign-up to explore the
   demo." is gone. Closed (and pending/failed): "No account needed. Nothing is saved." stays beside the demo pill;
   it reads as that pill's caption, and the "Already on a team? Sign in" line sits under it when closed.
2. **Form on the left everywhere.** Every auth route already shared one frame with the form on the left; it is now
   asserted by a test (form before panel, 55 / 45). The new response-lost state uses the same frame.
3. **Layout.** 55 / 45 split from 1024px. The form column (420px) is centred in its half both ways, with Back to
   home, heading, panel and links on one left edge — the fixed top offset and its dead band are gone. The brand
   panel is `--tint` with a faint `--hair` grid and one centred block: wordmark, a sample week in the app's style
   (a "This week" card with `SAMPLE DATA`, the strip in real Updates states — posted ×3, today, holiday — and the
   posted Wednesday as a day card with two typed work lines and hours), then the line. The squares still come in
   once (entry 32), each from a hollow outline. Phone layout unchanged.
4. **Sign-up "Couldn't reach the server", then "invite-only".**
   - **Root cause.** It isn't in our sign-up code. The API only listens after MongoDB connects (`server.js` awaits
     `connectDb()`), and the client sets no request timeout. What produces exactly this — the account saved, the
     answer lost, the server fine a moment later — is the API process being **restarted mid-request**. Reproduced here
     with `npm run dev` (`node --watch`) on an in-memory database: touching any loaded file during a sign-up gave
     "Connection reset by peer" / "Empty reply from server", and the next request was served by the new process.
     `node --watch` watched every loaded file, **including everything under `node_modules`**, and on Windows Node
     ends the old process outright. Locally the write is too quick to fall between the insert and the reply. On
     Atlas, the insert and the read that builds the reply are each a network round trip (~100–300 ms), so a restart in
     that window saves the account and loses the answer. That is the owner's sequence: "Couldn't reach the server",
     then `SIGNUP_CLOSED` → "invite-only", then sign-in works. What touched a file on the owner's machine can't be
     known from here: an `npm install` or editor still writing, or an antivirus scan, are the usual ones. It didn't
     recur after a clean restart. The first Atlas connection and index sync aren't the cause: listening waits for
     the connection, and index builds don't block requests.
   - **Fix in our code.** `npm run dev` is now `node --watch-path=src src/server.js`. Changes under `node_modules` no
     longer restart the API (checked: touching `node_modules/express/index.js` → no restart; `src/app.js` → restart).
     And `server.js` now closes gracefully on SIGTERM/SIGINT: it stops taking connections and lets requests in flight
     finish (10 s at most). Checked with the same timing test: an in-flight sign-up now completes (201) through a
     restart, and a request arriving during the gap is refused before anything is written. This also covers Render
     deploys. On Windows a `--watch` restart still ends the process abruptly, which is why the recovery below
     matters there.
   - **Recovery.** If Create account fails with no response, `/signup` keeps the email and re-checks A1. If sign-up
     is now closed — by that re-check, or by `SIGNUP_CLOSED` on a second press — it shows "Your account may
     already have been created. / Sign in with the email you just used." with `Sign in`, which opens `/signin`
     with the email filled in. Accept invite: a lost answer followed by `LINK_INVALID` shows the same block instead
     of "expired". Reset password says "Your new password may already have been saved." The choice of screen is
     `lib/authRecovery.js`, a pure function with tests; there is no DOM test environment and no new dependency.
- **Files.** New: `components/auth/ResponseLost.jsx`, `lib/authRecovery.js`, `lib/__tests__/authRecovery.test.js`.
  Changed: `AuthLayout`, `AuthBrandPanel`, `SignUpPage`, `SignInPage` (email default from router state),
  `AcceptInvitePage`, `ResetPasswordPage`, `HeroSection`, `server/src/server.js`, `server/package.json` (`dev`), the tests.
- **Checks.** `npm run lint` clean; `npm test`: server 389, client 610. **Looked at in headless Chromium**
  (in-memory MongoDB only, never Atlas): `/signin`, `/signup` open and closed, a real invite link and an expired
  reset link at **1440, 1280, 1024 and 360**, light and dark; the landing hero open and closed at the same widths.
  **The owner's failure, reproduced in the browser:** the sign-up request was let through to the API (the account
  was created) and its response dropped → "Your account may already have been created." → Sign in → the email
  was filled in → signed in to This week. The same on an invite link at 360px: first press "Couldn't reach the
  server.", second press → the same block.
- **Not verified:** a real Windows `node --watch` restart (it can't be run here); Atlas latency (simulated by
  dropping the response in the browser); Firefox and Safari; screen readers.

**Owner: how to check round two by hand** (Windows; a database you can wipe)
1. `git fetch origin`, `git checkout claude/auth-pages`, then `git pull`.
2. `npm --prefix server install` and `npm --prefix client install`.
3. `npm run db:empty`. Start `npm --prefix server run dev` and, in a second terminal, `npm --prefix client run dev`.
4. Open http://localhost:5173/ in a private Chrome window: **Create your account** and **See the live demo** side by
   side, and nothing written under them.
5. Click **Create your account** at full width (1440px or more): the form is in the middle of the left part, with
   "← Back to home", the heading, the box and the link lined up on one left edge. On the right, on a faint grid:
   WeeklyView, a small "This week" card marked SAMPLE DATA (Mon–Wed blue, Thu outlined, Fri dotted grey) with
   Wednesday's two lines, then "One short update a day." The squares come in once, Monday to Friday.
6. F12 → Ctrl+Shift+M → Responsive: try **1280**, **1024** and **360** (reload each time). The left part stays a
   little wider than the right down to 1024; at 360 the slim bar is on top and the form follows.
7. **The lost answer, by hand:** in DevTools open the **Network** tab. Fill in the sign-up form, then, the moment
   you click **Create account**, choose **Offline** in the throttling menu (next to "Disable cache"). If the click
   was quick enough the account is still created on the server. Switch back to **No throttling**. If the page
   shows "Your account may already have been created." click **Sign in**: your email is already filled in. (If it
   shows "Couldn't reach the server." with the form still there, nothing was saved — press Create account again.)
8. Sign in (or create the account normally). Sign out from the menu under your name.
9. Open http://localhost:5173/ again: under **See the live demo** ("No account needed. Nothing is saved.") is
   "Already on a team? **Sign in**". `/signup` says "This team is invite-only." with the same split layout.
10. Dark mode: your name → **Appearance** → Dark, then sign out: both halves dark, the grid faint.
11. `npm run db:sample`, restart the API, sign in as a sample person (password `weekly-view-dev`): This week as before.

### Auth pages, round three: form on the right, matched pair, looping preview (owner feedback on PR #27, 2026-10-17)
Same branch, `claude/auth-pages`. Recorded in `product_design_system.md` §3.12 (round-three block), §8.4 (the exception)
and §8.5 entry 32, `frontend_architecture.md` §9.15, `project_structure.md` and `docs/USER_MANUAL.md` §4.
1. **Sides swapped** on every auth screen: brand panel left, form right (reverses round two). The form stays first in
   the DOM, so keyboard focus, screen readers and the phone layout (slim header, form first) are unchanged.
2. **A matched pair.** Equal halves; each holds one 420px block centred in it, so the outer margins mirror. Both blocks
   sit on one grid with four shared rows (CSS subgrid): "Back to home" ↔ wordmark, the heading row, form panel ↔
   sample card (the card stretches to the panel's height), links ↔ caption. Measured in the browser: the two blocks'
   tops and bottoms are equal to the pixel at every size checked, and so are the two cards'. The sign-up-closed
   screen (one button) keeps its link under the button.
   **The clipping bug:** the old frame centred the form in a sticky full-height layout and dropped its bottom padding
   when the form was taller than the screen. Now the rows above and below the pair are at least 52px, so when content
   is taller than the screen (sign up at 1366×768 or 1280×800) the page scrolls normally with 52px kept above and
   below. Nothing scrolls sideways at any size.
3. **Looping preview** (replaces the one-time fill-in; design §8.5 entry 32). Every 3 s the chosen day's bar slides
   Mon → Tue → Wed → Thu and the day's lines cross-fade; on Thursday ("today, not posted yet") the square then fills
   and two posted lines rise into place; after 3.8 s it returns calmly to Monday. Friday stays a holiday. Cycle 15 s.
   It uses `opacity` and `transform`/`scale` transitions only, and every day's content is stacked in one cell, so
   nothing reflows. It runs on one `setTimeout` and stops on `visibilitychange` (tab hidden) and when an
   `IntersectionObserver` reports the panel out of view (it is hidden on phones). Under reduced motion it does not
   start, and the posted Thursday is shown. The card is `aria-hidden`; the caption is real text; nothing on the form
   side moves or takes focus. No new dependency. The card gains a footer: "Friday's weekly report" with a Draft chip.
- **Files.** New: `components/auth/previewSteps.js`. Changed: `AuthLayout`, `AuthBrandPanel`, `AuthScreen` (its three
  parts are now three elements; `compact`; `AuthPanel` fills its row from 1024px), `LinkExpired`, `ResponseLost`
  (fill their row), `SignUpPage` (`compact` on the closed state), the auth-screen tests.
- **Checks.** `npm run lint` clean. `npm test`: server 389, client 613. Tests added: the sides and the shared rows; the
  sample week's states; the loop's timeline (12–16 s, Mon→Thu, Thursday posted last); a source check that the panel
  transitions only opacity/transform/scale, sets one timer, and listens for `visibilitychange` and visibility.
  **Headless Chromium** (in-memory MongoDB only): sign in, sign up open and closed, a real invite link, an expired
  reset link and the response-lost screen at 1920×1080, 1440×900, 1366×768, 1280×800, 1280×768, 1024×768 and 360,
  light and dark; block edges measured (e.g. 1440×900 sign in: both blocks 188–712, both cards 319–618; margins 150 /
  150). **The loop, measured in the browser:** bar at 0 / 100 / 200 / 300 / 300% at 0.8 / 3.8 / 6.8 / 9.8 / 12.4 s,
  Thursday posted at 12.4 s, back to Monday at 15.8 s; no step during 7 s with the tab hidden, resumed when visible;
  **no loop timer** at 360px or under reduced motion (the only 3 s timers there are the boot splash's). A real
  bug found on the way: two transition classes on Thursday's square merged into one, dropping its fade; it now uses
  one `transition-[opacity,scale]`. The response-lost flows (sign-up and invite) were re-run and still work.
- **Not verified:** Firefox and Safari (subgrid needs Firefox 71+, Safari 16+, Chrome 117+); Windows font rendering;
  CPU use measured on a real laptop (by construction: one timer every 2–4 s, compositor-only changes); screen readers.

**Owner: how to check round three by hand** (Windows; a database you can wipe)
1. `git fetch origin`, `git checkout claude/auth-pages`, `git pull`.
2. `npm --prefix server install` and `npm --prefix client install`.
3. `npm run db:empty`; start `npm --prefix server run dev` and, in a second terminal, `npm --prefix client run dev`.
4. Open http://localhost:5173/signin in a private Chrome window, full screen. The WeeklyView panel with the grid is on
   the **left**, the form on the **right**. Check: "Back to home" and "WeeklyView" are on one line; the sample card
   and the sign-in box start and end at the same height; the caption and the links below start on one line; the gap
   from the sample card to the left edge equals the gap from the form to the right edge.
5. Watch the sample card for 15 seconds: the dark bar above the days moves Mon → Tue → Wed → Thu every few seconds
   and the lines change softly; on Thursday the outlined square fills and two lines appear; then it goes back to
   Monday. Nothing on the form side moves; click into Email while it runs — the cursor stays there.
6. Switch to another tab for a while and come back: it carries on from where it was (it paused).
7. F12 → Ctrl+Shift+M → Responsive. Try **1366 × 768**, **1280 × 800**, **1024 × 768**: nothing touches an edge; on
   `/signup` the page scrolls a little and the "Already have an account? Sign in" link is reachable with space below
   it. Try **360 × 780**: the slim bar, then the form; the sample card isn't shown.
8. Reduced motion: Windows Settings → Accessibility → Visual effects → Animation effects **off**; reload `/signin`:
   the card shows Thursday posted and never moves. Turn animation effects back on.
9. Create the owner account, sign out, and open `/signup`: "This team is invite-only." with **Open the demo** and the
   sign-in link right under it, beside the sample card.
10. Dark mode: sign in → your name → **Appearance** → Dark → sign out; check `/signin` again, both halves dark.
11. `npm run db:sample`, restart the API, sign in as a sample person (password `weekly-view-dev`): This week as before.

### Auth pages, round four: smooth entry, page-specific panel copy, grid motion, loop fixes (owner feedback on PR #27, 2026-10-17)
Same branch, `claude/auth-pages`. Recorded in `product_design_system.md` §3.12 (round-four block), §8.4 (the
exceptions) and §8.5 entries 32–34, `frontend_architecture.md` §9.15, `project_structure.md` and `docs/USER_MANUAL.md` §4.
1. **Loop bugs fixed.**
   - *Overlap:* each change of day is now three moves that never overlap: the old day fades out (0–160 ms), the
     bar slides (140–340 ms), then the new day fades in (240–420 ms).
   - *Two selected tabs:* the blue "today" underline is gone; the 2px ink bar is the only selection mark (today is
     still the hollow square).
   - *Stretched card:* the card keeps its natural height, its bottom level with the form panel's.
   - **Measured in the browser** (every animation frame for a full 16 s cycle, `/signup` at 1440×900, 961 frames):
     no frame with two days above 15% opacity (the second-most-visible day's highest opacity was 0.000), and no
     frame where the bar sat under a different day from the one shown. The first version had 14 such frames, at
     the start of each change; the timings above fixed them. I also looked at screenshots taken during the
     Mon→Tue and Thu→Mon changes.
2. **Smooth entry.** The View Transitions route was not taken. The landing page's links are full page loads on
   purpose: an earlier decision keeps the landing styles and font out of the app's session. That rules out a
   same-document view transition. A cross-document one would capture the app before React has drawn the screen.
   Instead, on arrival the brand panel fades in, and the two blocks rise 8 px with a fade (320 ms), the form 80 ms
   after the brand side. It is CSS only, works in every browser, and is off under reduced motion. Measured on
   arriving from the landing page's "Sign in": brand block first, form 80 ms later. "Back to home" is
   unchanged: it opens the landing page, which has its own entrance.
3. **Page-specific panel copy** (`panelIntros.js`). Under the wordmark:
   - sign in: "Welcome back. / Your week is where you left it."
   - create account: three numbered steps
   - sign-up closed, invite, reset, an expired link and a lost answer: a line each
   The page names its line through `AuthIntroContext`; an expired link or a lost answer overrides it. Any room
   left beside a taller form is shared above and below the line. Short screens (closed, expired, lost) keep
   heading, message and button together, top-aligned with the brand side. Before, the brand side's taller column
   opened gaps between them.
4. **Grid motion.** One oversized CSS layer drifts one 32 px cell down and right every 48 s, seamlessly. Measured:
   2.0 px in 3 s; frozen while the tab is hidden (`data-paused`); not displayed on phones; `animation: none` and
   0 px movement under reduced motion.
- **Files.** New: `components/auth/panelIntros.js`, `components/auth/authIntro.js`. Changed: `AuthLayout` (the intro
  channel, entrance classes), `AuthBrandPanel` (intro, grid layer, one `usePanelActive` for the loop and the grid,
  the loop's timings, no underline, natural-height card), `AuthScreen` (`intro`, the short layout), `LinkExpired`,
  `ResponseLost` (override the line), the four auth pages (name their line), `styles/base.css` (entrance and grid
  keyframes, reduced motion), the auth-screen tests.
- **Checks.** `npm run lint` clean. `npm test`: server 389, client 621; the landing isolation tests are green, and no
  landing file changed. **Headless Chromium** (in-memory MongoDB only):
  - `/signin` and `/signup` with sign-up open, and `/signup` with sign-up closed and a real invite link, at
    1920×1080, 1440×900, 1366×768, 1280×800, 1024×768 and 360×780, light and dark.
  - An expired reset link, and the recovery screen (reached by letting the sign-up request through and dropping
    its answer).
  - Every desktop view: both blocks share top and bottom edges; outer margins mirror; no sideways scroll.
  - The sign-up and invite recovery flows re-run: no update loop.
- **Not verified:** Firefox and Safari; real CPU use on a laptop; screen readers.

**Owner: how to check round four by hand** (Windows; a database you can wipe)
1. `git fetch origin`, `git checkout claude/auth-pages`, `git pull`; `npm --prefix server install`,
   `npm --prefix client install`.
2. `npm run db:empty`; start `npm --prefix server run dev` and, in a second terminal, `npm --prefix client run dev`.
3. Open http://localhost:5173/ (private window, full screen) and click **Create your account**: the panel fades in and
   the two sides rise into place, the left one just before the right.
4. On `/signup`, the left side shows "Three steps to your team's first week" with three numbered steps above the
   sample card. The card is not stretched: its bottom lines up with the bottom of the form box.
5. Watch the sample card through a day change (every 3 s): the old day disappears, the dark bar moves, then the new
   day appears — never two days on top of each other, and only one tab has the dark bar. On Thursday the outlined
   square fills and two lines appear; then it returns to Monday.
6. Look closely at the background grid on the left: it creeps very slowly down and to the right (one square takes
   48 s). Switch to another tab and back: it carries on.
7. Open `/signin`: "Welcome back. Your week is where you left it." under WeeklyView.
8. Create the owner account, sign out, open `/signup`: "This team is invite-only." with **Open the demo** and the
   sign-in link right under the heading; the left side says "This team is already set up."
9. Users → invite someone → open the link in a private window: the left side says "You've been invited to join the
   team." Open `/reset/abc`: "This link has expired…" on the right, "Links work once, for a limited time." on the left.
10. F12 → Ctrl+Shift+M → Responsive: **1366 × 768**, **1280 × 800**, **1024 × 768** — no edge touching, page scrolls if
    needed; **360 × 780** — slim bar, form first, no panel.
11. Reduced motion (Windows Settings → Accessibility → Visual effects → Animation effects off): reload `/signin` —
    no entrance, the grid and the card are still. Turn it back on.
12. Dark mode: sign in → your name → **Appearance** → Dark → sign out; check `/signin` again.
13. `npm run db:sample`, restart the API, sign in as a sample person (password `weekly-view-dev`): This week as before.

### Auth pages, round five: intro card, livelier grid (owner feedback on PR #27, 2026-10-17)
Same branch, `claude/auth-pages`. Recorded in `product_design_system.md` §3.12 (round-five block), §8.4 and §8.5
entry 34, and `docs/USER_MANUAL.md` §4.
1. **The panel's line on a card**, like the sample card: `--card`, hairline border, square corners, no shadow, the same
   width, 20 / 16 px padding. **Chosen for every screen**, the one-line intros too. In the screenshots, the one-liners on
   a card read as one set with the sign-up steps; bare text on the now-moving grid looked less finished. The two cards
   keep one 24 px gap on every screen (measured: 24 px at every size and screen checked). Any room a taller form leaves
   goes above the pair, beside the form's heading. Top and bottom edges still match the form's.
2. **A livelier grid.** The drift is now one square every 14 s (was 48 s); measured about 2.3 px/s. Eight cells of the
   drifting layer light to cobalt (`--acc`) in four turns, two at a time, each fading in and out over about 1.4 s. The
   peak is 12% in light and 28% in dark: at 12%, the dark theme's cobalt on its dark tint was almost invisible in the
   screenshots. The cells run on the layer's own CSS clock, so they move with the lines and are dark whenever the loop
   resets (they never jump). They are placed, once and on resize, only in cells whose whole drift stays clear of the
   brand block and away from the panel's edges, so none ever sits behind text or a card. Measured over 30 s in each
   theme: at most 2 lit at once; 0 lit at the loop's seam; 0 overlapping the brand block. CSS only, no per-frame
   JavaScript: one `ResizeObserver` places them. They pause with the panel (`[data-paused]`, checked: play-state paused
   when the tab is hidden). The panel isn't displayed on phones. Under reduced motion there is no animation and the cells
   stay at opacity 0. That needed one fix: the per-turn `animation-name` rules out-ranked the reduced-motion reset. The
   optional glow following the chosen day was left out to keep the grid calm.
   - At 1024 px the panel's side margins are narrower than two cells, so few or no cells qualify there; the drift
     still shows.
- **Checks.** `npm run lint` clean. `npm test`: server 389, client 624 (3 new: the intro card on every screen; the
  14 s drift and the eight cells in four turns; dark at the seam, the two peaks, `--acc`). **Headless Chromium**
  (in-memory MongoDB only):
  - `/signin` and `/signup` with sign-up open, and `/signup` with sign-up closed and a real invite link, at 1440×900,
    1366×768, 1024×768 and 360×780, light and dark.
  - An expired reset link, and the recovery screen: sign-up and invite flows re-run, both still work.
  - Every desktop view: edges match, cards 24 px apart, no sideways scroll. Text sits only on cards or on the plain
    tint, never over a lit cell, so its contrast is the same as before.
- **Not verified:** Firefox and Safari; real laptop CPU; screen readers.

**Owner: how to check round five by hand** (Windows; a database you can wipe)
1. `git fetch origin`, `git checkout claude/auth-pages`, `git pull`; `npm --prefix server install`,
   `npm --prefix client install`.
2. `npm run db:empty`; start `npm --prefix server run dev` and, in a second terminal, `npm --prefix client run dev`.
3. Open http://localhost:5173/signup full screen: "Three steps to your team's first week" is on a white card the same
   width as the "This week" card, with the same gap between the two cards as on `/signin` ("Welcome back." card).
4. Watch the left side for 15 seconds: the grid moves gently down and to the right (a square every 14 s), and here and
   there a square softly fills with light blue and fades — two at a time, never behind the text or the cards.
5. Switch to dark (sign in → your name → **Appearance** → Dark → sign out) and look again: the blue squares are visible
   but quiet; all text reads as clearly as before.
6. Create the owner account, sign out, open `/signup` (closed), then an invite link from **Users**: each shows its line
   on a card, 24 px above the sample card.
7. F12 → Ctrl+Shift+M → Responsive: **1366 × 768**, **1024 × 768** (the grid moves; few or no squares light at this
   width), **360 × 780** (no panel).
8. Reduced motion (Windows Settings → Accessibility → Visual effects → Animation effects off): reload `/signin` — the
   grid is still and no square lights. Turn it back on.
9. `npm run db:sample`, restart the API, sign in as a sample person (password `weekly-view-dev`): This week as before.

### Auth pages, round six: smooth landing transitions, staggered entrance (owner decision on PR #27, 2026-10-17)
Same branch, `claude/auth-pages`. **Owner decision:** the landing page and the auth screens move between each other
client-side, replacing "the landing page's links are full page loads". Recorded in `brand_design_strategy.md` §6.0
rule 14, `frontend_architecture.md` §4 and §9.16, `product_design_system.md` §8.4 and §8.5 entries 33 and 35,
`project_structure.md` and `docs/USER_MANUAL.md` §48.
1. **Client-side moves with a cross-fade.** Every landing link to `/signin` and `/signup` (hero, nav "Sign in" and
   pill, "Already on a team? Sign in", closing band, footer), "← Back to home" and the links between the auth screens
   are `TransitionLink`s: a click loads the target page's chunk, then navigates with React Router's `viewTransition`.
   The two auth chunks are also preloaded when the landing page is idle. The cross-fade (`base.css`) is 300 ms, old
   and new on one curve, the new page rising 6 px. Browser Back and Forward replay it. `/demo` stays a plain page
   load. The bootstrap result comes from the query cache, so the auth screen renders at once.
2. **Staggered entrance** (`.wv-stagger`). Brand side: wordmark, intro card, sample card, caption. Form side, 40 ms
   behind: back link, heading, line, panel, links. Each part rises 10 px with a fade, 50 ms apart, 380 ms each,
   `--ease-out`; done at about 600 ms. Inside a view transition the parts only rise: the cross-fade already fades
   them, and fading twice washed the middle frames out (found in the first frame capture). Opacity and transform
   only: the email field takes focus during the entrance.
3. **Isolation.** The landing chunk (with GSAP and Bricolage) still loads only for `/`. A direct `/signin` requests
   no landing file until "Back to home" is clicked, and the production build has GSAP and Bricolage in the
   `LandingPage` chunk only. Leaving `/`, `html.landing-active` and the font link are gone. Returning, the
   landing's motion is rebuilt from scratch. Without view transitions it fades in on its own (`l-page-in`).
4. **Tests.**
   - Landing tests render in a router now. They check that sign in and sign up are client-side links, that demo
     links stay plain, and that the link loads the page before navigating.
   - Auth tests check: the stagger order and timing; one cross-fade length and curve both ways; no animation
     under reduced motion; rise-only inside a transition; the entrance never touching `pointer-events`,
     `visibility` or `display`; home and the auth links being `TransitionLink`s.
   - **The requested computed-style test can't run in `npm test`:** the client tests have no DOM, and adding jsdom
     or a browser runner (e.g. `@playwright/test`) is a new dependency (see *Open questions*). The same check was
     run in Chromium, below.

**Checks.** `npm run lint` clean. `npm test`: server 389, client 631 (landing isolation green). Chromium, in-memory
MongoDB only, on the dev server and a production build:
- **Client-side only:** landing → sign up, Back to home, landing → sign in, browser Back, browser Forward, then a
  refresh: exactly two full page loads (the first visit and the refresh). No boot splash; 0 page errors.
- **Frames:** each transition was filmed with Chrome's screencast at 1440 and 360, light and dark (5 transitions × 4
  = 20 films, 24–54 frames each). No blank frame: the lowest frame contrast was 10–27, up from 5 before the
  rise-only fix. No flash in dark: the brightest frame in every dark film is the landing's own green, and the auth
  page arrives dark. Contact sheets looked at.
- **Timing (production build, this container):** the transition starts within 6–14 ms of the click. The dissolve
  begins 170–230 ms later: about 65 ms for the browser to capture the old page, plus 100–175 ms for React to
  swap the landing page in or out (auth → auth: 7 ms). This container has no GPU and a slow CPU, so real
  machines should be quicker; not measured on one.
- **Computed styles after landing → `/signin` client-side** (then `/signup`), light and dark: 0 elements with a
  landing colour, Bricolage or a border radius. Headings Chivo, body Instrument Sans.
- **Returning to `/`:** the scroll stories match a fresh load pixel for pixel (mean difference 0.00–0.01, at the
  week story's 4th step and the dashboard's 6th). The hero plays again. "Back to home" starts at the top; browser
  Back restores the scroll position.
- **Refresh on `/signin`:** a full load; the stagger plays (sampled per frame: all parts at 0, partly in by
  200 ms, all at 1 at the end).
- **Reduced motion:** the switch is one cut (no in-between frame); the stagger and the cross-fade are `none`.
- **Not verified:** Firefox and Safari (whether and how they run view transitions; the fallback is coded but
  only reasoned about); real-device timing; screen readers.

**Owner: how to check round six by hand** (Windows; a database you can wipe)
1. `git fetch origin`, `git checkout claude/auth-pages`, `git pull`; `npm --prefix server install`,
   `npm --prefix client install`.
2. `npm run db:empty`; start `npm --prefix server run dev` and, in a second terminal, `npm --prefix client run dev`.
3. Open http://localhost:5173/ in Chrome (private window). Click **Create your account**: the green page dissolves
   into the sign-up screen (about a third of a second), with no white flash and no loading screen; then the
   parts settle in, left side first.
4. Click **← Back to home**: the landing page dissolves back in, at the top, and its hero animation plays. Scroll
   down: the "Follow one person's week" and manager stories still hold and step as before.
5. Click **Sign in** in the top bar, then press the browser's **Back** and **Forward** buttons: each switch is the
   same dissolve.
6. On `/signin`, press **F5**: a normal reload, and the parts settle in one after another. Click into Email at once:
   you can type straight away.
7. Dark mode: sign in once, your name → **Appearance** → Dark, sign out, then repeat steps 3–5: no light flash.
8. F12 → Ctrl+Shift+M → **360** wide: repeat steps 3–4.
9. Reduced motion (Windows Settings → Accessibility → Visual effects → Animation effects off): repeat step 3 — the
   switch is instant and nothing settles in. Turn it back on.
10. Optional, in Firefox or Safari: steps 3–5 still work (with or without the dissolve), and nothing green appears
    on the sign-in screens.
11. `npm run db:sample`, restart the API, sign in as a sample person (password `weekly-view-dev`): This week as before.

### Owner request: guided demo tour (2026-10-17)
Not a stage; **C11 is still next.** Branch `claude/demo-tour` from `main`, pull request
[iamSahdoon/weekly-view#28](https://github.com/iamSahdoon/weekly-view/pull/28). Recorded as owner decisions in `requirments_doc.md`
§14.1, `product_design_system.md` §3.14 "Guided tour" and §8.5 (entries 36–37), `frontend_architecture.md` §9.18,
§11.3 and §11.6, `tech_stack.md` §6.9 and §10, `project_structure.md` (tree, §3.4) and `docs/USER_MANUAL.md` §49
(and the feature index). No server code, API, rule or error message changed; no dependency was added.

**The order, proposed before building** (as asked, then built as proposed):
one team's week as a story, each feature explained once, in the chapter of the lowest role that has it. Every
step names who it is for: **Everyone**, **Managers and admins** or **Admins only**.

1. **Admin — setting up the team** (Sanduni B., the owner). Opens with "Admins can do everything managers and
   members can. This part shows what only admins do." Users list → invite a person (the link shown once) →
   change a role → change an email → password-reset link → remove and re-invite → the owner's protections →
   pass ownership on → holidays.
2. **Member — the core of the product** (Imali J.). Opens with "Everyone posts daily updates, managers and admins
   included." This week → the week strip → other weeks → a work line (task, project, type, what was done, hours)
   → blockers → open to team comments → save without posting → post → edit a posted day → who's away → your own
   leave → Team updates → comment on a teammate's open day → edit or delete within 10 minutes → reply to a
   comment → what teammates see → the weekly report builds itself (task statuses) → achievements and notes →
   hours by task type → autosave → before you submit → ask for approval → submit → the filed week → day cards →
   resolve a blocker → overall comments → print → My reports and statuses → My projects → your numbers.
3. **Manager — reviewing and running the team** (Nadia F.). Opens with "Managers can do everything members can.
   Admins can do everything here too." Comment on anyone's update → open a teammate's day to the team → the
   review desk (with "Nobody reviews their own report…") → open Imali's report → read it → comment on the week →
   send back with a reason → next in review desk → the dashboard's four numbers → the team table and Updates
   squares → projects on the dashboard (Days / Hours) → charts → recent activity → People → a profile → leave
   history → set anyone's leave → Projects → create a project (plan, people) → extend a plan.
4. **Member — fixing a sent-back report** (Imali). The "new" marker → the Needs correction panel → fix and
   resubmit → versions.
5. **Manager — approving it** (Nadia). Approve → the status is Approved everywhere.
6. **Wrap-up, for everyone.** Account (name, password) → appearance → where to go next (Explore on your own, or
   Create your account on the real site).

The story week is **Imali's last week**: every day of it is posted, so it can be submitted on any day of the
week (the current week can only be submitted once Friday is posted). The tour turns it into a Draft when the member
chapter starts; Imali's submit really lands on Nadia's review desk, and so on. A step reached by a jump prepares the
state it needs through demo-store setup helpers.

**As built: 72 steps in six chapters** (* = waits for the visitor and offers **Do it for me**; 11 of them).
The first screen says "About 15 minutes" — computed from the steps (9 s to read one, 30 s to do an action
yourself), not a fixed number.

1. **Setting up the team** (Sanduni B., the owner): 1 Sanduni sets up the team · 2 Users · 3 Invite a person* · 4 Change a role · 5 Change an email · 6 Issue a password-reset link* · 7 Remove someone, and bring them back · 8 The owner is protected · 9 Pass ownership on · 10 Holidays
2. **A member’s week** (Imali J.): 11 Imali’s week · 12 This week · 13 The week strip · 14 Other weeks · 15 A work line · 16 Blockers · 17 Open to team comments · 18 Save without posting · 19 Post the update* · 20 Edit a posted day · 21 Who’s away · 22 Your own leave · 23 Team updates · 24 Comment on a teammate’s day* · 25 Edit or delete, for 10 minutes · 26 Reply to a comment* · 27 What teammates see · 28 The weekly report builds itself · 29 Achievements and notes · 30 Hours by task type · 31 Autosave · 32 Before you submit · 33 Ask for approval · 34 Submit* · 35 Submitted · 36 Day cards · 37 Resolve a blocker · 38 Overall comments · 39 Print a week · 40 My reports · 41 My projects · 42 Your numbers
3. **Reviewing and running the team** (Nadia F.): 43 Nadia runs the team · 44 Comment on anyone’s update* · 45 Open a teammate’s day · 46 The review desk · 47 Open Imali’s report* · 48 Reading a submitted report · 49 Comment on the week · 50 Send it back* · 51 Next in review desk · 52 The team dashboard · 53 The Updates squares · 54 Projects at a glance · 55 Charts · 56 Recent activity · 57 People · 58 A person’s profile · 59 Leave history · 60 Set anyone’s leave · 61 Projects · 62 Create a project · 63 Extend a plan
4. **Fixing a sent-back report** (Imali J.): 64 Back to Imali · 65 Needs correction · 66 Fix and resubmit* · 67 Versions
5. **Approving it** (Nadia F.): 68 Approve* · 69 Approved, everywhere
6. **For everyone** (Nadia F.): 70 Your account · 71 Light or dark · 72 Where to go next

**How it works** (`frontend_architecture.md` §11.6). An overlay layer, `client/src/demo/tour/`, which
`RootLayout` loads under `/demo` only by a dynamic import. For each step it runs the step's demo-store setup
helpers, becomes the step's person through the chooser's own sign-in, navigates, waits up to 6 s for the
`[data-tour]` target to appear (data loads first), scrolls it into view and draws a `--backdrop` dim with a
cutout, a 2px `--acc` outline and the tooltip. Action steps watch the store (or the screen) and move on once
the visitor has done it; **Do it for me** presses the real buttons and fills only what was left empty. Pages
gained inert `data-tour` attributes only. The jump panel is the **Tour** button in the demo bar (and **Jump to
a part** on the first screen). Design: `product_design_system.md` §3.14 "Guided tour".

**Feature coverage** (every entry of `docs/USER_MANUAL.md`'s feature index → its step → the label the
step shows). `demo/__tests__/demoTour.test.js` fails when an index entry has no step and no reason, when
a step names a feature the index doesn't have, or when a capability of `requirments_doc.md` §1 Roles has
no step in the chapter of its lowest role.

| Feature (manual index) | Step | Label |
| --- | --- | --- |
| Account page (name, password, theme, leave) | 70 Your account | Everyone |
| Activity list (recent activity) | 56 Recent activity | Managers and admins |
| Approve a report | 68 Approve | Managers and admins |
| Ask for approval | 33 Ask for approval | Everyone |
| Autosave (weekly form) | 31 Autosave | Everyone |
| Blockers (write) | 16 Blockers | Everyone |
| Blockers (resolve) | 37 Resolve a blocker | Everyone |
| "Both sides" (team member vs manager) | 27 What teammates see | Everyone |
| Carried-over tasks | 28 The weekly report builds itself | Everyone |
| Charts (tasks completed, hours by type, workload) | 55 Charts | Managers and admins |
| Comments on a day | 24 Comment on a teammate’s day | Everyone |
| Comments on the week (overall comments) | 38 Overall comments | Everyone |
| Compliance | 52 The team dashboard | Managers and admins |
| Confirm before ending leave | 22 Your own leave | Everyone |
| Dark theme | 71 Light or dark | Everyone |
| Day cards | 36 Day cards | Everyone |
| Demo (three perspectives) | 72 Where to go next | Everyone |
| Guided tour (demo) | 72 Where to go next | Everyone |
| Drafts (unposted text kept until sign-out) | 18 Save without posting | Everyone |
| Edit email (admin) | 5 Change an email | Admins only |
| Edit / delete a comment (10 minutes) | 25 Edit or delete, for 10 minutes | Everyone |
| Error toast with Retry | — not in the tour: The demo’s saves don’t fail, and the tour won’t fake a failure. | — |
| Extend plan | 63 Extend a plan | Managers and admins |
| Holidays (manage) | 10 Holidays | Admins only |
| Holiday week | 40 My reports | Everyone |
| Hours | 15 A work line | Everyone |
| Hours by task type | 30 Hours by task type | Everyone |
| Invite a person | 3 Invite a person | Admins only |
| Landing page | — not in the tour: It is outside the demo: the page the visitor came from, with its own look. | — |
| Leave (turn on/off) | 22 Your own leave | Everyone |
| Leave history | 59 Leave history | Managers and admins |
| Make owner | 9 Pass ownership on | Admins only |
| My projects | 41 My projects | Everyone |
| My reports (history) | 40 My reports | Everyone |
| "New" markers | 64 Back to Imali | Everyone |
| Next in review desk | 51 Next in review desk | Managers and admins |
| Not started | 40 My reports | Everyone |
| Offline strip | — not in the tour: The demo never goes over the network, so it can’t lose the connection. | — |
| On leave (week state) | 40 My reports | Everyone |
| Open to team comments | 17 Open to team comments | Everyone |
| Password change | 70 Your account | Everyone |
| Password reset link (admin) | 6 Issue a password-reset link | Admins only |
| People list and profiles | 57 People | Managers and admins |
| Planned hours / working days | 62 Create a project | Managers and admins |
| Post a daily update | 19 Post the update | Everyone |
| Print a report | 39 Print a week | Everyone |
| Privacy rules | 27 What teammates see | Everyone |
| Projects | 61 Projects | Managers and admins |
| Remove a person / re-invite | 7 Remove someone, and bring them back | Admins only |
| Report statuses | 35 Submitted; 40 My reports | Everyone |
| Review desk | 46 The review desk | Managers and admins |
| Roles | 4 Change a role | Admins only |
| Send back | 50 Send it back | Managers and admins |
| Session expiry sign-in window | — not in the tour: The demo has no sessions to expire. | — |
| Sign up (first account only) | — not in the tour: Accounts aren’t part of the demo; the last step links to the real site. | — |
| "Starting up" screen | — not in the tour: It appears only while the real server wakes up; the demo has no server. | — |
| Stale version banner | — not in the tour: It needs two people acting on one report at the same moment. | — |
| Submit / Resubmit | 34 Submit; 66 Fix and resubmit | Everyone |
| Submit checklist ("Before you submit") | 32 Before you submit | Everyone |
| Task types (7 colours) | 15 A work line | Everyone |
| Team dashboard | 52 The team dashboard | Managers and admins |
| Team updates | 23 Team updates | Everyone |
| This week | 12 This week | Everyone |
| Updates squares and legend | 53 The Updates squares | Managers and admins |
| Users (manage) | 2 Users | Admins only |
| Versions (revisions) | 67 Versions | Everyone |
| Week picker | 14 Other weeks | Everyone |
| Week strip (Mon–Fri) | 13 The week strip | Everyone |
| Weekly report form | 28 The weekly report builds itself | Everyone |
| Your numbers | 42 Your numbers | Everyone |

The role capabilities of `requirments_doc.md` §1 map the same way (`CAPABILITIES` in `tourSteps.js`):
member — 15, 16, 19 (post); 23, 24 (read, comment on an open day); 28, 33, 34 (build, ask, submit); 40
(history); 26, 38, 65 (reply on updates and the week); 41 (project progress); 21, 22 (who is away, own
leave). Manager — 44, 49 (comment on anyone's update and week); 48 (read submitted reports); 46, 50, 68
(review, send back, approve); 45 (open a teammate's day); 52, 58 (dashboard, profiles); 62, 63 (projects,
plans, people); 60 (anyone's leave). Admin — 3 invite, 7 remove, 4 roles, 5 email, 6 reset link, 10 holidays.

**Owner decisions, accepted as built** *(PR #28 review, 2026-10-18)*. Stated the same way in
`requirments_doc.md` §14.1, `frontend_architecture.md` §11.6 and `product_design_system.md` §3.14 "Guided
tour"; the first also in `tech_stack.md` §10. No code changed for them.
1. **No library.** The tour is built on what is already in the stack; no dependency was added
   (`tech_stack.md` §10).
2. **The Tour button lives in the demo bar** (an icon only on phones), not floating over the page.
3. **The story week replaces Imali's sample history.** The tour turns Imali's last week back into a Draft,
   replacing its sample sent-back history, and the visitor recreates that history themselves.
4. **A refresh ends the tour**, and the demo data resets too. Within a page's life, Exit or Esc keeps
   **Resume at step N**, and **Switch** pauses the tour.
5. **"Overall comment"** means the managers' comments on a submitted week (`requirments_doc.md` §4, "Overall
   comments on the week"), not a field on the weekly form; the tour covers it as week comments (step 38 for
   Imali, step 49 for Nadia).

**Still to confirm or change** (smaller and reversible; not part of the PR #28 review):
1. **Moving through the tour prepares each step's data.** Going **Back** from "Edit a posted day" to "Post the
   update" takes the posted day off again, and a jump can reset the story week; the step needs that state.
2. **The dim doesn't block the page.** The visitor can use the highlighted element and anything else; if a
   step's target goes away, the card says "This part of the screen has closed." with **Show it again**.
3. **Seven features are left out**, each because it can't happen honestly in a browser-only demo: the landing
   page, sign-up, the session-expiry window, the "Starting up" screen, the offline strip, the error toast with
   Retry, the stale-version banner (`NOT_IN_TOUR`).
4. **The first screen's lead line** is now "Take the guided tour, or look around on your own."; the original
   line sits under "Explore on your own" with the three choices, unchanged.

**Checks.** `npm run lint` clean; Prettier clean on every changed file. `npm test`: server 389, client 670
(39 new: 38 in `demoTour.test.js`, 1 in `demoEntry.test.jsx`, which now counts the role picker's three buttons
inside its list). `demoCoverage.test.js` green and unchanged: the tour adds no endpoint. `vite build` OK.
**Bundle split** (production build, measured): the main bundle grew from 936.05 to 937.30 kB (gzip 301.65 →
302.12: the `data-tour` attributes, the demo bar's button and the loader); it contains no tour code — only the
DOM event's name and the dynamic-import stub. The landing chunk is the same size as on `main` (192.83 kB) and
holds no tour code. The tour is two chunks, `TourLayer` (21.2 kB) and `tourSteps` (32.8 kB, shared with the
chooser). In `vite preview`, `/` and `/signin` request none of the demo or tour chunks; `/demo` requests them.

**Looked at in headless Chromium** (the in-memory demo only — no database, no Atlas, no `MONGODB_URI`; the
container's date was Saturday 17 Oct 2026, and Monday and Wednesday were simulated with a fake clock):
- The whole tour, pressing **Do it for me** on every action step, with a screenshot of every step and every
  action's outcome: 1440×900 light and dark, 360×780 light and dark (dev server), 1440 light on the production
  build, 360 light on a Monday. 72 of 72 steps found their target with the outline drawn, none fell back to
  "didn't appear", every action finished. I looked at every picture of the final 1440 light and 360 dark runs,
  every picture of an earlier 360 light run, and a selection of the 1440 dark and Monday runs. After the last
  two touches (Day cards now outlines one card, not the whole column; the last step's buttons align right),
  those two steps were re-checked by jumping to them at 1440 and 360.
- The whole tour pressing only **Next** (a Wednesday, 1440): the setup helpers carried the story — the report
  was submitted, sent back, resubmitted and approved without the visitor doing it.
- Jumps from the panel, at 1440 light and 360 dark: from the first screen's **Jump to a part** into **Send it
  back** (as Nadia; Do it for me → "Next in review desk"); from the demo bar's **Tour** into **Fix and
  resubmit** (as Imali → "Versions"), **Approve** (→ "Approved, everywhere"), **Post the update** (→ "Edit a
  posted day") and **Invite a person** (→ "The link is shown once").
- Keyboard: → and ← move steps; Tab from the card's last button focuses the highlighted element; the first
  Esc closes the invite dialog and leaves the tour, the second ends it and focus goes to **Tour**; the panel
  then offers **Resume at step 4**, which resumes; the card takes focus with `aria-labelledby` and
  `aria-describedby` set; **Switch** pauses the tour; a refresh at `/demo/team` returns to the first screen
  with no tour.
- Reduced motion: the page jumps to each target instead of scrolling smoothly, and the card's fade is cut to
  1 ms. Normal motion: the card fades in over 120 ms; nothing travels between steps.
- Found and fixed while looking: the "edit a day" helper took back the day just posted; the tooltip covered the
  composer and the review panel the visitor had to use (the page now scrolls the target up to make room, and
  action steps highlight the whole work area); a tooltip beside a ⋯ menu covered the opened menu; after **Do it
  for me** the outline stayed on the button behind a dialog; on a phone the Tour button squeezed the name in
  the demo bar, and a top sheet covered the demo bar.

**Not verified:** Firefox and Safari; real phones and touch (the phone layout was checked at 360px in
desktop Chromium); screen readers (the dialog's labels, focus moves and the live region were checked in the
DOM, not heard); Windows font rendering; widths other than 1440 and 360; the hosted Vercel build. The
console's one error in every run is `/favicon.ico` 404, which `main` has too.

**Owner: how to check by hand** (Windows; nothing needs the database)
1. In a terminal at the repo root: `git fetch origin`, then `git checkout claude/demo-tour`.
2. `npm --prefix client install`, then `npm --prefix client run dev`. (No API is needed for the demo.)
3. In Chrome open http://localhost:5173/demo. The first screen offers **Take the guided tour** ("About 15
   minutes, or jump to any part") above **Explore on your own** and the three choices, unchanged.
4. Click **Take the guided tour**. You are Sanduni on Users; a card points at "Demo · you're Sanduni B.,
   Admin" and says "Admins can do everything managers and members can…". Press **Next** through the admin
   part; on **Invite a person** press **Do it for me**: the invite window opens, fills in and shows the link,
   and the card now points at it ("The link is shown once").
5. Keep going into Imali's part. On **Post the update**, fill in the line yourself (task, type, what you did,
   hours) and press **Post update**: the card says "Done. …" and waits for **Next** *(changed on the PR #28
   feedback, below)*.
6. On **Submit**, press **Do it for me**: every task gets a status, Ask for approval is ticked, the report is
   submitted and the card shows "Handed in", pointing at the Submitted status.
7. In Nadia's part, **The review desk** shows Imali's report waiting. On **Send it back**, write a reason of
   10+ characters, press **Send back** and confirm.
8. In "Back to Imali", **Fix and resubmit**, then (as Nadia) **Approve**; the next card shows Imali's row
   Approved on the dashboard.
9. Click **Tour** in the dark demo bar: the panel lists every step under **Everyone**, **Managers and
   admins** and **Admins only**. Choose **Send it back**: you become Nadia on Imali's submitted report.
   Open the panel again and choose **Fix and resubmit**: you become Imali on the sent-back form.
10. Press **Esc** (twice if a window of the app is open): the tour ends and focus is on **Tour**. Open the panel:
    **Resume at step N** takes you back.
11. Press F12 → Ctrl+Shift+M → Responsive → **360** wide, reload, start the tour: the card is a sheet at the
    bottom (or under the demo bar when the highlighted part is at the bottom) and never covers the outlined
    part; the panel fills the screen; the demo bar still reads "Sanduni B." with a small route icon for Tour.
12. Dark: choose a perspective, your name → **Appearance** → Dark, then press **Tour** → **Start again**.
13. Reduced motion (Windows Settings → Accessibility → Visual effects → Animation effects off): reload and
    start the tour — the page jumps to each part instead of scrolling. Turn animation effects back on.
14. Optional: `npm --prefix client run build` then `npm --prefix client run preview`; open
    http://localhost:4173/ and F12 → Network → JS: no `TourLayer` or `tourSteps` file loads until you open
    `/demo`.

### Owner feedback on PR #28: "Do it for me" shows the result and waits (2026-10-18)
Same branch and pull request ([iamSahdoon/weekly-view#28](https://github.com/iamSahdoon/weekly-view/pull/28)).
Before, **Do it for me** did the action at once and the tour jumped to the next step, so the visitor never saw
what happened. Now, on all 11 action steps:
1. **It works visibly.** The fields are filled one after another — text typed quickly (about 0.65 s a field),
   a choice, a tick or a press after a 300 ms pause — then the real button is pressed. The outline moves to the
   part being changed (the invite window, the ⋯ menu then the reset window, the Tasks section then the action
   bar, the notes, the confirm window).
2. **It stays on the step.** Once the action has saved and the screen shows it (nothing fetching or saving, the
   result on screen), the card fades in again with a short title and a "Done. …" sentence, and the outline
   moves to the result.
3. **It waits for Next.** Nothing moves the tour but Back, Next, a jump or Exit — the same when the visitor
   does the action by hand.
4. **While it runs**, Back, Next and Do it for me are disabled and ← → do nothing; Exit still works and stops it
   at once. A second press (even two in the same moment) does nothing.
5. **Reduced motion:** everything is filled at once, with no typing and no pauses; then the same "Done." card.

| Step | Done card | Outline moves to | Robot (1440 / 360) |
| --- | --- | --- | --- |
| 3 Invite a person | The link is shown once — "Done. The invite link is ready, and this is the only time it's shown…" | the link | 2.2–2.5 s |
| 6 Issue a password-reset link | A one-time reset link — "Done. Ruwan's reset link is ready…" | the link | 2.2–2.7 s |
| 19 Post the update | Posted — "Done. Imali's Friday update is posted, and its square on the strip is now filled." (the day is named) | that day's square on the strip | 2.0–2.1 s |
| 24 Comment on a teammate's day | Comment posted — "Done. Imali's comment is under Ayesha's update…" | Ayesha's comments | 1.8–1.9 s |
| 26 Reply to a comment | Reply posted — "Done. Imali's reply sits under Nadia's question…" | that day's comments | 1.8–1.9 s |
| 34 Submit | Handed in — "Done. Imali's report is submitted: its status now reads Submitted…" | the Status block | 2.6–2.7 s |
| 44 Comment on anyone's update | Comment posted — "Done. Nadia's comment is under Ruwan's update…" | Ruwan's comments | 1.8–1.9 s |
| 47 Open Imali's report | Imali's report is open — "Done. The whole week is here to read…" | the report's heading | 0.5–1.0 s |
| 50 Send it back | Sent back — "Done. Imali's report is sent back. The panel says so…" | the panel ("Sent back by Nadia F.") | 1.8–1.9 s |
| 66 Fix and resubmit | Resubmitted — "Done. Imali's report reads Submitted again, as a new version…" | the Status block | 2.4–2.6 s |
| 68 Approve | Approved — "Done. Imali's report is approved: its status now reads Approved." | the Status block | 0.5–0.6 s |

Robot times are from the press to the save, measured in headless Chromium; the "Done." card follows 0.1–0.8 s
later, once the screen has caught up. With reduced motion: 0.25–1.2 s.

**What changed in the code.** `demo/tour/tourState.js` (new; `project_structure.md` updated): the tour's
reducer, pure and tested, with an action's `outcome` (`null` → `doing` → `done`); only Back, Next, a jump and
Exit move the tour. `tourRobot.js`: `createRobot({ alive, reduced, onArea })` — typing, pauses, `area()`,
reduced motion, and a stop the moment the step is left. `tourSteps.js`: every action has a `done` (title, a
"Done." body, the result's target) and names the areas it changes; "Submitted"'s body no longer repeats the
Submit card. `TourLayer.jsx` and `TourTooltip.jsx`: the done state, the held controls, the outline following
the robot, and a scrolled target's outline clipped below the sticky bars (`clipBelow` in `tourPlacement.js`).
Three inert targets added: `strip-day` (each square of the week strip, with `data-tour-id` = the weekday),
`review-heading` and `review-status` on the review page. No server code, API, dependency or page logic changed.

**Found and fixed while looking:** the router's `navigate` changes with every pathname, and the step's effect
depended on it, so a page that moved on by itself (a submitted report opening its week) restarted the step and
navigated back — it is now read from a ref; for a frame after the action the outline jumped back to the Invite
button; while Submit worked down the Tasks section the outline was drawn across the demo bar and the top bar;
during a page change (Submit, Resubmit, Open report) the outline briefly had nothing to show — it now falls back
to the result; on the heavy weekly form typing ran slow (Resubmit took 3.5 s), so a key press now catches up;
Exit stopped the robot one render late (three more characters typed) — it now stops in the same tick.

**Docs.** `product_design_system.md` §3.14 "Guided tour" (a new "An action step" entry; the highlight's clip;
accessibility; the note under motion entries 36–37), `frontend_architecture.md` §11.6 (the robot, the new
state row, "Running a step"), `docs/USER_MANUAL.md` "The guided tour" (Controls), `requirments_doc.md` §14.1
(one sentence: the step says what changed and waits for Next — the owner's rule, so the requirement and the
build agree) and `project_structure.md` (the tree).

**Checks.** `npm run lint` clean; Prettier clean on every changed client file. `npm test`: server 389, client
677 (7 new in `demoTour.test.js`: every action step has a "Done." card and a result target; the step stays
after Do it for me and after the visitor's own action, until Next; Back, Next and a second press are held while
it runs, Exit is not; a step that was left can't report; nothing in the layer moves the tour but Back and Next;
the outline clip). `demoCoverage.test.js` green and unchanged. `vite build` OK: the main bundle is unchanged
(937.30 kB) and holds no robot code; the landing chunk is unchanged (192.83 kB); `TourLayer` is 23.1 kB (was
21.2), `tourSteps` 35.2 kB (was 32.8).

**Looked at in headless Chromium** (in-memory demo only — no database, no Atlas, no `MONGODB_URI`; Saturday
18 Oct 2026). The whole tour, pressing **Do it for me** on every action step and Next elsewhere, at 1440×900
light and dark and 360×780 light and dark, with a picture of each action step before, during and done. For all
44 (11 steps × 4): Back, Next and Do it for me disabled 120 ms after the press, Exit enabled, the "Doing it
now" line shown; the card turned to "Done. …"; the outline sat on the result (matched to the element); three
seconds later the step, the message and an enabled Next were all still there. I looked at every done picture
in all four runs, and the during pictures at 1440 light. The same tour under reduced motion at 1440 light and
360 dark: one input event per text field (no typing), the same done cards, no auto-advance. By hand, at 1440
light: the invite, a comment, opening Imali's report and Approve each show their done card and wait; ← → while
the robot runs leave the step where it is; Exit during **Send it back** closes the tour with the reason
half-typed and nothing sent (still Submitted). Two presses of Do it for me in the same moment made one invite.

**Not verified:** Firefox and Safari; real phones and touch; screen readers (the focus move to the done card
and the live region were checked in the DOM, not heard); Windows font rendering; widths other than 1440 and
360; the hosted Vercel build. The double-press check ran on the invite at 1440 only. The console's one error is
still `/favicon.ico` 404, which `main` has too.

**Owner: how to check "Do it for me"** (Windows; nothing needs the database)
1. In a terminal at the repo root: `git fetch origin`, `git checkout claude/demo-tour`, `git pull`.
2. `npm --prefix client install`, then `npm --prefix client run dev`.
3. In Chrome open http://localhost:5173/demo, click **Take the guided tour**, and press **Next** to step 3,
   **Invite a person**.
4. Press **Do it for me** and watch: the invite window opens with a blue outline, the email is typed in, then
   **Create invite link** is pressed. While it works, **Back**, **Do it for me** and **Next** are greyed out and
   the card says "Doing it now. Watch the outlined part."; **Exit** stays usable.
5. The card turns to **The link is shown once** — "Done. The invite link is ready…" — with the outline on the
   link. Wait: it does not move on. Press **Next**.
6. Click **Tour** in the demo bar → **Post the update**. Press **Do it for me**: the task, type, what you did
   and hours fill in one after another, then **Post update**. The card says "Done. Imali's … update is posted,
   and its square on the strip is now filled.", and the outline is on that day's square, now solid blue.
7. Press **Back**, then **Next** to return to **Post the update**, and this time fill the line in yourself and
   press **Post update**: the same "Done." card appears and waits for **Next**.
8. **Tour** → **Submit** → **Do it for me**: the outline goes to the Tasks section while each status is chosen,
   then to the bar at the bottom while **Ask for approval** is ticked and **Submit** pressed; the week page
   opens and the card says **Handed in**, outlining the Submitted status.
9. **Tour** → **Send it back** → **Do it for me**, and press **Exit** straight away, while the reason is being
   typed (it takes under a second): the tour closes, the reason stays half-typed, and nothing is sent back.
10. Phone width: F12 → Ctrl+Shift+M → Responsive → **360** wide, reload, start the tour and repeat step 4: the
    card is a sheet that stays clear of the outlined result.
11. Dark: choose a perspective, your name → **Appearance** → Dark, then **Tour** → **Approve** → **Do it for
    me**: the card says "Done. Imali's report is approved…", outlining the green Approved status.
12. Reduced motion (Windows Settings → Accessibility → Visual effects → Animation effects off): reload, **Tour**
    → **Post the update** → **Do it for me**: everything appears at once, no typing; then the same "Done."
    card, waiting for **Next**. Turn animation effects back on.

### Your next steps
1. Run the checks just above, then review and merge
   [iamSahdoon/weekly-view#28](https://github.com/iamSahdoon/weekly-view/pull/28) (from `claude/demo-tour` into
   `main`). The five decisions are accepted (PR #28 review, 2026-10-18); say if any of the four still to confirm
   should change.
2. Next session prompt, unchanged by this work: "Read `CLAUDE.md` and `PROGRESS.md`, then do stage C11
   (verification, deployment, README) from `MASTER_PROMPT.md`."

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
- S2, **owner decision (2026-10-03):** only the owner may invite someone at role `admin`
  (U3), matching U5. A non-owner admin gets `403 OWNER_ONLY`, checked before anything else
  in the invite, for a new address and for re-inviting a removed one. Noted in
  `api_specification.md` U3.
- S2, **owner decision (2026-10-03):** removing a person also ends any open leave period,
  in the same write that closes their work period (`to: now` on both). Noted in
  `database_schema.md` §3.3.

- S3, **owner decision (2026-10-04):** project progress counts "today" as the **server's
  UTC calendar date** (`calendarService.todayUtc`); P1 takes no date from the client, and
  no API change is made. `api_specification.md` I2 (the client's clock defines today)
  governs weeks the client sends, not P1. A team east of UTC sees the day's count move at
  00:00 UTC (05:30 in Colombo), not at local midnight.
- S3, **owner decision (2026-10-04):** a person's expected days are the working days on
  which a work period covers them, minus leave (`database_schema.md` §0.2): someone who
  joins on a Wednesday is expected Wednesday to Friday. `database_schema.md` §5.0 step 2
  was reworded to match §0.2, with a note naming the decision.
- S3: `calendarService` is mostly pure functions over a holiday set
  (`countWorkingDays`, `workingDaysIn`, `isOnTeamForWeek`, `expectedDaysOf`, `weekStateOf`,
  `planDaysUsed`); `holidaySet`, `workingDaysOfWeek` and `holidaysForPlans` are the only
  reads. P1 reads holidays once for every plan on the page.
- S3: `progress` is `null` for a project with no plan — on every manager item, and on a
  member's assigned projects. A member's unassigned projects carry no `progress` key at all.
- S3: `memberIds` (sorted by `_id`) and `memberCount` count invited and active people whose
  `projects` hold the project; removed people are not members. P3's `memberIds` replaces
  membership among invited and active people and leaves a removed person's record alone.
  P2/P3 `memberIds` naming an unknown or removed person → `422` `fields.memberIds`.
- S3: limits the spec doesn't give: project name 1–100, description ≤ 200, `memberIds` ≤ 500.
  `plannedHours` may be omitted on P2 and P4 and is then `null`. An empty P3 or HD3 body →
  `422`. P3, P4 and P5 work on inactive projects (the spec doesn't forbid it).
- S3: P4 appends the replaced plan to `planHistory` and sets the new one in **one**
  update-pipeline write, so two concurrent extensions can't record the same plan twice.
  A first plan adds no history entry. `changedAt` is the API server's clock.
- S3: P1 `usedInWeek` ignores `status` (it is its own selection); `mine` combines with
  either. Query booleans (`mine`, `includeDone`) accept exactly `true` / `false`.
- S3: HD1 requires both `from` and `to`; "at most one year apart" means `to` ≤ `from` plus
  one calendar year. HD4 answers 200 with the deleted holiday's item.
- S3: T1 sorts by name (case-insensitive). `hoursTotal` / `lastWeekKey` come from the
  actor's own lines in reports of every status.
- S3: shared Zod fields are exported from the validator that owns them: `objectId` from
  `userValidator.js`, `calendarDate` / `weekdayDate` from `holidayValidator.js`,
  `booleanQuery` from `projectValidator.js`.
- S3: CLAUDE.md's "Name the stage" rule now says every session works on
  `claude/<stage-id>-<short-stage-name>`, created from `main` (owner's instruction).

- S4: **`dayStates` on the server's clock.** I2 makes the client's clock the judge of
  "today", but R3, R4 and U8 take no date. An unposted expected day is `future` when its
  date is after the UTC date of now + 14 h (exactly what R5 refuses), `today` from the
  server's UTC date up to that bound, and `missing` before it — so for some hours of each
  day two days can read `today`, erring towards allowing (O4). The client should still
  judge today with its own clock. Reversible.
- S4: R5's `WEEK_OUT_OF_RANGE` is a week after the week of now + 14 h, or a week no work
  period covers (`calendarService.isOnTeamForWeek`, §5.0 stage 1).
- S4, **owner decision (2026-10-04):** `DAY_NOT_EXPECTED` has a fourth `reason`,
  `not_on_team`, for a day of the join week before the person joined. Added to
  `api_specification.md` §1.9 with a note naming the decision. `dayStates` uses the same
  value, which §1.10 already lists. `frontend_architecture.md`'s wording table names only
  `future` · `holiday` · `leave`; C4 adds a line for it.
- S4: a holiday takes precedence over leave and over `not_on_team`, in R5's `reason`,
  `dayStates` and R12's `state` (`calendarService.dayAvailability`).
- S4: R3 / U8 on a week outside the person's work periods with no report → `state:
  "not_started"` (`weekStateOf` alone would say `on_leave`, since nothing is expected).
- S4: R5 accepts a task id that is the actor's and open — **or already named in this
  week's lines**, so re-saving a day of a week sent back after the task was marked done
  doesn't 404. A `newTask` on an unknown project → `404 PROJECT_NOT_FOUND` (§2.5 names only
  `PROJECT_INACTIVE`). An existing task on a since-deactivated project stays usable.
- S4: R5 keeps a line or blocker `_id` only if that day already has it; any other `_id` is
  replaced by a fresh one. A kept blocker keeps its `isKey`; new blockers start unflagged.
  `openToTeam` is required (the body is "the whole day"). Hours have no upper bound.
- S4: R5's write is **one pipeline update** conditioned on the open status: replace or
  append the day (comments and `postedAt` kept, `editedAt` set on an edit), sync
  `content.tasks` (listed tasks keep their order, status and note; new ones append in order
  of first appearance), prune orphaned resolutions. So two days saved at once can't lose
  each other's tasks. If it matches nothing, the tasks it just created are deleted and the
  answer is 409.
- S4: R6 is a partial update: each field given replaces that field; `tasks` entries merge
  `status` and/or `note` into rows already listed (a status can't be cleared back to null).
  **Empty `nextWeek` strings and empty-text achievements are not stored** — the API allows
  0–500 characters, but `contentSchema` requires achievement text and a revision copy would
  fail; the form keeps its own empty rows (a refetch never resets it). An unknown
  `keyBlockerId` → `422` `fields.keyBlockerId`, like an unknown task id.
- S4: R7's atomic claim is also conditioned on "no task without a status", so a day saved
  between the rule check and the claim (adding a task) can't slip into a revision; a
  missed claim re-runs the rules (422) or answers 409. `doneAt` is set to now on `done`
  tasks that had none and cleared on the others.
- S4, **owner decision (2026-10-04):** `submitBlockers` copy is one line per missing day
  ("Thursday has no update.", the spec's), then "One task has no status." / "N tasks have
  no status." — kept as written. `canSubmit` and `submitBlockers` are `null`
  for anyone but the author; for the author, `submitBlockers` is `[]` once the week is
  frozen.
- S4: the WeekView's `tasks` rows follow the **live** lines; `status` and `note` come from
  the served content (the sent-back revision for a manager on Needs correction), `null`
  where withheld or absent. `contentRevisionNumber` is `null` unless the revision is served.
- S4: `isNew` is `false` on every row and thread until S5's `markerService` decorates them.
  R13 writes seen marks now (in `markerService` / `markerController`, as the tree places
  it; the route is declared in `reportRoutes.js`). Day threads carry `revisionNumber: null`
  and `kind: null`; week threads default to `kind: "comment"`.
- S4: `canOpenWeek` is true for any authenticated actor (authenticate admits only active
  people). `reportPolicy.contentScope(actor)` is the Mongo face of `canReadContent`; both
  derive from one status list, and `scopeParity.test.js` holds them together. R1 and U7
  filter by author as the spec says; `buildReportScope` will serve V3 (S5).
- S4: `ReportRow.tasksDone` counts `done` among the served content's tasks; `projects` are
  sorted by name. U7's weeks are every week a work period covers (`isOnTeamForWeek`) up to
  the current week, plus any week with a report; `sort=lastActivityAt` puts rows without
  activity (drafts, then WeekRows) last in either direction. A WeekRow is exactly the
  spec's example (no `approvalRequested`, `submittedAt` or `postedWeekdays`).
- S4: R2 requires both `weekKey` and `month`; `weeksFiled` counts reports submitted at
  least once (as U1's `reportsFiled`); `openBlockers` counts unresolved blockers.
- S4: R12 lists active and removed people whose work period covers the week; someone who
  joined later that week is left out of an earlier day unless they posted it.
  `blockersOnly` keeps people whose posted day has any blocker, resolved or not; either
  filter drops people with no posted day. `resolvedBy` (R10 and Day blockers) is a UserRef.

- S5, **owner decision (2026-10-04, accepted as built):** **C2 on a Draft →
  `409 REPORT_STATE_CHANGED`** (with `status: "draft"`). C2 names
  `COMMENT_NOT_ALLOWED` only for the author; §3's table accepts "every status except
  draft" and says every other state returns 409. The UI never offers it.
- S5: C2 is conditioned on the `revisionNumber` it read, so a resubmit landing between the
  read and the write is a 409, not a comment tagged with the wrong version.
- S5: C3 on a week thread by a teammate → `403 COMMENT_NOT_ALLOWED` (C3's wording), with
  nothing of the thread in the body. C4/C5 by anyone but the writer →
  `403 EDIT_WINDOW_CLOSED` (§1.9: "or someone else's"). C5 checks in the order 404 →
  403 → 409. C1 and C3 by a teammate are conditioned on `openToTeam` at write time, so a
  day closed meanwhile is a 403. Edits don't move `interactionAt` and are never "new".
- S5: V1/V2 check the status and the pin against the report first (409 with its status),
  then claim the revision (`action: null`), then update the report conditioned on
  `submitted` and the same `revisionNumber`. An approval comment that is empty after
  trimming counts as none (no thread). A given approval comment is also stored on the
  revision's `comment`, as the send-back's is.
- S5: the review desk's base filter is `reportPolicy.reviewDeskScope(actor, { approval })`
  — `buildReportScope`, `status: submitted`, `approvalRequested` unless `all`, and
  `author: { $ne: actor }` — shared by V3, V4 and N1 ("one query builder", §2.7). V3's own
  filters go beside it in an `$and`, so `person=<self>` can't undo the guard. It lives in
  the policy so `markerService` (N1) needn't import `reviewService`. V3's `role` filter is
  the author's current role; `project` means any line on that project; ties sort by
  `weekKey`, then `_id`.
- S5, **owner decision (2026-10-04, accepted as built):** **"new" rules**
  (`database_schema.md` §5.4), with "no seen mark" meaning everything
  that concerns the reader is new: for the author, their report approved or sent back
  (status `approved` / `needs_correction` and `lastActivityAt` after `seenAt` — only a
  review sets those), or a comment or reply by someone else on their days or week; for
  anyone, an entry by someone else in a thread they wrote in; for a manager or admin, a
  requested `submitted` report (not their own) submitted after `seenAt`. Week threads
  count only where `canReadContent` allows. A row is checked first against
  `interactionAt > seenAt`. V4 = the desk's requested reports whose `submittedAt` is after
  the reader's `seenAt`.
- S5, **owner decision (2026-10-04, accepted as built):** **N1's "this week" on the
  server's clock.** The server has no client date (I2), so
  `nav.thisWeek` covers any week that is current somewhere (the weeks of now − 12 h and
  now + 14 h; on a Sunday that is both last week and the next), and `nav.myReports`
  covers the actor's earlier reports of the 12 weeks. Errs towards showing a dot.
- S5: `reportService` exports `weekViewOf`, `dayView`, `weekCommentsView` and
  `threadView` for `reviewService`'s answers, so serialization (and `isNew`) stays in one
  place. `EDIT_WINDOW_MS` is exported from `reportPolicy`.
- S6, **owner decision (2026-10-04, accepted as built):** **The page filters apply uniformly, per row (I11)** to D1, D2, D4 and D5, and to D3
  by report. A person kept by `project` keeps all of their hours that week — D4 and D5 do not
  cut the lines down to the project, so D5 under a project filter can still show other
  projects the same people worked on. D6 takes no filter (it is "across the team"); D8 takes
  only `weekKey`. D3's `person` narrows the team series; `trendPerson` is its own series and
  ignores `person`.
- S6: **Rows are users first**, in plain code rather than one `$lookup` pipeline: one read of
  the users, one of the week's reports (projected without `content`, `weekComments` and day
  comments), one of the holidays — shared across the weeks of D1's trailing window. Task
  statuses are read only to count Done: from live content for Submitted and Approved, from the
  sent-back revision for Needs correction (I13); a Draft is never read. The Needs-correction
  count and `oldestSentBackAt` (the earliest `reviewedAt` of the sent-back revisions) follow
  the same rows.
- S6, **owner decision (2026-10-04, accepted as built):** **D1 definitions the spec leaves open.** `complianceTrailing` pools filed and expected
  over the eight weeks ending at `weekKey` (the week itself included), so a week with nobody
  expected adds nothing, and the rate is `null` only when all eight are empty. D1's open
  blockers read the rows' reports — people on the team that week — so a blocker raised by
  someone removed mid-week is not counted.
- S6, **owner decision (2026-10-04, accepted as built):** **D6's event field is `type`** (`submitted` · `approved` · `sent_back`); the spec names
  the events but not the key. The feed reads the newest eight revisions by `submittedAt` and
  the newest eight reviewed by `reviewedAt` (both indexed), merges and keeps eight — bounded
  without a time window — then looks up users and reports for those eight only. An unreviewed
  submission is one event.
- S6, **owner decision (2026-10-04, accepted as built):** **D7 counts weeks up to and including the current one**, through the same derivation as
  §5.0, so the current week lowers the rate until it is filed (as it does on D1). `compliance`
  and `avgHoursPerWeek` are `null` when no week was expected; the average divides all hours of
  those weeks, every report status, by the expected weeks.
- S6: D8 returns every active project with a plan, sorted by name; a person appears if any
  line anywhere names the project, ordered by total hours. `lastDay` is the date of the
  latest day with a line on the project.
- S6: dashboard services take no `actor` — every manager sees the same figures — so the
  controllers build none. `reportService.dayStatesOf` and `projectService.progressFor` are
  now exported so D2 and D8 reuse them instead of copying.
- S6, **owner decision (2026-10-04, accepted as built):** **The seed's invite link.** The invited person has a live link, but the raw token is
  generated and dropped inside `runSeed`: only its SHA-256 is stored and nothing prints it
  (link tokens are never logged or cached). To get a usable link in development, reissue the
  invite from the Users page (U4). The accounts' common password is `weekly-view-dev`, printed
  by the script; it is a development password, and the seed refuses to run when
  `NODE_ENV=production`.
- S6: **The seed's calendar.** Everyone joined on the Monday of week −6, the Holiday week
  (five holidays, "Year-end closure"), so every person's history has no empty weeks before
  their first report. Holiday *names* are Sri Lankan-style, but the dates are relative to the
  seeding week, so they only illustrate. Timestamps in the current week follow its working
  days: on a Tuesday run, Friday's submissions are dated in the future. `seed` and `seed:reset`
  do the same thing — the schema says `seed` already wipes — and `--reset` is the explicit
  spelling.

- C1: **C1 renders only the auth screens, "/" and `/design`.** Until C2 builds the shell and
  the full route table, `SessionLayout` is a bare outlet, `ProtectedRoute` has no `allow` /
  403 branch (it is unused), and unknown paths get React Router's default error page.
  `IndexRoute` stands in: signed in, a placeholder naming the person with `Sign out` (C4's
  `ThisWeekPage` replaces it); signed out, a redirect to `/signin` (C10's landing page
  replaces it); signed out in the demo, an empty placeholder (C10's chooser). Suspense
  fallbacks are `null` until C2's page skeleton.
- C1: `AuthContext` adds `bootFailed` and `retryBoot()` to the §3.3 shape — boot retries a
  network error or 5xx at 4, 8, 16 and 32 s, keeping the token, then shows the error panel
  with `Try again`. A 401 at boot clears the token and boots anonymous. A signed-in `signIn`
  as a different `_id` clears the query cache.
- C1: `UnsavedChangesContext` is the registry only (`setDirty`, `hasUnsavedChanges`) plus
  `useUnsavedGuard`; the session-expiry modal asks before `Sign out` / dismiss when anything
  is dirty. The navigation and tab-close guards on it come with the forms in C4.
- C1, **owner decision (2026-10-04):** `rounded-lg` stays as built — it compiles to a zero
  radius because design §9.4 sets `--radius-lg: 0px`; no design-system change. The C1 done
  item "`rounded-lg` fails to compile" is read as "never rounds".
- C1, **owner decision (2026-10-04, accepted as built):** **Toasts and tooltips use `--d-panel`, not `--ink`.** Design §6.12/§6.13 and
  `tech_stack.md` §6.7 say `--ink` with `--d-text` text; in the dark theme `--ink` is
  `#eef1f4`, the same as `--d-text`, so the text would vanish. `tokens.css` itself labels
  `--d-panel` "dark-band surfaces (demo bar, toasts, tooltips)", and it is theme-independent.
  In light it is `#14171b` against `--ink`'s `#0d0f12`. Reversible (one class each); see
  *Open questions*.
- C1: auth forms disable their fields while the request runs (design §3.12, "fields
  disabled, values preserved"), where `frontend_architecture.md` §6.1 says fields stay
  enabled — the screen-specific rule wins on the auth screens only.
- C1: `Switch` has no anatomy in the design system: built square like the Checkbox
  (32×18 track, 12px thumb, `--acc` when on, transform and colour transitions only).
- C1: the Modal focuses the body's first interactive element (the close button only if the
  body has none) and, since modals are opened from state rather than a Radix `Trigger`,
  returns focus to whatever opened it.
- C1: `Panel`'s `sample` prop (the SAMPLE DATA pill) is not built; it arrives with the demo
  bar in C10. `AvatarStack` is left to the stage that first needs it.
- C1: the client's Zod schemas: login checks only that both fields are filled (the server has
  one answer for every failure); signup, invite and reset mirror §2.1's limits (name 1–80,
  password 8–72, a valid email on signup). Server field errors land on matching fields; the
  rest and any other code show in the form's strip, worded from `lib/errorCopy.js`
  (`reportServerError` in `lib/formErrors.js`, beside §6.1's `applyServerErrors`).
- C1: auth mutations and the link preview use `gcTime: 0`, so a password or link token held
  as a mutation variable leaves the cache with the screen. The link token is never in a key.
- C1: **the demo adapter's auth answers.** A1 → `available: false`; A2 → `403 SIGNUP_CLOSED`;
  A3 → `403 FORBIDDEN` (sign-in isn't demonstrated); A4/A5 read and rename the chosen
  person; A6 → `{ token: null, user }` after checking the new password's length; A7/A8 →
  `404 LINK_INVALID`. With no perspective chosen, person-scoped routes answer
  `403 FORBIDDEN`, never 401 (a 401 would open the session-expiry modal). The fixtures hold
  the three perspectives (Imali J., Nadia F., Sanduni B. — the owner) with `example.com`
  emails; `demo.setPerspective(role)` is exported from `bootDemo.js` for C10's chooser.
- C1: `demoCoverage.test.js` keeps a table of one case per service function; a function
  without a case fails the first test, so each stage adds its cases with its handlers.
- C1: `lib/urlParams.js` descriptors carry `parse` / `serialize` / `isDefault` / `toApi`,
  plus `textParam` for `q`; `useUrlFilters` (C2) builds on them. `lib/format.js` formats
  hours as plain numbers ("7.5") — the unit is the caller's.
- C1: ESLint's react-refresh rule is off for `src/context/*Context.jsx`, which keep the
  context and its provider in one file as the tree says. `client/.prettierrc.json` now points
  `tailwindStylesheet` at `src/styles/index.css` (the S0 note).

- C2: **`PendingPage` stands in for every page a later stage builds.** The route table (every
  path in `frontend_architecture.md` §4.1, with `ProtectedRoute allow` and `ParamGuard`) is
  complete now; each page renders `PendingPage` (inside the shell, with its `PageHeader`
  title) until its stage replaces that line in `routes/index.jsx` — C3 the report-reading
  routes, C4 `/`, C5 the edit route, C6 history / updates / review, C7 `/team`, C8 the rest.
  Real pages should be `lazy()` imports as the C1 auth pages are (§4.1). C11 deletes the file.
  Two redirects in §4.1's "Normalising" belong to the pages that know the data and are not
  built: `/people/:me/reports/:week` → `/reports/:week` (C3) and a non-editable
  `/reports/:week/edit` → `/reports/:week` (C5).
- C2: **The top-bar title is the page's `<h1>`** (`PageHeader` portals it as one). Pages with an
  in-page heading (design §3.0: This week, Team dashboard, Profile, Projects) should render it
  as an `<h2>` visually styled as the page title — the bar is the landmark.
- C2: **`OfflineStrip` is mounted by `AppShell`**, under the top bar, not by `RootLayout`
  (`project_structure.md` listed it there): design §3.13 puts it below the top bar, which only
  the shell has. Signed-out screens show no strip. `project_structure.md` is updated.
- C2: **The sidebar's dots and count are wired in data, not yet in value.** `navItems.js` carries
  `dot` (N1 key) and `count` (V4); `Sidebar` takes a `marks` prop that is `{}` until `useNewMarks`
  (C9) and the review-desk count hook (C6) exist. The dot is a local 6 × 6 square; C3's
  `NewMarker` replaces it.
- C2: **`--demo-h` is set to `0px` by `AppShell`.** C10 builds the 36 px `DemoBar` and flips it in
  the demo. Every sticky `top` already reads `calc(… + var(--demo-h, 0px))`.
- C2: **Popovers use CSS keyframes (`.wv-popover`), not Motion `AnimatePresence`** (design §8.2
  #7–#8 names Motion), as C1's modal and tooltip do; same 120 / 100 ms and `translateY(-2px)`.
  Motion is used where layout projection or exit orchestration is needed: the drawer, the tab
  bar (`layoutId`) and the route fade.
- C2: **Drawer mode is below 1024 px for every width** (`frontend_architecture.md` §7.2), the
  hamburger being the top bar's first control; the drawer is a Radix Dialog (focus trap, Esc,
  focus returned to the hamburger) animated with Motion — 200 ms in, 140 ms out, `translateX`
  plus backdrop opacity.
- C2: **Top bar below 1024 px:** secondary actions move into a `⋯` popover (the secondary slot
  node exists only while it is open, so the page's portal mounts then); the week picker **stays**
  in the bar (design §10 says "page title only" at 768–1023 px, which would leave the week
  unchangeable); below 640 px the week picker wraps to its own row under the title.
- C2: **`Table`** (design §5, `frontend_architecture.md` §8.2): `sortable` columns get a header
  `<button>`; clicking calls `onSortChange({ id, dir })` with the direction already toggled
  (`defaultDir` on a column sets its first direction). Added columns props: `mono` (the §5.2
  date / week-id style) and `label` (the stacked card's label, defaulting to `header`). The
  first column is the primary identifier and, with `getRowHref`, is wrapped in a real `<Link>`;
  the row click skips clicks on any link, button or input inside it. Below 768 px it renders
  stacked cards (`mobile: "primary" | "status" | "pair" | "hidden"`; default first = primary,
  rest = pair); skeleton rows match the column count.
- C2: **`FilterBar`** adds `sort={{ options, value, onChange }}` — the single `Sort` select that
  replaces sortable headers below 768 px (design §5.6) — and `width` ("wide" 1560 / "page"
  1240) so its content aligns with the page's. Its sheet below 900 px is the shared `Modal`
  (a centred 420 px dialog from 640 px up, full screen below), with `Done`, not a separate
  full-screen component.
- C2: **`MultiSelect`** is a popover with a native checkbox list (so it needs no listbox ARIA),
  `↑ ↓` between boxes, a search field above 8 options, and a `--tint` footer. `Apply` commits
  the draft; `Clear` commits an empty selection and closes.
- C2: **`WeekPicker`** disables weeks outside `[min, max]` (`max` defaults to the current week);
  `↑ ↓` step weeks as well as `← →`; a row with no weekday in the viewed month (the 1st is a
  weekend) is not drawn; month arrows disable when the month holds no allowed week.
  `useWeekParam` clamps `?week=` with the same rule, using the browser's clock and the local
  week of `user.joinedAt`. `SegmentedControl`'s selected segment is `--acc-l` / `--acc-txt`
  (design §6 gives it no anatomy), as the active nav item is.
- C2: **404 and 403 copy.** Signed in, the primary is design §3.13's `Go to this week`; signed
  out (404 only) it is `Go to the start page`, since "this week" means nothing without a session.
- C2: **ESLint:** `argsIgnorePattern: "^[A-Z_]"` joins `varsIgnorePattern`, and Motion is imported
  as `Motion` — with no `eslint-plugin-react`, `<Icon />` and `<motion.div>` read as unused.
- C2: **`useUrlFilters`** leaves params outside its spec (`week`, `day`) untouched; `clear()`
  resets filters only (not `sort`, `dir`, `limit`) and goes to page 1. A hand-edited URL is read
  as defaults but is not rewritten until the next change.
- C2: **`ScrollRestoration`** is mounted in `RootLayout`, so a new page opens at the top and Back
  restores the scroll.

- C2, **owner decision (2026-10-04): every C2 decision above is accepted as built** — `PendingPage`
  stand-ins, the `<h1>` top-bar title, `OfflineStrip` in `AppShell`, the `marks` wiring, `--demo-h`,
  CSS popovers, drawer below 1024 px, the overflow `⋯` menu and week picker placement, the `Table`,
  `FilterBar`, `MultiSelect`, `WeekPicker` and `SegmentedControl` choices, the 404 copy, the ESLint
  change, `useUrlFilters` and `ScrollRestoration`.

- C3: **`userService.js` exists with `getUserWeek` (U8) only**, since §5.2 puts U8 there and
  `useWeek` needs it; the other `userService` functions arrive with C6 and C8. `useMarkSeen` is in
  `useReportQueries.js`, where §5.6's table puts it (`project_structure.md` lists `useNewMarks.js` as
  "and marking a week seen"; `useNewMarks` itself is C9's).
- C3: **Comment mutations invalidate every cached week**, not one. `CommentThread`'s props are
  `thread, target, canReply` (§8.3) and `target` carries `{ reportId }` only, so a comment hook has
  no `userId` / `weekKey` for §5.7's `invalidateWeek(queryClient, W)`. `lib/invalidateWeek.js` takes
  the coordinates it has: with all three it is §5.7's helper; with `{ reportId }` it marks every
  `["week"]` and that `["report", id]` stale, and only the weeks on screen refetch. The blocker and
  team-comment hooks hold the week and use the targeted form.
- C3: **`useResolveBlocker(week)` and `useTeamComments(week)` are the two optimistic toggles** of
  §5.7: each edits the week cache at once and invalidates in `onSettled`. Built as option objects
  (`resolveBlockerOptions`, `teamCommentsOptions`) so their rules are tested without rendering a hook.
  Failure handling is the owner's decision below.
- C3, **owner decision (2026-10-04): decisions 1–4 accepted as built** — the member's back-link to
  Team updates in place of the breadcrumb; the resolve toggle on the daily-update rows only;
  comment hooks invalidating every cached week; a confirm before deleting a comment.
- C3, **owner decision (2026-10-04): the optimistic toggles follow §5.7 on failure** — the change
  is restored and an error toast with `Retry` is raised (`lib/errorToast.js`: `toast.error`,
  `duration: Infinity`, the description from `lib/errorCopy.js`, action `Retry`, which sends the
  same write again; an `id` per control makes a repeat failure replace the toast, not stack).
  Titles: "That blocker wasn’t marked as resolved." / "That blocker wasn’t reopened." /
  "That day’s comment setting didn’t save." `hooks/__tests__/useReportQueries.test.js` (6 tests)
  runs the real mutation options against a query client: a flip is visible before the server
  answers, a refusal restores the cache and raises the toast with `Retry`, `Retry` re-fires the same
  variables, the week is marked stale afterwards either way, and a success raises nothing.
- C3: **Breadcrumb for a member.** Design §3.4 gives `People → Nadia F. → Week 31`, but People and a
  person's profile are manager pages, so for a member (who reaches someone's week from Team
  updates) the links would end in the 403 state. Managers and admins get the breadcrumb; a member
  gets a back-link to `Team updates`. Reversible (`headerLinks` in `ReportDetailPage.jsx`).
- C3: **The resolve toggle is on the daily-update rows only.** §3.4 says "every blocker row carries a
  resolve toggle", but `ReportDocument` is pure rendering (§8.3), so section 03 shows each blocker's
  Resolved state, Key and Carried over read-only; the toggle is in the day above it. A snapshot
  (a past version) has no resolution state, so its blockers show text and Key only.
- C3: **`ReportDocument` takes `week` and `revision?` — no `viewer`.** Nothing in §3.4 varies with
  the reader once the response is decided, and an unused prop is dead code. The withheld cases (the
  teammate note, the Draft panel, no report) are the page's, in `WeekNotices.jsx`; a withheld
  response from a member is the teammate note, from a manager the Draft panel.
- C3: **"Sent back on {date}" in the correcting banner** reads `latestComment.createdAt` from the
  week, so the banner needs no revisions request (the manager already gets that field).
- C3: **Extra props and files the contracts didn't list:** `Comment` takes `reply`, `canDelete`,
  `onEdit`, `onDelete` and `error` (the contract lists `comment, isWriter, showKind?` and says it
  shows the countdown — the buttons need handlers); `CommentComposer` adds `initialValue`, `onCancel`,
  `rows`, `autoFocus`, `label` (editing reuses it); `StartThread` (the `Comment` button) is exported
  from `CommentThread.jsx`; `WeekComments` (listed under `review/`, built here because the rail needs
  it) takes `threads, canStart, canReply, reportId`; `ui/RoleChip.jsx`, `report/BlockerRow.jsx`,
  `report/WeekNotices.jsx`, `lib/permissions.js` (the week-thread gates, G1) and
  `lib/invalidateWeek.js`. `RevisionsRail` drops the contract's unused `reportId`.
- C3: **Deleting a comment asks first** (the shared `ConfirmDialog`: "Delete this comment? It is
  removed for everyone who can read this thread."). Design §6.23 only names the text button.
- C3: **A day's comment count is a plain line** ("No comments" / "2 comments", with the `NewMarker` when
  a thread is new) rather than a badge; every posted day shows `Comment` to anyone who may write
  there, and a teammate on a closed day sees §6.23's "Comments on this update are limited to
  {first name} and managers." once, after the threads.
- C3: **`useNow(intervalMs)`** keeps one module-level timer running only while something subscribes,
  at the shortest interval anyone asked for (default 15 s). It has a server snapshot so the page can
  be rendered to a string in a test.
- C3: **The sidebar's local dot is replaced by `NewMarker`** (the C2 note); the rest of C9's wiring
  (`useNewMarks`, V4) is still C9.
- C3: **The demo's weeks.** `fixtures.js` now holds two projects, six tasks and five reports on dates
  relative to the demo's start: Imali (member) has this week as a Draft, last week sent back by
  Nadia (live content already differing from the sent-back version, a thread with her reply, a
  resolved blocker) and the week before approved on its second version; Nadia (manager) has last
  week submitted. They give every row of §9.4 and a revisions list. The handlers (`demoWeekRoutes.js`)
  apply the server's rules and error codes; `demoWeekView.js` derives `dayStates`, `tasks`,
  `hoursByType`, `contentSource`, `canComment`, `editableUntil`, `isNew` and `submitBlockers` from
  the store. Holidays, leave, `not_on_team` and a real submit are not modelled until C4–C8.
  `isNew` follows `database_schema.md` §5.4 in a simplified form (an entry by someone else after the
  reader's last visit, in a thread on their own report or one they wrote in).
- C3: **Test layout.** The client has no jsdom or testing library, so the page test renders to a
  string with a primed query cache (as the C2 route tests do) and cannot click; the click paths
  (reply, edit, delete, toggles) are covered by the browser walkthrough and, for their rules, by
  `demoWeeks.test.js`.

- C4: **This week is built whole**, including `CurrentWeekPanel`, `RecentWeeksList` and
  `PersonalStrip`, which the stage's build list doesn't name but design §3.1 and §9.1 put on the
  page. That brought R1 and R2 (`listMyReports`, `getSummary`, `useMyReports`,
  `useReportSummary`) and their demo handlers forward from C6; the R1 handler applies every
  filter and sort, so C6 can reuse it.
- C4: **The chosen day in the strip** is marked with a 2px `--ink` bar along the top (design
  §3.1 gives every cell state but not "selected"; today already uses the bottom `--acc` bar).
- C4: **Default day** stays as C2's `useWeekdayParam` (frontend §9.1: today in the current week,
  else the earliest missing, else Monday). Design §3.1's "today, or the earliest missing day if
  there is one" could be read as missing first; the top-bar action already points at the
  missing day.
- C4: **Drafts.** `DayDraftsProvider` wraps the page (§9.1), so drafts survive day and week
  switches. Per §6.3 a draft written by `Save` marks the composer clean; text carried over a
  day switch is kept but still counts as unsaved, so the guards still ask. `LeaveGuard`
  (`useBlocker`, mounted in `RootLayout`) asks only when the path changes. See *Open questions*
  for what happens to saved drafts on leaving the page.
- C4: **Composer details the design doesn't give:** a `Cancel` text button while editing a posted
  day (it drops the draft and returns to the posted view); the header reads "Not posted",
  "Saved, not posted" or "Posted 17:42 · edited". The first-week panel's `Post today’s update`
  and the "This week's report" panel's button are secondary, because the top bar holds the page's
  one primary.
- C4: **Day form errors** show beneath the line (§4.11), one message per field. R5's
  `lines.N.newTask.*` paths are mapped onto the form's `lines.N.task.*`. `PROJECT_INACTIVE`
  names no line, so it goes on the first new-task line's project; `TASK_NOT_FOUND` and
  `DAY_NOT_EXPECTED` (worded from `reason`), `WEEK_OUT_OF_RANGE` and `REPORT_STATE_CHANGED`
  are inline under the buttons and refetch what §5.8 says.
- C4: **Validation timing** is RHF's `onTouched` for the day form (design §4.10). The auth forms
  (C1) still use `onBlur` with `reValidateMode: "onChange"`, which only re-checks on change after
  a submit. Not changed here.
- C4: **`ui/inputClasses.js`** keeps the read-only look off `<select>` (`[&:read-only:not(select)]`),
  a C1 bug shown by C4's screenshots.
- C4: **`Combobox`** uses Radix Popover's `Anchor` directly rather than the shared `Popover`
  wrapper, because focus must stay in the input (aria-activedescendant); same classes as the
  wrapper.
- C4: **`useHolidaysForWeek`** fetches whole calendar years (`qk.holidays(year)`,
  `from: YYYY-01-01, to: YYYY-12-31`) so the holidays page (C8) shares the cache.
  `qk.all` gained `projects`, `tasks` and `users` prefixes for invalidation.
- C4: **`usePutDay`** writes the response into the week cache and invalidates `report(id)`,
  `teamUpdates`, `dashboard`, `reports`, `projects` and `tasks` (§5.7). `useSetLeave` sets the
  actor's `Me` from the response when they are the target.
- C4: **The demo's calendar.** Tasks now have an `owner` and `doneAt` (Nadia has her own "Team
  planning" in place of Imali's shared "Sprint planning"); projects have plans (Client A in time,
  R&D overdue); users have `leaveFrom`. `dayStates`, `expectedDays` and the week state now model
  holidays, leave and `not_on_team` in the server's order. The holidays fixture is still empty
  (C8). `meOf`, `projectRef` and `taskRef` moved to `demoWeekView.js`.

- C4, **owner decision (2026-10-05): day drafts are kept until sign-out.** `DayDraftsProvider` moved
  from `ThisWeekPage` to `SessionLayout`, keyed by the signed-in person, so unposted text (saved or
  not) survives moving to another page and back, and ends at sign-out. Leaving This week no longer
  loses anything, so the day panel and the drafts register with `UnsavedChangesContext` as
  `keepsOnNavigate`: they arm the tab-close prompt, sign-out and the re-auth dismiss, but not
  `LeaveGuard` (which now asks `losesOnNavigate()`). A reload still loses drafts — nothing is
  written to the device (§2). This departs from frontend §9.1 ("wraps this page's content") at the
  owner's request.
- C4, **owner decision (2026-10-05): the sign-in and sign-up forms validate `onTouched`** — on blur
  first, then on every change once a field has been touched, so an error clears as soon as it is
  fixed (design §4.10), as the day form does. The accept-invite and reset-password forms still use
  `onBlur` + `reValidateMode: "onChange"` (not asked; same gap).
- C4 answers: **a C3 fixture fix found by the date.** On a Monday morning, last week's send-back
  (Friday + 3 days, 09:00) and Imali's reply (12:00) were still in the future, so the reply's
  10-minute window read as open and three demo tests failed — on `main` too. The send-back is now
  Friday 18:00, after the 17:00 submit.

- C4, **owner decision (2026-10-05): turning leave off asks first.** `Turn off` on This week opens
  `components/user/EndLeaveDialog.jsx` (the shared `ConfirmDialog`, not destructive): "Turn off your
  leave?" / "Today will need a daily update." / `Turn off leave`; U9 is sent only on confirm, and the
  dialog closes when it settles (a failure shows in the strip, as before). For a manager or admin
  ending someone else's leave the same dialog reads "Turn off {first name}’s leave?" / "{First name}
  will need a daily update for today." — that control lives on the people and users pages, so C8
  must use `EndLeaveDialog` with `isSelf={false}`. Turning leave on does not ask. Noted in
  `requirments_doc.md` §15. Test: `lib/__tests__/endLeaveCopy.test.js` (2) for the wording; the click
  path was walked in a browser against the real API (Dinesh, on leave in the seed): `Turn off` → the
  dialog → `Cancel` closes it and sends nothing; `Turn off` → `Turn off leave` sends U9 once and the
  on-leave line goes away.
- **For C8 (owner decision, 2026-10-05; built in C8 — see *C8 decisions*):** the person's profile (`/people/:userId`)
  must show managers and admins a **leave history** — each leave period's start, end and who set
  it. The data is already stored on the user's leave periods (`database_schema.md` §1.1); no API
  endpoint serves it yet, so C8 must check the API spec for one or raise it before building.
  Ending someone's leave from C8's pages uses `EndLeaveDialog` (above). Noted in
  `requirments_doc.md` §15.

- **C5 decisions — all seven accepted as built (owner, 2026-10-05):**
  1. **Submit stays clickable while disabled.** It is `aria-disabled` (looks disabled, stays
     focusable) rather than `disabled`, so its tooltip can name what is missing (a native disabled
     button gets no hover or focus) and a click scrolls to and focuses the first problem without
     sending anything — design §4.10's "blocked submit". R7's 422 does the same from the
     server's `fields`. `Button`'s primary variant gained the `aria-disabled` look.
  2. **Guards during autosave.** §6.4 says the form registers as unsaved while `pending` or
     `failed`, and also that a route change flushes. Built: `failed` blocks in-app navigation
     ("Leave this page?" — the C4 wording, "What you've written and not posted will be lost.");
     `pending` / `saving` only arm the tab-close prompt, because leaving the page saves them
     (the unmount flush).
  3. **"Ask for approval" is unticked on every open, a resubmit included** (requirements §4: "may
     ask for approval again"; design §4.9: "unticked by default"). It is framed like the buttons
     beside it and turns `--acc-l` when ticked, for the owner's "easy to see".
  4. **A 409 on submit** shows an error toast "This report is now Submitted." and refetches; the
     page then moves to the filed document, so there is no form left to show it inline.
  5. **The status placeholder reads "Set status"** — "Choose a status" does not fit design §4.3's
     140 px Select. The error under it keeps §4.10's "Choose a status.".
  6. **"since W35"** (design §4.3, a task continued from an earlier week, with its total hours in
     a tooltip) is **not built**: the `Report.tasks` the form reads carries no first week or total
     (`api_specification.md` §1.10); T1 has `hoursTotal` and `lastWeekKey` but not the first week.
     **Owner decision (2026-10-05): deferred, no API change.** The form ships without the label;
     it is a possible later addition, which would need a field on `Report.tasks` (first week,
     total hours) decided in the API spec first.
  7. Empty lists (next week, achievements, links) open with one blank row; removing the last row
     empties it. The rail's "Before you submit" heading over the checklist is new copy.

### Polish: daily updates as day cards (2026-10-07)
Not a stage; **C8 is still next.** The owner found the Daily updates block on the week page flat,
cluttered and demotivating. Redesigned inside the design system (cobalt, cool neutrals, square
corners, hairlines, existing tokens, no hex in components). Recorded as an owner-decision note in
`product_design_system.md` §3.4 (the "Daily updates block" bullet).
- **Each day is a card** on `--card`, 20px apart. A posted day has a header (weekday and date, hours,
  comment count, the "Open to team comments" switch), then work lines, blockers and comments as
  hairline-separated sections. Work lines: task over project, type with its colour mark, what was
  done, hours right-aligned in mono (stacked under 640px). Comments read as a conversation
  (`CommentThread` `variant="conversation"`: no grey fill, replies hang off a hairline); the
  overall comments keep the §6.23 tint. Holiday and leave are short tinted cards, Missing keeps its
  red with a left bar, the rest are plain one-row cards.
- **Same cards elsewhere:** the day panel on This week (header unchanged, count and switch in a strip
  under it, holiday/leave tinted) and the posted days on Team updates (gap 16px). `PostedUpdate` is now
  the card body only; new `DayControls` is the count and switch. No behaviour changed: comments,
  edit window, toggles and error toasts are the same code.
- **Checks:** `npm run lint` clean; client tests 346 green (one new in `ReportDetailPage.test.jsx`
  for the five cards and the quiet days); server untouched. Looked at in a real browser (Chromium,
  local in-memory Mongo, seeded; Atlas and `MONGODB_URI` never used) at 1440 and 360 px, light and
  dark: W41 as Imali (thread, reply, resolved blocker, holiday), This week (a posted day and a
  holiday), Team updates as Nadia, Lakmal's W41 (posted, Missing, Holiday, today, future), and a
  walkthrough at 360 px (post a comment, toggle the switch, edit window shown). **Not looked at:**
  the "On leave" chip card (the seed has no week with both a report and a leave day; covered by the
  new test only), and the demo (same components, not opened).
- The dark theme is the Appearance switch in the sidebar's user menu; it is stored per device
  (`wv.theme`), not taken from the operating system.

**Owner: how to check it** (local, on your machine)
1. `npm install` in the repo root's `server/` and `client/`; copy `client/.env.example` to
   `client/.env` and `server/.env.example` to `server/.env` (your Atlas `MONGODB_URI` is fine for
   `server/.env`, but seeding **wipes** that database; use a local Mongo or a throw-away Atlas
   database for this check).
2. `npm run db:sample`, then in two terminals `npm --prefix server run dev` and `npm --prefix client run dev`.
3. Open http://localhost:5173/signin and sign in as `imali@example.com`, password `weekly-view-dev`.
4. Open **My reports**, then **Week 41**. Check: five separate cards; Tuesday's thread reads as a
   conversation with Imali's reply indented under a line; Wednesday is a short grey Holiday card;
   Thursday has a Blockers section.
5. Click **Comment** on Monday, write something, **Post comment**. It appears at once with `Edit`
   and `Delete` and a minutes-left counter. The count in Monday's header becomes "1 comment".
6. Switch **Open to team comments** on Monday on and off.
7. Open **This week**, pick **Tue** in the strip: the same card, with the count and switch under
   the header. Pick **Wed**: the holiday card.
8. Sign out, sign in as `nadia@example.com` (manager), open **Team updates**: each person's day is a card,
   16px apart; **Mon 5** shows posted days, Dinesh (on leave) a short row.
9. On **Team updates**, on **Mon 5**, click **Lakmal H.**'s name: his Week 41 opens. Monday is posted,
   Tuesday **Missing** with a red bar, Wednesday Holiday, Thursday "Not posted yet", Friday "Not yet".
10. Dark theme: click your name at the bottom of the sidebar, choose **Dark** under Appearance, and
    repeat steps 4 and 8.
11. Narrow the browser to about 360 px (or use the device toolbar) and repeat step 4: the header wraps
    (title, then count, then the switch) and the work lines stack.

## Open questions for the owner
- **Guided demo tour, to confirm or change** (see *Owner request: guided demo tour*): four smaller decisions —
  steps re-preparing their data on Back and jumps; a dim that doesn't block the page; seven features left
  out; the first screen's new lead line. ~~No library; the Tour button in the demo bar; Imali's last week
  reset to a Draft; the tour ending on refresh; "overall comment" read as the week's comments~~ **Resolved
  (owner, PR #28 review, 2026-10-18):** all five accepted as built; recorded as owner decisions in
  `requirments_doc.md` §14.1, `frontend_architecture.md` §11.6 and `product_design_system.md` §3.14.
- **Auth pages round six — a committed browser test?** The client suite has no DOM, so the "landing → `/signin`
  client-side, computed styles use app tokens only" check runs in Chromium by script, not in `npm test`. Making it a
  committed test needs a new dev dependency (`@playwright/test`, or jsdom, which cannot compute real styles).
  Say if you want it added (`tech_stack.md` §8 deferred E2E).
- **Auth pages, to confirm or change** (see *Owner decision: redesigned sign-in pages…*): `Go to that week`
  appears only once the first week has begun. Small and reversible. ~~(1) the brand panel's fill-in, (2) A1 on
  `/signin`, (3) "Forgot your password?" as a panel~~ **Resolved (owner, PR #27 review, 2026-10-17):** all three
  accepted as built — see *Auth pages: owner decisions accepted*.
- **Landing polish, to confirm or change:** the stories' panels are pinned with CSS `position: sticky` (ScrollTrigger
  does the scrub and snap) instead of ScrollTrigger's own `pin`, because the GSAP pin scored a layout shift of 7.78
  in Chrome against 0.0008 for sticky (see *Landing polish*). Say if you want the GSAP pin anyway; it is a small,
  reversible change.
- ~~C10, to confirm or change~~ **Resolved (owner, 2026-10-10):** all twelve C10 decisions accepted as built — see *C10 decisions*; the weekend look of the team table was fixed (see *C10 owner answers*). (Was: the twelve decisions, especially 3 (the demo bar's surface is `--d-panel`, not `--ink`), 4 (its way out is always `Sign in`), 6 (the pill on panels only) and 10 (the open-sign-up wording of the landing page's FAQ).) The landing page and the demo were checked in a browser with fallback fonts only; see *C10 checks*.
- ~~C8, to confirm or change~~ **Resolved (owner, 2026-10-09):** all twelve C8 decisions accepted as built — see *C8 decisions*. (Was: the twelve decisions, especially 1 (the new `leaveHistory` field on U2), 3–4 (the profile's This week strip; no day cards in C8's pages), 6 (Users lists every status by default) and 9 (overdue colour).)
- **Whole-app polish, to review:** built on `claude/app-polish` (see *Polish: whole-app UI/UX pass*); every rule
  and motion change is an owner-decision note in `product_design_system.md` (§8.5 lists the new motion). Say what
  to keep, change or drop before it is merged. (Was: "After C10: one whole-app *visual polish* session".)
- ~~C7, to confirm or change~~ **Resolved (owner, 2026-10-07):** all twelve C7 decisions accepted as built — see *C7 decisions*. (Was: the twelve decisions, especially 1 (`Extend plan` waits for C8) and 2 (the tooltip's surface).) C8 wires `onExtend` to `PlanModal`.
- ~~C6, to confirm or change~~ **Resolved (owner, 2026-10-05):** all ten decisions accepted; `blockersOnly` now means open blockers and the review panel is pinned — see *C6 owner answers*. (Was: the ten decisions above, especially 1 (People is C8) and 4 (the
  feed's optimistic toggles); and the `blockersOnly` gap.)
- ~~C5, to confirm or change~~ **Resolved (owner, 2026-10-05):** all seven C5 decisions accepted
  as built; "since W35" (decision 6) is deferred with no API change, a possible later addition —
  see *Decisions*.
- ~~C4, to confirm or change~~ **Resolved (owner, 2026-10-05):** saved drafts are kept until
  sign-out, and the sign-in and sign-up forms take the `onTouched` validation timing — see the two
  C4 owner decisions under *Decisions*. The other C4 decisions stand as built.
- ~~C3, to confirm or change~~ **Resolved (owner, 2026-10-04):** decisions 1–4 accepted as built;
  decision 5 changed to follow §5.7 — see the two C3 owner decisions under *Decisions*.
- ~~C2: `server/tests/seed/seed.test.js` fails 3 tests in the cloud container~~ **Resolved
  (owner, 2026-10-04):** all 21 pass on `main` elsewhere, so the failures were this container,
  not S6. Server suite stands at 381 green. **Root cause found and fixed 2026-10-05** — a frozen
  test clock made Mongoose think the connection was stale; see *Seed tests made reliable*.
- ~~C2, to confirm or change~~ **Resolved (owner, 2026-10-04): all C2 decisions accepted as built** (all recorded under *Decisions*): the signed-out 404's
  button reads `Go to the start page`; the week picker stays in the top bar between 768 and
  1023 px where design §10 says "page title only"; the top-bar title is the page's `<h1>`; the
  `FilterBar` sheet is the shared `Modal`.
- ~~`npm ci` fails in `client/`~~ **Resolved in C1:** `client/package-lock.json` regenerated
  with `npm install`; `npm ci` now succeeds.

## Departures from `docs/project_structure.md`
- The guided demo tour added `demo/tour/` (`TourLayer.jsx`, `TourTooltip.jsx`, `TourPanel.jsx`, `tourSteps.js`, `tourSetup.js`, `tourRobot.js`, `tourPlacement.js`, `tourBus.js`) and `demo/__tests__/demoTour.test.js`; `Table` takes a `tour` prop, `Tabs` and `DropdownMenu` pass rest props through (menu items take a `tour` key); `fixtures.js` exports `CAST` and `SAMPLE_PROJECTS`, `bootDemo.js` exposes the store. `project_structure.md` (tree and §3.4) is updated.
- The landing revamp added `components/marketing/{PrivacySection,DemoSection,StoryCaptions}.jsx` and `storySteps.js`, and removed `SidesSection.jsx` and `LimitsSection.jsx` (`LimitsSection` became `PrivacySection`); `project_structure.md` §3.1 is updated.
- C10 added `components/ui/SampleDataPill.jsx`, `hooks/useIsDemo.js`, eight section components, `CtaPill.jsx` and `Words.jsx` in `components/marketing/`, `client/.prettierignore` and four test files (`demo/__tests__/{demoCast.test.js,demoEntry.test.jsx}`, `components/marketing/__tests__/LandingPage.test.jsx`, `styles/__tests__/landingIsolation.test.js`); `AuthPanel` takes `padding="none"`; `project_structure.md` §3.1 and §6 are updated. `DemoEntryPage`, `DemoBar`, `MarketingLayout`, `LandingPage`, `useLandingMotion` and `landing.css` were in the tree. `pages.js` names `LandingPage` and `DemoEntryPage`.
- C9 added `components/shell/{ErrorBoundary,ErrorStates}.jsx`, `components/report/PrintFooter.jsx`, `hooks/{useNewMarks,useRouteFocus,usePrintTheme}.js`, `lib/clearMarkers.js`, `services/markerService.js` (in the tree), `styles/print.css` and four test files (`demo/__tests__/demoMarkers.test.js`, `lib/__tests__/clearMarkers.test.js`, `components/shell/__tests__/{SidebarMarks,ErrorBoundary}.test.jsx`); `project_structure.md` §3.1 and §6 are updated. The page-level error boundary is in `AppShell` as well as `RootLayout` (see C9 decisions).
- C8 added `pages/{ProjectsPage,HolidaysPage,UsersPage,PeoplePage,PersonProfilePage,AccountPage}.jsx` (all in the tree), `components/project/{ProjectModal,ProjectsListTable}.jsx`, `components/holiday/HolidayModal.jsx`, ten files in `components/user/` (see the tree), `ui/{DropdownMenu,DatePicker,Meter}.jsx` (in the tree), `schemas/{projectSchema,userSchema}.js`, `lib/{peopleParams,passwordStrength}.js` and five test files; it deleted `pages/PendingPage.jsx`. `project_structure.md` §3.1 and §6 are updated.
- C7 added `lib/dashboardParams.js`, `lib/dashboardData.js`, `demo/demoDashboardRoutes.js`, `components/ui/AvatarStack.jsx` (in the tree of §3.1 as `AvatarStack` of the `ui/` list, now a file) and five test files (`pages/__tests__/TeamDashboardPage.test.jsx`, `demo/__tests__/demoDashboard.test.js`, `lib/__tests__/{dashboardParams,dashboardData,chartTheme}.test.js`); `project_structure.md` §3.1 and §6 are updated. `MetricCell` is built (`PersonalStrip` still draws its own three cells). `typeColor` in `chartTheme.js` is `TASK_TYPE_COLORS` itself, not a second copy.
- C6 added `components/report/WeekDocument.jsx`, `components/ui/WeekRangeFilter.jsx`, `demo/demoReviewRoutes.js`, `demo/demoUserRoutes.js`, `lib/reviewDeskParams.js`, `lib/reviewOutcome.js`, `lib/updatesDay.js` and five test files (`pages/__tests__/ReviewPages.test.jsx`, `demo/__tests__/demoReview.test.js`, `lib/__tests__/{reviewDeskParams,reviewOutcome,updatesDay}.test.js`); `project_structure.md` §3.1 and §6 are updated. `WeekComments.jsx` (built in C3) is reused by the review page unchanged. `hooks/useNewMarks.js` and the desk's count are C9's.
- C5 added four test files (`hooks/__tests__/useAutosave.test.js`, `lib/__tests__/submitChecklist.test.js`,
  `demo/__tests__/demoContent.test.js`, `pages/__tests__/ReportEditPage.test.jsx`) and R6/R7 to
  `demo/demoDayRoutes.js`; `project_structure.md` §3.1 and §6 are updated. `TaskRow.jsx` also exports
  the status and note fields `TaskCard` shares. `PendingPage` no longer serves the edit route.
- C4 added `components/shell/LeaveGuard.jsx`, `demo/demoDayRoutes.js`, `demo/demoCatalogRoutes.js`
  and four test files (`demo/__tests__/demoDays.test.js`, `lib/__tests__/weekActions.test.js`,
  `schemas/__tests__/reportSchema.test.js`, `pages/__tests__/ThisWeekPage.test.jsx`), and after the
  owner's answers `components/user/EndLeaveDialog.jsx` and `lib/__tests__/endLeaveCopy.test.js`;
  `project_structure.md` §3.1 and §6 are updated. The C3 fix added
  `components/ui/__tests__/QueryView.test.jsx`. `projectService`, `holidayService` and
  `userService` hold reads only so far; `MetricCell` (C7) is not built — `PersonalStrip` draws
  its three cells itself.
- C3 added `components/ui/RoleChip.jsx`, `components/report/BlockerRow.jsx`,
  `components/report/WeekNotices.jsx`, `lib/invalidateWeek.js`, `demo/demoResponses.js`,
  `demo/demoWeekView.js`, `demo/demoWeekRoutes.js` and three test files (`lib/__tests__/permissions.test.js`,
  `demo/__tests__/demoWeeks.test.js`, `pages/__tests__/ReportDetailPage.test.jsx`), and after the owner's answers
  `lib/errorToast.js` and `hooks/__tests__/useReportQueries.test.js`; `project_structure.md`
  §3.1 and §6 are updated. `lib/permissions.js` (in the tree) and `userService.js` / `reviewService.js` /
  `reportService.js` are started, not complete; `StartThread` and `WeekComments` share files and folders
  as noted under *Decisions*.
- Added `server/eslint.config.js`, `client/eslint.config.js`, `client/.prettierrc.json` (the trees
  had no lint/format configs; noted in §2.1 and §3.1).
- ~~Temporary: `server/tests/smoke.test.js`~~ — deleted in S1.
- S1 added `server/tests/foundation/` (five test files proving the stage's *done* list);
  noted in `project_structure.md` §2.1 and §6.
- S3 added `server/tests/calendar/calendarService.test.js` and
  `server/tests/rbac/projects.test.js`; noted in `project_structure.md` §2.1 and §6.
- S4 added `server/tests/helpers/testWeeks.js` (the week writes the three report suites
  share); noted in `project_structure.md` §2.1 and §6.
- S5 added `server/tests/rbac/markers.test.js` (the "new" markers, which no §6 item
  covers); noted in `project_structure.md` §2.1 and §6.
- C2 added `components/shell/PageContainer.jsx`, `hooks/useShellMode.js`, `lib/routeParams.js`,
  `routes/ParamGuard.jsx`, `pages/PendingPage.jsx` (temporary) and three test files
  (`routes/__tests__/routeGuards.test.jsx`, `components/shell/__tests__/navItems.test.js`,
  `lib/__tests__/routeParams.test.js`); `project_structure.md` §3.1 and §6 are updated. The
  route and nav tests are static renders — `project_structure.md` §6 had said the client
  carries two tests, a statement C1 had already outgrown.
- C1 added `components/ui/inputClasses.js`, `components/shell/BrandMark.jsx`, six files in
  `components/auth/`, `context/__tests__/authReducer.test.js` and three tests in
  `lib/__tests__/`; noted in `project_structure.md` §3.1.
- S6 added `server/tests/rbac/dashboard.test.js` and `server/tests/seed/seed.test.js`;
  noted in `project_structure.md` §6.
