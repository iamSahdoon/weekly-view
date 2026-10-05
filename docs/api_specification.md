# WeeklyView — API Specification

> Output of the **Backend Engineer / API Architect** role, revised in reconciliation
> pass 4 for daily work lines, tasks, project plans, optional approval, comment threads,
> holidays, "new" markers and a client-side demo. Settled input for the Frontend
> Engineer, the Tech Lead and the coding agent.
>
> **This document owns** endpoint paths, methods, request and response payloads, status
> codes and error codes. **It does not own** the data model (`database_schema.md`), the
> permission rules (`tech_stack.md` §3.1, `policies/reportPolicy.js`), or the UI
> (`product_design_system.md`). Where an endpoint needs something those documents do not
> provide, it is recorded in §7, not changed here.
>
> Stack: Node + Express 5, Mongoose 8, ESM, JavaScript only. No OpenAPI, no generated
> clients. Written for a human and a coding agent to build from.

---

## 0. Decisions

Settled and applied throughout.

| #   | Decision                                                                                                                                                                                                                   |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I1  | **Id is canonical.** Mutations and the review page address a report by `_id`. Read-only week lookups mirror the client's week routes: `GET /reports/week/:weekKey` (yours) and `GET /users/:userId/reports/:weekKey` (anyone's). |
| I2  | **The client's clock defines "today" and "this week."** The client sends a `weekKey` (and a weekday where relevant); the server derives dates from it, and bounds "current" at `now + 14h`, the earliest point in any timezone. |
| I3  | **A report is created by its author's first daily update of the week** (`database_schema.md` §1.4). There is no create endpoint. A week lookup always returns a `WeekView`, with `report: null` when there is none yet; 404 is reserved for ids that don't exist. |
| I4  | **Which weeks a person can write:** weeks inside one of their work periods, up to the current week (I2). Outside that, `422 WEEK_OUT_OF_RANGE`.                                                                            |
| I5  | **Days and content are written separately.** A day is written whole by `PUT …/days/:weekday` (R5). The end-of-week content — task statuses and notes, next week, achievements, notes, links, key blocker — by autosave (R6). |
| I6  | **One 409 for every illegal state, plus a revision pin.** Review bodies carry the `revisionNumber` the reviewer read; the atomic claim is on the revision (`action: null`); any mismatch is `409 REPORT_STATE_CHANGED`.       |
| I7  | **Password change returns a fresh token.** A wrong current password is `422`, never `401`.                                                                                                                                  |
| I8  | **The review desk has its own base,** `/api/review-desk`, plus a count endpoint for the sidebar.                                                                                                                            |
| I9  | **Link tokens travel in request bodies,** never in paths: `POST /auth/links/preview` and `POST /auth/links/accept`, for invites and resets alike.                                                                          |
| I10 | **Dashboard scope is one `weekKey`** (accepted by the project owner, `requirments_doc.md` §6). The trend chart takes `endWeek` + `weeks ∈ {4, 8, 12}`.                                                                    |
| I11 | **The project filter is per row:** a person belongs to project P for week W if any of their work lines that week names P, or — having no lines yet — if they are assigned to P.                                           |
| I12 | **No self-mutation, and the owner is protected.** `403 CANNOT_MODIFY_SELF` and `403 PROTECTED_ACCOUNT`. Only the owner changes another admin's details or transfers ownership (`403 OWNER_ONLY`).                         |
| I13 | **A non-author reading a Needs-correction report gets the sent-back revision's `content`,** not the live correction (accepted by the project owner, `requirments_doc.md` §4). Days are always live.                      |
| I14 | **Project assignment only narrows the new-task project list.** No assignment means every active project.                                                                                                                    |
| I15 | **Three read layers** (`tech_stack.md` §3.1): days — the whole team; `content` and week comments — the author, and managers and admins once submitted. Withheld layers are `null`, never a 403, on a week the reader may open. |
| I16 | **Approval is optional.** The author sets `requestApproval` on submit; any manager or admin except the author may approve any submitted report; the review desk defaults to reports that asked.                           |
| I17 | **Comments are threads** with a 10-minute edit and delete window on the server's clock.                                                                                                                                     |
| I18 | **Leave is a boolean in, a period stored.** `PUT /users/:userId/leave { onLeave }`, by the person or a manager or admin.                                                                                                   |
| I19 | **The owner's name and email are on `Me`,** so the Account page can address its `mailto:` link.                                                                                                                           |
| I20 | **"New" markers are derived** from `seenMarks` (`database_schema.md` §5.4); opening a week marks it seen (R13).                                                                                                             |
| I21 | **There is no demo on the server.** No demo account, flag, route or rule. The demo is a client-side adapter over hard-coded data (`tech_stack.md` §6.9) that answers the same endpoints in the browser.                  |

---

## 1. Conventions

### 1.1 Base path, mounting, route declaration

- Everything is under **`/api`**, mounted once in `app.js` → `routes/index.js`:

  ```js
  router.get("/health", healthHandler);
  router.use("/auth", authRoutes);
  router.use("/users", userRoutes);
  router.use("/projects", projectRoutes);
  router.use("/tasks", taskRoutes);
  router.use("/updates", updateRoutes);         // the team updates feed
  router.use("/reports", reportRoutes);          // author side, days, resolutions
  router.use("/reports", reviewRoutes);          // review actions and comments
  router.use("/review-desk", reviewDeskRoutes);  // exported from reviewRoutes.js
  router.use("/holidays", holidayRoutes);
  router.use("/me", meRoutes);                   // "new" markers
  router.use("/dashboard", dashboardRoutes);
  ```

- **Route declaration rule.** A literal path segment may share a base with a `/:id`
  route only if it is declared **before** that route **in the same router**, and never
  across two routers that share a base. In `reportRoutes.js`, `/summary` and
  `/week/:weekKey…` come before `/:id`; in `userRoutes.js`, `/on-leave` comes before
  `/:userId`.
- **Guards attach per route**, never with `router.use(authenticate)` or
  `router.use(authorize(...))` (`project_structure.md` §2.4).

### 1.2 The middleware chain

```
route → validate(zodSchema) → authenticate → authorize(roles) → controller → service → model
```

- `validate` parses `params`, `query` and `body` into **`req.validated`**. Express 5's
  `req.query` is read-only, so nothing is written back to `req`.
- Validation runs first, so a malformed request gets `422` before `401`. Intended:
  validation reveals only the public shape of the endpoint.
- `authenticate` verifies the JWT, loads the user, compares `tokenVersion`, and rejects
  any user whose `status` is not `active`. Any failure is `401 UNAUTHENTICATED`.
- `authorize(role)` carries the hierarchy: `authorize('manager')` admits managers and
  admins. A failure is `403 FORBIDDEN`.
- The controller builds `actor = { id, role, isOwner }` and calls **one** service
  function. Services never see `req`.
- **Single-resource reads load, then authorize.** Never `findOne({ _id, ...scope })`.

### 1.3 Authentication header and session

- `Authorization: Bearer <jwt>` on every endpoint except the public ones:
  `GET /health`, `GET /auth/bootstrap`, `POST /auth/signup`, `POST /auth/login`,
  `POST /auth/links/preview` and `POST /auth/links/accept`.
- The JWT payload is `{ sub, role, tokenVersion }`, expiring after about 5 days. There
  is no refresh token and no logout endpoint: logging out means discarding the token.
- **Client interceptor rule** (amendment M1). On a `401`, the interceptor clears the token
  and emits `session-expired` only if the request carried a token **and** that token
  still equals the one in storage. The first condition keeps a wrong password on
  `/signin` from firing the re-auth modal; the second keeps in-flight requests from
  deleting a fresh token.

### 1.4 Credentials never travel in a URL

Tokens and passwords go in request bodies or headers only. `morgan` logs the request line
on Render, so a token in a URL is a token in the production logs. The client routes
`/invite/:token` and `/reset/:token` read the token from their own URL and send it in a
body.

### 1.5 Response envelope

Every endpoint returns exactly one of two shapes (`tech_stack.md` §3):

```json
{ "success": true,  "data": { }, "message": null, "error": null }
```

```json
{ "success": false, "data": null, "message": "You can't comment on this update.",
  "error": { "code": "COMMENT_NOT_ALLOWED" } }
```

- `ok(res, data, message, status = 200)` produces success; `errorHandler` produces every
  error. The fourth parameter exists for `201`s (amendment M9, applied).
- `error` always has `code`; a few codes carry one extra key (§1.9).
- `message` is plain and safe to show; the client renders its own copy keyed on `code`.

### 1.6 List responses — pagination meta

**Paginated lists** return `{ items, meta: { page, limit, total, totalPages } }`.
`page` is 1-based; `totalPages` is `0` when `total` is `0`; a page beyond the end returns
empty `items` with correct `meta`.

