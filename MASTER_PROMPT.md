# WeeklyView — master build prompt

You are building WeeklyView from finished planning documents. This file is how: it splits
the build into **stages**, one per session, and says what each stage reads, builds and must
prove. `CLAUDE.md` holds the standing rules; `PROGRESS.md` holds the state.

## How to start a session

Paste this, changing the stage:

> Read `CLAUDE.md`, then `PROGRESS.md`, then `MASTER_PROMPT.md`. Do **Stage S1** only. Read
> just the document sections that stage names. When done, run its checks, update
> `PROGRESS.md`, commit, and stop.

If `PROGRESS.md` says the previous stage is not done, say so and ask before continuing.

## Rules for every stage

1. **Read only what the stage names.** Section numbers below are exact. If you need another
   section, read that section, not the document.
2. **Build, don't redesign.** Endpoint paths, payloads, error codes, field names, query
   keys, file names and copy are specified. Use them verbatim. A mismatch with the API spec
   is a bug in your code, not a reason to change the spec.
3. **Conflicts and gaps:** stop, state the conflict, take the smallest reversible choice,
   and record it in `PROGRESS.md` (*Decisions* or *Open questions*). Never silently pick.
   Known gaps are listed under *Known open items* below — take the documented default.
4. **Tests are part of the stage.** Server stages ship the tests the API spec §6 assigns to
   them. Client stages keep `constants.parity.test.js` and `demoCoverage.test.js` green.
5. **Definition of done, every stage:** `npm run lint` clean · `npm test` green · the
   stage's checks below done · `PROGRESS.md` updated (status, decisions, departures) · one
   commit with a message naming the stage. Then **stop**.
6. **Say what you could not verify.** You usually cannot see a browser. A UI stage's visual
   checks are *unverified* unless a browser tool actually rendered them — write that in
   `PROGRESS.md` for the owner to look at. Never claim a screen matches the design from code alone.
7. **Ask before** pushing, deploying, creating accounts or databases, adding a dependency
   not in `docs/tech_stack.md` §9–§10, or changing a document.

---

# Part A — Server

Build in this order. Each stage ends with a running API and passing tests.

## S0 — Repo scaffold

**Read:** `docs/project_structure.md` §1, §7, §8 · `docs/tech_stack.md` §5, §7.1–7.3, §9, §10.

**Build**
- `git init` if needed. Root `package.json` (script shim, no workspaces), `.gitignore`,
  `README.md` (what it is, how to run, the Atlas `0.0.0.0/0` note from `tech_stack.md` §7.4).
- `server/` and `client/` with their `package.json` exactly as `tech_stack.md` §9 and §10
  (client `vitest` + a placeholder parity test is fine), ESLint + Prettier configs, and both
  `.env.example` files verbatim from `tech_stack.md` §5.
- `client/vercel.json` with the rewrite **and** the `Referrer-Policy: no-referrer` header
  (`tech_stack.md` §7.2).
- Empty folders are not created; create files when a stage needs them.

**Done when:** `npm install` works in both; `npm run lint` and `npm test` run (even if with
one trivial test each); a bare Vite page and a bare Express app start.

## S1 — Server foundation, models, test harness

**Read:** `docs/tech_stack.md` §3, §4, §5, §11 · `docs/project_structure.md` §2.1–§2.4 ·
`docs/database_schema.md` §0, §1 (all of it), §6 · `docs/api_specification.md` §1.

**Build**
- `config/env.js`, `config/db.js`; `app.js` / `server.js` split; `routes/index.js` with the
  mounts of `api_specification.md` §1.1 (routers can be stubs now); `GET /api/health` (H1,
  no database access).
- `utils/` (`apiResponse.ok` with the status argument, `appError`, `paginate`, `weeks` over
  date-fns), `middleware/` (`validate` → `req.validated`, `authenticate`, `authorize` with the
  role hierarchy, `notFound`, `errorHandler` with the Mongo duplicate-key mapping), `constants/`
  (five enums).
