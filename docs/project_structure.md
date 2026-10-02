# WeeklyView — Project Structure

> Output of the **Software Architect** role (structure pass), revised in reconciliation
> pass 4 for daily work lines, tasks, projects with plans, comment threads, holidays,
> "new" markers and the client-side demo. Settled input for the Database Engineer,
> Backend Engineer, Frontend Engineer and Tech Lead.
>
> Companion docs: `requirments_doc.md` · `development_approach_doc.md` ·
> `brand_design_strategy.md` · `product_design_system.md` · `tech_stack.md` ·
> `database_schema.md` · `api_specification.md` · `frontend_architecture.md`.
>
> **Authority when documents disagree — by subject, not by rank.** See §0.5.
> Unreconciled contradictions are listed in §9 and are **not** resolved here.

---

## 0. How to read and change this document

**What it decides.** Where every file lives, what belongs in each folder, and the
naming rules. It does not decide schema fields, endpoint paths, component props or copy
— those belong to the documents listed below.

**It describes the intended shape, not the current state of the repo.** Nothing here
has been built yet. Every tree is the target layout, and several entries exist because a
document calls for them rather than because a caller exists. Treat the trees as the
plan, and the plan as revisable when the build teaches you something it couldn't know.

### 0.1 Changing the structure during the build

Build to this layout by default. Depart from it when one of these is true, and say so:

- **Something is missing.** A file the build genuinely needs has no home here. Add it in
  the folder the conventions in §4 imply, and record it.
- **Something is unnecessary.** A file or folder here has no caller once the feature is
  built. Do not create an empty file to satisfy the tree. A folder with nothing in it is
  worse than an absent one.
- **Something simplifies.** Two files here that always change together and never make
  sense apart should be one file. Prefer the plainest thing that satisfies the
  requirement — `development_approach_doc.md`, General Principles.
- **There is a demonstrably better approach.** Not a preference or a different habit: a
  reason tied to a real constraint, a bug the current layout invites, or a rule in one of
  the authoritative documents that the layout fails to serve.

**When you depart, edit this document in the same change** — the tree in §2 or §3 **and**
the conventions in §4 if the rule moved — with a one-line note saying what changed and
why. A layout doc that lags the repo stops being read, and then every later decision is
made from memory.

### 0.2 What must not change without a decision from the project owner

These are load-bearing. Departing from them breaks something specific, not just
consistency:

| Fixed                                                                        | What breaks otherwise                                                                       |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `client/` and `server/` as self-contained deployables, no cross-root imports | Render cannot see files outside its root directory; the API fails at build or runtime (§8)  |
| `app.js` exports the app; `server.js` connects and listens                   | The RBAC suite can no longer import the app without opening a port or reaching Atlas (§2.3) |
| One rule set behind `buildReportScope` and `canReadContent`                  | A list and a single week start disagreeing about who may read a report's content, silently (§2.6) |
| Services take an `actor` and never `req`                                     | Authorization logic leaks back into the Express layer, in two places instead of one (§2.6)  |
| Every request in the client goes through the one `apiClient` instance        | The demo adapter (§3.4) no longer sees every call, and the demo silently reaches the real API or breaks |
| `tokens.css` as the only place a hex appears                                 | Dark mode fails for every Tailwind utility while hand-written CSS still switches (§3.3)     |
| The naming conventions in §4                                                 | Nothing immediately — which is why it drifts first. Change it deliberately or not at all    |

Everything else in this document is a considered default, and a considered default is
still allowed to lose to a better argument.

### 0.3 The document set, and what each one owns

| Document                   | Owns                                                                                         | Supersedes here                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `database_schema.md`       | Collections, fields, relationships, indexes, the revision model                              | The `models/` file list                                                       |
| `api_specification.md`     | Every endpoint path, method, request and response shape, status codes                        | The route file contents; **not** the mount bases fixed in §2.4                |
| `frontend_architecture.md` | Component props and contracts, state ownership, query keys, data flow per page               | Nothing structural; it fills in the components this document places           |
| `MASTER_PROMPT.md`         | The build instructions handed to the coding agent                                            | Nothing — it consumes this document                                           |
| `CLAUDE.md`                | Repo-level conventions the agent reads on every run (lives at the repo root, not in `docs/`) | Nothing — it should restate §4 rather than re-decide it                       |

**The rule when a later document contradicts this one.** Within its own lane, the later
document wins and this one is edited to match. Outside its lane — a schema doc renaming
a folder, an API spec moving a service — the change is made here first, because the
layout is what the whole build assumes.

### 0.4 Conflicts, gaps and provisional items

**Conflicts between the authoritative documents are recorded in §9, never resolved in
passing.** If a build step hits one, it stops and the conflict is reconciled in both
source documents together. A conflict silently resolved by whoever hits it first is how
two documents start describing two products.

**Provisional items (§10)** carry an owner. When that owner's document lands, the
provisional marker is removed here and the row is deleted from §10.

**A gap is neither of those** — a decision no document answers, hit mid-build. Make the
smallest choice that unblocks the work, then add a row to §10 naming what was chosen and
who should confirm it. What must not happen is a gap being filled silently and
discovered three features later.

### 0.5 Authority: three subjects, not one ranking

This document previously carried a single linear order —
`product_design_system.md` > `brand_design_strategy.md` > `tech_stack.md` >
`development_approach_doc.md` > `requirments_doc.md` — and it produced a wrong answer
the first time it was used in earnest. Applied to the Tailwind conflict (§9, C1), it
selected a v3 config file for a project that installs Tailwind 4, where that file is
never read. A ranking cannot decide a question about what a tool does.

A linear order also puts `requirments_doc.md` last, which inverts the only thing it is
for: a later document that introduces a capability is not exercising authority over the
requirements, it is adding scope.

**Authority attaches to the subject of the disagreement:**

| Subject                                                                                 | Decides                    |
| --------------------------------------------------------------------------------------- | -------------------------- |
| **Scope and features** — what exists at all: roles, screens, capabilities, permissions  | `requirments_doc.md`       |
| **Visual and interaction detail** — layout, tokens, copy, states, motion, component spec | `product_design_system.md` |
| **Technical implementation** — libraries, versions, mechanisms, data access, deployment | `tech_stack.md`            |

`brand_design_strategy.md` owns identity — name, vocabulary, color, type, voice — and the
landing page; within those, it is the authority, and `product_design_system.md` §0.3/§0.4
is the pattern for extending or overriding it *by name* rather than silently.
`development_approach_doc.md` owns build standards and is superseded on any specific
mechanism by `tech_stack.md`.

**And above all three: no document outranks reality.** A configuration format the
installed version does not read, a copy promise nothing implements, a screen that needs a
mail server the stack does not have — these are not resolved by consulting an order. They
are resolved by changing the document that is wrong about the world.

**When a document introduces a feature outside its subject** — a design document adding a
screen, a tech document adding a capability — that is a scope proposal. It goes to
`requirments_doc.md` to be accepted or dropped, which is how the landing page (§13 there)
and the demo (§14) stopped being undeclared scope.

---

## 1. Repository root