**Bounded lists** return `{ items }` with no `meta`: lists whose length the product fixes
— revisions of one report, projects, holidays of a year, dashboard series, the activity
feed, the team updates of one day. Requirements §12's pagination rule applies to lists of
reports, and every list of reports is paginated.

Paginated endpoints: U1, U7, R1, V3, D2.

### 1.7 Query parameters for lists

| Param                 | Form                          | Rule                                                              |
| --------------------- | ----------------------------- | ----------------------------------------------------------------- |
| `page`                | integer ≥ 1                   | default `1`                                                       |
| `limit`               | `20` \| `50` \| `100`         | default `20`; anything else → `422`                               |
| `sort`                | a field from the endpoint's **allowlist** | anything else → `422 VALIDATION_FAILED`                 |
| `dir`                 | `asc` \| `desc`               | default per endpoint                                              |
| multi-value filters   | comma list                    | each value validated against its enum                             |
| `weekFrom` / `weekTo` | weekKey                       | inclusive; `weekFrom > weekTo` → `422`                            |
| `q`                   | string, 1–100 chars, trimmed  | case-insensitive substring over name and email; regex-escaped     |

**Week-state sort order** wherever sortable: `not_started` → `on_leave` → `draft` →
`submitted` → `needs_correction` → `approved`.

### 1.8 Formats

| Thing       | Format                                                                                                          |
| ----------- | --------------------------------------------------------------------------------------------------------------- |
| Ids         | 24-hex ObjectId strings, always `_id`. Malformed in a path → `422`; well-formed but absent → `404`              |
| `weekKey`   | `YYYY-Www`, ISO week-numbering year: `2026-W38`. `W53` only in years that have one                              |
| `weekday`   | `mon` \| `tue` \| `wed` \| `thu` \| `fri`                                                                       |
| Dates       | Calendar dates (holidays, week starts, project starts) as `YYYY-MM-DD`; instants as ISO 8601 UTC with milliseconds |
| Enums       | Storage keys exactly as `database_schema.md` §0.1; the client maps them to labels                               |
| Hours       | numbers > 0 on a line, step 0.25; sums are plain numbers                                                         |
| Rates       | numbers in `[0, 1]`, or `null` when the denominator is zero                                                      |

### 1.9 Error codes

| Code                         | Status | Meaning                                                                                                       | Extra keys  |
| ---------------------------- | ------ | ------------------------------------------------------------------------------------------------------------- | ----------- |
| `VALIDATION_FAILED`          | 422    | The request failed Zod, or the submit rules failed                                                            | `fields`    |
| `UNAUTHENTICATED`            | 401    | Missing, malformed, expired or version-stale token, or the user is not `active`                              | —           |
| `INVALID_CREDENTIALS`        | 401    | Login failed. One code and one message for every cause                                                        | —           |
| `FORBIDDEN`                  | 403    | The role is too low for the route                                                                              | —           |
| `SIGNUP_CLOSED`              | 403    | Bootstrap is unavailable, including the losing insert of a race                                               | —           |
| `CANNOT_MODIFY_SELF`         | 403    | An admin attempted to change their own role, remove themselves, or transfer ownership to themselves          | —           |
| `PROTECTED_ACCOUNT`          | 403    | The target is the owner, and the actor is not                                                                 | —           |
| `OWNER_ONLY`                 | 403    | Only the owner may do this: change another admin's details, or transfer ownership                            | —           |
| `REPORT_FORBIDDEN`           | 403    | A write on a week that isn't the actor's to write — someone else's content, or a member acting on another's week | —         |
| `SELF_REVIEW_FORBIDDEN`      | 403    | A reviewer acted on their own report                                                                          | —           |
| `COMMENT_NOT_ALLOWED`        | 403    | The actor may not write in that place (a teammate on a closed update; a member starting a week thread)        | —           |
| `EDIT_WINDOW_CLOSED`         | 403    | Editing or deleting a comment more than 10 minutes after it was posted, or someone else's                     | —           |
| `LINK_INVALID`               | 404    | A link token that is expired, used, never valid, or of the wrong purpose. **One response for all**            | —           |
| `USER_NOT_FOUND`             | 404    | No user with that id                                                                                          | —           |
| `PROJECT_NOT_FOUND`          | 404    | No project with that id                                                                                       | —           |
| `TASK_NOT_FOUND`             | 404    | No task with that id, or not the actor's                                                                      | —           |
| `REPORT_NOT_FOUND`           | 404    | No report with that id, or no posted day with that weekday                                                    | —           |
| `REVISION_NOT_FOUND`         | 404    | That revision number does not exist on the report                                                             | —           |
| `THREAD_NOT_FOUND`           | 404    | No comment or reply with that id on the report                                                                | —           |
| `BLOCKER_NOT_FOUND`          | 404    | No blocker with that id in the report's days                                                                  | —           |
| `HOLIDAY_NOT_FOUND`          | 404    | No holiday with that id                                                                                       | —           |
| `ROUTE_NOT_FOUND`            | 404    | No route matched                                                                                              | —           |
| `USER_EXISTS`                | 409    | Invite, or email change, to an address that belongs to another `active` or `invited` user                     | —           |
| `USER_STATE_CHANGED`         | 409    | The target user is not in a state this action accepts                                                         | `status`    |
| `PROJECT_NAME_TAKEN`         | 409    | The name collides, case-insensitively, with any project, active or inactive                                   | —           |
| `HOLIDAY_EXISTS`             | 409    | A holiday already exists on that date                                                                         | —           |
| `COMMENT_HAS_REPLIES`        | 409    | Deleting a comment that has replies, or a send-back comment                                                   | —           |
| `REPORT_STATE_CHANGED`       | 409    | **Every** illegal report state: a lost review race, a stale revision pin, a disallowed transition, a write on a frozen week | `status` |
| `WEEK_OUT_OF_RANGE`          | 422    | The weekKey is outside the person's work periods or after the current-week bound                              | —           |
| `DAY_NOT_EXPECTED`           | 422    | A daily update for a day that is in the future, a holiday, a day the person is on leave, or a day before they joined; `reason` is `future` · `holiday` · `leave` · `not_on_team` | `reason`    |
| `PROJECT_INACTIVE`           | 422    | Starting a task on an inactive project                                                                        | —           |
| `CURRENT_PASSWORD_INCORRECT` | 422    | Password change with a wrong current password; a field error on `currentPassword`                             | `fields`    |
| `INTERNAL_ERROR`             | 500    | Anything unhandled. The stack is logged in development only                                                   | —           |

**`DAY_NOT_EXPECTED` reason `not_on_team`** — a day of the join week before the person's
work period starts. *(Owner decision, 2026-10-04.)*

**Mongo duplicate-key errors** are mapped in the service, never passed through: an
`E11000` on `{ isOwner: 1 }` becomes `SIGNUP_CLOSED`; on `{ email: 1 }`, `USER_EXISTS`; on
`holidays.date`, `HOLIDAY_EXISTS`.

**`status` on `REPORT_STATE_CHANGED`** is returned only after the actor has passed the
read check for that report, so it never discloses anything they could not read.

### 1.10 Shared response shapes

**`UserRef`**, wherever a person is named:

```json
{ "_id": "66f1…a1", "name": "Nadia F.", "role": "manager", "status": "active", "onLeave": false }
```

`status` lets the client show the removed marker; `onLeave` the On leave chip.

**`ProjectRef`**: `{ "_id": "66f1…c3", "name": "Client A", "status": "active" }`

**`TaskRef`**: `{ "_id": "66f3…t1", "name": "Checkout redesign", "project": ProjectRef }`

**`Me`**, returned by `/auth/me`, login, signup, link accept and password change:

```json
{
  "_id": "66f1…a1", "name": "Nadia F.", "email": "nadia@example.com",
  "role": "manager", "status": "active",
  "projects": [ProjectRef],
  "joinedAt": "2026-03-04T10:12:00.000Z",
  "isOwner": false, "onLeave": false,
  "owner": { "name": "Sanduni B.", "email": "sanduni@example.com" }
}
```

`joinedAt` is the start of the person's **first** work period — the same value U1 serves
for "Joined" — so the week picker can disable weeks before it (amendment M3). Weeks in a
gap between two periods stay selectable and simply have nothing in them. `owner` serves the Account page's email line (I19).

**`Thread`**, a comment with its replies:

```json
{
  "_id": "66f2…m1",
  "author": UserRef,
  "text": "I've chased the client for the keys.",
  "createdAt": "2026-09-16T18:05:00.000Z",
  "editedAt": null,
  "editableUntil": "2026-09-16T18:15:00.000Z",
  "revisionNumber": null,
  "kind": "comment",
  "replies": [
    { "_id": "66f2…m2", "author": UserRef, "text": "Thanks.", "createdAt": "…",
      "editedAt": null, "editableUntil": "…" }
  ],
  "isNew": true
}
```

- `editableUntil` is `createdAt + 10 min`; the client shows `Edit` and `Delete` to the
  writer until then. It is informative: the server enforces the window on its own clock.
