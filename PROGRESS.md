# Build progress

> Updated by the agent at the end of every stage. `MASTER_PROMPT.md` defines the stages.

**Next stage: C8**

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
- **Seed** (`npm run seed`, also `seed:reset`): deterministic (the same week builds
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
- **Manual backend checks on a real server** (`node src/server.js` and `npm run seed` against a
  local `mongod` of the same version the tests download; real clock, Sunday 4 Oct 2026):
  `seed` and `seed:reset` both wipe and refill; `NODE_ENV=production npm run seed` refuses.
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
  headless; the API on a local in-memory replica set seeded with `npm run seed`; Vite dev server).
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
  API on a local in-memory replica set, `npm run seed`, Vite dev server; today was a Sunday, so the
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
  cluster, and it takes precedence over `server/.env`. The first `npm run seed` tried it and
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
Run `npm run seed` locally first; every seed account's password is `weekly-view-dev`.
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
Run `npm run seed` locally first; every seed account's password is `weekly-view-dev`. The seed's
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
Run `npm run seed` locally first (**local database only**); every seed account's password is
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
- **For C8 (owner decision, 2026-10-05; not built in C4):** the person's profile (`/people/:userId`)
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

## Open questions for the owner
- **After C10:** one whole-app *visual polish* session (colour tokens, contrast, emphasis), reviewed with the owner — see *C7 owner feedback*, item 6.
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