```
weekly-report-generator/
├── client/                      # Vercel root directory
├── server/                      # Render root directory
├── docs/                        # the planning documents, in the order they were written
│   ├── requirments_doc.md
│   ├── development_approach_doc.md
│   ├── brand_design_strategy.md
│   ├── product_design_system.md
│   ├── tech_stack.md
│   ├── project_structure.md     # this file
│   ├── database_schema.md       # added by the Database Engineer
│   ├── api_specification.md     # added by the Backend Engineer
│   ├── frontend_architecture.md # added by the Frontend Engineer
│   ├── conflicts_reconciliation.md   # the cross-document audit the first pass worked from
│   └── reconciliation_changelog.md   # what each reconciliation pass changed, and what it left open
├── CLAUDE.md                    # repo conventions the coding agent reads every run
├── MASTER_PROMPT.md             # the build instructions handed to the agent
├── .gitignore                   # one file, repo-wide
├── package.json                 # convenience scripts only — see §7.4
└── README.md
```

Every planning document lives in `docs/`. The two agent-facing files sit at the repo
root instead, because `CLAUDE.md` is read from the root by convention and
`MASTER_PROMPT.md` belongs beside it. No `brainstorms/` folder: interview transcripts
are not part of the repo, and each document already records its own decisions.

Three top-level folders, exactly as `tech_stack.md` §1.4 fixes them. Each deployable
owns its own `package.json`, its own lockfile and its own `.env.example`, because each
platform is pointed at one of them as its root directory and cannot see outside it
(§8).

---

## 2. Server

### 2.1 Tree

```
server/
├── src/
│   ├── config/
│   │   ├── env.js                     # Zod-parsed process.env; nothing else reads process.env
│   │   └── db.js                      # mongoose.connect with the tech_stack §4 pool settings
│   ├── models/                        # one file per collection — database_schema.md §1
│   │   ├── userModel.js               # exports User
│   │   ├── projectModel.js            # exports Project — plan and planHistory included
│   │   ├── taskModel.js               # exports Task
│   │   ├── reportModel.js             # exports Report
│   │   ├── revisionModel.js           # exports Revision
│   │   ├── holidayModel.js            # exports Holiday
│   │   ├── seenMarkModel.js           # exports SeenMark
│   │   ├── contentSchema.js           # the end-of-week body, reused verbatim by Report.content and Revision.content
│   │   ├── daySchema.js               # a daily update; Report.days, and Revision.days without comments
│   │   └── threadSchema.js            # a comment with replies; days[].comments and Report.weekComments
│   ├── policies/
│   │   ├── reportPolicy.js            # pure functions; the whole permission model for a week
│   │   └── submitRules.js             # pure: is this week ready to submit, and if not, why
│   ├── routes/
│   │   ├── index.js                   # mounts every router + /health; the API's table of contents
│   │   ├── authRoutes.js
│   │   ├── userRoutes.js
│   │   ├── projectRoutes.js
│   │   ├── taskRoutes.js
│   │   ├── updateRoutes.js            # GET /updates — the team updates feed
│   │   ├── reportRoutes.js
│   │   ├── reviewRoutes.js            # mounted at the same base as reportRoutes; also exports reviewDeskRoutes — §2.4
│   │   ├── holidayRoutes.js
│   │   ├── meRoutes.js                # GET /me/new — the sidebar's "new" dots
│   │   └── dashboardRoutes.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── projectController.js
│   │   ├── taskController.js
│   │   ├── reportController.js        # also the handlers for /updates and the two /users/:id/reports routes
│   │   ├── reviewController.js        # review actions, the review desk, and every comment route
│   │   ├── holidayController.js
│   │   ├── markerController.js        # /me/new and POST /reports/:id/seen
│   │   └── dashboardController.js
│   ├── services/
│   │   ├── authService.js             # signup, login, password, link preview and accept
│   │   ├── userService.js             # invites, reset links, roles, email, removal, leave, ownership, work periods
│   │   ├── projectService.js          # projects, plans, plan history, progress
│   │   ├── taskService.js             # the task picker; creates tasks when a day names a new one
│   │   ├── reportService.js           # days, autosave, submit, reads, revisions, blockers, team-comment switch
│   │   ├── reviewService.js           # approve, send back, the review desk, all comment threads
│   │   ├── holidayService.js
│   │   ├── calendarService.js         # working days and expected days: weeks × holidays × work periods × leave
│   │   ├── markerService.js           # seenMarks; isNew for rows and threads; the sidebar dots
│   │   └── dashboardService.js
│   ├── validators/
│   │   ├── authValidator.js
│   │   ├── userValidator.js
│   │   ├── projectValidator.js
│   │   ├── taskValidator.js
│   │   ├── reportValidator.js         # day, autosave, submit, list queries
│   │   ├── reviewValidator.js         # review actions, comments, review-desk queries
│   │   ├── holidayValidator.js
│   │   └── dashboardValidator.js      # query/filter schemas for the dashboard reads
│   ├── middleware/
│   │   ├── authenticate.js
│   │   ├── authorize.js
│   │   ├── validate.js
│   │   ├── notFound.js
│   │   └── errorHandler.js            # registered last; the only place a 500 is formatted
│   ├── constants/                     # database_schema.md §0.1 — five enums
│   │   ├── reportStatus.js            # draft · submitted · needs_correction · approved
│   │   ├── roles.js                   # member · manager · admin
│   │   ├── taskTypes.js               # the seven hour categories, research_study included
│   │   ├── taskStatus.js              # not_started · in_progress · done · carried_over
│   │   └── weekdays.js                # mon · tue · wed · thu · fri — the daily-update days
│   ├── utils/
│   │   ├── apiResponse.js             # ok(res, data, message, status = 200)
│   │   ├── appError.js                # exports the AppError class
│   │   ├── paginate.js                # page/limit parsing + the meta block for list endpoints
│   │   └── weeks.js                   # ISO week keys ↔ dates over date-fns; no holidays, no people
│   ├── seed/
│   │   ├── index.js                   # npm run seed / seed:reset — development and tests only
│   │   └── seedData.js                # the fixed deterministic arrays (no faker), relative to the current week
│   ├── app.js                         # builds and exports the Express app
│   └── server.js                      # connects Mongo, then listens
├── tests/
│   ├── helpers/
│   │   ├── testDb.js                  # mongodb-memory-server start/stop
│   │   └── testAuth.js                # signs a token for a seeded actor
│   ├── rbac/                          # api_specification.md §6
│   │   ├── reportAccess.test.js       # days served, content withheld; 404 for a fabricated id; submit rules
│   │   ├── dailyUpdates.test.js       # posting days; teammates read; team-comment switch; the 10-minute window
│   │   ├── reviewAccess.test.js       # self-review guard; unrequested approval; review races
│   │   ├── adminRoutes.test.js        # user management, owner protection, email and reset links, holidays
│   │   ├── auth.test.js               # bootstrap race; password change never 401
│   │   └── scopeParity.test.js        # buildReportScope ↔ canReadContent parity; no private layer leaks
│   └── policy/
│       ├── reportPolicy.test.js       # pure-function unit tests, no HTTP, no DB
│       └── submitRules.test.js
├── vitest.config.js                   # setupFiles → tests/helpers/testDb.js
├── .env.example
└── package.json
```

### 2.2 What belongs in each folder