- `revisionNumber` and `kind` (`comment` · `approval` · `send_back`) are set on week
  threads only.
- `isNew` is the "new" marker for the reader (§2.10).

**`Day`**:

```json
{
  "weekday": "tue",
  "lines": [
    { "_id": "66f2…l1", "task": TaskRef, "taskType": "development",
      "text": "Wired payments on the test site", "hours": 3 }
  ],
  "blockers": [
    { "_id": "66f2…b1", "text": "Waiting on API keys", "isKey": true,
      "resolvedAt": null, "resolvedBy": null, "carriedOver": false }
  ],
  "openToTeam": false,
  "postedAt": "2026-09-15T17:42:00.000Z",
  "editedAt": null,
  "hours": 5.5,
  "comments": [Thread],
  "canComment": true
}
```

`hours` is the day's sum. `resolvedAt` and `resolvedBy` are joined from
`blockerResolutions`, and `carriedOver` is computed on read by comparing the blocker's
normalised text with the same author's previous week (`database_schema.md` §3.5) — the
design's `Carried over` label (design §3.4) has no other source. `canComment` states whether the reader may write here, so the
client doesn't re-derive the policy.

**`WeekView`**, returned by every single-week read (R3, R4, U8) and every report mutation
(R5–R7, V1, V2):

```json
{
  "user": UserRef, "weekKey": "2026-W38", "weekStart": "2026-09-14", "weekEnd": "2026-09-18",
  "expectedDays": ["mon", "tue", "thu", "fri"],
  "dayStates": { "mon": "posted", "tue": "posted", "wed": "holiday", "thu": "missing", "fri": "future" },
  "state": "draft",
  "report": Report
}
```

- `report` is `null` until the person's first daily update of the week (I3); the week
  still has its expected days and day states, so the page can render "Not started" and
  mark holidays and leave.
- `state` is the derived week state (`database_schema.md` §5.0): a report status,
  `not_started`, `on_leave` or `holiday_week`.
- `dayStates` values: `posted` · `missing` · `today` · `future` · `holiday` · `leave` ·
  `not_on_team`.

**`Report`**, inside a `WeekView`:

```json
{
  "_id": "66f2…r7",
  "author": UserRef,
  "weekKey": "2026-W38", "weekStart": "2026-09-14", "weekEnd": "2026-09-18",
  "status": "submitted",
  "approvalRequested": true,
  "revisionNumber": 2,
  "submittedAt": "…", "lastActivityAt": "…", "updatedAt": "…",
  "days": [Day],
  "tasks": [
    { "task": TaskRef, "hours": 11.5, "status": "in_progress", "note": "Payments wired" }
  ],
  "hoursByType": { "development": 18, "testing": 5, "meetings": 6, "documentation": 3,
                   "review": 4, "research_study": 2, "other": 0 },
  "contentSource": "live",
  "contentRevisionNumber": null,
  "content": { "nextWeek": [], "achievements": [], "notes": "", "links": [] },
  "weekComments": [Thread],
  "latestComment": { "text": "…", "author": UserRef, "revisionNumber": 1, "createdAt": "…" },
  "canSubmit": false,
  "submitBlockers": ["Thursday has no update."]
}
```

- **Layers (I15).** `days` and `hoursByType` are served to anyone who may open the
  week. `tasks[].status`, `tasks[].note`, `content`,
  `weekComments` and `latestComment` are served only when `canReadContent` allows;
  otherwise `content` is `null`, `weekComments` is `null`, each task's `status` and
  `note` are `null`, and `contentSource` is `"withheld"`.
- **Content served (I13).** The author always gets live content. A manager or admin on a
  `needs_correction` report gets the snapshot of revision `revisionNumber` —
  `contentSource: "revision"`, `contentRevisionNumber: 2`. Every other readable case
  serves live content.
- `tasks[].hours` is summed from the lines — always live and always visible, because the
  lines are.
- `canSubmit` and `submitBlockers` are served to the author only, from the shared
  submit-rules module, so the form can explain a disabled `Submit`.

**`ReportRow`**, one row in a report list (R1, U7):

```json
{
  "_id": "66f2…r7", "weekKey": "2026-W38", "weekStart": "…", "weekEnd": "…",
  "status": "approved", "approvalRequested": false,
  "projects": [ProjectRef], "tasksDone": 8, "taskCount": 12, "hours": 38.5,
  "revisionNumber": 3, "submittedAt": "…", "lastActivityAt": "…",
  "postedWeekdays": ["mon", "tue", "wed", "thu", "fri"], "isNew": false
}
```

For a non-author viewer, `tasksDone` is `null` on a Draft (task status is content) and is
read from the sent-back revision on Needs correction. `hours`, `projects` and
`taskCount` come from the lines and are always present.

**`RevisionSummary`** (R8) and **`Revision`** (R9):

```json
{
  "revisionNumber": 2, "isCurrent": true, "approvalRequested": true,
  "submittedAt": "…", "submittedBy": UserRef,
  "action": "changes_requested", "comment": "Hours by type look off.",
  "reviewedBy": UserRef, "reviewedAt": "…"
}
```

`Revision` adds `content` and `days` — the snapshot as submitted, with no comments and no
resolution state.

**`ProjectProgress`**:

```json
{
  "plan": { "startDate": "2026-09-01", "plannedDays": 20, "plannedHours": 160 },
  "daysUsed": 12, "daysLeft": 8, "overdueDays": 0,
  "hoursLogged": 96.5,
  "planHistory": [ { "plannedDays": 15, "plannedHours": null, "startDate": "2026-09-01",
                     "changedAt": "…", "changedBy": UserRef } ]
}
```

`daysLeft` is never negative; `overdueDays` carries the overrun. Both are derived
(`database_schema.md` §5.3).

---

## 2. Endpoints

Each entry gives the method and path, auth, roles, the schema, the request, the success
response, and errors in the **order they are checked**. The shared errors — `422
VALIDATION_FAILED` for a malformed request, `401 UNAUTHENTICATED`, `500 INTERNAL_ERROR` —
apply to every authenticated endpoint and are not repeated.

### 2.0 Health

#### H1 · `GET /api/health`

Public. Render's health check. **200** `data: { "status": "ok" }`. It does not touch the
database, so a slow Atlas connection never fails the health check.

---

### 2.1 Auth — `authRoutes.js` · `authController` · `authService` · `authValidator.js`

#### A1 · `GET /api/auth/bootstrap`

Public. **200** `data: { "available": true }` — `false` once any user exists. Drives the
landing page's call to action and `/signup`'s two states.

#### A2 · `POST /api/auth/signup`

Public. Body `{ name, email, password }`: name 1–80, email valid, password 8–72 (bcrypt's
input limit).

1. Any user exists → `403 SIGNUP_CLOSED`.
2. Insert `role: 'admin'`, `status: 'active'`, `isOwner: true`, and a work period
   `{ from: now, to: null }`.
3. A duplicate key on `isOwner` (the race) → `403 SIGNUP_CLOSED`.

**201** `data: { token, user: Me }`

#### A3 · `POST /api/auth/login`

Public. Body `{ email, password }`. **200** `data: { token, user: Me }`.
Errors: `401 INVALID_CREDENTIALS` for an unknown email, a wrong password, or `status ≠
active` — one code and one message: "That email and password don't match." Rate limiting
is deferred (`tech_stack.md` §8).

#### A4 · `GET /api/auth/me`

Roles: any. **200** `data: Me`. A `401` here is how a stale stored token is discovered.

#### A5 · `PATCH /api/auth/me`

Roles: any. Body `{ name }`, 1–80 characters. **Name only** — email is changed by an
admin (U12). **200** `data: Me`.

#### A6 · `POST /api/auth/password`

Roles: any. Body `{ currentPassword, newPassword }`, new 8–72.

1. Verify `currentPassword` → `422 CURRENT_PASSWORD_INCORRECT` with
   `fields.currentPassword`. **Never 401**, or the interceptor would open the re-auth
   modal over the Account page.
2. In one update, set the new hash and `$inc tokenVersion`; sign a token at the new
   version.

**200** `data: { token, user: Me }`. Every other session dies at its next request.

#### A7 · `POST /api/auth/links/preview`

Public. Body `{ token }`, 1–200 characters. SHA-256 the token, look it up through
`{ linkTokenHash: 1 }`, require an unexpired link.

**200** `data: { "purpose": "invite", "email": "imali@example.com", "role": "member" }` —
`role` for invites only. **404 `LINK_INVALID`** for any failure, byte-identical to A8's.

#### A8 · `POST /api/auth/links/accept`

Public. Body `{ token, password }`, plus `name` (1–80) when the link is an invite.

1. Verify as A7.
2. **Invite:** set `name`, `passwordHash`, `status: 'active'`, `$push workPeriods { from:
   now, to: null }`, clear the link fields. **Reset:** set `passwordHash`, `$inc
   tokenVersion`, clear the link fields.