- **All models** with their indexes: user, project, task, report, revision, holiday, seenMark
  and the shared `contentSchema`, `daySchema`, `threadSchema`. Include the unique partial
  index on `isOwner`, the case-insensitive unique project name, the link-token sparse index.
- Test harness: `tests/helpers/testDb.js` (mongodb-memory-server, **replica-set mode** — the
  ownership transfer needs a transaction), `testAuth.js`, `vitest.config.js`.

**Done when:** the app starts against a real Atlas URI (ask the owner for it) and in tests
against memory; `/api/health` answers; every index in `database_schema.md` §6 exists (assert
it in a test); an unknown route returns `404 ROUTE_NOT_FOUND` in the envelope.

## S2 — Auth, users, links, leave, ownership

**Read:** `docs/tech_stack.md` §2, §2.1, §2.2 · `docs/api_specification.md` §2.1, §2.2,
§1.9 · `docs/database_schema.md` §1.1, §3.3 (accept invite, reset, email, ownership, leave,
remove) · `docs/requirments_doc.md` §1, §11, §15.

**Build:** endpoints **A1–A8, U1–U6, U9–U13**; `authService`, `userService`, validators;
link-token issue/verify (one code path for invite and reset); work periods and leave
periods; the owner rules; `tokenVersion` bumps on removal, role change, email change,
password change and reset.

**Tests (API §6.6, §6.7, and §6.1 items that apply):** admin routes, owner protection,
transfer, link single-use and expiry, bootstrap race (two concurrent signups → one wins),
password change never `401`, `GET /users` never contains a token or hash.

**Done when:** all of the above pass; you can sign up the first account on an empty database,
log in, invite someone and complete the invite from the returned URL via A7/A8.

## S3 — Projects, tasks, holidays, calendar

**Read:** `docs/api_specification.md` §2.3, §2.4, §2.8 · `docs/database_schema.md` §0.2,
§1.2, §1.3, §1.8, §5.0, §5.3 · `docs/requirments_doc.md` §7, §15, §16.

**Build:** **P1–P5, T1, HD1–HD4**; `calendarService` (working days, expected days per person,
week state: `holiday_week` / `on_leave` / `not_started`, project days used skipping
holidays); project progress derivation (`daysUsed`, `daysLeft`, `overdueDays`,
`hoursLogged` — hours may be 0 until S4).

**Done when:** a 20-day plan from a Monday shows 19 left after that Monday and skips an
added holiday; "overdue by N" appears on day 21; adding or removing a holiday changes
nothing stored; manager-only and admin-only routes enforce their roles.

## S4 — Reports, days, submit, week reads

**Read:** `docs/api_specification.md` §2.5, U7/U8 in §2.2, §3, §4 · `docs/database_schema.md`
§1.4–§1.7, §3.1, §3.3 (post a day, submit, autosave), §3.5, §5.0, §5.0b ·
`docs/tech_stack.md` §3.1 · `docs/requirments_doc.md` §2, §3, §4.

**Build:** `policies/reportPolicy.js` and `policies/submitRules.js`; **R1–R13, U7, U8**;
`WeekView` assembly (`dayStates`, `expectedDays`, `state`, `tasks`, `hoursByType`,
`contentSource`, `canSubmit`, `submitBlockers`, `Day.hours`, `carriedOver`); the day-save write
order (create report on first post, new tasks, sync `content.tasks`, prune orphan
resolutions); atomic submit with revision allocation; `U7` returns every week on the team
(`ReportRow` or `WeekRow`).

**Tests:** API §6.1 (policy), §6.2 (scope parity, **no private layer leaks**), §6.3 (daily
updates), §6.4 (report access). Concurrent submit → one 200, one 409, one revision.

**Done when:** a member can post five days, set statuses, submit; a teammate reads the days
but gets `content: null`; a manager reading a Draft gets days only; a manager reading a
`needs_correction` report gets the sent-back revision.

## S5 — Comments, review, "new" markers