| Folder         | Holds                                                                                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `config/`      | Startup configuration only: the validated `env` object and the database connection. No domain knowledge.                                                   |
| `models/`      | Mongoose schemas, indexes, schema-level validation and `toJSON` transforms. One file per collection, plus the three subdocument schemas shared between collections. |
| `policies/`    | Pure rule functions — no Mongoose, no Express. `reportPolicy.js` says who may; `submitRules.js` says whether a week is ready (§2.6).                        |
| `routes/`      | Path + middleware chain. No logic, no data access, no response building.                                                                                   |
| `controllers/` | Pull values off `req`, build the `actor`, call one service function, respond via `ok()`. Target under 15 lines (`tech_stack.md` §3).                       |
| `services/`    | All business logic: status transitions, revision creation, day writes, aggregation. Express-free — a service never sees `req`, `req.user` or a Mongoose user document. |
| `validators/`  | Zod schemas consumed by `validate(schema)` at the route. One file per resource, named `*Schema` exports.                                                   |
| `middleware/`  | Cross-cutting Express handlers. Each file exports the one function it is named after.                                                                      |
| `constants/`   | Shared domain vocabulary — the values the client mirrors (§7.1). No logic.                                                                                 |
| `utils/`       | Stateless, domain-agnostic helpers: `ok()`, `AppError`, `paginate()`, week-key arithmetic. If a helper knows about roles, ownership, statuses or holidays, it is not a util. |
| `seed/`        | The deterministic development dataset and the script that writes it. The public demo does not use it (§3.4).                                               |
| `tests/`       | RBAC and policy tests only, per `tech_stack.md` §1.1 and §8 (component and E2E tests are deferred).                                                        |

### 2.3 `app.js` versus `server.js`

- **`app.js`** applies helmet, cors, morgan and JSON parsing, mounts
  `routes/index.js` at `/api`, then `notFound` and `errorHandler` last. It exports the
  app. It never connects to Mongo and never listens.
- **`server.js`** imports the app, awaits the Mongo connection, then binds
  `env.PORT`.

The split is load-bearing, not stylistic: Supertest imports `app.js` directly, so the
RBAC suite runs against the real middleware chain without opening a port or touching
Atlas.

### 2.4 Routing

`routes/index.js` is the only file that knows the full URL surface. It mounts each
domain router and `/health`, and `app.js` mounts it once at `/api`, so the `/api`
prefix is written exactly once:

```js
// routes/index.js — api_specification.md §1.1
router.get("/health", healthHandler);
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/projects", projectRoutes);
router.use("/tasks", taskRoutes);
router.use("/updates", updateRoutes);
router.use("/reports", reportRoutes);          // the author side, days, resolutions
router.use("/reports", reviewRoutes);          // /:id/review/*, /:id/…comments, /:id/threads/*
router.use("/review-desk", reviewDeskRoutes);  // exported from reviewRoutes.js
router.use("/holidays", holidayRoutes);
router.use("/me", meRoutes);
router.use("/dashboard", dashboardRoutes);
```

Review actions and comments are nested under the report resource, because neither has
an independent lifecycle. Both routers mount at the same base and Express matches in
mount order. `reviewRoutes.js` declares its own full sub-paths rather than relying on
`mergeParams`, so `:id` is declared where it is consumed and each route file reads
completely on its own.

**Consequence, and it is easy to get wrong:** because two routers share `/reports`,
neither may attach guards with a router-level `router.use(authenticate)` or
`router.use(authorize(...))`. A router-level guard in `reportRoutes.js` would also run
on review requests passing through it. Guards attach per route, which is already the
chain in `tech_stack.md` §3.

**Literal segments before `/:id`, in the same router.** In `reportRoutes.js`, `/summary`
and `/week/:weekKey…` are declared before `/:id`; in `userRoutes.js`, `/on-leave` before
`/:userId`. A literal segment is never shared across two routers on one base.

### 2.5 How the services are split

**The split follows the access rule, not the file length.** Each service enforces one
shape of permission, which is why the split should survive a later refactor.

`reportService` owns **the author writing their own week**: posting and editing days,
autosaving the end-of-week content, submit and resubmit, revision snapshots, and every
report read including version history and the team updates feed. Its access shape is
author scope plus an open status for writes, and `canOpenWeek` / `canReadContent` for
reads.

`reviewService` owns **the conversation about a week**: approve, send back, the review
desk queue and count, and every comment thread — on a day or on the week, by anyone
allowed to write there. They belong together because a review action writes a week
thread (`send_back`, `approval`), and one service owning thread writes keeps the
10-minute rule, the reply rules and `interactionAt` in one place.

**Blocker resolution and the team-comment switch belong to `reportService`.** Neither is
a review action: the author performs them as often as a manager does, they take no
comment, change no status and write no revision. `canResolveBlocker` and
`canToggleTeamComments` gate them, not `canEditContent` (`tech_stack.md` §3.1).

**Tasks have their own small service, called by `reportService`.** A task is created
when a day names a new one, inside the day write; `taskService` owns that creation and
the task picker, and `reportService` calls it rather than writing to `tasks` itself. The
task's `doneAt` is set on submit, by `reportService`, from the week's statuses.

**`calendarService` is the one place working days are computed.** Expected days,
holiday weeks, project days used, and whether a day may be posted all derive from weeks,
holidays, work periods and leave (`database_schema.md` §0.2, §5.0). It reads `holidays`,
so it is a service, not a util; `reportService`, `dashboardService` and
`projectService` call it.

**Leave, ownership, invites, reset links and emails belong to `userService`.** All are
writes to a person, not to a report, with plain role and owner gates rather than a
per-document policy (§2.6).

**`markerService` owns "new".** It writes `seenMarks` and answers whether a row or thread
is new for a reader (`database_schema.md` §5.4). Other services call it to decorate what
they return with `isNew`; it never decides access.

Aggregations split by **query shape**, not by caller: `dashboardService` owns
cross-entity aggregation (grouping across people, projects and task types, rolling up
counts and rates), covering the team dashboard, the projects table and the person
profile. Project progress for one project is `projectService`'s, and the dashboard
calls it. The personal strip on "This week" is a single-user summary over that user's
own reports and belongs to `reportService`.

### 2.6 Authorization placement

`tech_stack.md` §3.1 is the full specification. Structurally:

- The **controller** builds the actor `{ id, role, isOwner }` from `req.user` and passes
  it as the first argument to every service function.
- **`policies/reportPolicy.js`** defines the week's three layers of visibility once:
  `buildReportScope` for list queries, `canOpenWeek` (the week and its days),
  `canReadContent` (the end-of-week content and week comments), and the write rules —
  `canCommentOnDay`, `canToggleTeamComments`, `canCommentOnWeek`, `canEditOwnComment`,
  `canReviewReport`, `canEditContent` and `canResolveBlocker`.
- **`policies/submitRules.js`** is the one statement of the submit rules — every expected
  day posted, every task given a status. The submit endpoint enforces it; the week view
  uses the same function to tell the author why `Submit` is disabled.
- The **service** loads the document, then authorizes it, then applies the status
  invariant. Mutations run the same load-then-authorize path.
- `tests/rbac/scopeParity.test.js` is the seam that fails loudly if the list filter and
  the content predicate ever disagree.

Ownership is still _enforced_ in the service — that is where the document is loaded, as
`tech_stack.md` §3 requires. What lives in `policies/` is the rule's _definition_, so
the list path and the single-resource path cannot drift apart.

There is no demo rule on the server. The demo never reaches it (§3.4).

---

## 3. Client

### 3.1 Tree