The update is conditioned on the same `linkTokenHash`, so two concurrent accepts cannot
both succeed. **201** `data: { token, user: Me }` — the person is signed in.
Errors: `404 LINK_INVALID`.

---

### 2.2 Users — `userRoutes.js` · `userController` · `userService` · `userValidator.js`

U7 and U8 are mounted here but read reports: their handlers live in `reportController`.

#### U1 · `GET /api/users`

Roles: `authorize('manager')`. Serves **People** (§3.15) and **Users** (§3.10).

Query: `q`, `role` (multi), `status` (multi: `active,invited,removed`, omitted = all),
`project` (id), `page`, `limit`, `sort` (`name` default · `joinedAt` · `lastActivityAt` ·
`reportsFiled`), `dir` (default `asc`).

The People client drops `status` while `q` is set, so a search reaches every status.

**200** paginated items:

```json
{
  "_id": "…", "name": "Imali J.", "email": "imali@example.com", "role": "member",
  "status": "invited", "projects": [ProjectRef],
  "joinedAt": null, "removedAt": null, "linkExpiresAt": "2026-10-05T11:00:00.000Z",
  "reportsFiled": 0, "lastActivityAt": null,
  "isOwner": false, "onLeave": false, "leaveSince": null
}
```

- **No token, raw or hashed, ever appears in this list.**
- `joinedAt` / `removedAt` are derived from work periods; `linkExpiresAt` is set only for
  a live invite link.

Errors: `403 FORBIDDEN` for a member.

#### U2 · `GET /api/users/:userId`

Roles: `authorize('manager')`. The profile header. **200** a U1 item. Errors:
`404 USER_NOT_FOUND`.

#### U3 · `POST /api/users` — create an invite

Roles: `authorize('admin')`. Body `{ email, role, projects? }` — `projects` are active
project ids. **No name**: it is set when the invite is accepted
(`database_schema.md` §10, decision 16).

- **The role is `admin` and the actor is not the owner** → `403 OWNER_ONLY`, as U5.
  *(Owner decision, 2026-10-03.)*
- **No user with that email** → insert `status: 'invited'`, the role, projects and an
  invite link (7 days). **201.**
- **An `active` or `invited` user** → `409 USER_EXISTS`. A pending invite is re-issued
  with U4.
- **A `removed` user** → reactivate the same document: `status: 'invited'`, `$unset
  passwordHash`, the body's role and projects, a fresh invite link, `$inc tokenVersion`.
  Earlier work periods stay closed; accepting opens a new one. **200.**

**201 / 200** `data: { user: U1 item, linkUrl: "https://…/invite/6hB…Qe", expiresAt }`.
`linkUrl` appears only in this response and U4's.

Errors: `403 FORBIDDEN`, `403 OWNER_ONLY`, `409 USER_EXISTS`, `422 VALIDATION_FAILED`
(unknown or inactive project in `fields.projects`).

#### U4 · `POST /api/users/:userId/invite-link` — re-issue

Roles: `authorize('admin')`. The target must be `invited` → otherwise `409
USER_STATE_CHANGED`. Overwrites the link fields, killing the previous link.
**200** `data: { linkUrl, expiresAt }`.

#### U5 · `PATCH /api/users/:userId/role`

Roles: `authorize('admin')`. Body `{ role }`.

1. Self → `403 CANNOT_MODIFY_SELF`.
2. `404 USER_NOT_FOUND`.
3. Target is the owner → `403 PROTECTED_ACCOUNT`.
4. Target is an admin, or the new role is admin, and the actor is not the owner →
   `403 OWNER_ONLY`.
5. Target `removed` → `409 USER_STATE_CHANGED`.
6. Same role → 200 no-op. Otherwise set it and `$inc tokenVersion`.

**200** a U1 item.

#### U6 · `POST /api/users/:userId/remove`

Roles: `authorize('admin')`. Checks as U5 steps 1–4; already `removed` → `409`.
Sets `status: 'removed'`, closes the open work period, `$inc tokenVersion`, clears any
link. Keeps `projects`. Reports are untouched. **200** a U1 item.

#### U7 · `GET /api/users/:userId/reports` — someone's history

Roles: `authorize('manager')`. Query: `status` (multi — the four report statuses **and**
`not_started`, `on_leave`, `holiday_week`), `weekFrom`, `weekTo`, `page`, `limit`, `sort`
(`weekKey` default · `lastActivityAt`), `dir` (default `desc`).

The list is **every week the person was on the team** (inside one of their work periods,
up to the current week), not only weeks with a report. The service builds the week list
from the work periods, joins the reports, and derives the state of a week with no report
exactly as `database_schema.md` §5.0 does. **200** paginated items, each either a
`ReportRow` (with the non-author rules of §1.10) or a **`WeekRow`** for a week with no
report:

```json
{ "_id": null, "weekKey": "2026-W35", "weekStart": "2026-08-24", "weekEnd": "2026-08-28",
  "status": "on_leave", "hours": null, "projects": [], "taskCount": null, "tasksDone": null,
  "revisionNumber": 0, "lastActivityAt": null, "isNew": false }
```

`status` on a `WeekRow` is `not_started`, `on_leave` or `holiday_week`; `_id` is `null`
and there is nothing to open. `sort=lastActivityAt` places `WeekRow`s last.
Errors: `404 USER_NOT_FOUND`.

#### U8 · `GET /api/users/:userId/reports/:weekKey` — anyone's week

Roles: **any**. Serves `/people/:userId/reports/:week`, and a teammate opening a week from
the team updates.

1. `404 USER_NOT_FOUND`.
2. `canOpenWeek` — any active member of the team.
3. Find `{ author: userId, weekKey }`; build the `WeekView`, with the layers of I15
   applied to its report.

**200** `data: WeekView` — `report: null` if nothing has been posted.

#### U9 · `PUT /api/users/:userId/leave`

Roles: any, with a service check. Body `{ onLeave: boolean }`.
The actor must be the person, or a manager or admin → otherwise `403 FORBIDDEN`. Target
not `active` → `409 USER_STATE_CHANGED`. Opens or closes a leave period; idempotent
both ways. **200** `Me` when the actor is the target, else a U1 item.

#### U10 · `GET /api/users/on-leave`

Roles: **any**. **200** `data: { items: [UserRef] }` — active people with an open leave
period, sorted by name. Names and roles only. Bounded list.

#### U11 · `POST /api/users/:userId/transfer-ownership`

Roles: `authorize('admin')` — the owner is always an admin — then owner-only in the service.

1. Actor not the owner → `403 OWNER_ONLY`.
2. Self → `403 CANNOT_MODIFY_SELF`.
3. `404 USER_NOT_FOUND`.
4. Target not `active`, or a member → `409 USER_STATE_CHANGED`.
5. One **transaction**: unset the actor's `isOwner`; set the target's, and if a manager,
   `role: 'admin'` and `$inc tokenVersion`.

**200** the target as a U1 item.

#### U12 · `PATCH /api/users/:userId/email`

Roles: `authorize('admin')`. Body `{ email }`.

1. `404 USER_NOT_FOUND`.
2. Target is another admin or the owner, and the actor is not the owner →
   `403 OWNER_ONLY` / `403 PROTECTED_ACCOUNT`. The owner may change their own email; any
   other admin may not change their own (`403 CANNOT_MODIFY_SELF`).
3. Target `removed` → `409 USER_STATE_CHANGED`.
4. Address in use → `409 USER_EXISTS`.
5. Set it and `$inc tokenVersion` — the person signs in again with the new address.

**200** a U1 item.

#### U13 · `POST /api/users/:userId/reset-link`

Roles: `authorize('admin')`. Body none. The same scope rules as U12 steps 1–2; the target
must be `active` → otherwise `409 USER_STATE_CHANGED`. Issues a reset link (24 hours),
overwriting any live link. **200** `data: { linkUrl: "https://…/reset/…", expiresAt }`,
in this response only. The admin never sets a password.

---

### 2.3 Projects — `projectRoutes.js` · `projectController` · `projectService` · `projectValidator.js`

#### P1 · `GET /api/projects`

Roles: any. Query: `status` (`active` default · `inactive` · `all`), `mine` (boolean),
`usedInWeek` (a weekKey: active projects plus any inactive one named by a line that week,
for the dashboard filter). Bounded, sorted by name.

**200** `data: { items }`:

- **Every role:** `{ _id, name, description, status }`, plus `progress: ProjectProgress`
  on projects the viewer is assigned to.
- **Managers and admins:** `progress` on every project with a plan, `memberIds`,
  `memberCount`, `taskCount`, `createdAt`.

#### P2 · `POST /api/projects`