**Read:** `docs/api_specification.md` §2.6, §2.7, §2.10, §3 · `docs/database_schema.md` §1.9,
§1.10, §3.2, §3.3 (comment, send back, approve), §5.1, §5.4 · `docs/requirments_doc.md`
§2.1, §4, §17.

**Build:** **C1–C5, V1–V4, N1**; `reviewService`; the 10-minute window on the server clock;
the revision pin and atomic claim on approve / send back; self-review guard; `isNew`
decoration on rows, days and threads; `markerService`.

**Tests:** API §6.5 (review access), the 10-minute window with an injected clock, comment
rules, the stale-pin `409`, approving an unrequested report.

**Done when:** the full correction cycle in `database_schema.md` §3.4 works end to end.

## S6 — Dashboard and seed

**Read:** `docs/api_specification.md` §2.9 · `docs/database_schema.md` §5 (all), §8 ·
`docs/tech_stack.md` §6.8 · `docs/requirments_doc.md` §6.

**Build:** **D1–D8** (users-first pipelines, `status` filter on D2 only, D6 not week-scoped);
`npm run db:sample` (and `db:empty`, which wipes and inserts nothing; owner decision, see `PROGRESS.md`) — deterministic, relative to the current week, all seven
collections, every state in the current week (`database_schema.md` §8).

**Done when:** after `npm run db:sample`, every status and week state is reachable from the API
without a write, and a full run of the manual backend checks in
`docs/development_approach_doc.md` passes.

---

# Part B — Client

Build in this order. The demo's handlers are written **inside each stage**, not at the end.

## C1 — Foundation: lib, apiClient, auth, base UI, `/design`

**Read:** `docs/frontend_architecture.md` §1–§3, §5.1–§5.4, §6.1 · `docs/tech_stack.md` §6.1–§6.5,
§6.7 · `docs/product_design_system.md` §0, §2, §6.0–§6.9, §6.11–§6.19, §9 · `docs/project_structure.md` §3.

**Build**
- Tokens exactly: `styles/tokens.css` (design §9.3), the `@theme` block (§9.4),
  `base.css`, `index.css`, font loading and the theme-flash script (§9.2).
- `lib/` (everything in `frontend_architecture.md` §13.1 step 2), `apiClient` + `api`,
  `authService`, `AuthContext` with boot and session expiry, `ReAuthModal`, `ProtectedRoute`,
  `SessionLayout`, the four auth screens, `demo/` skeleton (`bootDemo`, adapter that rejects
  ≥ 400, auth handlers).
- The `ui/` primitives needed so far (`Button`, `Input`, `Field`, `Select`, `Textarea`,
  `Checkbox`, `Switch`, `StatusChip`, `Panel`, `Modal`, `ConfirmDialog`, `Toaster`,
  `Tooltip`, `InlineError`, `Skeleton`, `EmptyState`, `Avatar`) and the **`/design`**
  dev-only page rendering each in every state, both themes.

**Done when:** you can sign up, sign in, sign out; a stale token goes to `/signin` with no
modal flash; expiring the token mid-page opens the modal; `bg-indigo-500` / `rounded-lg`
fail to compile; the parity test passes; `/design` shows light and dark. **Visual checks:
unverified unless rendered — list them for the owner.**

## C2 — Shell, tables, filters, URL state

**Read:** `docs/frontend_architecture.md` §4, §7, §8.1–§8.2, §8.4 · `docs/product_design_system.md`
§1, §5, §6.5, §6.10, §6.20–§6.22, §10 · `docs/project_structure.md` §3.2.

**Build:** `AppShell`, `Sidebar` + `navItems`, `TopBar` + `PageHeader`, drawer/rail modes, theme
toggle, `OfflineStrip`, `RootLayout`, route table with guards and param validation,
`useUrlFilters` + `lib/urlParams`, `useWeekParam`, `Table`, `Pagination`, `FilterBar`,
`MultiSelect`, `WeekPicker`, `Tabs`, `SegmentedControl`, `QueryView`, `NotFoundPage`,
`ForbiddenPage`.