```
client/
├── public/
├── index.html                         # font preconnect + <html data-theme> bootstrap
├── src/
│   ├── main.jsx                       # React root, QueryClientProvider, AuthProvider, RouterProvider, Toaster
│   ├── App.jsx                        # theme bootstrap + global providers' children
│   ├── routes/
│   │   ├── index.jsx                  # the route table — every path in the product
│   │   ├── SessionLayout.jsx          # AppShell when signed in, a bare outlet when not — lets "/" branch (frontend_architecture §4.1)
│   │   ├── IndexRoute.jsx             # "/" → ThisWeekPage · landing · or the demo chooser
│   │   ├── ProtectedRoute.jsx         # layout route: auth + allow=[roles]; renders the 403 state (tech_stack §6.4)
│   │   ├── PublicOnly.jsx             # sends a signed-in visitor away from /signin and /signup
│   │   └── DevOnlyRoute.jsx           # gates /design behind import.meta.env.DEV
│   ├── layouts/
│   │   ├── RootLayout.jsx             # router root: Outlet, Toaster, OfflineStrip, ReAuthModal
│   │   ├── AppShell.jsx               # sidebar + top bar frame; renders <Outlet/>
│   │   ├── AuthLayout.jsx             # the centred 420px column, no shell (§3.12)
│   │   └── MarketingLayout.jsx        # sticky nav + footer for the landing page, in the landing theme (brand §6.0)
│   ├── pages/
│   │   ├── LandingPage.jsx            # /  when signed out — brand §6–7, requirements §13
│   │   ├── ThisWeekPage.jsx           # /  when signed in  — design §3.1
│   │   ├── ReportHistoryPage.jsx      # /reports
│   │   ├── ReportDetailPage.jsx       # /reports/:week  AND  /people/:userId/reports/:week
│   │   ├── ReportEditPage.jsx         # /reports/:week/edit — the end-of-week form (§4)
│   │   ├── TeamUpdatesPage.jsx        # /updates — design §3.16
│   │   ├── ReviewDeskPage.jsx         # /review
│   │   ├── ReviewPage.jsx             # /review/:reportId
│   │   ├── TeamDashboardPage.jsx      # /team
│   │   ├── PeoplePage.jsx             # /people — design §3.15
│   │   ├── PersonProfilePage.jsx      # /people/:userId
│   │   ├── ProjectsPage.jsx           # /projects — design §3.9
│   │   ├── UsersPage.jsx              # /users
│   │   ├── HolidaysPage.jsx           # /holidays — design §3.17
│   │   ├── AccountPage.jsx            # /account
│   │   ├── SignInPage.jsx             # /signin
│   │   ├── SignUpPage.jsx             # /signup — first-run bootstrap; closed state after (§3.12)
│   │   ├── AcceptInvitePage.jsx       # /invite/:token
│   │   ├── ResetPasswordPage.jsx      # /reset/:token — an admin-issued reset link
│   │   ├── DemoEntryPage.jsx          # /demo — the perspective chooser (§3.14)
│   │   ├── NotFoundPage.jsx           # §3.13
│   │   ├── ForbiddenPage.jsx          # §3.13
│   │   └── DesignPage.jsx             # /design, dev-only style guide
│   ├── components/
│   │   ├── ui/                        # the §6 inventory — design-system primitives
│   │   │   ├── Button.jsx
│   │   │   ├── Input.jsx
│   │   │   ├── Textarea.jsx
│   │   │   ├── Select.jsx
│   │   │   ├── WeekPicker.jsx
│   │   │   ├── Checkbox.jsx
│   │   │   ├── Radio.jsx
│   │   │   ├── StatusChip.jsx
│   │   │   ├── Panel.jsx
│   │   │   ├── Table.jsx
│   │   │   ├── Pagination.jsx
│   │   │   ├── Modal.jsx
│   │   │   ├── Tooltip.jsx
│   │   │   ├── Tabs.jsx
│   │   │   ├── SegmentedControl.jsx   # the Days | Hours switch (§6.25)
│   │   │   ├── Field.jsx              # label / optional marker / helper / error around any control
│   │   │   ├── Combobox.jsx           # the task picker, on Radix Popover
│   │   │   ├── MultiSelect.jsx        # §6.4's custom listbox for FilterBar
│   │   │   ├── Switch.jsx
│   │   │   ├── DatePicker.jsx         # weekends not selectable
│   │   │   ├── Popover.jsx            # the shared Radix wrapper
│   │   │   ├── ConfirmDialog.jsx      # destructive confirm: consequence text + Cancel / action
│   │   │   ├── QueryView.jsx          # the four designed states around a query result (frontend_architecture §8.4)
│   │   │   ├── InlineError.jsx
│   │   │   ├── Skeleton.jsx
│   │   │   ├── EmptyState.jsx
│   │   │   ├── Avatar.jsx
│   │   │   ├── DropdownMenu.jsx
│   │   │   ├── Breadcrumb.jsx
│   │   │   ├── FilterBar.jsx
│   │   │   ├── Meter.jsx
│   │   │   ├── NewMarker.jsx          # the 6px square (§6.24)
│   │   │   └── Toaster.jsx            # Sonner mount, constrained per tech_stack §6.7
│   │   ├── shell/                     # AppShell parts (§1)
│   │   │   ├── Sidebar.jsx
│   │   │   ├── SidebarNavItem.jsx     # carries the nav item's "new" marker
│   │   │   ├── SidebarUserBlock.jsx
│   │   │   ├── TopBar.jsx
│   │   │   ├── PageHeader.jsx         # a page's title, back-link, week picker and actions, portalled into the TopBar
│   │   │   ├── navItems.js            # the sidebar as data: groups, roles, routes, dots, counts
│   │   │   ├── AppBootSplash.jsx
│   │   │   ├── OfflineStrip.jsx
│   │   │   ├── ReAuthModal.jsx        # the session-expiry modal (design §3.12)
│   │   │   ├── ThemeToggle.jsx
│   │   │   ├── SkipLink.jsx
│   │   │   └── DemoBar.jsx            # the 36px --ink bar: SAMPLE DATA, Switch, Start over (§3.14)
│   │   ├── report/                    # §3.1–3.4, §4
│   │   │   ├── WeekStrip.jsx          # the five-day strip — the daily-update control (§3.1)
│   │   │   ├── DayPanel.jsx           # compose / read one day: lines, blockers, comments (§4.11)
│   │   │   ├── FormSection.jsx        # a numbered form section; the rail's anchor
│   │   │   ├── WorkLineRow.jsx        # task · type · text · hours
│   │   │   ├── TaskPicker.jsx         # own open tasks + "start a new task"
│   │   │   ├── DailyUpdatesBlock.jsx  # the five days on the detail and review pages (§3.4)
│   │   │   ├── OnLeaveStrip.jsx       # "On leave: …" and the week's holidays
│   │   │   ├── CurrentWeekPanel.jsx
│   │   │   ├── MyProjectsPanel.jsx    # a member's project progress (§3.1)
│   │   │   ├── RecentWeeksList.jsx
│   │   │   ├── PersonalStrip.jsx
│   │   │   ├── CorrectionPanel.jsx
│   │   │   ├── ReportForm.jsx
│   │   │   ├── SectionRail.jsx        # the form's section rail and submit checklist (§4.2) — form sections, not projects
│   │   │   ├── TasksTable.jsx         # the week's tasks, built from the days: status + note (§4.3)
│   │   │   ├── TaskRow.jsx
│   │   │   ├── TaskCard.jsx           # the <768px stacked form (§4.4)
│   │   │   ├── KeyFlag.jsx
│   │   │   ├── HoursByTypeGrid.jsx    # read-only sums from the lines (§4.6)
│   │   │   ├── AutosaveIndicator.jsx
│   │   │   ├── StickyActionBar.jsx    # Submit, and the "Ask for approval" checkbox (§4.9)
│   │   │   ├── ReportDocument.jsx     # the read-only rendering shared by §3.4 and §3.6
│   │   │   ├── RevisionsRail.jsx
│   │   │   └── ReportHistoryTable.jsx
│   │   ├── comment/                   # §6.23 — used by report/, updates/ and review/
│   │   │   ├── CommentThread.jsx
│   │   │   ├── Comment.jsx            # includes the 10-minute Edit / Delete countdown
│   │   │   └── CommentComposer.jsx
│   │   ├── updates/                   # §3.16
│   │   │   ├── DayTabs.jsx
│   │   │   └── PersonUpdate.jsx       # one person's day, or their one-line state
│   │   ├── review/                    # §3.5–3.6
│   │   │   ├── ReviewDeskTable.jsx    # "Asked for approval" / "All submitted"
│   │   │   ├── ReviewPersonBlock.jsx
│   │   │   ├── ReviewStatusBlock.jsx
│   │   │   ├── WeekComments.jsx       # overall comments on the week, with versions and kinds
│   │   │   ├── ReviewActionPanel.jsx  # Approve, Send back, Comment only
│   │   │   └── ReadOnlyStrip.jsx
│   │   ├── dashboard/                 # §3.7–3.8, §7
│   │   │   ├── MetricStrip.jsx
│   │   │   ├── MetricCell.jsx
│   │   │   ├── ChartContainer.jsx
│   │   │   ├── TeamTable.jsx          # carries the status filter
│   │   │   ├── UpdatesCell.jsx        # the table-scale five-day strip (§3.7)
│   │   │   ├── ProjectsTable.jsx      # plans, progress and people per project (§3.7)
│   │   │   ├── TasksTrendChart.jsx
│   │   │   ├── HoursByTypeChart.jsx
│   │   │   ├── WorkloadByProjectChart.jsx
│   │   │   └── ActivityFeed.jsx       # the latest eight events
│   │   ├── project/                   # §3.9, §6.25
│   │   │   ├── ProjectProgress.jsx    # the bar and "overdue by N days"
│   │   │   └── PlanModal.jsx          # set or extend a plan
│   │   ├── holiday/                   # §3.17
│   │   ├── user/                      # §3.10–3.11, §3.15
│   │   ├── auth/                      # §3.12 form bodies shared across the auth screens
│   │   └── marketing/                 # the landing page's sections, ported from landing-reference/index.html (brand §6.0)
│   ├── demo/                          # the client-side demo — tech_stack.md §6.9
│   │   ├── bootDemo.js                # builds the store, installs the adapter — dynamically imported by main.jsx
│   │   ├── demoAdapter.js             # the custom Axios adapter
│   │   ├── demoRoutes.js              # method + path → handler, one per endpoint the pages call
│   │   ├── demoStore.js               # builds the in-memory store; rebuilt on refresh or Start over
│   │   ├── fixtures.js                # hard-coded people, projects, tasks, weeks — relative dates
│   │   └── __tests__/
│   │       └── demoCoverage.test.js   # every services/ function answered by the adapter
│   ├── hooks/
│   │   ├── useAuth.js                 # reads AuthContext
│   │   ├── useAuthQueries.js          # bootstrap status, link preview, login, signup, accept
│   │   ├── useWeekParam.js            # ?week= and ?day=, validated and clamped
│   │   ├── useAutosave.js             # the weekly form's debounced, coalescing autosave
│   │   ├── useNow.js                  # one shared ticker for the comment countdowns
│   │   ├── useMediaQuery.js
│   │   ├── useOnlineStatus.js
│   │   ├── useUnsavedGuard.js         # registers dirty state with UnsavedChangesContext
│   │   ├── useDocumentTitle.js
│   │   ├── useActiveSection.js        # IntersectionObserver for the form rail
│   │   ├── useHasMounted.js           # lets charts animate data changes but not mount
│   │   ├── usePermissions.js          # lib/permissions bound to the current user
│   │   ├── useLandingMotion.js        # v11's vanilla motion kit (reveals, split headings, counters, scroll scenes) as one effect hook
│   │   ├── useReportQueries.js        # TanStack Query hooks wrapping reportService (incl. team updates)
│   │   ├── useReviewQueries.js        # review desk, review actions, comments
│   │   ├── useDashboardQueries.js
│   │   ├── useProjectQueries.js
│   │   ├── useTaskQueries.js
│   │   ├── useUserQueries.js
│   │   ├── useHolidayQueries.js
│   │   ├── useNewMarks.js             # ['newMarks'], and marking a week seen
│   │   ├── useTheme.js
│   │   └── useUrlFilters.js           # filter/sort/pagination state in the URL
│   ├── context/
│   │   ├── AuthContext.jsx            # context + provider; boot, session expiry; in the demo, the chosen perspective
│   │   ├── authReducer.js
│   │   ├── UnsavedChangesContext.jsx  # registry of dirty forms: guards navigation, tab close and sign-out
│   │   ├── DayDraftsContext.jsx       # unposted day text, in memory only
│   │   └── PageChromeContext.jsx      # the TopBar's slot targets
│   ├── services/
│   │   ├── apiClient.js               # the Axios instance, both interceptors, and `api` (returns envelope.data)
│   │   ├── authService.js
│   │   ├── reportService.js
│   │   ├── reviewService.js
│   │   ├── dashboardService.js
│   │   ├── projectService.js
│   │   ├── taskService.js
│   │   ├── userService.js
│   │   ├── holidayService.js
│   │   └── markerService.js
│   ├── schemas/
│   │   ├── authSchema.js              # zodResolver schemas, client-side
│   │   ├── reportSchema.js            # the day panel and the end-of-week form
│   │   ├── reviewSchema.js            # send-back comment, comments and replies
│   │   ├── projectSchema.js
│   │   ├── userSchema.js
│   │   └── holidaySchema.js
│   ├── lib/
│   │   ├── cn.js                      # clsx + tailwind-merge
│   │   ├── constants.js               # the client's copy of the shared vocabulary (§7.1)
│   │   ├── statusMaps.js              # status and week state → label + token names
│   │   ├── dates.js                   # ISO-week helpers over date-fns
│   │   ├── normalizeError.js          # → ApiError { httpStatus, code, message, fields, details }
│   │   ├── errorCopy.js               # one plain-language message per API error code
│   │   ├── formErrors.js              # applyServerErrors(form, apiError)
│   │   ├── queryKeys.js               # the qk factory — no key literals elsewhere
│   │   ├── queryClient.js
│   │   ├── urlParams.js               # enumParam, listParam, weekParam, pageParam, limitParam
│   │   ├── tokenStore.js              # wv_token get / set / clear, try/catch around storage
│   │   ├── authEvents.js              # the tiny emitter behind "session-expired"
│   │   ├── permissions.js             # UX gates derived from role and ownership — never the authority
│   │   ├── submitChecklist.js         # the submit checklist from dayStates + task statuses
│   │   ├── weekActions.js             # the top-bar primary action for a week
│   │   ├── format.js                  # hours, dates, relative times
│   │   ├── chartTheme.js              # chart colours and axis props as token strings
│   │   └── __tests__/
│   │       └── constants.parity.test.js
│   ├── styles/
│   │   ├── landing.css                # the landing page only: v11's green tokens and rules, scoped to .landing — never imported by the app (brand §6.0)
│   │   ├── tokens.css                 # design §9.3 verbatim: :root + [data-theme="dark"]
│   │   ├── base.css                   # global element styles, focus ring, reduced motion
│   │   └── index.css                  # @import "tailwindcss" → tokens.css → base.css, then @theme
│   └── assets/                        # the glyph SVG and anything else shipped as a file
├── vite.config.js
├── vercel.json
├── .env.example
└── package.json
```

