# Build progress

> Updated by the agent at the end of every stage. `MASTER_PROMPT.md` defines the stages.

**Next stage: S6**

| Stage | What | Status |
| --- | --- | --- |
| S0 | Repo scaffold | done |
| S1 | Server foundation, models, test harness | done |
| S2 | Auth, users, links, leave, ownership | done |
| S3 | Projects, tasks, holidays, calendar | done |
| S4 | Reports, days, submit, week reads | done |
| S5 | Comments, review, "new" markers | done |
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

## Open questions for the owner
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
- S3 added `server/tests/calendar/calendarService.test.js` and
  `server/tests/rbac/projects.test.js`; noted in `project_structure.md` §2.1 and §6.
- S4 added `server/tests/helpers/testWeeks.js` (the week writes the three report suites
  share); noted in `project_structure.md` §2.1 and §6.
- S5 added `server/tests/rbac/markers.test.js` (the "new" markers, which no §6 item
  covers); noted in `project_structure.md` §2.1 and §6.