**Done when:** a member typing `/review` sees the 403 state in the shell and no manager nav
item exists in the DOM; sort/page/filter survive a refresh and the back button.

## C3 — Reading a week; comments

**Read:** `docs/frontend_architecture.md` §5.5–§5.8, §8.3 (report, comment), §9.4 ·
`docs/product_design_system.md` §3.4, §6.23, §6.24.

**Build:** `reportService`, `useWeek` / `useReport` / revisions hooks, `ReportDetailPage`
(both routes), `ReportDocument`, `DailyUpdatesBlock`, `RevisionsRail`, `CommentThread` /
`Comment` / `CommentComposer`, `useNow`, `NewMarker`, `useMarkSeen`. Demo handlers for weeks
and comments.

**Done when:** every row of the table in `frontend_architecture.md` §9.4 renders correctly
(teammate, manager on Draft, manager on Needs correction, author), against the real API.

## C4 — Writing: day panel, This week

**Read:** `docs/frontend_architecture.md` §6.3, §8.3 (report), §9.1 · `docs/product_design_system.md`
§3.1, §4.11, §6.14 · `docs/requirments_doc.md` §2.1.

**Build:** `WeekStrip`, `DayPanel`, `WorkLineRow`, `TaskPicker` + `Combobox`, `DayDraftsContext`,
`UnsavedChangesContext`, `weekActions`, `OnLeaveStrip`, `MyProjectsPanel`, `CorrectionPanel`,
`ThisWeekPage`, the project and task services/hooks. Demo handlers for days, tasks, projects.

**Done when:** post a day with lines on two projects and a new task; edit it; switch days
without losing unposted text; the top-bar primary action follows the week's state.

## C5 — The weekly form

**Read:** `docs/frontend_architecture.md` §6.2, §6.4, §9.3 · `docs/product_design_system.md`
§3.2, §4.1–§4.10 · `docs/requirments_doc.md` §2.2.

**Build:** `ReportEditPage`, `ReportForm`, `FormSection`, `SectionRail`, `TasksTable` / `TaskRow` /
`TaskCard`, `HoursByTypeGrid`, `StickyActionBar`, `AutosaveIndicator`, `useAutosave`,
`useActiveSection`, `submitChecklist`, `applyServerErrors`.

**Done when:** autosave shows all four states and never toasts; typing during a refetch
changes nothing; submit is disabled with a named reason and enabled the moment the last status
is set; a blocked submit scrolls to and focuses the first problem; a full week works at 360px.

## C6 — History, team updates, review desk, review page

**Read:** `docs/frontend_architecture.md` §9.2, §9.5–§9.7 · `docs/product_design_system.md`
§3.3, §3.5, §3.6, §3.16.

**Build:** `ReportHistoryPage`, `TeamUpdatesPage` + `DayTabs` + `PersonUpdate`, `ReviewDeskPage`,
`ReviewPage`, `ReviewActionPanel`, `WeekComments`, `useNextInQueue`, review hooks. Demo handlers.

**Done when:** the review desk never lists your own report; approve / send back pin the
revision and a resubmitted report shows the stale-version banner; "Next in review desk" works.

## C7 — Dashboard and charts

**Read:** `docs/frontend_architecture.md` §9.8, §10 · `docs/product_design_system.md` §3.7, §7, §8.

**Build:** the seven dashboard blocks, each its own query and `QueryView`, `ChartContainer`,
`ChartTooltip`, `chartTheme`, the four charts, `ProjectsTable`, `UpdatesCell`.

**Done when:** the `status` URL parameter changes the team table and nothing else; each block
fails independently; no chart uses a hex or a default legend/tooltip; the seven task-type
colours match the day panel and the form.

## C8 — Projects, users, holidays, people, profile, account

**Read:** `docs/frontend_architecture.md` §9.9–§9.14 · `docs/product_design_system.md` §3.8–§3.11,
§3.15, §3.17.