### 3.2 What belongs where

**Pages are the only smart components.** A page owns state, data fetching through its
query hooks, and composition. It owns no components folder.

**`components/ui/` is the design system.** Every file corresponds to an entry in
`product_design_system.md` §6 and renders from tokens with no product knowledge. A
`ui/` component never imports a service, a query hook or a domain type. The comment
thread (§6.23) and project progress (§6.25) are specified in §6 but know product rules —
the 10-minute window, "overdue by N days" — so they live in `comment/` and `project/`.

**`components/<domain>/` holds composed pieces.** A component used by exactly one page
still lives here, in its own file — placement is decided by what a component _is_, not
by how many callers it currently has, so moving or deleting a page never orphans a
folder. `ReportDocument.jsx` is the clearest case: §3.6 specifies that the review
page's document pane is exactly the §3.4 rendering, so it belongs to the report domain
and is consumed by two pages. `comment/` exists because three domains render threads.

**`layouts/` holds frames that render an `<Outlet/>`**, not pages. `AppShell` is used
as the layout route for every signed-in page and for the demo; `AuthLayout` for the
§3.12 screens and the demo's perspective chooser; `MarketingLayout` for the landing page.

**`routes/index.jsx` is the route table.** Guards are layout routes, exactly as
`tech_stack.md` §6.4 specifies, so a whole branch is protected by one declaration:

