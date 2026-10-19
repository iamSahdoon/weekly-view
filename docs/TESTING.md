# Testing WeeklyView

How the automated tests work, what they prove, how to run them on Windows, and how to add one.
It is written for the owner, for new contributors and for anyone reading the project to judge it.

Everything here was checked against the test files and by running the suites on 2026-10-19.
The counts will grow as tests are added; re-run the suites (§5) for today's numbers.

## Contents

1. [Overview](#1-overview)
2. [Types of tests](#2-types-of-tests)
3. [How the tests are built](#3-how-the-tests-are-built)
4. [What is tested, and the expected results](#4-what-is-tested-and-the-expected-results)
5. [How to run the tests (Windows)](#5-how-to-run-the-tests-windows)
6. [How to add a new test](#6-how-to-add-a-new-test)
7. [What is not covered](#7-what-is-not-covered)
8. [Related documents](#8-related-documents)

---

## 1. Overview

**What the suite protects.** The rules that would hurt people if they broke:

- **Privacy.** A teammate reads your daily updates but never your end-of-week content or your
  week comments. A manager reads a Draft's days but not its content. These are checked on every
  read route.
- **Roles.** Members, managers, admins and the owner can each do only what they should, and the
  owner's account is protected.
- **Review.** Nobody reviews their own report; two managers acting at once produce one result; a
  stale version cannot be approved.
- **Data rules.** Days that are not expected (future, holiday, leave, before joining), the
  10-minute comment window, quarter-hour hours, one owner, one use per link.
- **The demo and the tour.** The in-browser demo answers every call the app can make, and the
  guided tour covers every feature in the user manual.
- **The two looks.** The green landing page never leaks into the cobalt app.

**Current counts** (a full run on 2026-10-19: every test passed; `npm run lint` was clean):

| Side | Test files | Tests |
| --- | ---: | ---: |
| Server | 21 | **415** |
| Client | 52 | **692** |
| **Total** | **73** | **1,107** |

A test is one `it(...)`. A test written with `it.each([...])` counts once per row.

Server, by folder (`server/tests/`):

| Folder | Files | Tests | What it holds |
| --- | ---: | ---: | --- |
| `rbac/` | 9 | 257 | Real HTTP requests to the real app: roles, privacy, review, dashboard, projects, markers |
| `foundation/` | 7 | 60 | App shell, config, middleware, models, indexes, week maths, the test database itself |
| `policy/` | 2 | 37 | Permission and submit rules as pure functions |
| `seed/` | 1 | 25 | The sample dataset and `db:empty` / `db:sample` |
| `scripts/` | 1 | 21 | `owner:reset-link` |
| `calendar/` | 1 | 15 | Working days, expected days, week state, project days used |
| `helpers/` | 4 | — | Shared setup, not tests |

Client, by folder (`client/src/**/__tests__/`):

| Folder | Files | Tests | What it holds |
| --- | ---: | ---: | --- |
| `demo/` | 11 | 238 | The demo adapter, its coverage, the entry page, the guided tour |
| `lib/` | 20 | 159 | Pure logic: dates, permissions, URL params, chart theme, constants parity |
| `pages/` | 6 | 102 | Whole pages rendered to HTML: dashboard, review, This week, people |
| `styles/` | 1 | 51 | Landing/app style isolation |
| `components/marketing/` | 1 | 44 | The landing page |
| `components/auth/` | 1 | 29 | Sign-in, sign-up and reset screens |
| `hooks/` | 3 | 17 | Autosave state machine, optimistic toggles, user queries |
| `routes/` | 2 | 16 | Route guards and fallbacks |
| `components/shell/` | 3 | 16 | Error boundary, sidebar markers, nav items |
| `schemas/` | 1 | 13 | The report form's Zod schema |
| `context/` | 1 | 3 | Auth reducer |
| `components/project/` | 1 | 2 | Plan fields |
| `components/ui/` | 1 | 2 | `QueryView` |

**The tools** (one sentence each):

- **Vitest** is the test runner for both sides: it finds `*.test.js(x)` files, runs them, and
  provides `describe` / `it` / `expect`, fake clocks and mocks.
- **Supertest** sends real HTTP requests to the Express app from inside the test, without opening
  a port yourself, and returns the status and JSON body.
- **mongodb-memory-server** starts a throw-away MongoDB inside the test run (downloading the
  `mongod` program once), so tests never need Atlas or an installed database.

---

## 2. Types of tests

### 2.1 Server API / RBAC tests — `server/tests/rbac/`

*Question answered: "if this person makes this request, what exactly does the API answer, and what
did it write?"* The test builds users and data, sends a real HTTP request to the real Express app
with Supertest, and checks the status, the response envelope and the data. The whole chain runs:
validation, authentication, role check, controller, service, model and a real (in-memory) MongoDB.

Example — `rbac/reviewAccess.test.js`, test *"manager A approving or sending back A's own → 403
SELF_REVIEW_FORBIDDEN; manager B → 200"*. Other files in the folder: `auth`, `adminRoutes`,
`dailyUpdates`, `reportAccess`, `scopeParity`, `dashboard`, `projects`, `markers`.

Test names carry the numbers of `api_specification.md` §6 ("27 · nobody reviews their own
report"), so a failing test points straight at the rule.

### 2.2 Server policy unit tests — `server/tests/policy/`

*Question answered: "given this actor and this report, does the rule say yes or no?"* The
permission rules live as pure functions in `server/src/policies/`. These tests call them directly
with plain objects: no HTTP, no database. They run in milliseconds and pin the rule itself; the
RBAC tests then prove the routes use it.

Example — `policy/reportPolicy.test.js`, test *"a manager or admin on another's: draft → false,
every other status → true"* (that is `canReadContent`). The other file is `submitRules.test.js`
(*"names each missing day, in day order, and each task without a status"*).

### 2.3 Server foundation tests — `server/tests/foundation/`

*Question answered: "is the ground the RBAC tests stand on solid?"* A broken foundation should fail
here first, with a clear name, instead of showing up as fifty confusing RBAC failures.

| File | Checks |
| --- | --- |
| `env.test.js` | Config parsing; production refuses the example `JWT_SECRET` (it even starts a real Node process and checks it exits) |
| `middleware.test.js` | `validate`, `authenticate`, `authorize`, `errorHandler` on a throw-away Express app wired with the real middleware |
| `models.test.js` | Mongoose rules: quarter hours only, one key blocker, send-back comment of at least 10 characters |
| `indexes.test.js` | Every index in `database_schema.md` §6 exists with its options, and nothing else; exactly seven collections |
| `weeks.test.js` | ISO week keys, Monday–Friday, year boundaries, paging meta |
| `app.test.js` | Health route, 404 envelope, non-JSON body → 422, CORS, helmet headers |
| `testDb.test.js` | The test database stays connected while the clock is frozen (a regression test for the harness) |

Example — `foundation/middleware.test.js`, test *"answers 401 UNAUTHENTICATED: stale
tokenVersion"* (one of nine bad-token cases run through `it.each`).

### 2.4 Server calendar, seed and script tests

- **Calendar** — `calendar/calendarService.test.js`: working days against a set of holidays,
  expected days per person, the week-state order, project days used. Example: *"leave: the day it
  is switched on is away, the day it is switched off is back"*.
- **Seed** — `seed/seed.test.js`: the sample dataset is deterministic, relative to the week it runs
  in, holds every status and week state, and `db:empty` / `db:sample` refuse to run when
  `NODE_ENV` is `production`. Example: *"db:sample refuses and touches nothing"*.
- **Scripts** — `scripts/ownerResetLink.test.js`: the owner's recovery link is hashed, single-use,
  valid for 24 hours, and changes no password until used. Example: *"is a valid, hashed,
  single-use, 24-hour reset link for the owner only"*; it also covers how PowerShell and npm hand
  the site address to the script.

### 2.5 Client logic unit tests — `client/src/lib/__tests__/`

*Question answered: "does this plain function give the right answer?"* No React, no browser:
import the function, call it, check the result. The `schemas/` and `context/` tests work the
same way.

Example — `lib/__tests__/dates.test.js`, test *"validates weekKeys, W53 only where it exists"*.
Others: `permissions`, `submitChecklist`, `weekActions`, `urlParams`, `normalizeError`,
`dashboardData`, `passwordStrength`.

### 2.6 Client rendered component and page tests

*Question answered: "when this component or page gets this data, what does it show?"* The test
renders the component to an HTML string with `react-dom/server` (`renderToStaticMarkup`) and
checks the text and attributes in that string. It needs no browser and no fake DOM (see §3.5).
This is how 16 test files work, including every file in `pages/__tests__/`.

Example — `components/ui/__tests__/QueryView.test.jsx`, test *"keeps the loaded data when a refetch
fails"*. A fuller one: `pages/__tests__/ReviewPages.test.jsx` renders the review desk and review
page over the demo's data, as a manager, on a frozen Wednesday.

Because nothing is clicked in these tests, what a click does is covered elsewhere: the **hooks**
tests (`hooks/__tests__/`) drive the state machines and mutation options directly (the autosave
timer, the optimistic toggles that roll back on error), and the **demo** tests call the services.

### 2.7 Demo adapter and coverage tests — `client/src/demo/__tests__/`

The demo is the real app running on hard-coded data through an in-browser axios adapter. These
tests keep it honest.

- **Every service function has a demo handler.** `demoCoverage.test.js` loads every
  `services/*Service.js` file and fails with the missing names if any function has no case
  (*"has a case for every service function"*). Then it runs each function through the demo adapter
  and checks the keys the page reads (*"answers reportService.getMyWeek"*, one test per function).
  Last, *"never reaches the network: an unknown route is the 404 envelope"*.
  Since every API call goes service → api → `apiClient`, this is the "every API call has a demo
  handler" guarantee.
- **The demo applies the server's rules.** `demoWeeks`, `demoReview`, `demoContent`, `demoDays`,
  `demoPeople`, `demoDashboard` and `demoMarkers` repeat the important server rules and codes
  against the demo (a teammate gets the days and no content; a stale version is refused; a
  9-character send-back is a 422). Example: `demoReview.test.js`, *"never lists the caller's own
  report, under any filter"*.
- **The cast.** `demoCast.test.js` checks the eight people and the data every dashboard state needs.
- **The entry page.** `demoEntry.test.jsx` renders the chooser and the demo bar.
- **Every manual feature has a tour step.** `demoTour.test.js` reads the *Feature index* table of
  `docs/USER_MANUAL.md` and fails if a feature has no tour step and no written reason in
  `NOT_IN_TOUR` (*"covers every feature of the index, or says why not"*). It does the same for the
  role bullets in `docs/requirments_doc.md`, checks that every `data-tour="…"` target exists in the
  components, checks the tour's wording (sentence case, no exclamation marks), the action-step
  behaviour, and the tooltip placement maths.

### 2.8 Guard-rail tests

Tests that protect a rule of the project rather than a feature. Most read source files as text.

| Guard | Where | What it enforces |
| --- | --- | --- |
| Landing/app style isolation | `styles/__tests__/landingIsolation.test.js` | `landing.css` is scoped to `.landing`, uses only `--l-*` tokens and `l-*` keyframes; the app's stylesheets contain no landing token, font or colour; `index.html` does not load Bricolage Grotesque |
| Client–server constant parity | `lib/__tests__/constants.parity.test.js` | The five shared value sets (`REPORT_STATUSES`, `ROLES`, `TASK_STATUSES`, `TASK_TYPES`, `WEEKDAYS`) are equal, in the same order, on both sides. The only place where `client/` reaches into `server/` |
| No hex values | `lib/__tests__/chartTheme.test.js`, `TeamDashboardPage.test.jsx`, `AuthScreens.test.jsx`, `LandingPage.test.jsx` | Charts and components use `var(--token)` only (the landing page only `var(--l-*)`) |
| Bundle split | `landingIsolation.test.js`, `demoTour.test.js` | GSAP is imported by `useLandingMotion` alone, and that hook by `LandingPage` alone; `landing.css` is imported by `LandingPage` alone; the tour is reached only through a dynamic `import()` in `RootLayout.jsx`. These check the **source**; no test builds the bundle |

### 2.9 Anything else

- **Copy and vocabulary checks.** `LandingPage.test.jsx` (*"has no pricing, workspace, booking or
  customer claims"*, *"spells the statuses exactly"*) and the tour test keep the product's
  language honest.
- **State machines without React.** `hooks/__tests__/useAutosave.test.js` runs the autosave (1200 ms
  after the last change, one request in flight, one trailing save) on a fake clock.
- **Query-client tests.** `hooks/__tests__/useReportQueries.test.js` runs the optimistic toggles'
  mutation options against a real TanStack `QueryClient` and checks the rollback.
- **Error and recovery paths.** `lib/__tests__/chunkReload.test.js` (reload once after a redeploy,
  never twice), `authRecovery.test.js` (a lost sign-up answer), `ErrorBoundary.test.jsx`.
- **Child-process tests.** A few server tests start a real Node process (`spawnSync`) to prove that
  production start-up refuses the example `JWT_SECRET` and that `db:empty` refuses in production.

---

## 3. How the tests are built

### 3.1 The in-memory MongoDB

- **Replica set, not a single server.** `server/tests/helpers/testDb.js` starts a one-node
  `MongoMemoryReplSet` because submitting a report and transferring ownership use transactions,
  and transactions need a replica set.
- **One database per test file.** `testDb.js` is a Vitest `setupFiles` entry, so it runs for every
  test file: it starts a fresh replica set, connects Mongoose to it, builds every model's indexes
  (`syncIndexes()`), and stops it afterwards. Files run in parallel without seeing each other's
  data.
- **Global setup downloads `mongod` once.** `helpers/globalSetup.js` runs once before any file and
  calls `MongoBinary.getPath()`. Without it, every parallel file would start the same ~80 MB
  download and trample each other's temp file (`ENOENT` on rename, `ETXTBSY`).
- **Cleared between tests.** `testDb.js` exports `clearDb()`, which empties every collection but
  keeps the indexes. Suites that write data call it in `beforeEach`.
- **Never Atlas.** `server/vitest.config.js` sets the environment the tests run with:

  ```js
  env: {
    NODE_ENV: "test",
    MONGODB_URI: "mongodb://in-memory.invalid/weeklyview-test",   // a placeholder
    JWT_SECRET: "test-only-secret-that-is-at-least-32-characters-long",
    JWT_EXPIRES_IN: "5d",
    CLIENT_URL: "http://localhost:5173",
  },
  ```

  `config/env.js` insists on these variables at import time, so they are filled with harmless
  values. `MONGODB_URI` points at `.invalid`, a name that can never resolve; nothing connects to
  it, because `testDb.js` connects Mongoose to the in-memory server instead. The values in the
  config override whatever is in your shell, so even a real `MONGODB_URI` in your environment
  is not used. The secrets are test-only strings, not real ones.
- **Timeouts.** `hookTimeout` is 180 s (enough for the first download) and `testTimeout` is 20 s.

The client has **no Vitest config file and no setup file**: `client/vite.config.js` is picked up
(so JSX and Tailwind compile), tests run in Vitest's default Node environment, and nothing starts
a database.

### 3.2 The helpers

All in `server/tests/helpers/`:

| Helper | File | What it does |
| --- | --- | --- |
| `createUser(overrides)` | `testAuth.js` | Inserts an active user who has been on the team since 2026-01-05; pass `{ role: "manager" }`, `{ status: "removed" }` and so on |
| `bearer(user)` / `tokenFor(user)` | `testAuth.js` | The `Authorization` header value (`Bearer …`) or the bare JWT, signed with the test secret. No test builds a JWT by hand |
| `createActor(role)` | `testAuth.js` | A user, its token, and the `actor` object that services take |
| `clearDb()` | `testDb.js` | Empties every collection, keeps indexes |
| `api`, `as(user)` | `testWeeks.js` | `api` is Supertest bound to the app; `as(user)` gives `{ Authorization }` |
| `freezeAt("2026-10-02T12:00:00")` | `testWeeks.js` | Freezes the clock at that UTC time |
| `postWeek`, `putDay`, `submit`, `filedWeek`, `sendBack`, `approve`, `commentOnDay`, `commentOnWeek`, … | `testWeeks.js` | The calls a person makes, so a test can build "a submitted week" in one line |

**Frozen clocks.** Tests that depend on "today" freeze `Date` and nothing else:

```js
vi.useFakeTimers({ toFake: ["Date"] });
vi.setSystemTime(new Date("2026-10-02T12:00:00.000Z"));   // a Friday, week 2026-W40
// and in afterEach:
vi.useRealTimers();
```

Faking only `Date` matters. Faking every timer would also freeze `setTimeout`, which the database
driver and Supertest depend on. `testDb.js` has an extra guard for the driver's heartbeat
timestamp, and `foundation/testDb.test.js` proves it.

The 10-minute comment window is tested on this injected clock (*"edited at 9 min 59 s → 200; at
10 min 1 s → 403 EDIT_WINDOW_CLOSED"*), not by waiting.

Standard cast in the RBAC suites: `admin`, `managerA`, `managerB`, `memberX`, `memberY`, as in
`api_specification.md` §6.

### 3.3 The shape of a server test

Arrange → act → assert, with the clock frozen and the database emptied first. From
`rbac/reviewAccess.test.js` (shortened):

```js
let admin, managerA, managerB, memberX, memberY, project;

beforeEach(async () => {
  await clearDb();                                   // empty collections, keep indexes
  freezeAt("2026-10-02T12:00:00");                   // Friday of 2026-W40
  managerA = await createUser({ name: "Manager A.", role: "manager" });
  managerB = await createUser({ name: "Manager B.", role: "manager" });
  project  = await Project.create({ name: "Client A" });
});
afterEach(() => vi.useRealTimers());

it("manager A approving or sending back A's own → 403 SELF_REVIEW_FORBIDDEN; manager B → 200",
async () => {
  // ARRANGE: manager A posts five days and submits, asking for approval
  const view = await filedWeek(managerA, project, { requestApproval: true });
  const id = view.report._id;

  // ACT: A tries to approve their own report (an HTTP call to the real app)
  let res = await approve(id, managerA);

  // ASSERT: the status and the error envelope
  expect(res.status).toBe(403);
  expect(res.body.error).toEqual({ code: "SELF_REVIEW_FORBIDDEN" });

  // ACT + ASSERT again: a different manager succeeds
  res = await approve(id, managerB);
  expect(res.status).toBe(200);
  expect(res.body.data).toMatchObject({ state: "approved" });
  const revision = await Revision.findOne({ report: id }).lean();   // check the database too
  expect(String(revision.reviewedBy)).toBe(String(managerB._id));
});
```

Every response is the envelope `{ success, data, message, error: { code } }`, so tests assert
`res.status` and `res.body.error` (an exact `{ code }`) or `res.body.data`. For a 409 the error
also carries the report's `status`, and a 422 carries `fields`.

Short examples of the other server kinds:

```js
// POLICY — policy/reportPolicy.test.js: plain objects in, true/false out
it("a manager or admin on another's: draft → false, every other status → true", () => {
  for (const reader of [managerA, admin]) {
    expect(canReadContent(reader, reportOf("x", "draft"))).toBe(false);
    for (const status of ["submitted", "needs_correction", "approved"])
      expect(canReadContent(reader, reportOf("x", status))).toBe(true);
  }
});

// FOUNDATION — foundation/middleware.test.js: a throw-away app with the real middleware
testApp.get("/manager", validate(z.object({})), authenticate, authorize("manager"),
  (req, res) => ok(res, { role: req.user.role }));
it.each([["member", 403], ["manager", 200], ["admin", 200]])(
  "authorize('manager') gives a %s %i", async (role, status) => {
    const user = await createUser({ role });
    const res = await request(testApp).get("/manager").set("Authorization", bearer(user));
    expect(res.status).toBe(status);
  });
```

### 3.4 Why some RBAC tests look long

A few tests are one story, on purpose: for example *"submit → send back → correct → resubmit →
another manager approves"* walks the whole correction cycle of `database_schema.md` §3.4, and the
concurrency tests send two requests at once and assert that exactly one wins. These are the cases
where separate small tests would hide the bug.

### 3.5 How client tests avoid needing a browser

Vitest runs client tests in plain Node: there is no `jsdom`, no `happy-dom`, no Testing Library
in `client/package.json`, and no window. Instead:

1. **Render to a string.** `renderToStaticMarkup` from `react-dom/server` turns a component into
   HTML. The test wraps it in the providers the real app uses (an `AuthContext.Provider` with a
   chosen role, a `MemoryRouter` set to a chosen URL, a `QueryClientProvider`) and asserts on the
   string.
2. **Data comes from the demo.** Page tests set `apiClient.defaults.adapter` to the demo adapter
   (`createDemoAdapter(store)`), so the page's real service calls are answered from an in-memory
   store, with no network. They prime the query cache with it, then render.
3. **Time is frozen** with the same `vi.useFakeTimers({ toFake: ["Date"] })`, on a fixed Wednesday,
   so "today", "this week" and "overdue" are stable.
4. **Behaviour is tested below the UI.** Hooks and state machines are exported as plain functions
   (`createAutosave`, `resolveBlockerOptions`), so tests call them directly.
5. **Browser-only React features** (an error boundary catching a thrown render) are exercised
   through the class's own methods; `ErrorBoundary.test.jsx` says so in its header.
6. **Source checks** read component files with `readFileSync` and check imports, selectors and
   colours.

Short examples:

```jsx
// COMPONENT — components/ui/__tests__/QueryView.test.jsx
const render = (query) =>
  renderToStaticMarkup(                                // React → an HTML string, no browser
    <QueryView query={query} skeleton={<p>skeleton</p>} error={<p>failed</p>}>
      {(data) => <p>{data.text}</p>}
    </QueryView>,
  );
it("keeps the loaded data when a refetch fails", () => {
  const html = render({ isPending: false, isError: true, isFetching: false,
                        data: { text: "loaded" } });
  expect(html).toContain("<p>loaded</p>");             // assert on the string
  expect(html).not.toContain("failed");
});
```

```js
// LOGIC — lib/__tests__/dates.test.js: no React at all
expect(isWeekKey("2026-W53")).toBe(true);              // 2026 has 53 ISO weeks
expect(isWeekKey("2027-W53")).toBe(false);

// DEMO COVERAGE — demo/__tests__/demoCoverage.test.js
const services = import.meta.glob("../../services/*Service.js", { eager: true });
it("has a case for every service function", () => {
  const missing = [];
  for (const [path, module] of Object.entries(services))
    for (const [name] of functionsOf(module))
      if (!CASES[moduleName(path)]?.[name]) missing.push(`${moduleName(path)}.${name}`);
  expect(missing).toEqual([]);                         // a new service function fails here
});

// GUARD RAIL — lib/__tests__/constants.parity.test.js
it(`${name} matches the server`, () => {
  expect([...client[name]]).toEqual([...values]);      // order is compared too
});
```

---

## 4. What is tested, and the expected results

Error codes are those of `api_specification.md` §1.9. "Member X / Y", "manager A / B", "admin" and
"owner" are as in §6 of that document. "Frozen" means the clock is fixed on a day in week
2026-W40 (Friday 2 October 2026 unless noted). The route labels (R5, V3, U7 …) are the API
specification's. This is a selection of the important rules, not one row per test.

### 4.1 Auth and sign-up — `rbac/auth.test.js`, `foundation/middleware.test.js`, `foundation/env.test.js`

| What is checked | Who / setup | Expected result |
| --- | --- | --- |
| Sign-up on an empty database | Nobody signed in, zero users | A1 says available; A2 → 201; the first account is the owner and an admin |
| Sign-up when someone exists | Non-empty database | 403 `SIGNUP_CLOSED` |
| Two sign-ups at the same moment | Empty database, concurrent | One 201, one 403 `SIGNUP_CLOSED` |
| Both pass the "is it empty" check | Forced race | The unique partial index on `isOwner` decides; still one owner |
| Login failure, every cause | Unknown email, wrong password, removed user, invited user | 401 `INVALID_CREDENTIALS`, the same message each time |
| Login email case | `Sanduni@Example.com` | Signs in |
| Bad token | No header, not Bearer, garbage, wrong secret, expired, stale `tokenVersion`, removed / invited / deleted user | 401 `UNAUTHENTICATED` |
| Malformed body without a token | Validation runs first | 422 `VALIDATION_FAILED`, not 401 |
| Wrong role on a protected route | Member on a manager route | 403 `FORBIDDEN`; manager and admin 200 |
| Wrong current password on change | Signed in | 422 `CURRENT_PASSWORD_INCORRECT` (never 401) |
| Password changed | Signed in | A working new token; other sessions are signed out |
| Link already used, expired, unknown, or wrong purpose | Anyone, with the token in the **body** | 404 `LINK_INVALID`, one identical answer for all |
| Two people accept one invite at once | Concurrent | Exactly one succeeds |
| A new link is issued | Re-issue | The previous link stops working |
| What is stored for a link | Read the database | Only the SHA-256 hash, never the token |
| Anything unhandled | Route throws | 500 `INTERNAL_ERROR`, no internals in the body |
| Production with the example `JWT_SECRET` | `NODE_ENV=production` | Config rejected; a real start-up process exits with the reason |

### 4.2 Daily updates — `rbac/dailyUpdates.test.js`

| What is checked | Who / setup | Expected result |
| --- | --- | --- |
| First update of the week | Member X, R5 for today | 200; the week's report now exists as a Draft |
| Two first posts at once | Member X, concurrent | One report with both days |
| Future day | Member X, R5 for a weekday later than today | 422 `DAY_NOT_EXPECTED`, `reason: "future"` (the next day is allowed for UTC+14) |
| Holiday, leave day, day before joining | Member X | 422 `DAY_NOT_EXPECTED`, `reason` `holiday` · `leave` · `not_on_team` |
| Week after the current one, or before the person's work periods | Member X | 422 `WEEK_OUT_OF_RANGE` |
| Another person's task | Member X names Y's task id | 404 `TASK_NOT_FOUND`; nothing written |
| New task on an inactive / unknown project | Member X | 422 `PROJECT_INACTIVE` / 404 `PROJECT_NOT_FOUND` |
| Edit a day on a submitted week | Author | 409 `REPORT_STATE_CHANGED` with the status |
| Teammate reads a day | Member Y, R12 and U8 on X's week | 200, X's days present, `content: null`, private text appears nowhere |
| Teammate comments on a closed day | Member Y, C1 | 403 `COMMENT_NOT_ALLOWED` |
| …after the author or a manager opens it (R11) | Member Y | 201; closed again → 403 for comments and replies |
| Manager comments on their own update | Manager A | 201 |
| Edit a comment inside / outside the window | Writer, clock at 9 min 59 s / 10 min 1 s | 200 / 403 `EDIT_WINDOW_CLOSED` |
| Edit or delete someone else's comment | Anyone else, inside the window | 403 |
| Delete a comment that has a reply | Writer | 409 `COMMENT_HAS_REPLIES`; editing still works |
| Comment on a day that was never posted | Manager | 404 `REPORT_NOT_FOUND`; unknown thread 404 `THREAD_NOT_FOUND` |
| Drop a blocker when editing a day | Author, R5 | Its resolution is removed with it |
| Mark one blocker as key (R6) | Author | Every other blocker's `isKey` clears |

### 4.3 Weekly reports and privacy layers — `rbac/reportAccess.test.js`, `rbac/scopeParity.test.js`

| What is checked | Who / setup | Expected result |
| --- | --- | --- |
| Teammate reads a week | Member Y on X's report | 200, days present, `content: null`, `contentSource: "withheld"`, `weekComments: null`, `canSubmit: null` |
| Manager reads a Draft | Manager A on Y's Draft | 200, days only, `contentSource: "withheld"` |
| Manager reads a sent-back week | Manager A on Y's `needs_correction` | `contentSource: "revision"` (the sent-back version); the author Y gets `"live"` |
| Write on someone else's report | Member Y, R6 autosave or R7 submit on X's | 403 `REPORT_FORBIDDEN` |
| Unknown / malformed id | Anyone | A well-formed unknown ObjectId → 404; `not-an-id` → 422 |
| List scope equals the single-report rule | Member, manager, admin; fixed set of reports | The rows carrying content are exactly the reports `canReadContent` allows |
| No private layer leaks | Every read endpoint, every non-author role | No Draft `content`, task status, note or week comment in any response |
| Submit with a missing expected day | Author, R7 | 422 `VALIDATION_FAILED`, `fields["days.thu"]`; if Thursday is a holiday → 200 |
| Submit with a task that has no status | Author | 422 with `fields["tasks.<id>.status"]` |
| Submit twice | Author, concurrently | One 200, one 409 `REPORT_STATE_CHANGED`; exactly one revision |
| Submit a submitted report | Author | 409; a `needs_correction` report resubmits as revision 2 |
| Resolve a blocker | Author or manager on a Draft or Approved report | 200; a teammate → 403; unknown blocker → 404 `BLOCKER_NOT_FOUND` |
| Autosave | Author, R6 | Only status and note on tasks already listed; a partial update keeps what it doesn't name |
| Revision history (R8, R9) | Author and managers (once submitted) | 200; a teammate → 403; a manager on a Draft → 403 |
| History of a person (U7) | Manager | Every week on the team, with computed rows for weeks with no report |

### 4.4 Review: approve and send back — `rbac/reviewAccess.test.js`

| What is checked | Who / setup | Expected result |
| --- | --- | --- |
| A member tries any review action | Member Y: approve, send back, review desk, count, week comment | 403 `FORBIDDEN`; the report is unchanged |
| A manager approves or sends back their own report | Manager A on A's submitted report | 403 `SELF_REVIEW_FORBIDDEN`; manager B on the same report → 200 |
| Approve a report that did not ask for approval | Manager B | 200 (approval is optional) |
| An admin approves a manager's report | Admin | 200 |
| Approve or send back at the wrong status | Manager B on a Draft / an Approved / a `needs_correction` report | 409 `REPORT_STATE_CHANGED` with the current `status` |
| Unknown / malformed report id | Manager | 404 `REPORT_NOT_FOUND` / 422 |
| Two managers approve at once | A and B, concurrent | One 200, one 409; the winner's `reviewedBy` stands |
| An approve and a send-back at once | Concurrent | Exactly one outcome on the revision and the report |
| Approve an old version | B approves `revisionNumber: 1` after revision 2 was submitted | 409 `REPORT_STATE_CHANGED`; nothing written |
| Send back with a short comment | 9 characters | 422 `VALIDATION_FAILED`, `fields.comment` |
| Send back with a valid comment | 10+ characters | 200; a `send_back` week thread on that revision's number |
| Delete the send-back comment | Its writer, inside the window | 409 `COMMENT_HAS_REPLIES`; editing it still works; a plain week comment can be deleted |
| Week comment on a Draft / on your own week | Manager | 409 `REPORT_STATE_CHANGED` / 403 `COMMENT_NOT_ALLOWED` |
| Week comment on a submitted or approved week | Manager B, admin | 201 |
| Review desk (V3) | Manager | Only approval-requested by default; `approval=all` adds the rest; never the actor's own report, even with `person=<self>` |
| The whole correction cycle | Member files → A sends back → member corrects and resubmits → B approves | Three revisions, the right states and comments at each step |

### 4.5 Dashboard — `rbac/dashboard.test.js`

| What is checked | Who / setup | Expected result |
| --- | --- | --- |
| Role gate | Signed out / member / manager and admin | 401 / 403 `FORBIDDEN` / 200, on every dashboard endpoint |
| Bad parameters | Missing or invalid `weekKey`, unknown sort, window not 4 / 8 / 12 | 422 `VALIDATION_FAILED` |
| Unknown person (D7) | Manager | 404 `USER_NOT_FOUND`; a malformed id → 422 |
| Who counts as filed | D1 | Submitted, Needs correction and Approved count; people who filed nothing are expected; people on leave are not |
| All-holiday week | D1 | Expects nobody; the rate is `null`, not 0 |
| Status filter | D1 / D2 | Changes the team table and nothing else |
| No private content in the team table | D2 on a Draft | No task statuses, notes or content |
| Needs-correction row | D2 | Read from the sent-back revision |
| Recent activity (D6) | Manager | The latest eight events, newest first, whatever the week |
| Hours (D4, D5) | Manager | Seven task types in fixed order; Draft weeks included |
| Projects table (D8) | Manager | Active projects with a plan, people sorted by total hours |

### 4.6 Projects and tasks — `rbac/projects.test.js`

| What is checked | Who / setup | Expected result |
| --- | --- | --- |
| Create a project | Manager, P2 | 201 with members and a plan |
| Duplicate name | Any case, active or inactive project | 409 `PROJECT_NAME_TAKEN` |
| Bad plan | Weekend start, 0 or 1001 days, 1.5 days, 0 hours, `2026-02-30` | 422 `VALIDATION_FAILED` naming the field (`plan.startDate`, `plan.plannedDays` …) |
| Project writes by a member | Member, P2–P5 | 403 `FORBIDDEN` |
| What a member sees | P1 | Base shape; progress only on projects they are assigned to; a manager sees progress on every planned project |
| Unknown project | P3 / P4 | 404 `PROJECT_NOT_FOUND` |
| Progress over time | A 20-day plan starting on a Monday | 19 left after that Monday; untouched before the start; "overdue by N" on day 21; an added holiday is skipped |
| Extend the plan | P4 | The earlier plan stays in the history |
| Deactivate | P5 | Idempotent; tasks untouched; the name stays reserved |
| My tasks | T1 | Only the actor's tasks, open unless `includeDone` |

### 4.7 People, admin and the owner's protections — `rbac/adminRoutes.test.js`

| What is checked | Who / setup | Expected result |
| --- | --- | --- |
| Manager or member on admin routes | Manager on U3–U6, U11–U13; member on U1–U3, U5–U7 | 403 `FORBIDDEN`; no token → 401 |
| An admin changes themselves | Admin: own role, removal, own email | 403 `CANNOT_MODIFY_SELF` |
| An admin touches the owner | Role, remove, email, reset link | 403 `PROTECTED_ACCOUNT` |
| An admin touches another admin | Same actions | 403 `OWNER_ONLY`; the owner doing it → 200 |
| An admin promotes someone to admin, or invites at role admin | Non-owner admin | 403 `OWNER_ONLY` |
| Transfer ownership | Owner → manager M | 200; exactly one `isOwner`; M is now an admin; M's old token → 401 |
| Transfer by an admin | Non-owner admin, U11 | 403 `OWNER_ONLY` |
| Transfer to a member or an inactive person | Owner | 409 `USER_STATE_CHANGED` |
| Change an email | Admin | The person's old token → 401; they sign in with the new address; an address in use → 409 `USER_EXISTS` |
| Reset link (U13 then A8) | Admin on a member | Sets the password, ends other sessions; the same token again → 404 `LINK_INVALID`; an invite token used as a reset (and the reverse) → 404 |
| Remove a person | Admin | Their token → 401; an open leave period ends in the same write; removing twice → 409 `USER_STATE_CHANGED` |
| Re-invite a removed person | Admin | Same `_id`, a second work period on acceptance |
| Invite an active or invited address | Admin | 409 `USER_EXISTS` |
| People list never carries a credential | `GET /users` with live links | No token, hash or `tokenVersion` anywhere in the body |
| People list | U1 | Sorting, filtering, paging, derived `removedAt` / `linkExpiresAt` |
| Owner recovery script | `owner:reset-link` | A 24-hour, hashed, single-use reset link for the owner only; changes no password until used; a previous link stops working; "no owner" is a clean error |

### 4.8 Holidays and leave — `rbac/adminRoutes.test.js`, `calendar/calendarService.test.js`

| What is checked | Who / setup | Expected result |
| --- | --- | --- |
| Holiday writes | Manager or member, HD2–HD4 | 403 `FORBIDDEN` (admin only) |
| Add a holiday | Admin | 201; everyone can read the list by date, with the creator |
| Second holiday on a date | Admin | 409 `HOLIDAY_EXISTS` |
| Holiday on a weekend or a bad date | Admin | 422 `VALIDATION_FAILED` (`"Pick a Monday to Friday"`) |
| Rename, move or delete | Admin | Unknown id → 404 `HOLIDAY_NOT_FOUND`; delete removes the row, a second delete → 404 |
| Set your own leave | Member, U9 | 200; repeating it changes nothing |
| Set someone else's leave | Manager | 200, and the row records who set it |
| …by a member | Member sets another's | 403 `FORBIDDEN` |
| Leave on someone who is not active | Admin on a removed person / an unknown id | 409 `USER_STATE_CHANGED` with the `status` / 404 |
| Working days and holidays | Calendar | Weekends and holidays are skipped; a week reads its working days from the holidays |
| Expected days | Calendar | Leave: the day it is switched on is away, the day it is switched off is back; weeks between two work periods are not expected |
| Week state | Calendar | Derived in the documented order |
| A holiday on a day | R7 | Submission succeeds without an update for that day |

### 4.9 "New" markers — `rbac/markers.test.js`

| What is checked | Who / setup | Expected result |
| --- | --- | --- |
| A reviewer changes a status | Author | The row is new until the author opens the week |
| Your own comment | Writer | Never new for the writer |
| A manager's comment on the author's day | Author | New for the author, not for the writer |
| A reply | Teammate who commented / one who didn't | New for the first, not the second |
| Approval requests | Managers and admins | V3 and U7 rows are new until that manager opens the week; a report that didn't ask isn't a request |
| Sidebar dots (N1) | Member / manager | Member: `reviewRequests` 0, `thisWeek` / `myReports` from their own reports; manager: `reviewRequests` equals V4 |
| Sunday in a zone ahead of UTC | Clock at Sunday 13:00 UTC | Last week still counts as "this week" |
| No session | Anyone | Refused |
| Markers never reveal a private layer | A week thread on someone else's Draft; R12 rows | Nothing from the week's comments reaches a teammate or makes a manager's row new |

### 4.10 Database commands and seed — `seed/seed.test.js`, `scripts/ownerResetLink.test.js`

| What is checked | Who / setup | Expected result |
| --- | --- | --- |
| `db:sample` is deterministic | Same moment twice | Same documents, ids included; safe to re-run |
| The sample week holds every state | Frozen Thursday | Every status, week state and both approval flags; a holiday in the week; leave, correction and blockers |
| The cast logs in | `sanduni@example.com` and the sample password | One owner; the invited person's raw token is nowhere, only its hash |
| The correction cycle | Sample data | Three revisions; a send-back on a specific revision |
| Privacy in the sample | A teammate reads an open day | Sees its comment, never a Draft's content |
| Across a year boundary | Re-seed in another year | The current week is still filled |
| `db:empty` | Any database | Wipes all seven collections, keeps indexes, leaves sign-up open; safe on an empty one |
| In production | `NODE_ENV=production` | Both commands exit 1 with "Refusing to …" and touch nothing |

### 4.11 Demo and tour — `client/src/demo/__tests__/`

| What is checked | Setup | Expected result |
| --- | --- | --- |
| Every service function has a demo case | All `services/*Service.js` | The list of missing functions is empty |
| Each function answers | Run through the demo adapter | The keys the page reads are present, or the real error code (`rejects`) |
| Unknown route | `apiClient.get("/nowhere")` | `ROUTE_NOT_FOUND`, HTTP 404; nothing reaches the network |
| Demo follows the server's privacy rules | Demo adapter, frozen Wednesday | A teammate gets days and no content; a manager sees a Draft's days only; a manager sees the sent-back version, the author the live correction |
| Demo review refusals | Demo adapter | Own report refused, stale version refused, 9-character send-back refused |
| Demo dashboard | Member / bad week | Member refused with `FORBIDDEN`; missing or malformed week → 422 |
| Demo cast | Full fixtures | Eight people, a review desk with something waiting, every square the dashboard draws |
| Every manual feature has a tour step | `USER_MANUAL.md` *Feature index* | Each feature is in a step or in `NOT_IN_TOUR` with a reason; the tour names no feature that isn't in the index |
| Every role capability has a step | `requirments_doc.md` role bullets | Each is mapped to steps, in the chapter of the lowest role that has it |
| Every step has a target | `data-tour="…"` names | Each exists in the components |
| Tour wording | Steps | Sentence case, no exclamation marks, no pronouns |
| Action steps | "Do it for me" and the visitor's own action | The tour stays on the step until Next; Back and Next are held while it runs |
| Tour is a separate chunk | `RootLayout.jsx` | Reaches `demo/tour` only by a dynamic `import()` |
| Entry page | Chooser and bar | Three perspectives, tour offered first, the `SAMPLE DATA` pill |

### 4.12 Landing and auth pages — `LandingPage.test.jsx`, `AuthScreens.test.jsx`, `landingIsolation.test.js`

| What is checked | Setup | Expected result |
| --- | --- | --- |
| Call to action follows the instance | Sign-up open / closed / not yet known | Open: *Create your account* is primary, demo beside it. Closed: invite-only wording, "Already on a team? Sign in". Not known: no sign-up link |
| Links | Rendered page | Sign-in and sign-up are client-side links; every demo link is a plain page load |
| Copy honesty | Rendered page | No pricing, workspace, booking or customer claims; says it is new; labels sample data; statuses spelled exactly |
| Story order | Rendered page | Hero → before/after → the week → the dashboard → privacy → demo → FAQ → final |
| Mock-ups match the app | Rendered page | The six Updates states with a legend; the app's four metrics; the legend appears only where the squares do |
| Sign-in screens | Rendered at each state | Form first in reading order; owner sign-up only when open; a lost answer says the account may exist and offers *Sign in* |
| Style isolation | `landing.css` and the app's stylesheets | Landing selectors start at `.landing`; only `--l-*` tokens; the app contains no landing token, font or colour |
| No hex values | Landing and auth components, charts, dashboard | None; `var(--token)` only |
| Import isolation | Source files | GSAP, `landing.css` and the tour are each imported from one place only |

### 4.13 Other client areas

| Area | What is checked | Expected result |
| --- | --- | --- |
| Route guards (`routes/`) | A member opens `/review` | The 403 state ("You don’t have access to this page."), no review content, and no manager item in the nav |
| Sidebar markers | Marks supplied by the hook | A dot only on the item the mark names; the review desk count shown as a number; never offered to a member |
| This week page | Today not posted; a posted day; a missing day; a frozen week; a holiday or a day ahead | A composer for today; the posted lines with Posted and the time and Edit while the week is open; no Edit on a frozen week; no composer for a holiday or a future day |
| Review pages | A manager opens their own report | "You can’t review your own report." and no Approve / Send back / Comment only panel in the page (the server refuses it as well) |
| Review desk | The manager's own report | Not on their desk |
| Dashboard page | Each block failing on its own | The other blocks still render; no pie chart, no library legend or tooltip, no hex value |
| People pages | Admin and owner on Users; a profile; Account | The owner's row has an Owner chip; rows the viewer cannot change are disabled with their reason; *Manage users* is offered to admins only; a link token is in no cache once its modal has read it |
| Report form | `reportSchema` | Hours above zero in quarter hours with no maximum; a new task needs a name and a project; only real statuses are sent; a 422 from submit maps onto the form's fields |
| Autosave | Fake timers | Saves 1200 ms after the last change; one request in flight; one trailing save |
| Optimistic toggles | The server refuses | The cache is restored and an error toast with Retry appears |
| Stale chunk | A page chunk missing after a redeploy | One reload, never two |

---

## 5. How to run the tests (Windows)

You need Node 20 or later and Git. Open **PowerShell** in the project folder (the one that contains
`package.json`, `client` and `server`).

### 5.1 First time only: install

```powershell
cd server
npm install
cd ..
cd client
npm install
cd ..
```

Use `cd` then `npm install`, not `npm --prefix client install` (see §5.8).

### 5.2 Everything

```powershell
npm test
```

This runs the server suite and then the client suite (`npm --prefix server run test && npm --prefix
client run test`). If the server suite fails, the client suite does not run. `npm run lint` checks
both sides and is not part of `npm test`; run both before a merge.

### 5.3 Server only / client only

```powershell
npm --prefix server run test
npm --prefix client run test
```

### 5.4 A single file

Go into the folder; the root `npm test` has no way to take a filter.

```powershell
cd server
npx vitest run tests/rbac/reviewAccess.test.js
cd ..
```

```powershell
cd client
npx vitest run src/lib/__tests__/dates.test.js
cd ..
```

`npx vitest run tests/rbac` runs every file whose path contains that text. Forward slashes work in
PowerShell. `npm run test -- tests/rbac/auth.test.js` does the same from inside the folder.

### 5.5 A single test, by name

`-t` matches against the full name (describe titles plus test title), as a piece of text:

```powershell
cd server
npx vitest run tests/rbac/reviewAccess.test.js -t "SELF_REVIEW_FORBIDDEN"
npx vitest run -t "42"
```

The skipped tests are listed as skipped, which is expected (`20 tests | 19 skipped`).

### 5.6 Watch mode

There is no npm script for it, but Vitest has it built in. In `server` or `client`:

```powershell
npx vitest
```

It runs the tests, then re-runs the ones affected whenever you save a file. Press `h` for the key
list (`f` re-runs failures, `p` filters by file name, `t` by test name, `q` quits). On the server
side each re-run starts a fresh in-memory database, so a re-run takes a few seconds.

### 5.7 What success and failure look like

Success (a full run on 2026-10-19):

```text
> weeklyview-server@1.0.0 test
> vitest run
 Test Files  21 passed (21)
      Tests  415 passed (415)
   Duration  48.55s

> weeklyview-client@1.0.0 test
> vitest run
 Test Files  52 passed (52)
      Tests  692 passed (692)
   Duration  26.36s
```

A single file shows a tick, the file and its count:

```text
 ✓ tests/foundation/weeks.test.js (6 tests) 1987ms
 Test Files  1 passed (1)
      Tests  6 passed (6)
```

Failure names the test, then shows what was expected and what arrived, with the line (the example
below is a deliberately broken test, shown to illustrate the format):

```text
 ❯ demo.test.js (1 test | 1 failed) 10ms
   × approve > manager approves own report → 403 SELF_REVIEW_FORBIDDEN 9ms
     → expected 200 to be 403 // Object.is equality

 FAIL  demo.test.js > approve > manager approves own report → 403 SELF_REVIEW_FORBIDDEN
AssertionError: expected 200 to be 403 // Object.is equality
- Expected
+ Received
- 403
+ 200
 ❯ demo.test.js:3:17
      3|     expect(200).toBe(403);
       |                 ^
 Test Files  1 failed (1)
      Tests  1 failed (1)
```

Read it from the top: the `×` line says which rule broke; `Expected` / `Received` say how. The
exit code is non-zero, which is how `npm test` knows to stop.

### 5.8 The first run downloads `mongod`

The first server run downloads a MongoDB server program (version 7.0.24 when checked, about 80 MB)
from `fastdl.mongodb.org` and keeps it on disk. You will see lines like
`Downloading MongoDB "7.0.24": 45.4% (37.1mb / 81.8mb)`. This happens once, in the global setup,
before any test file starts; later runs reuse the cached copy and start in seconds. The hook
timeout is 180 seconds, so a slow connection has three minutes. Windows may show a firewall prompt
for `mongod.exe` the first time it runs; it only listens on your own machine, and the tests work
if you decline it.

### 5.9 Common problems

| Symptom | Likely cause and fix |
| --- | --- |
| The download fails or `Hook timed out in 180000ms` on the first run | `fastdl.mongodb.org` is blocked (firewall, proxy, offline) or the connection is slow. Allow that host and run again. If you must use a proxy, set `HTTPS_PROXY`; if you already have a MongoDB 7 `mongod` that can run as a replica set, mongodb-memory-server can use it through its `MONGOMS_SYSTEM_BINARY` setting. Both are the library's own options and were not exercised in this repository |
| `ENOENT` on rename, or `ETXTBSY`, during the download | Several workers racing to download. `globalSetup.js` prevents this; if it appears anyway, delete the half-downloaded cache folder (under `node_modules\.cache\mongodb-memory-server`) and re-run |
| `Connection operation buffering timed out after 10000ms` | The clock was frozen with **all** timers faked. Use `vi.useFakeTimers({ toFake: ["Date"] })` (or the `freezeAt` helper) so the database driver's timers keep running. `foundation/testDb.test.js` guards the harness side |
| Port already in use | Not expected: the tests do not listen on a fixed port (Supertest and the in-memory MongoDB pick free ones), so a dev server on :5000 or :5173, or a MongoDB on :27017, does not clash |
| A test passes alone and fails in the full run, or the reverse | A test relies on data left by another. Every suite starts with `clearDb()` for this reason; add it, and create what the test needs inside the test |
| `Cannot find module …` | Run `npm install` in **both** `server` and `client` (§5.1) |
| `npm --prefix client install` adds a bad `file:..` line to `client/package.json` | A quirk on the owner's PC. Use `cd client` then `npm install`, and if the line appears run `git restore client/package.json` (see `USER_MANUAL.md` §52) |
| The root `npm test` stops after the server suite | `&&` stops on the first failure. Fix the server failure, or run the client suite alone (§5.3) |
| Tests seem slow on the server side | Each file starts its own in-memory database (a few seconds each); a full run is about a minute on a normal machine. Run one folder or file while you work (§5.4) |
| Worried a test touched Atlas | It cannot: the URI in the tests is a placeholder and the connection goes to the in-memory server (§3.1) |

---

## 6. How to add a new test

**Where it goes**

- A new API route or a change in a rule → `server/tests/rbac/` (a file for the area, or a new
  `describe` in the file that already covers it).
- A new permission function → `server/tests/policy/`, as a pure-function test, *and* an RBAC test
  that proves the route uses it.
- Config, middleware, models, indexes, week maths → `server/tests/foundation/`.
- Calendar rules → `server/tests/calendar/`; seed or script behaviour → `seed/` or `scripts/`.
- Client logic → `client/src/<folder>/__tests__/` beside the code it proves (`lib/`, `hooks/`,
  `schemas/`, `context/`, `routes/`, `components/<area>/`, `pages/`, `demo/`).

**Naming.** Files end in `.test.js` (or `.test.jsx` when the file contains JSX). One `describe`
per rule or route, with the specification's number or route label where there is one ("27 ·
nobody reviews their own report", "P4 · set or extend the plan"). Test names state the situation
and the result, including the status and error code: `"member Y → C1 on X's closed day → 403
COMMENT_NOT_ALLOWED"`. A reader should know the rule from the name alone.

**Helpers to use**

- Server: `createUser`, `bearer`, `clearDb`, and from `testWeeks.js` `api`, `as`, `freezeAt`,
  `postWeek`, `filedWeek`, `submit`, `sendBack`, `approve`, … Never build a JWT by hand. Never
  start your own MongoDB. Never listen on a port; use `api` or `request(app)`.
- Client: `renderToStaticMarkup` with the providers the component needs; the demo adapter
  (`createDemoStore`, `createDemoAdapter`) for page data; `vi.useFakeTimers({ toFake: ["Date"] })`
  for time.

**The rules**

1. **No Atlas, no real secrets.** Tests use the in-memory database and the placeholder values in
   `server/vitest.config.js`. Never put a real `MONGODB_URI`, password or token in a test.
2. **Every test sets up its own data** and does not depend on test order. Call `clearDb()` in
   `beforeEach`.
3. **Freeze the clock** (`Date` only) for anything that depends on today, and restore it in
   `afterEach`.
4. **Assert the envelope and the cause**, not only the status: the exact `{ code }` for an error,
   the `status` on a 409, the `fields` on a 422. And assert what was *not* written when a request
   is refused.
5. **A new API route needs RBAC rows** in `api_specification.md` §6 (who is refused, who is
   allowed, the codes) and tests that match them.
6. **Keep `demoCoverage` green.** A new function in `client/src/services/*Service.js` fails
   *"has a case for every service function"* until you add a demo handler for it and a case in
   `demoCoverage.test.js` (and the handler is written in the same change as the feature).
7. **Keep the tour coverage green.** A new row in the *Feature index* of `docs/USER_MANUAL.md`,
   or a new role bullet in `requirments_doc.md`, fails `demoTour.test.js` until a tour step covers
   it or `NOT_IN_TOUR` gives a reason (more than 20 characters).
8. **A new shared constant** (status, role, task type, weekday) is added on both sides, and
   `constants.parity.test.js` proves they match.
9. **Don't add test dependencies** (jsdom, Testing Library, a browser runner) without asking; the
   tech stack in `docs/tech_stack.md` §9–§10 fixes the list.
10. **Write the test first when fixing a bug** and watch it fail against the old code. Several
    tests in this repository were checked that way (PROGRESS.md says so where it applies).
11. Run `npm run lint` and `npm test` before you commit; both must pass.

If a new test file is added, mention it in `docs/project_structure.md` §6.

---

## 7. What is not covered

Said plainly, so nobody trusts the suite for more than it does.

- **No committed browser end-to-end tests.** The owner declined `@playwright/test` (PROGRESS.md,
  *Auth pages round six*; `tech_stack.md` §8). Clicking through the real app, real layout, real
  focus behaviour, animation, print layout and responsive breakpoints are not in the automated
  suite. Component and page tests render to HTML strings, so they cannot see CSS, scrolling,
  clicks or anything that needs a browser. Those checks were done by hand by the owner and by
  Playwright scripts run by the coding agent during development; the results are recorded stage
  by stage in `PROGRESS.md`. They are not repeated on every change.
- **No load or performance tests.** Nothing measures speed, request volume, memory, or how the
  dashboard behaves with a large team. The in-memory database is also much smaller than a real
  one.
- **No tests against real Atlas or Vercel.** The suite never connects to Atlas, and nothing tests
  the deployed serverless function, the Vercel configuration, CORS between the two live
  projects, environment variables on Vercel, or real network behaviour. Those are covered by the
  live checks in `docs/DEPLOYMENT.md` §4 (and by the Atlas check done on the owner's machine in
  stage S1).
- **No email.** The product sends none (links are copied by hand), so there is nothing to test.
- **The built bundle** is not inspected. "Bundle split" tests check which source files import
  which; a build is not made.
- **No CI.** `tech_stack.md` §8 defers GitHub Actions. The tests run on your machine, and the
  rule is that `npm test` and `npm run lint` pass before a merge.
- **Browsers other than the ones used by hand**, and accessibility tooling (screen readers,
  automated audits), are not tested automatically; the rendered-HTML tests check some labels and
  `aria-hidden` choices, nothing more.

---

## 8. Related documents

- `docs/api_specification.md` §6 — the server test plan: the numbered RBAC rules the `rbac/` and
  `policy/` tests are named after. §1.9 lists every error code.
- `docs/tech_stack.md` §12 — the table that maps each requirement ("Signup closes after the
  first account", "Comments are editable for 10 minutes", …) to the test that proves it; §8 lists
  what is deferred (component and end-to-end tests, CI).
- `docs/project_structure.md` §6 — where the tests live and why they are grouped by what they
  prove.
- `docs/DEPLOYMENT.md` §4 — the live checks after a deploy, which cover what these tests cannot.
- `docs/development_approach_doc.md` — the manual verification walkthroughs that complement the
  automated suite.
- `README.md` — setup on Windows and the other commands.