**Build:** each page with its modals; `PlanModal`; the link state for invites and resets
(component-state only); `lib/permissions.userActions`; inline role change with revert; leave
toggles; the People search-overrides-status rule; the profile's every-week history with
non-clickable `WeekRow`s.

**Done when:** a link never appears in the query cache after its modal closes; admin-vs-owner
row rules match `requirments_doc.md` §11.2–§11.3; Make owner works and the actor's `Me` refreshes.

## C9 — "New" markers, system states, print

**Read:** `docs/frontend_architecture.md` §9.17, §12 · `docs/product_design_system.md` §3.13, §6.24,
§3.4 (print).

**Build:** sidebar dots and review-desk count from N1 / V4, `isNew` markers everywhere they
appear, the error boundary, the print stylesheet, focus-on-route-change, document titles.

**Done when:** opening a week shows its markers once and not on reopening.

## C10 — Demo and landing page

**Read:** `docs/frontend_architecture.md` §9.16, §9.18, §11 · `docs/product_design_system.md` §3.14 ·
`docs/brand_design_strategy.md` §6.0, §6.3, §6.4, §8, §10, §12 · **`landing-reference/index.html`**.

**Build**
- Demo: second router under `/demo`, `DemoEntryPage`, `DemoBar`, the `SAMPLE DATA` pill,
  `fixtures.js` (relative dates, the cast in brand §10), every handler complete, latency,
  `demoCoverage.test.js` passing.
- Landing page: port `v11/index.html` to `LandingPage` + `components/marketing/` +
  `styles/landing.css` (scoped to `.landing`) + `hooks/useLandingMotion.js`. Keep its copy.
  **Add** the bootstrap swap to "Create your account". Load Bricolage Grotesque from this
  page only. **No landing token or font may reach the app or the demo.**

**Done when:** the demo works with the API stopped and every perspective can do what its role
can; a refresh under `/demo` returns to the chooser; the landing page is green and the app is
not; `grep -r "Bricolage\|#123F35\|#F2B880" client/src` matches only the landing files.

## C11 — Verification, deployment, README

**Read:** `docs/development_approach_doc.md` "Verifying What Gets Built" · `docs/product_design_system.md`
§13 · `docs/tech_stack.md` §7 · `docs/frontend_architecture.md` §13.2.

**Do:** run the three end-to-end walkthroughs and every checklist, fix what fails, write the
README (setup, env, seed, demo, deployment). **Ask the owner** before creating Vercel, Render
or Atlas resources, then follow `tech_stack.md` §7.

---

# Known open items — take the default, flag, do not block

| Item | Default to build | Where |
| --- | --- | --- |
| Colours `--c7` (Research & study) and three dark chart colours need the owner's sign-off | Build with the documented values | design §0.3 |
| The "starting up" boot state has no design spec | Glyph, then after 3 s one `--mut` line | frontend FA13 |
| Refresh under `/demo` returns to the chooser | As documented | frontend FA1 |
| Landing CTA while the bootstrap check is pending or failed | Demo primary, no signup link | frontend FA14 |
| Week-thread permissions have no server flag | Derive on the client per `frontend_architecture.md` §8.3 | frontend G1 |
| `U10` is "on leave now" only | Show the on-leave line for the current week only | frontend G2 |
| Person filters can't be limited to who was on the team that week | `useUsers({ limit: 100 })` | frontend G3 |
| The 17 judgement calls K1–K17 | As written in the documents | `docs/reconciliation_changelog.md` Pass 4 |

Record every one you hit in `PROGRESS.md` so the owner can confirm or change it.

# What not to do

- Do not add TypeScript, a UI kit, a CSS-in-JS library, a state library, a table library, an
  email provider or a calendar library.
- Do not create `/api` endpoints that the API spec does not list, or change a payload shape.
- Do not put the demo, the green theme or any server concern into the wrong place — see `CLAUDE.md`.
- Do not skip a failing test, delete a check, or weaken a policy to make a stage pass.
- Do not start the next stage.