```jsx
{ element: <ProtectedRoute allow={['manager','admin']} />, children: [
    { path: '/review',   element: <ReviewDeskPage /> },
    { path: '/team',     element: <TeamDashboardPage /> },
    { path: '/projects', element: <ProjectsPage /> },
]},
{ element: <ProtectedRoute allow={['admin']} />, children: [
    { path: '/users',    element: <UsersPage /> },
    { path: '/holidays', element: <HolidaysPage /> },
]}
```

`/updates` is open to every signed-in role. Route guarding is UX only. Server-side
`authorize` plus `reportPolicy` is the actual enforcement, and the RBAC suite targets
that.

**Two routes need a note, because both look like mistakes in the table:**

- **`/` renders two different pages.** Signed out, it is `LandingPage`; signed in, it is
  `ThisWeekPage` (`product_design_system.md` §3.1, `requirments_doc.md` §13). It is one
  index route whose element branches on the auth state — not a redirect, which would
  flash the wrong page, and not two paths, since the landing page has no second URL to
  live at.
- **`ReportDetailPage` is mounted at two paths.** `/reports/:week` reads your own week;
  `/people/:userId/reports/:week` is how anyone opens someone else's — a teammate from
  the team updates, a manager from §3.8's history table — and the only route deep enough
  to need the three-level breadcrumb. One page, because the rendering is identical and
  the difference is purely which week is fetched; the server decides which layers the
  viewer receives.

**`services/` is the only place Axios appears** (`development_approach_doc.md`,
Frontend Standards). One file per resource; each declares its own endpoint paths, which
`apiClient` prefixes with `VITE_API_BASE_URL`. **`hooks/` wraps services in TanStack
Query** — components call hooks, never services directly.

**`schemas/` holds client-side Zod schemas** for `zodResolver`. They are intentionally
separate from the server's `validators/`: the client validates for the form's benefit,
the server validates for the API's, and the two have different error shapes.

**`lib/` is for framework-agnostic helpers** — `cn()`, date helpers, status maps,
constants. Nothing in `lib/` imports React.

### 3.3 Styles

Three files, in import order:

1. `tokens.css` — pure CSS, the `:root` and `[data-theme="dark"]` blocks lifted
   verbatim from `product_design_system.md` §9.3, so the file stays diffable against its
   source.
2. `base.css` — global element styles: base typography, the universal focus ring,
   scrollbars, the `prefers-reduced-motion` block.
3. `index.css` — `@import "tailwindcss"`, then the other two, then the `@theme` block
   that maps Tailwind's utility names onto the variables (`--color-paper: var(--paper)`).

**`@theme` never restates a hex.** It does not participate in the `[data-theme]`
cascade, so a literal value declared there compiles into every utility and dark mode
silently fails for `bg-card` and `text-ink` while hand-written CSS switches correctly.
`tokens.css` is the single source of truth; `@theme` is a mapping layer over it. If a
theme is ever scoped to a subtree rather than `<html>`, `@theme inline` is the safer
form of the same mapping.

**There is no `tailwind.config.js`.** Tailwind 4 is configured in CSS, and the `@theme`
block in `index.css` carries the whole configuration — colors, spacing, type scale, radii,
fonts, breakpoint — specified in full in `product_design_system.md` §9.4. C1 is resolved;
the config file that document once carried was v3 form under a v4 install, where it would
not have been read at all.

### 3.4 The demo folder

`client/src/demo/` is the whole public demo (`requirments_doc.md` §14,
`tech_stack.md` §6.9). `/demo` renders the perspective chooser; choosing one tells
`apiClient` to use the demo adapter and puts the chosen person into `AuthContext` without
a token. From then on every page, hook and service runs unchanged, and the adapter answers
from an in-memory store built from `fixtures.js`.

It sits in its own folder rather than in `services/` because it is not a way of calling
the API — it is a stand-in for the API, and nothing outside `apiClient.js` and
`DemoEntryPage.jsx` imports it. It ships in the client bundle; the server knows nothing
about it.

`demoRoutes.js` mirrors `api_specification.md`, not the server's route files — the
client never imports across roots (§8). `demoCoverage.test.js` is what keeps the two in
step.

---

## 4. Naming conventions

Every convention chosen, in one place.

### 4.1 Server

| Thing            | Convention                                        | Example                                     |
| ---------------- | ------------------------------------------------- | ------------------------------------------- |
| Layer files      | `camelCase` + the singular role of its folder     | `reportController.js`, `reportService.js`   |
| Models           | same rule — no PascalCase filenames on the server | `reportModel.js`, exporting `Report`        |
| Shared subdocuments | `camelCase` + `Schema`                         | `threadSchema.js`                           |
| Policies         | same rule                                         | `reportPolicy.js`                           |
| Validators       | same rule; exports end in `Schema`                | `reportValidator.js` → `dayUpdateSchema`    |
| Middleware       | named after the function it exports               | `authenticate.js`, `errorHandler.js`        |
| Utils            | named after what they provide                     | `paginate.js`, `appError.js` → `AppError`   |
| Domain in a name | **singular**, always                              | `projectRoutes.js`, not `projectsRoutes.js` |
| URL paths        | **plural** resource segments                      | `/api/reports`, `/api/projects`             |
| Folders          | by layer, plural                                  | `controllers/`, `services/`, `policies/`    |
| Tests            | `<subject>.test.js`, grouped by kind              | `rbac/reportAccess.test.js`                 |
| Error codes      | `SCREAMING_SNAKE`                                 | `REPORT_FORBIDDEN`, `COMMENT_NOT_ALLOWED`   |