Roles: `authorize('manager')`. Body `{ name, description?, memberIds?, plan? }` — `plan:
{ startDate, plannedDays, plannedHours? }`; `startDate` a weekday, `plannedDays` 1–1000,
`plannedHours` > 0 or null.
**201** a P1 manager item. Errors: `409 PROJECT_NAME_TAKEN`, `422 VALIDATION_FAILED`.

#### P3 · `PATCH /api/projects/:id`

Roles: `authorize('manager')`. Body any of `{ name, description, memberIds }`. `memberIds`
replaces membership. **200** a P1 manager item.

#### P4 · `PUT /api/projects/:id/plan` — set or extend the plan

Roles: `authorize('manager')`. Body `{ startDate, plannedDays, plannedHours }`. The plan
being replaced is pushed onto `planHistory` with `changedAt` and `changedBy`.
**200** a P1 manager item. Errors: `404 PROJECT_NOT_FOUND`, `422 VALIDATION_FAILED`.

#### P5 · `POST /api/projects/:id/deactivate`

Roles: `authorize('manager')`. Idempotent. Tasks and lines are untouched.
**200** a P1 manager item.

---

### 2.4 Tasks — `taskRoutes.js` · `taskController` · `taskService`

#### T1 · `GET /api/tasks`

Roles: any. Always the actor's own tasks. Query: `includeDone` (default `false`).
**200** `data: { items: [TaskRef + { doneAt, hoursTotal, lastWeekKey }] }`, grouped by the
client. This is the day panel's task picker. Tasks are created by R5 ("start a new
task"), never here.

---

### 2.5 Reports and days — `reportRoutes.js` · `reportController` · `reportService` · `reportValidator.js`

Declaration order: `GET /`, `GET /summary`, `GET /week/:weekKey`,
`PUT /week/:weekKey/days/:weekday`, then every `/:id…` route.

#### R1 · `GET /api/reports` — my reports

Roles: any. Always `{ author: actor.id }`. Query: `status` (multi), `project`, `weekFrom`,
`weekTo`, `page`, `limit`, `sort` (`weekKey` default · `lastActivityAt` · `submittedAt`),
`dir` (default `desc`). **200** paginated `ReportRow` items.

#### R2 · `GET /api/reports/summary` — personal strip

Roles: any. Query: `weekKey`, `month` (`YYYY-MM`).
**200** `{ "weeksFiled": 14, "hoursThisMonth": 96.5, "openBlockers": 2 }` — hours from the
author's lines dated in the month; open blockers in the given week's days.

#### R3 · `GET /api/reports/week/:weekKey` — my week

Roles: any. **200** `data: WeekView` for the caller. `report: null` renders Not started,
with holidays and leave days already marked.

#### R4 · `GET /api/reports/:id`

Roles: any. Load → `404 REPORT_NOT_FOUND`; `canOpenWeek` → `403 REPORT_FORBIDDEN` (only
for someone not on the team); serve with the layers of I15. **200** `data: WeekView`.

#### R5 · `PUT /api/reports/week/:weekKey/days/:weekday` — post or edit a daily update

Roles: any. Always the caller's own week. Body — the **whole day**:

```json
{
  "lines": [
    { "_id": "66f2…l1", "task": "66f3…t1", "taskType": "development",
      "text": "Wired payments", "hours": 3 },
    { "newTask": { "name": "Login timeout", "project": "66f1…c3" },
      "taskType": "testing", "text": "Regression tests", "hours": 2.5 }
  ],
  "blockers": [ { "_id": "66f2…b1", "text": "Waiting on API keys" }, { "text": "New one" } ],
  "openToTeam": false
}
```

- `lines`: 1–20. Each names an existing own open task by id **or** a `newTask`. `text`
  1–500, `hours` > 0 step 0.25, `taskType` from the enum. **The client round-trips
  existing line and blocker `_id`s.**
- `blockers`: 0–10, `text` 1–500. `isKey` is not accepted here; see R6.

Order:

1. `weekKey` outside I4 → `422 WEEK_OUT_OF_RANGE`.
2. The weekday is in the future, a holiday, or a leave day for the author →
   `422 DAY_NOT_EXPECTED` with `reason`.
3. A task id that isn't the actor's → `404 TASK_NOT_FOUND`; a `newTask` on an inactive
   project → `422 PROJECT_INACTIVE`.
4. No report → create it as a Draft (I3).
5. Status not `draft` or `needs_correction` → `409 REPORT_STATE_CHANGED`.
6. Insert new tasks; upsert the day conditioned on the status still being open; copy each
   task's project onto its line; keep `isKey` on kept blockers; sync `content.tasks`;
   prune orphaned resolutions. Comments are untouched.

**200** `data: WeekView`, the author view. No revision, no `lastActivityAt`.

#### R6 · `PATCH /api/reports/:id` — autosave the end-of-week content

Roles: any. Body:

```json
{
  "tasks": [ { "task": "66f3…t1", "status": "in_progress", "note": "Payments wired" } ],
  "nextWeek": [ "…" ], "achievements": [ { "_id": "…", "text": "…", "isKey": true } ],
  "notes": "…", "links": [ { "label": "…", "url": "https://…" } ],
  "keyBlockerId": "66f2…b1"
}
```

- `tasks` may only set `status` and `note` on tasks already listed; a task id not in the
  week → `422 VALIDATION_FAILED`. Adding or removing tasks happens through R5.
- `keyBlockerId`: a blocker in any day, or `null`. The server sets `isKey` on it and
  clears it everywhere else.
- Bounds: `note` 0–2000; `nextWeek`, `achievements`, `links` at most 30 items, text
  0–500; at most one `isKey` achievement; `notes` 0–5000; `links[].url` http(s).

Order: load → 404; not the author → `403 REPORT_FORBIDDEN`; status not open → `409`;
`updateOne` conditioned on the open status (zero match → `409`). **200** `WeekView`.

Concurrent autosaves from two tabs are last-write-wins (O2).

#### R7 · `POST /api/reports/:id/submit` — submit or resubmit

Roles: any. Body `{ "requestApproval": false }`. The client flushes any pending autosave
first.

1. Load → 404; not the author → 403; status not open → 409.
2. Submit rules (`database_schema.md` §3.3): every expected day posted; every task has a
   status → otherwise `422 VALIDATION_FAILED` with `fields` such as
   `{ "days.thu": "Thursday has no update.", "tasks.66f3…t1.status": "Choose a status." }`.
3. The atomic `findOneAndUpdate` (`$inc revisionNumber`, status, `approvalRequested`,
   timestamps, `latestComment: null`); zero match → `409`.
4. Insert the revision with `content` and `days` (no comments); update tasks' `doneAt`.

**200** `data: WeekView`.

#### R8 · `GET /api/reports/:id/revisions`

Roles: any who may read the week's content — the author, or a manager or admin once
submitted; otherwise `403 REPORT_FORBIDDEN`. **200** `data: { items: RevisionSummary[] }`,
newest first.

#### R9 · `GET /api/reports/:id/revisions/:revisionNumber`

As R8, then `404 REVISION_NOT_FOUND`. **200** `data: Revision`.

#### R10 · `PUT` / `DELETE /api/reports/:id/blockers/:blockerId/resolution`

Roles: any, with `canResolveBlocker`: the author, or a manager or admin, at every status.
A teammate → `403 REPORT_FORBIDDEN`. Blocker not in any day → `404 BLOCKER_NOT_FOUND`.
Idempotent both ways; resolving keeps the original `resolvedAt`.
**200** `data: { blockerId, resolvedAt, resolvedBy }` (nulls after `DELETE`).

#### R11 · `PUT /api/reports/:id/days/:weekday/team-comments`

Roles: any, with `canToggleTeamComments`: the author, or a manager or admin. Body
`{ "open": true }`. Any status. No posted day → `404 REPORT_NOT_FOUND`.
**200** `data: Day`.

#### R12 · `GET /api/updates` — the team updates feed

Roles: any. Mounted at `/api/updates`. Query: `weekKey` (required), `weekday` (required),
`project` (optional, people with a line on it that day), `blockersOnly` (boolean — keeps only
days with an **open**, unresolved blocker; *owner decision, 2026-10-05, per design §3.16*).
**200** `data: { items }` — one entry per person on the team that week, sorted by name
with the viewer first:

```json
{ "user": UserRef, "state": "posted", "reportId": "66f2…r7", "day": Day }
```

`state` is `posted` · `not_posted` · `leave` · `holiday`; `day` is `null` unless posted.
Bounded by the team's size. No `content` is read.

#### R13 · `POST /api/reports/:id/seen`