Casing does not track what a file exports on the server. `reportModel.js` exports the
`Report` constant and `appError.js` exports the `AppError` class, so every file
belonging to a resource is predictable from its name.

### 4.2 Client

| Thing                  | Convention                               | Example                                   |
| ---------------------- | ---------------------------------------- | ----------------------------------------- |
| Components             | `PascalCase.jsx`, one component per file | `StatusChip.jsx`, `ReviewActionPanel.jsx` |
| Pages                  | `PascalCase` + `Page` suffix             | `ReviewDeskPage.jsx`                      |
| Layouts / route guards | `PascalCase.jsx`                         | `AppShell.jsx`, `ProtectedRoute.jsx`      |
| Hooks                  | `useCamelCase.js`                        | `useReportQueries.js`                     |
| Services               | `camelCase` + `Service`                  | `reportService.js`                        |
| Schemas                | `camelCase` + `Schema`                   | `reportSchema.js`                         |
| Context                | `PascalCase` for the context file        | `AuthContext.jsx`, `authReducer.js`       |
| `lib/` and `demo/` helpers | `camelCase.js`                       | `normalizeError.js`, `demoAdapter.js`     |
| Domain folders         | **singular**                             | `components/report/`, `components/user/`  |
| CSS files              | lowercase                                | `tokens.css`                              |
| Query keys             | as `tech_stack.md` §6.3                  | `['week', userId, weekKey]`               |

**PascalCase is exclusive to React components**, which makes casing itself meaningful:
if a filename starts with a capital, it renders.

### 4.3 Repo-wide

- Folders are lowercase, hyphenated if they ever need two words.
- One export subject per file; no barrel `index.js` re-export files anywhere except
  `routes/index.js` and `seed/index.js`, which are entry points rather than re-exports.
- A file's name says what it is or does, never how it is implemented
  (`development_approach_doc.md`, General Principles).
- **"Project" is the work entity everywhere** — models, routes, pages, components.
  "Section" survives only for the parts of the weekly form (`SectionRail.jsx`,
  `product_design_system.md` §4.2), never for a project.

---

## 5. Where the awkward helpers live

**`paginate()`** → `server/src/utils/paginate.js`. It parses `page`/`limit` from
validated query input and produces the pagination meta for list responses, which
requirements §12 requires on every list of reports. It is domain-agnostic, which is what
qualifies it for `utils/`.

**Week arithmetic and working days are two helpers, not one.** `utils/weeks.js` turns a
week key into dates and back — pure date math, the same answer for everyone.
`services/calendarService.js` answers "which of those days is this person expected to
post?", which needs holidays, work periods and leave from the database, so it is a
service. The client's `lib/dates.js` does only the first; expected days always come
from the API.

**Link tokens** (`tech_stack.md` §2.1) are issued and verified in `authService` and
`userService` from one pair of functions in `authService`. They are not a util: they
write to `users`.

**The ESM `__dirname` helper** → `server/src/utils/paths.js`, **created only when
something actually needs a filesystem path**, exporting one function that takes
`import.meta.url`. Nothing in the current design reads from disk at runtime: config
comes from `env`, and the seed data is a JavaScript module. Creating the file before a
caller exists would be a speculative abstraction.

**`cn()`** → `client/src/lib/cn.js`, the only place `clsx` and `tailwind-merge` are
imported.

---

## 6. Tests

Server tests live in `server/tests/`, outside `src/`, mirroring `tech_stack.md` §7.1.
They are grouped by what they prove rather than by the file they touch:

- `tests/policy/` — `reportPolicy` and `submitRules` as pure functions, no HTTP and no
  database.
- `tests/rbac/` — Supertest against the app exported by `app.js`, with
  mongodb-memory-server, covering `api_specification.md` §6: wrong role blocked, a
  teammate's week opening with its days and without its content, a fabricated ObjectId
  returning **404**, your own report absent from your review desk, the comment and
  owner rules, and list-scope/predicate parity.

Co-locating these beside the code would scatter the RBAC suite across many folders,
and the suite is the deliverable that requirements §12's access-control line is
verified by. `tests/helpers/` holds the in-memory database lifecycle and a token
factory so no test builds a JWT by hand.

The client carries exactly two tests: `lib/__tests__/constants.parity.test.js` (§7.1)
and `demo/__tests__/demoCoverage.test.js` (§3.4). Component and E2E testing stays
deferred per `tech_stack.md` §8.

---

## 7. Shared concerns

### 7.1 Shared vocabulary, without shared code

Render does not expose files outside a service's root directory at build time or
runtime, and Vercel needs an explicit "include source files outside of the Root
Directory" setting. A top-level `/shared` folder would therefore be invisible to the
running API. Each side declares its own copy instead:

- `server/src/constants/` — `reportStatus.js`, `roles.js`, `taskTypes.js`,
  `taskStatus.js`, `weekdays.js` (`database_schema.md` §0.1).
- `client/src/lib/constants.js` — the same five value sets, plus the display labels and
  status token names the server has no business knowing, and the three derived week
  states (`not_started`, `on_leave`, `holiday_week`) the server never stores.

`client/src/lib/__tests__/constants.parity.test.js` reads both sides and asserts the
**value sets** match exactly, for all five enums. The values are the contract; the file
shape is not. The test runs on the client side deliberately: a divergence breaks the
correctness of the client build, so the check belongs where the failing artifact is
produced.

**API paths get no parity test.** The server declares them in `routes/`; the client
declares each once in its `services/` file. A test comparing route strings to client
URL strings cannot catch a parameter in the wrong position, so it would buy false
confidence rather than coverage. The demo coverage test is different in kind: it checks
that the demo answers every call the client makes, not that the client's paths match the
server's.

### 7.2 `.env.example`

Both files are specified verbatim in `tech_stack.md` §5 and are committed:
`server/.env.example` (`NODE_ENV`, `PORT`, `MONGODB_URI`, `JWT_SECRET`,
`JWT_EXPIRES_IN`, `CLIENT_URL`) and `client/.env.example` (`VITE_API_BASE_URL`).
Placeholder values only. Nothing in the server reads `process.env` directly; everything
imports `env` from `config/env.js`. The demo needs no variable: it is a route, not a
build.

### 7.3 `.gitignore`

One file at the repo root:

```
node_modules/
dist/
.env
.env.*
!.env.example
coverage/
.vite/
.vercel/
*.log
.DS_Store
```

`.env` is ignored before the first commit, per `development_approach_doc.md`,
Environment & Secrets Handling.

### 7.4 Root `package.json`

Yes, but only as a script shim — no dependencies, **no npm workspaces**:

```json
{
  "name": "weekly-report-generator",
  "private": true,
  "scripts": {
    "dev:client": "npm --prefix client run dev",
    "dev:server": "npm --prefix server run dev",
    "seed": "npm --prefix server run seed",
    "test": "npm --prefix server run test && npm --prefix client run test",
    "lint": "npm --prefix client run lint && npm --prefix server run lint"
  }
}
```

Workspaces would hoist dependencies and move the lockfile to the repo root, which is
outside both platforms' root directories — the one change here that would actually
break deployment. Without them, each platform still sees a self-contained project and
this file is invisible to both.

---

## 8. Deployment fit

| Platform   | Root directory | Build           | Start / output       |
| ---------- | -------------- | --------------- | -------------------- |
| **Vercel** | `client`       | `npm run build` | output `dist`        |
| **Render** | `server`       | `npm install`   | `node src/server.js` |

The structure satisfies both settings because **no runtime or build-time import ever
crosses between `client/` and `server/`**. The only cross-root read in the repo is the
client parity test, which runs locally and ships to neither platform.

- `server.js` sits at `src/server.js`, matching the start command already recorded in
  `tech_stack.md` §7.3 and the `start` script in §9 of that document.
- `/api/health` is mounted in `routes/index.js` and is Render's health check path.
- `client/vercel.json` holds the SPA rewrite; without it a refresh on `/review` 404s.
- The server binds `process.env.PORT` through `env.PORT` — Render supplies it.
- Vite env vars are inlined at build time, so changing `VITE_API_BASE_URL` requires a
  redeploy, not just a settings save.
- Both platforms redeploy only on changes inside their own root directory, which is
  why the shared vocabulary is duplicated rather than centralized (§7.1).
- **The demo is served by Vercel alone.** It works while the Render API is asleep, which
  is when a visitor from the landing page is most likely to arrive.

**One amendment this structure implied**, now applied: the client needs `vitest` in its
devDependencies and a `"test": "vitest run"` script so its tests can run.
`tech_stack.md` §10 carries both.

---

## 9. Conflicts — all resolved

Every conflict below was found by reading the documents against each other and recorded
here rather than resolved in passing; each was then reconciled in a pass that edited both
sides together. The audit that collected them is `conflicts_reconciliation.md`; what each
pass changed is `reconciliation_changelog.md`. The register is kept rather than deleted —
a resolved conflict is the cheapest warning about where two documents drift apart. Where
a later pass changed a resolution, the table says so.

| #      | Subject                | The disagreement                                                                                                                                                        | Resolution                                                                                                                                                                                                                                                                             |
| ------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **C1** | Tailwind config        | `product_design_system.md` §9.4 shipped a v3-form `tailwind.config.js`; `tech_stack.md` §6.5 specified Tailwind 4, CSS-first, no config file                            | **v4 CSS-first.** A v3 config is not read by the installed version — §0.5's "no document outranks reality". §9.4 is now the complete `@theme` block, carrying the spacing and type scales that deleting the config would otherwise have silently dropped; §6.5 defers to it             |
| **C2** | Role model             | `product_design_system.md` §0.2's two shells vs a three-value `role` field                                                                                              | **`database_schema.md` §0.1:** one `role` enum `member · manager · admin`; `authorize()` carries the hierarchy so `authorize('manager')` admits admin; `isAdmin` is derived client-side and never stored                                                                                |
| **C3** | Demo mode              | Read-only demo (`product_design_system.md` §0.2, §3.14) vs report writing enabled (`tech_stack.md` §6.9, §3.1)                                                          | First resolved as a read-only seeded account. **Pass 4 replaced it:** the demo runs entirely in the browser on hard-coded data, every control works, and a refresh resets it (`requirments_doc.md` §14, `tech_stack.md` §6.9). No demo account, flag or server rule exists              |
| **C4** | Auth screens           | Five screens including a workspace-name field and password reset, against a product with no workspace entity and a stack with no mail library                           | **No workspace anywhere** — registration creates an account (`requirments_doc.md` §1). The invite flow stays, with the admin delivering a one-time link by hand. **Pass 4 restored password reset the same way:** an admin issues a reset link (`/reset/:token`); still no self-service "forgot password" and no email dependency |
| **C5** | Session expiry         | Re-auth modal preserving form state (`product_design_system.md` §3.12) vs clearing the token and hard-redirecting (`tech_stack.md` §6.2); `/login` vs `/signin`         | **The modal, without request retry.** A redirect discards an in-progress report, which is the failure the modal exists to prevent; a retry queue would be machinery for the part that did not need saving. `/signin` is now the only sign-in route name in any document                 |
| **C6** | Landing page route     | `brand_design_strategy.md` §6–§7 specifies a landing page; `product_design_system.md` §3.1 assigns `/` to "This week"; no document gave the landing page a route        | **`/` branches on the session.** Signed out renders the landing page, signed in renders "This week" (§3.2 above). Recorded as deliberate scope in `requirments_doc.md` §13, because a design document had specified a whole product surface that was never agreed as a feature         |
| **C7** | "project" vs "section" | `brand_design_strategy.md` §1.4 and `product_design_system.md` §3.9 said **section**; `requirments_doc.md` §7 and `tech_stack.md` §4's index said project               | First resolved as `section` everywhere. **Pass 4 reversed it at the project owner's request:** **`project` everywhere** — the collection, the API, the pages and the brand vocabulary. "Section" now means only a part of the weekly form                                              |

**Contradictions found after this table was written** were fixed in the same passes and
are listed in `reconciliation_changelog.md` rather than added here — among them a manager
being able to read a teammate's Draft through what was then `canAccessReport` despite
`requirments_doc.md` §3, a toast specified light in one document and dark in another, and
an offline message promising local persistence and sync that nothing in the stack
implements.

---

## 10. Provisional items

Files or paths in the tree above that later roles own.

| Item                                                                                                                                                                                                                               | Owner               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| ~~`models/*` — the collection set~~ **Settled in `database_schema.md`:** seven collections (users, projects, tasks, reports, revisions, holidays, seenMarks) and three shared subdocument schemas                                   | Database Engineer ✔ |
| ~~Endpoint paths beyond the mount bases~~ **Settled in `api_specification.md`**, whose §1.1 mounts match §2.4 here                                                                                                                 | Backend Engineer ✔  |
| ~~The auth pages~~ **Settled:** sign in, first-run sign up, accept invite, and reset password from an admin-issued link                                                                                                            | Reconciliation ✔    |
| ~~`DemoEntryPage.jsx` and the demo write rules~~ **Settled in pass 4:** `/demo` is a perspective chooser over the client-side demo adapter; there are no demo write rules                                                          | Reconciliation ✔    |
| ~~A **People** list page~~ **Settled:** specified in `product_design_system.md` §3.15; `PeoplePage.jsx` is in the §3.1 tree                                                                                                       | Design System ✔     |
| ~~`vitest` in `client/package.json`, per §8~~ **Done** — `tech_stack.md` §10 carries the dependency and the `test` script                                                                                                         | Tech Lead ✔         |
| ~~Component props, state ownership and data flow per page~~ **Settled in `frontend_architecture.md`** — the files in §3.1 are placed there and specified in its §8–§9                                                               | Frontend Engineer ✔ |

**Nothing structural is open.** Invites and resets both reach people as a one-time link an
admin copies from the Users page (`requirments_doc.md` §11.1), and `/signup` is first-run
bootstrap that closes once any account exists (§1 there). Neither needed a new dependency.