Roles: any who may open the week. Upserts the actor's `seenMarks` entry with `seenAt:
now`. **200** `data: null`. The client calls it when a week is opened and invalidates
`['newMarks']`.

---

### 2.6 Comments — `reviewRoutes.js` · `reviewController` · `reviewService`

Thread ids are unique within a report, so one path shape serves day and week threads.

#### C1 · `POST /api/reports/:id/days/:weekday/comments`

Roles: any, with `canCommentOnDay`: the author; any manager or admin, their own update
included; a member only while the day is `openToTeam` → otherwise
`403 COMMENT_NOT_ALLOWED`. No posted day → `404`. Body `{ text }`, 1–2000. Any status.
**201** `data: Day`.

#### C2 · `POST /api/reports/:id/week-comments`

Roles: `authorize('manager')`, with `canCommentOnWeek`: the report is not a Draft. The
author themselves → `403 COMMENT_NOT_ALLOWED` (they reply instead, C3). Body `{ text }`.
The thread carries the current `revisionNumber` and `kind: 'comment'`.
**201** `data: { weekComments: [Thread] }`.

#### C3 · `POST /api/reports/:id/threads/:threadId/replies`

Roles: any who may write in that place — for a day thread, `canCommentOnDay`; for a week
thread, the author, or a manager or admin. Body `{ text }`. **201** the thread.

#### C4 · `PATCH /api/reports/:id/threads/:threadId` and `…/threads/:threadId/replies/:replyId`

Roles: the writer. Body `{ text }`. Not the writer, or more than 10 minutes since
`createdAt` on the server's clock → `403 EDIT_WINDOW_CLOSED`. **200** the thread.

#### C5 · `DELETE` the same two paths

As C4, and additionally: a comment with replies, or a send-back comment →
`409 COMMENT_HAS_REPLIES`. **200** the containing day or `{ weekComments }`.

---

### 2.7 Review — `reviewRoutes.js` (two routers) · `reviewController` · `reviewService`

#### V1 · `POST /api/reports/:id/review/approve`

Roles: `authorize('manager')`. Body `{ revisionNumber, comment? }` — the comment 0–2000,
optional. **Any submitted report**, whether or not approval was requested (I16).

1. Load → 404.
2. `canReviewReport`: the actor is the author → `403 SELF_REVIEW_FORBIDDEN`.
3. Claim the revision: `updateOne({ report, revisionNumber: pinned, action: null }, …)`;
   zero match → `409 REPORT_STATE_CHANGED`, nothing written.
4. Update the report to `approved`; if a comment was given, push a week thread
   `kind: 'approval'`.

**200** `data: WeekView`. No success toast — the chip change is the feedback.

#### V2 · `POST /api/reports/:id/review/send-back`

As V1, with `comment` required: 10–2000 characters after trimming. Step 4 sets
`needs_correction`, `latestComment`, and pushes a week thread `kind: 'send_back'`.
**200** `data: WeekView`. Errors add `422 VALIDATION_FAILED` with `fields.comment`.

(Earlier revisions named this `…/request-changes`; renamed for the product's vocabulary,
"send back".)

#### V3 · `GET /api/review-desk`

Roles: `authorize('manager')`. Query: `approval` (`requested` default · `all`), `person`
(multi), `project` (multi), `weekFrom`, `weekTo`, `role` (the author's; multi), `page`,
`limit`, `sort` (`submittedAt` default · `weekKey`), `dir` (default `asc`).

One query builder for V3 and V4: `status: 'submitted'`, `approvalRequested: true` unless
`approval=all`, `buildReportScope(actor)`, and **`author: { $ne: actor.id }`** under every
filter combination.

**200** paginated items: `{ _id, author: UserRef, projects: [ProjectRef], weekKey,
weekStart, weekEnd, status, approvalRequested, revisionNumber, submittedAt, isNew }`.

#### V4 · `GET /api/review-desk/count`

Roles: `authorize('manager')`. **200** `data: { "count": 3 }` — requested reports this
manager has not opened since their latest submission. Query key
`['reviewDesk', 'count']`; no polling.

---

### 2.8 Holidays — `holidayRoutes.js` · `holidayController` · `holidayService`

#### HD1 · `GET /api/holidays`

Roles: any. Query: `from`, `to` (`YYYY-MM-DD`, at most one year apart).
**200** `data: { items: [{ _id, date, name, createdBy: UserRef }] }`, by date.

#### HD2 · `POST /api/holidays`

Roles: `authorize('admin')`. Body `{ date, name }` — a Monday to Friday; name 1–100.
**201** the holiday. Errors: `409 HOLIDAY_EXISTS`, `422 VALIDATION_FAILED` (a weekend).

#### HD3 · `PATCH /api/holidays/:id` · HD4 · `DELETE /api/holidays/:id`

Roles: `authorize('admin')`. Edit the date or name; delete for real — a holiday is team
configuration, not a record anyone authored work against. Both change no stored report:
everything that depends on holidays is derived (`database_schema.md` §1.8).
**200** / **200**. Errors: `404 HOLIDAY_NOT_FOUND`, `409 HOLIDAY_EXISTS`.

---

### 2.9 Dashboard — `dashboardRoutes.js` · `dashboardController` · `dashboardService`

All endpoints: roles `authorize('manager')`. Page-level filters: `weekKey` (required,
I10), `person` (multi), `project` (one id, I11). **`status` is accepted by D2 only** —
it filters the team table, never the headline numbers (`requirments_doc.md` §6).

#### D1 · `GET /api/dashboard/summary` — the metric strip

```json
{
  "weekKey": "2026-W38", "filed": 9, "expected": 12, "notFiled": 3, "onLeave": 1,
  "compliance": 0.75, "complianceTrailing": { "weeks": 8, "rate": 0.82 },
  "needsCorrection": { "count": 2, "oldestSentBackAt": "…" },
  "openBlockers": { "count": 3, "peopleCount": 3 }
}
```

`expected` excludes `on_leave` and `holiday_week` rows; `filed` counts submitted, needs
correction and approved — approval plays no part.

#### D2 · `GET /api/dashboard/team` — the team table

Paginated; `sort` allowlist `name` (default) · `status` · `lastActivityAt`; `status`
filter (multi, week states). **200** items, one per person on the team that week:

```json
{
  "user": UserRef, "state": "submitted", "approvalRequested": true,
  "postedWeekdays": ["mon", "tue"], "dayStates": { … },
  "hours": 36, "projects": [ProjectRef],
  "report": { "_id": "…", "revisionNumber": 1, "tasksDone": 5, "taskCount": 7, "lastActivityAt": "…" }
}
```

`report` is `null` for `not_started`, `on_leave` and `holiday_week`. On a `draft` row it is
present with `tasksDone: null`. `hours` and `projects` come from lines and are always
present.

#### D3 · `GET /api/dashboard/trend` — tasks completed

Query: `endWeek` (required), `weeks` (`4` · `8` default · `12`), `trendPerson` (optional),
plus `person` and `project`. Counts tasks with status `done` in submitted reports — and,
for a `needs_correction` report, in its sent-back revision (I13). **200**
`{ weeks: [...], team: [{ weekKey, tasksDone }], person: [...] | null }`, every week
present.

#### D4 · `GET /api/dashboard/hours` — time by task type

**200** `{ items: [{ type, hours }] (seven, fixed order), total }`, from the week's lines,
every status.

#### D5 · `GET /api/dashboard/workload` — workload by project

**200** `{ items: [{ project: ProjectRef, hours: { development, …, other }, totalHours }] }`,
from the week's lines, sorted by `totalHours` descending.

#### D6 · `GET /api/dashboard/activity` — recent activity

No `weekKey`: the feed is **recent**, not week-scoped. It returns the latest **8** events —
`submitted` · `approved` · `sent_back` — across the team, with `at`, `actor`,
`revisionNumber` and `report: { _id, weekKey, author, status }`. No limit parameter and no
"all activity" endpoint (`requirments_doc.md` §6).

#### D7 · `GET /api/dashboard/people/:userId` — profile metric strip

**200** `{ reportsFiled, compliance, avgHoursPerWeek, corrections }` over the person's work
periods, excluding leave and holiday weeks. `corrections` counts revisions with
`action: 'changes_requested'`. Errors: `404 USER_NOT_FOUND`.

#### D8 · `GET /api/dashboard/projects` — the projects table

Query: `weekKey`. **200** `{ items }`, one per active project with a plan:

```json
{
  "project": ProjectRef, "progress": ProjectProgress,
  "people": [ { "user": UserRef, "hoursThisWeek": 6, "hoursTotal": 42.5, "lastDay": "2026-09-17" } ]
}
```

---

### 2.10 "New" markers — `meRoutes.js`

#### N1 · `GET /api/me/new`

Roles: any. **200**:

```json
{
  "reviewRequests": 3,
  "nav": { "thisWeek": true, "myReports": false }
}
```

Only the sidebar's dots come from here. `nav.thisWeek` and `nav.myReports` compare the
actor's **own** reports of the last 12 weeks with their `seenMarks` — found through
`{ author: 1, weekKey: 1 }`, never a scan. `reviewRequests` equals V4. Every other marker
is the `isNew` field on the rows, days and threads a page already loads
(`database_schema.md` §5.4: it runs over the current page, never the collection) — which
is how a reply in a thread on a teammate's day is marked. Query key `['newMarks']`;
refetched on window focus, never polled.

---

## 3. Status transition table

The reports enum is `draft · submitted · needs_correction · approved`. `not_started`,
`on_leave` and `holiday_week` are week states and never stored.

| From                     | To                 | Endpoint              | Who may trigger                                  | Illegal-state error                      |
| ------------------------ | ------------------ | --------------------- | ------------------------------------------------ | ---------------------------------------- |
| (none)                   | `draft`            | R5, the first day     | The author                                       | `422 WEEK_OUT_OF_RANGE`, `422 DAY_NOT_EXPECTED` |
| `draft`                  | `submitted`        | R7                    | The author; submit rules must pass               | `409 REPORT_STATE_CHANGED`               |
| `needs_correction`       | `submitted`        | R7                    | The author                                       | same                                     |
| `submitted`              | `approved`         | V1                    | A manager or admin who is not the author — asked or not | `403 SELF_REVIEW_FORBIDDEN`; `409`  |
| `submitted`              | `needs_correction` | V2                    | the same                                         | the same                                 |

Every other pair is illegal and returns `409 REPORT_STATE_CHANGED` — including
`approved → *` and `needs_correction → approved`. **`submitted` is a valid end state.**

**Writes that change no status:**

| Action                         | Endpoint   | Accepted states                   | Who                                                        |
| ------------------------------ | ---------- | --------------------------------- | ---------------------------------------------------------- |
| Post or edit a day             | R5         | `draft`, `needs_correction`       | The author                                                 |
| Autosave content               | R6         | `draft`, `needs_correction`       | The author                                                 |
| Resolve / unresolve a blocker  | R10        | every status                      | The author, managers, admins                               |
| Open a day to team comments    | R11        | every status                      | The author, managers, admins                               |
| Comment on a day               | C1         | every status                      | The author, managers, admins; teammates while open         |
| Comment on the week            | C2         | every status except `draft`       | Managers and admins                                        |
| Reply                          | C3         | every status                      | Anyone who may write in that thread                        |
| Edit or delete a comment       | C4, C5     | every status                      | The writer, within 10 minutes                              |

**Revision effects:** submit writes one revision; a review amends the current revision
once; nothing else writes a revision. **`lastActivityAt`** moves on submit and review
only.

---

## 4. Access matrix

| Mark      | Meaning                                                    |
| --------- | ---------------------------------------------------------- |
| ✓         | allowed                                                    |
| own       | on your own resource only                                  |
| days      | the week opens with its days; `content` and week comments withheld |
| 403 F     | `FORBIDDEN` (role)                                         |
| public    | no token needed                                            |

| #        | Endpoint                                 | Member                          | Manager                                         | Admin                                     |
| -------- | ---------------------------------------- | ------------------------------- | ----------------------------------------------- | ----------------------------------------- |
| H1, A1–A3, A7, A8 | health, bootstrap, signup, login, links | public                  | public                                          | public                                    |
| A4–A6    | me, name, password                       | own                             | own                                             | own                                       |
| U1, U2, U7 | users, a user, someone's history       | 403 F                           | ✓                                               | ✓                                         |
| U3–U6    | invite, re-issue, role, remove           | 403 F                           | 403 F                                           | ✓; owner/admin rules (I12)                |
| U8       | anyone's week                            | days (own: ✓)                   | ✓; a Draft opens with days                      | same                                      |
| U9       | leave                                    | own                             | anyone                                          | anyone                                    |
| U10      | who is on leave                          | ✓                               | ✓                                               | ✓                                         |
| U11      | transfer ownership                       | 403 F                           | 403 F                                           | owner only                                |
| U12, U13 | email, reset link                        | 403 F                           | 403 F                                           | members and managers; owner also admins   |
| P1       | projects                                 | ✓ (progress on own projects)    | ✓ (+ members, progress)                         | same                                      |
| P2–P5    | create, edit, plan, deactivate           | 403 F                           | ✓                                               | ✓                                         |
| T1       | my tasks                                 | own                             | own                                             | own                                       |
| R1–R3, R5–R7 | my reports, summary, my week, days, autosave, submit | own              | own                                             | own                                       |
| R4       | a week by id                             | days (own: ✓)                   | ✓; a Draft opens with days                      | same                                      |
| R8, R9   | revisions                                | own                             | any submitted                                   | same                                      |
| R10      | resolve a blocker                        | own                             | any                                             | any                                       |
| R11      | open a day to team comments              | own                             | any                                             | any                                       |
| R12      | team updates                             | ✓                               | ✓                                               | ✓                                         |
| R13      | mark seen                                | any week they may open          | same                                            | same                                      |
| C1       | comment on a day                         | own; others' while open         | any, own included                               | same                                      |
| C2       | comment on a week                        | 403 F                           | others' submitted weeks                         | same                                      |
| C3       | reply                                    | where they may write            | same                                            | same                                      |
| C4, C5   | edit, delete                             | own, 10 min                     | same                                            | same                                      |
| V1, V2   | approve, send back                       | 403 F                           | others' submitted; own `403 SELF_REVIEW_FORBIDDEN` | same                                   |
| V3, V4   | review desk, count                       | 403 F                           | never own                                       | same                                      |
| HD1      | holidays                                 | ✓                               | ✓                                               | ✓                                         |
| HD2–HD4  | add, edit, delete a holiday              | 403 F                           | 403 F                                           | ✓                                         |
| D1–D8    | dashboard                                | 403 F                           | ✓                                               | ✓                                         |
| N1       | new markers                              | own                             | own                                             | own                                       |

---

## 5. Coverage

### 5.1 Pages — `product_design_system.md` §3

| §     | Page or state                                            | Endpoints                                         |
| ----- | -------------------------------------------------------- | ------------------------------------------------- |
| 3.1   | This week: strip, day panel, leave and holiday strip     | R3, R5, T1, U10, HD1                              |
| 3.1   | My projects panel; personal strip; recent weeks          | P1 `mine`; R2; R1                                 |
| 3.1   | Correction panel; overall comments                       | R3 `latestComment`, `weekComments`; C3            |
| 3.2 / §4 | Weekly form, submit with "Ask for approval"           | R3, R6, R7                                        |
| 3.3   | My reports                                               | R1                                                |
| 3.4   | A week in full, any reader                               | R4, U8, R8, R9, R10, R11, C1–C5, R13              |
| 3.5   | Review desk, asked / all                                 | V3, V4                                            |
| 3.6   | Review page: approve, send back, comment only            | R4, V1, V2, C2                                    |
| 3.7   | Team dashboard, team table status filter, projects table | D1–D6, D8, P1 `usedInWeek`                        |
| 3.8   | Profile (every week on the team, away weeks included)   | U2, U7, D7, U9                                    |
| 3.9   | Projects, plans, extend, deactivate                      | P1–P5                                             |
| 3.10  | Users: invite, role, remove, email, reset link, owner, leave | U1, U3–U6, U9, U11–U13                        |
| 3.11  | Account: name, password, email line, leave               | A4–A6, `Me.owner`, U9                             |
| 3.12  | Sign in, create account, accept invite, reset password   | A1–A3, A7, A8                                     |
| 3.14  | Demo                                                     | none — the client demo adapter (`tech_stack.md` §6.9) |
| 3.15  | People                                                   | U1                                                |
| 3.16  | Team updates                                             | R12, C1, C3, R10, R11                             |
| 3.17  | Holidays                                                 | HD1–HD4                                           |
| 6.24  | "New" markers                                            | N1, R13                                           |

### 5.2 Requirements — `requirments_doc.md`

| §    | Requirement                                                | Endpoints                               |
| ---- | ---------------------------------------------------------- | --------------------------------------- |
| 1    | Bootstrap registration, login, roles                       | A1–A3, U3, U5                           |
| 2.1  | Daily updates with work lines, required, shared, commented | R5, R12, C1, C3–C5, R11                 |
| 2.2  | Weekly report built from the days, status and note per task | R3, R6, R7                             |
| 2.3  | Seven task types                                           | R5, D4                                  |
| 3    | Statuses; Submitted as an end state                        | §3                                      |
| 4    | Optional approval, send back, overall comments, sent-back version to managers | R7, V1–V3, C2, R4 (I13)  |
| 5    | Versions with timestamps                                   | R7, R8, R9                              |
| 6    | Dashboard, one week, status filter on the table, projects  | D1–D8                                   |
| 7    | Projects with plans and progress                           | P1–P5, D8                               |
| 11   | Invite, remove, re-invite, roles, email, reset links, owner | U3–U6, U11–U13, A7, A8                 |
| 11.4 | Work periods                                               | A8, U3, U6                              |
| 14   | Demo without a server                                      | none, by design                         |
| 15   | Leave                                                      | U9, U10                                 |
| 16   | Holidays                                                   | HD1–HD4                                 |
| 17   | "New" markers                                              | N1, R13, V4                             |

---

## 6. RBAC and behaviour tests — `server/tests/`

"Member X" and "member Y" are members; "manager A" and "manager B" are managers; "admin"
is an admin who is not the owner.

### 6.1 `tests/policy/reportPolicy.test.js` — pure functions

1. `canOpenWeek`: any active team member, every status → true.
2. `canReadContent`: the author always; a manager on another's `draft` → false, on
   `submitted`, `needs_correction`, `approved` → true; a member on another's → false.
3. `canCommentOnDay`: the author → true; a manager on anyone's, own included → true; a
   member on another's → false unless `openToTeam`.
4. `canCommentOnWeek`: a manager on another's non-draft → true; on a draft → false; a
   member → false.
5. `canReviewReport`: false for the author whatever the role; true for another manager on
   `submitted` whether or not approval was requested.
6. `canEditContent`: author on `draft` or `needs_correction` only.
7. `canResolveBlocker`: author, manager, admin at every status; a teammate → false.
8. `canEditOwnComment`: writer at 9:59 → true; at 10:01 → false; anyone else → false.

### 6.2 `tests/rbac/scopeParity.test.js`

9. For each role, the rows of R1 / U7 / V3 carrying content equal exactly the reports
   `canReadContent` allows.
10. **No private layer leaks:** for every read endpoint and every non-author role, no
    response contains a Draft's `content`, task statuses or week comments; a teammate
    never receives any `content` or week comment.

### 6.3 `tests/rbac/dailyUpdates.test.js`

11. Member X → R5 for today → 200, and the week's report now exists as a Draft.
12. R5 for a future weekday, a holiday, or a leave day → `422 DAY_NOT_EXPECTED` with the
    matching `reason`.
13. R5 naming member Y's task id → `404 TASK_NOT_FOUND`; a `newTask` on an inactive
    project → `422 PROJECT_INACTIVE`.
14. Member Y → R12 → sees X's day; U8 on X's week → days served, `content: null`.
15. Member Y → C1 on X's closed day → `403 COMMENT_NOT_ALLOWED`; after X (or a manager)
    opens it with R11 → `201`.
16. Manager A → C1 on A's own update → `201`.
17. A comment edited at 9 min 59 s → 200; at 10 min 1 s → `403 EDIT_WINDOW_CLOSED`;
    deleting a comment with a reply → `409 COMMENT_HAS_REPLIES`.
18. R5 dropping a blocker `_id` prunes its resolution; R6 with `keyBlockerId` on one
    blocker clears `isKey` on every other.

### 6.4 `tests/rbac/reportAccess.test.js`

19. Member Y → R6 or R7 on X's report → `403 REPORT_FORBIDDEN`; R4 on X's report → 200
    with days only.
20. `GET /reports/<fabricated ObjectId>` → `404`; `not-an-id` → `422`.
21. Manager A → R4 on Y's Draft → 200, `contentSource: "withheld"`.
22. Manager A → R4 on Y's `needs_correction` report → `contentSource: "revision"`; Y →
    `"live"`.
23. R7 with a missing expected day → `422` with `fields["days.thu"]`; with a holiday on
    that day → 200.
24. Two concurrent R7 → exactly one 200 and one 409; exactly one revision.
25. Resolve a blocker on a Draft and on an Approved report, as the author and as a manager
    → 200; as a teammate → 403.

### 6.5 `tests/rbac/reviewAccess.test.js`

26. Member → V1, V2, V3, V4, C2 → `403 FORBIDDEN`.
27. Manager A approving A's own report → `403 SELF_REVIEW_FORBIDDEN`; manager B → 200.
28. Manager B approving a report that did **not** request approval → 200.
29. V3 defaults to `approvalRequested: true`; `approval=all` adds the rest; A's own report
    never appears, including with `person=<A>`.
30. Two managers approving concurrently → one 200, one `409`; the winner's `reviewedBy`
    stands.
31. Stale pin: B approves `revisionNumber: 1` after rev 2 was submitted → `409`.
32. V2 with a 9-character comment → `422`; with a valid one → a `send_back` week thread
    exists on the revision's number.

### 6.6 `tests/rbac/adminRoutes.test.js`

33. Manager → U3–U6, U12, U13, HD2–HD4 → `403 FORBIDDEN`. Member → U1, U2, U7, P2–P5,
    D1–D8 → `403 FORBIDDEN`.
34. Admin → own role, removal, own email → `403 CANNOT_MODIFY_SELF`.
35. Admin → role, remove, email or reset link on the owner → `403 PROTECTED_ACCOUNT`; on
    another admin → `403 OWNER_ONLY`; the owner on another admin → 200.
36. The owner → U11 to manager M → 200: one `isOwner`, M is an admin, M's old token → 401.
    Admin → U11 → `403 OWNER_ONLY`.
37. U12 → the person's old token → 401; login with the new address → 200.
38. U13 → A8 with the reset token sets a password and ends other sessions; the same token
    again → `404 LINK_INVALID`; an invite token used as a reset → `404`.
39. Remove → the person's token → 401. Re-invite → same `_id`, a second work period on
    acceptance; weeks between the two periods are not expected (D1 `expected`).
40. `GET /users` never contains a token, `passwordHash` or `tokenVersion`.

### 6.7 Auth

41. A2 on a non-empty database → `403 SIGNUP_CLOSED`; two concurrent A2 on an empty one →
    one 201, one 403.
42. A6 with a wrong current password → `422 CURRENT_PASSWORD_INCORRECT`, never 401.

---

## 7. Conflicts, amendments, open flags

### 7.1 Conflicts — status after reconciliation pass 4

| #       | Subject                                                     | Status                                                                                             |
| ------- | ----------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **C1**  | Workload chart segmented by task type, but tasks had no type | **Resolved** — every work line has a task type; D5 groups lines                                   |
| **C2**  | Feed scoped by time, dashboard by week                      | **Resolved** — the feed is recent, not week-scoped (D6)                                             |
| **C3**  | Missing pipelines for trailing compliance, profile metrics, personal strip | **Resolved** in `database_schema.md` §5                                               |
| **C4**  | Moving a Draft's week                                       | **Dissolved** — a report is created by a daily update in its week and never moves                  |
| **C5**  | Dashboards reading a correction in progress                 | **Resolved** — hours come from shared lines; the trend reads the sent-back revision (D3)           |
| **C6**  | `joinedAt` on bootstrap and reactivation                    | **Resolved** by work periods                                                                       |
| **C7**  | People who leave and return                                 | **Resolved** — work periods (`requirments_doc.md` §11.4)                                          |
| **C8**  | `name` required but unknown at invite                       | **Resolved** — required only once active (`database_schema.md` §10, decision 16)                             |
| **C9**  | The demo going stale                                        | **Dissolved** — the demo is client-side with relative dates                                        |
| **C10** | `lastActivityAt` described two ways                         | **Resolved** in `database_schema.md` §1.4                                                          |

### 7.2 Amendments this spec requires elsewhere

| #      | Document                     | Change                                                                                      | Status      |
| ------ | ---------------------------- | ------------------------------------------------------------------------------------------- | ----------- |
| **M1** | `tech_stack.md` §6.2         | The 401 interceptor conditions in §1.3                                                      | Applied     |
| **M2** | `project_structure.md` §2.4  | The mounts in §1.1                                                                          | Applied     |
| **M3** | `product_design_system.md` §6.5 | Week picker disables weeks before the join week                                          | Applied     |
| **M4** | `product_design_system.md` §3.7, §7.4 | No date range; trend window                                                        | Applied     |
| **M5** | `product_design_system.md` §3.10 | Owner row protected                                                                     | Applied     |
| **M6** | `tech_stack.md` §8           | Rate-limit `POST /auth/password` with login                                                 | Applied     |
| **M7** | `product_design_system.md` §3.12 | Accept screen shows the role                                                            | Applied     |
| **M8** | `tech_stack.md` §2           | Drop "forced logout" from the `tokenVersion` triggers                                       | Applied     |
| **M9** | `tech_stack.md` §3, `project_structure.md` §2.1 | `ok(res, data, message, status = 200)`                                   | Applied     |

### 7.3 Open flags

| #      | Flag                                                                                                           | Owner                    |
| ------ | -------------------------------------------------------------------------------------------------------------- | ------------------------ |
| **O2** | Autosave across two tabs is last-write-wins; no version precondition on R6.                                    | Tech Lead (accepted)     |
| **O4** | Time tolerances: "today" is bounded at UTC+14 and dates compared in UTC, so a user far from UTC may post a few hours early. Both err towards allowing. | Project owner (accepted) |
| **O5** | For people with no lines yet, the project filter uses current assignment, not historical.                      | Project owner (accepted) |
| **O7** | N1 looks back 12 weeks. Activity on an older week of your own — a late reply on a thread from March — lights no sidebar dot, though the row itself is still marked when the list shows it. | Project owner |
