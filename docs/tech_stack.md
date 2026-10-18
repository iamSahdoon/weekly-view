# WeeklyView — Technology & Library Decisions

> Output of the **Software Architect** role. Every choice below is settled input
> for the Database Engineer, Backend Engineer, Frontend Engineer and Tech Lead
> roles. Do not re-litigate a decision here mid-build unless it produces a
> functional bug.
>
> Companion docs: `requirments_doc.md` (what it does),
> `development_approach_doc.md` (standards), `brand_design_strategy.md` (brand),
> `product_design_system.md` (tokens & components), `database_schema.md` (data),
> `project_structure.md` (layout), `api_specification.md` (endpoints),
> `frontend_architecture.md` (client state and data flow).
>
> Decisions were made in an interview session captured at
> `brainstorms/2026-09-15-weeklyview-tech-stack.md`, which records the reasoning
> behind each one.

**Project intent:** portfolio piece first, real team use later if it lands.
Every choice here is production-credible without engineering for scale that
doesn't exist yet.

---

## 0. Fixed inputs (not decided here)

MongoDB · Express · React · Node · **JavaScript only, no TypeScript** ·
Vite · Motion · Recharts · Chivo + Instrument Sans + JetBrains Mono ·
design tokens from `product_design_system.md`.

---

## 1. Final decision table

### 1.1 Backend

| Decision           | Choice                                                 | Version             | Why this, for this project                                                                                                   |
| ------------------ | ------------------------------------------------------ | ------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Module system      | **ESM** (`"type": "module"`)                           | —                   | One mental model with the Vite client; top-level `await` makes the DB connect and seed script read as straight-line code     |
| Framework          | **express**                                            | `^5.1`              | v5 auto-awaits async handlers and forwards rejections to `next(err)`, so controllers need no `express-async-handler` wrapper |
| ODM                | **mongoose**                                           | `^8`                | Schema validation at the model layer is one of the three validation layers the approach doc mandates                         |
| Auth tokens        | **jsonwebtoken**                                       | `^9`                | Single 5-day JWT; stateless, no session store to host on a free tier                                                         |
| Password hashing   | **bcryptjs**                                           | `^3`                | Pure JS — no native compile step to break Render builds or a Windows dev machine                                             |
| Request validation | **zod**                                                | `^4`                | The only option that also runs in the browser, so the report form validates with the same dialect the API does               |
| Env loading        | **dotenv**                                             | latest              | Local development only; Render injects env vars directly                                                                     |
| CORS               | **cors**                                               | `^2.8`              | Explicit allowlist — the client is on a different origin by design                                                           |
| Security headers   | **helmet**                                             | `^8`                | CSP matters more than usual because the JWT lives in `localStorage`                                                          |
| HTTP logging       | **morgan**                                             | `^1.10`             | `dev` format locally, `combined` in production; Render captures stdout                                                       |
| Dates              | **date-fns**                                           | `^4`                | The same library as the client: ISO week keys and Monday-based weeks (`utils/weeks.js`, `calendarService`) computed one way on both sides |
| Dev reload         | **`node --watch`**                                     | built-in            | Node's built-in watcher removes the `nodemon` dependency entirely. *(Owner report, 2026-10-17: run as `--watch-path=src`, so changes under `node_modules` — an install, a file scanner — no longer restart the API mid-request; `server.js` closes gracefully on SIGTERM.)* |
| Tests              | **vitest** + **supertest** + **mongodb-memory-server** | `^3` / `^7` / `^10` | RBAC tests only, against an in-memory Mongo so tests never touch Atlas                                                       |

**Deliberately not included:** `express-rate-limit`, `compression`,
`express-async-handler`, `mongoose-paginate-v2`, `cookie-parser`,
`express-session`, `nodemon`, `@faker-js/faker`. See §8 for why.

### 1.2 Frontend

| Decision      | Choice                                        | Version     | Why this, for this project                                                                                                                                                                                                         |
| ------------- | --------------------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Build tool    | **vite** + **@vitejs/plugin-react**           | `^7` / `^5` | Fixed input                                                                                                                                                                                                                        |
| Routing       | **react-router-dom**                          | `^7`        | Used in library mode; **no loaders/actions** — TanStack Query owns server state and splitting fetching across two systems would be incoherent                                                                                      |
| Server state  | **@tanstack/react-query**                     | `^5`        | The dashboard is filtered queries users flip between; query keys cache them, `invalidateQueries` refreshes the review desk after a review action, `isPending` vs `isFetching` distinguishes a cold start from a background refresh |
| Client state  | **Context + useReducer**                      | built-in    | Only the auth user is global once Query owns server data. No Zustand, no Redux                                                                                                                                                     |
| HTTP client   | **axios**                                     | `^1`        | Interceptors put token attachment and 401 handling in one file instead of every service                                                                                                                                            |
| Forms         | **react-hook-form** + **@hookform/resolvers** | `^7` / `^5` | `useFieldArray` adds/removes a task row without re-rendering sibling rows — the report form is the hardest screen and this is the decider                                                                                          |
| Validation    | **zod**                                       | `^4`        | Same library as the server; drives `zodResolver`                                                                                                                                                                                   |
| Styling       | **tailwindcss** + **@tailwindcss/vite**       | `^4`        | CSS-first `@theme` holding only WeeklyView tokens, so framework defaults literally don't compile                                                                                                                                   |
| Class merging | **clsx** + **tailwind-merge**                 | `^2` / `^3` | A `cn()` helper so component variants override base classes predictably                                                                                                                                                            |
| Primitives    | **@radix-ui/react-\***                        | `^1` each   | Unstyled — keyboard nav and focus trapping without hand-rolling it, fully styled by our tokens                                                                                                                                     |
| Animation     | **motion**                                    | `^12`       | Fixed input                                                                                                                                                                                                                        |
| Landing motion | **gsap** (with ScrollTrigger, ScrollToPlugin) | `^3`       | Landing page only — owner decision, landing polish (see §10) |
| Charts        | **recharts**                                  | `^3`        | Fixed input                                                                                                                                                                                                                        |
| Icons         | **lucide-react**                              | latest      | Rendered at `strokeWidth={1.5}` for the thin restrained stroke                                                                                                                                                                     |
| Toasts        | **sonner**                                    | `^2`        | Must be restyled to tokens — see §6.7                                                                                                                                                                                              |
| Dates         | **date-fns**                                  | `^4`        | ISO weeks start Monday, matching the Mon–Fri week model                                                                                                                                                                            |
| Tables        | **hand-built**                                | —           | The tasks table is a form grid (RHF's job) and the dashboard tables get sorting/filtering/pagination from the API, so a table library would only render rows while standing between our markup and the design spec                 |

### 1.3 Tooling

| Decision   | Choice                                                                                              | Version |
| ---------- | --------------------------------------------------------------------------------------------------- | ------- |
| Linting    | **eslint** + `@eslint/js` + `eslint-plugin-react-hooks` + `eslint-plugin-react-refresh` + `globals` | `^9`    |
| Formatting | **prettier** + `eslint-config-prettier` + `prettier-plugin-tailwindcss`                             | `^3`    |

`eslint-plugin-react-hooks` earns its place specifically in a TanStack Query
codebase, where a missing dependency in a query key or effect is a real bug.
`prettier-plugin-tailwindcss` sorts utility classes deterministically, which
keeps diffs readable once class strings get long.

### 1.4 Hosting

| Concern    | Choice                                      | Notes                                                                   |
| ---------- | ------------------------------------------- | ----------------------------------------------------------------------- |
| Repository | **One repo**: `/client`, `/server`, `/docs` | Both platforms support a per-service root directory                     |
| Client     | **Vercel**                                  | Static Vite build; free tier                                            |
| API        | **Render** free web service                 | Spins down after ~15 min idle, 30–60s wake-up, 750 compute hours/month  |
| Database   | **MongoDB Atlas M0**                        | Permanently free: 512 MB, 500 max connections, **no automated backups** |
| Domain     | Default platform URLs                       | Cross-origin by design — which is why the token is not in a cookie      |

---

## 2. Authentication — the full decision

**Model:** a single JWT with a ~5 day expiry, returned on login and stored in
`localStorage`. No refresh token, no rotation.

This was chosen knowingly over access+refresh. The reasoning: the client and API
are on unrelated origins (`*.vercel.app` and `*.onrender.com`), so an httpOnly
refresh cookie would be a third-party cookie and dropped by iOS Safari — which
would break the stated full-mobile-parity requirement for the demo.

**The one addition that makes this defensible: `tokenVersion`.**

A `tokenVersion` integer lives on the User document and is embedded in the JWT
payload. The auth middleware compares the token's version against the user's
current value and rejects on mismatch. Bump it on removal, role change, email change
and password change (including a reset) and every outstanding token for that user dies
immediately.

Without it, a 5-day token cannot be revoked — demote a Manager to Team Member
and they keep manager access for up to five days. With it, you get real
revocation for one extra field and one extra comparison.

```js
// server/src/middleware/authenticate.js
const payload = jwt.verify(token, env.JWT_SECRET); // throws -> 401
const user = await User.findById(payload.sub)
  .select("_id name email role status tokenVersion isOwner")
  .lean();

// A stale token survives role changes unless we version it; see tech_stack.md §2
if (!user || user.tokenVersion !== payload.tokenVersion)
  throw new AppError(401, "Session expired");
req.user = user;
```

**Token payload:** `{ sub, role, tokenVersion }`. Nothing else — no email, no
name. The payload is base64, not encrypted, and it goes stale.

**XSS posture**, since `localStorage` is script-reachable: React escaping by
default, no `dangerouslySetInnerHTML` anywhere in the codebase, helmet CSP on the
API, and no third-party script tags on the client beyond Google Fonts.

### 2.1 Link tokens — invites and password resets

`requirments_doc.md` §11.1 and §11.3 have the admin deliver two kinds of one-time link by
hand, because adding an email provider is out of scope: an **invite** (7 days), which
creates an account at a chosen role, and a **password reset** (24 hours), which replaces a
forgotten password. Both are bearer credentials and are treated as one.

```js
// server/src/services/userService.js — invite, re-issue and reset take this one path
import { randomBytes, createHash } from "node:crypto";

const raw = randomBytes(32).toString("base64url"); // 256 bits; shown once, never stored
const linkTokenHash = createHash("sha256").update(raw).digest("hex");
const ttl = purpose === "invite" ? 7 * 24 : 24; // hours
const linkTokenExpiresAt = new Date(Date.now() + ttl * 60 * 60 * 1000);
// The caller returns `${env.CLIENT_URL}/${purpose}/${raw}` — in this response only.
```

- **SHA-256, not `bcryptjs`**, even though bcrypt is already a dependency and is
  the reflex for anything token-shaped. The link has no other key to find the row by,
  so the digest has to be deterministic — a per-row salt makes the lookup impossible. A
  fast hash is also the right tool: this is 256 bits of CSPRNG output, not a password.
- **The raw token is returned only by the endpoints that issue it** — create invite,
  re-issue invite, issue reset — and by nothing else. It is never in `GET /users`.
- **Verification** hashes the presented token, looks it up through the unique sparse
  index, and checks `linkTokenPurpose` and `linkTokenExpiresAt`. Using it **clears all
  three fields** — single use is the absence of a hash.
- **Issuing a new link overwrites the fields**, so the previous link dies without a
  revocation list. A person has at most one live link.
- **A reset bumps `tokenVersion`**, so every session on the old password ends.
- **An admin never sets or sees a password.** The reset link is the whole mechanism;
  there is no "type a new password for this person" path to leak or misuse.
- **Never logged.** The URL is built in the service and returned; it does not go
  through `morgan`, an error message or a toast.
- **One exception: `npm run owner:reset-link`** (`requirments_doc.md` §11.3, owner decision).
  The owner is protected, so an owner who forgets their password has no admin to ask. The
  command, run by whoever holds `MONGODB_URI`, calls the same `issueResetLink` as U13 — same
  hash, single use, 24 hours, previous link overwritten — and **prints the link once to the
  terminal**, as the operator's equivalent of the single response an admin sees. It is
  never written to a file or log, never stored in plain form, and not reachable over HTTP.
  The site address (one bare argument, `--url <address>`, or npm's `url` config) replaces
  `CLIENT_URL` in the link only. The documented form is `npm run owner:reset-link <address>`
  with no `--`, because PowerShell's `npm.ps1` drops the first `--` and npm would take `--url`
  for its own config.

### 2.2 Bootstrap signup, and the race it would otherwise have

`/signup` is open only while the `users` collection is empty, and the account it
creates is an admin (`requirments_doc.md` §1). Every later attempt gets **403**,
enforced in the service — the closed screen is UI, and UI is not a control.

The naive implementation has a real hole: two requests arriving together both read
`countDocuments() === 0`, both insert, and both become admin, because their emails
differ and the `{ email: 1 }` index has no objection. So the first account also sets
`isOwner: true`, and `users` carries a **unique partial index on
`{ isOwner: true }`** (`database_schema.md` §6). The second insert loses on a
duplicate key and is mapped to the same 403 the closed path returns.

The field does a second job: it marks the **owner** (`requirments_doc.md` §11.2), the
protected account that no other admin can demote or remove. It was first named
`isBootstrap`; once the owner can hand ownership on, "signed up first" and "owns it now"
are different people, so it is `isOwner`. The same unique index that closes the race
guarantees there is never a second owner.

**Transferring ownership runs in a Mongo transaction** — the only place this codebase
uses one. Unsetting the old owner and setting the new one are two writes on two
documents, and with a unique index on the flag neither order is safe on its own: new
first violates the index, old first leaves a moment with no owner. Atlas M0 is a replica
set, so transactions are available; `mongodb-memory-server` needs its replica-set mode in
the test that covers this.

A one-line public endpoint reports whether the door is still open — `GET
/api/auth/bootstrap` → `{ available: boolean }` — so the landing page can offer
"Create your account" on a fresh instance and lead with the demo on a seeded one
(`requirments_doc.md` §13). It leaks nothing a signup attempt would not reveal in
the same second.

---

## 3. Layering (confirming `development_approach_doc.md`)

```
route  ->  validate(zodSchema)  ->  authenticate  ->  authorize(roles)  ->  controller  ->  service  ->  model
```

- **Route** declares the path and the middleware chain. No logic.
- **Validation middleware** parses `req.body` / `req.query` with a Zod schema and
  replaces the raw value with the parsed one, so controllers receive clean data.
- **`authenticate`** verifies the JWT and the `tokenVersion`.
- **`authorize(...roles)`** checks the role. Ownership checks that need the
  document itself (can this member read _this_ report?) are **enforced** in the
  **service**, because that's where the document is loaded — but they are
  **defined** in `policies/reportPolicy.js`. See §3.1.
- **Controller** is thin: pull values off `req`, call one service function, send
  the response. Target under 15 lines.
- **Service** holds all business logic: status transitions, revision creation,
  aggregation for the dashboard.
- **Model** defines the schema and its own validation.

**Response shape — every endpoint, no exceptions:**

```js
{ success: true,  data: {...}, message: null,       error: null }
{ success: false, data: null,  message: 'Not found', error: { code: 'REPORT_NOT_FOUND' } }
```

Two helpers (`ok(res, data, message, status = 200)` and the error middleware)
produce these; the `status` parameter exists for the `201`s on create endpoints.
No controller builds a response object by hand.

**Errors:** an `AppError(status, message, code)` class; services throw it,
Express 5 forwards async rejections automatically, and a single
`errorHandler(err, req, res, next)` registered last formats every response and
logs the stack in development only. There is no `res.status(500).send(err)`
anywhere in the codebase.

---

## 3.1 Authorization: the actor pattern and the policy module

Requirements §12 lists report ownership authorization as a requirement separate
from role-based access control, and reports are the only resource in this product
where access depends on the document rather than the route. It gets a deliberate
design.

### The actor

Services never receive `req`, `req.user`, or a Mongoose user document. The
controller builds a plain object and passes it as the first argument:

```js
// controller — the only line here that knows about Express
const actor = { id: req.user._id, role: req.user.role, isOwner: !!req.user.isOwner };
const result = await reportService.listReports(actor, filters);
```

Services stay Express-free and unit-testable with a literal actor object. The
scoping rule then exists in exactly one place instead of at every call site, so a
controller cannot forget to scope — there is nothing for it to forget.

There is no demo flag on the actor. The demo runs entirely in the browser on hard-coded
data (§6.9) and never reaches the API, so the server has no demo rule to enforce and no
demo account to protect.

### The policy module

`policies/reportPolicy.js` owns the whole permission model for a week as pure functions —
no Mongoose, no Express. A week has **three layers of visibility** (requirements §2, §4),
and each layer gets its own predicate rather than one predicate with exceptions inside it:

| Layer                                  | Who reads it                                              |
| -------------------------------------- | --------------------------------------------------------- |
| Daily updates — lines, blockers, comments | **Everyone on the team**, at every status               |
| End-of-week `content`                  | The author; managers and admins once it is submitted      |
| Overall comments on the week           | The same as `content`                                     |

| Function                                   | Rule                                                                                                                                                                                              |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `buildReportScope(actor, filters)`         | A Mongo filter over **report lists** — history, the review desk. Members get `{ author: actor.id }`; managers and admins get the team-wide filter. What each row may *show* is `canReadContent`'s job, applied as a projection |
| `canOpenWeek(actor, report)`               | May this actor open this week and read its **days**? Any active member of the team, at every status. Daily updates are shared with the whole team (requirements §2.1)                           |
| `canReadContent(actor, report)`            | May this actor read `content` and the week comments? The author always; a manager or admin once it has been submitted — and while it is `needs_correction`, from the sent-back revision, not the live correction (requirements §4). Never a teammate |
| `canCommentOnDay(actor, report, day)`      | The author; any manager or admin, **their own update included**; a member only while `day.openToTeam` is true. Replying follows the same rule                                                    |
| `canToggleTeamComments(actor, report)`     | The author, or any manager or admin                                                                                                                                                              |
| `canCommentOnWeek(actor, report)`          | A manager or admin who is **not the author**, once the report has been submitted. The author may **reply** in any thread on their week but not start one                                                                                       |
| `canEditOwnComment(actor, comment, now)`   | The comment's writer, within 10 minutes of `createdAt`. Delete additionally requires no replies, and never a send-back comment                                                                    |
| `canReviewReport(actor, report)`           | A manager or admin who is **not the author**, on a `submitted` report — whether or not approval was requested. The self-review guard that keeps your own report off your review desk             |
| `canEditContent(actor, report)`            | Author only, and only in Draft or Needs correction. Managers change status and comments, never content                                                                                           |
| `canResolveBlocker(actor, report)`         | The author, or any manager or admin, at every status. **Not a teammate**, who can see the blocker but not declare it cleared                                                                     |

User-level rules are plain gates in `userService`, since they need no per-document scoping:
admins change members' and managers' emails and issue their reset links; the owner does
the same for admins and for their own email; only the owner transfers ownership; leave is
set by the person or any manager or admin; holidays by admins.

It lives in its own folder rather than in `services/reportService.js` because
`reportService`, `reviewService` and the dashboard service all consume it, and
defining it inside one service would make the others import sideways across the
layer. It is not in `utils/` because that folder is scoped to `ok()`, `AppError`
and `paginate()` — stateless and domain-agnostic.

### The two faces must not drift

`buildReportScope` (a Mongo filter) and `canReadContent` (an in-memory predicate)
express one rule in two languages, and nothing structural keeps them in sync. Derive both
from one internal rule set, and back it with a parity test — seed a fixed set of reports,
run the list scope for each role, and assert that the rows carrying content are exactly
those `canReadContent` allows.

A second test sits beside it: for every role and every read endpoint, **no response
carries a Draft's `content` to anyone but its author, and no response carries any
`content` or week comment to a teammate.** Daily updates are shared, so the test concerns
only the private layers.

### Load then authorize — deliberately, not incidentally

Single-resource reads load the document first and authorize it second:

```js
// Not findOne({ _id, ...scope }): merging the scope collapses "not yours" and
// "doesn't exist" into one null, and the distinction is unrecoverable. See §3.1.
const report = await Report.findById(reportId).lean();
if (!report) throw new AppError(404, "Report not found", "REPORT_NOT_FOUND");
if (!canOpenWeek(actor, report))
  throw new AppError(403, "You don't have access to this report.", "REPORT_FORBIDDEN");
const content = canReadContent(actor, report) ? servedContent(report) : null;
```

Mutations run the same load-then-authorize path. A scoping rule that only guards reads is
the most common way this pattern fails.

### Error semantics

| Case                                                   | Response                   | UI                                                                                          |
| ------------------------------------------------------ | -------------------------- | ------------------------------------------------------------------------------------------- |
| A teammate's week, read by a member                    | **200**, content withheld  | The daily updates; no report content, no week comments                                     |
| Someone's Draft, read by a manager or admin            | **200**, content withheld  | The daily updates, and the report marked "not submitted yet"                               |
| A write the actor may not make                         | **403**, a specific code   | E.g. `REPORT_FORBIDDEN` on someone else's content, `COMMENT_NOT_ALLOWED` on a closed update |
| No such report id                                      | **404** `REPORT_NOT_FOUND` | Generic not-found                                                                           |
| Out-of-scope rows in a list                            | **no error at all**        | They never appear                                                                           |

Reads of a week by someone on the team no longer end in a 403: the week itself is shared,
and only its private layers are withheld. **Nothing withheld is ever serialized** — a
withheld layer is `null`, not an empty version of itself that hints at its size.

Route-level denial is separate: a member reaching `/review` gets design system §3.13's
route-level 403 from the client route guard, with no API call involved.

---

## 4. Mongoose configuration

```js
// server/src/config/db.js
await mongoose.connect(env.MONGODB_URI, {
  maxPoolSize: 10, // Atlas M0 caps at 500 connections across all clients
  serverSelectionTimeoutMS: 10000,
});
```

**Schema-level decisions:**

- `timestamps: true` on every schema. `createdAt` / `updatedAt` are free and the
  version history needs reliable submission timestamps anyway.
- `.lean()` on every read-only query — dashboards and lists return plain objects,
  which is measurably faster and avoids accidental mutation through a hydrated
  document.
- **No plugins.** `mongoose-paginate-v2` would impose its own
  `{ docs, totalDocs, page }` envelope and break the single-response-shape rule.
- `toJSON` transform on the User schema to strip `passwordHash`, `linkTokenHash` and
  `tokenVersion` — defence in depth alongside `.select()`.

**Indexes** are owned by `database_schema.md` §6, which lists every one with the query it
serves. They are not restated here: an earlier revision kept a second table in this
section, and the two drifted three times before it was removed. The rule behind them
stays: key order follows equality → sort → range, and every index names the query that
needs it.

**Week identity:** store an ISO week key string (`"2026-W38"`) alongside resolved
`weekStart` / `weekEnd` dates. The key makes grouping and the unique index
trivial; the dates make range filters possible. Never derive the week from a
locale-dependent date function — `date-fns`' `getISOWeek` / `startOfISOWeek` are
Monday-based, matching the Mon–Fri model.

---

## 5. Environment configuration

Fails loudly at startup, per `development_approach_doc.md`.

```js
// server/src/config/env.js
import "dotenv/config";
import { z } from "zod";

// The JWT_SECRET placeholder in server/.env.example. It is long enough to pass the length
// check, so production refuses it by value: a host given the example would otherwise
// start with a secret anyone can read (owner decision, PR #30 review, 2026-10-18).
// Development and tests may use it.
export const EXAMPLE_JWT_SECRET =
  "replace-with-a-32-plus-character-random-string";

const schema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().default(5000),
    MONGODB_URI: z.string().min(1),
    JWT_SECRET: z.string().min(32), // short secrets are a real weakness, not a style nit
    JWT_EXPIRES_IN: z.string().default("5d"),
    CLIENT_URL: z.string().url(),
  })
  .superRefine((value, ctx) => {
    if (
      value.NODE_ENV === "production" &&
      value.JWT_SECRET === EXAMPLE_JWT_SECRET
    )
      ctx.addIssue({
        code: "custom",
        path: ["JWT_SECRET"],
        message: "JWT_SECRET is the example value; generate a new one",
      });
  });

/** Parses an environment object; the module below passes process.env. */
export function parseEnv(source) {
  return schema.safeParse(source);
}

const parsed = parseEnv(process.env);
if (!parsed.success) {
  console.error("Invalid environment configuration:");
  console.error(z.prettifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
```

Nothing in the codebase reads `process.env` directly — everything imports `env`.
There are no fallback values for secrets: a missing `JWT_SECRET` stops the
process instead of silently defaulting.
In production the example `JWT_SECRET` from `server/.env.example` is refused by value, and the
errors are printed with `z.prettifyError`, one line per setting, never with the value *(owner
decision, PR #30 review, 2026-10-18)*.

**`/server/.env.example`**

```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb+srv://user:password@cluster.mongodb.net/weeklyview
JWT_SECRET=replace-with-a-32-plus-character-random-string
JWT_EXPIRES_IN=5d
CLIENT_URL=http://localhost:5173
```

**`/client/.env.example`**

```
VITE_API_BASE_URL=http://localhost:5000/api
```

`.env` goes into `.gitignore` before the first commit.

---

## 6. Configuration notes

### 6.1 CORS

```js
app.use(
  cors({
    origin: env.CLIENT_URL, // exact origin, never '*' with a real API
    credentials: false, // the token travels in a header, not a cookie
  }),
);
```

`credentials: false` is correct here and worth a comment in the code — the usual
`credentials: true` exists to carry cookies, and we deliberately have none.
Add the Vercel preview-deployment origins to the allowlist only if you use them.

### 6.2 Axios instance and interceptors

```js
// client/src/services/apiClient.js
const apiClient = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL });

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("wv_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

apiClient.interceptors.response.use(
  (response) => response.data, // unwrap { success, data, ... } at the boundary
  (error) => {
    const sent = error.config?.headers?.Authorization?.replace("Bearer ", "");
    if (
      error.response?.status === 401 &&
      sent && // a failed sign-in carries no token: not a session expiry
      sent === localStorage.getItem("wv_token") // an older in-flight request must not delete a fresh token
    ) {
      localStorage.removeItem("wv_token");
      // Never a hard redirect: it would discard an in-progress report.
      // See product_design_system.md §3.12.
      authEvents.emit("session-expired");
    }
    return Promise.reject(normalizeError(error));
  },
);
```

**Two conditions guard the 401 branch** (`api_specification.md` §1.3). A wrong password on
`/signin` is a 401 on a request that carried no token, and must show a field error, not
open the re-authentication modal over the sign-in page. And a request sent with the old
token that fails *after* the person has signed in again in the modal must not delete the
new token it never carried.

In the demo (§6.9) the same instance runs over the demo adapter, which never returns a
401, so none of this fires.

**A 401 opens the re-authentication modal, it does not navigate.** The interceptor
clears the dead token and emits one event; `AuthProvider` listens and renders the
modal from `product_design_system.md` §3.12 over whatever page is open. The report
form autosaves, so a token expiring mid-edit must not cost someone their writing —
and a `window.location.assign` destroys exactly that, every in-memory value on the
page, to save an event emitter. The user signs in again in place and carries on.

**The failed request is not retried and no retry queue exists.** Once the new token
is stored, recovery is by the mechanisms already running: the next autosave tick
writes the form, and TanStack Query refetches on its own schedule or on the next
interaction. A queue would mean holding requests, replaying them in order and
reasoning about ones that are no longer valid — machinery for an edge case, when
the thing that had to survive was the text in the form, and it did.

There is still no refresh-retry branch, because there is no refresh token: a 401
means the 5-day token expired or was revoked, and re-authentication is a real
sign-in against `/auth/login`. `normalizeError` maps the API's error envelope to an
`ApiError` — `{ httpStatus, code, message, fields, details, isNetwork }`, with `fields` the
dot-path map of a `VALIDATION_FAILED` and `details` the API's extra keys — so components
never touch Axios internals (`frontend_architecture.md` §5.1).

### 6.3 TanStack Query defaults

```js
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // dashboard data doesn't change second to second
      retry: 1, // one retry; more just extends a cold-start wait
      refetchOnWindowFocus: false,
    },
  },
});
```

**Query key convention:** `['reports', { filters }]`, `['report', id]`,
`['week', userId, weekKey]`, `['teamUpdates', weekKey, weekday]`, `['reviewDesk', { filters }]`,
`['projects']`, `['holidays', year]`, `['newMarks']`, `['dashboard', weekKey, { filters }]`. Filters go in the key as an object so
switching back to a previous filter combination renders from cache instantly. The week
key carries the person as well as the week, because anyone on the team can open anyone's
week (`api_specification.md` U8) and yours must not render from a teammate's cache.

**After a review action**, invalidate `['report', id]`, `['week']`, `['reports']`,
`['reviewDesk']`, `['newMarks']` and `['dashboard']`. The review desk has its own API base (`api_specification.md` I8) and
therefore its own key; left out, "Next in review desk" reads a cached queue and opens the
report that was just reviewed.

**After posting a daily update, commenting, replying, resolving a blocker, toggling team
comments or toggling leave**, invalidate `['report', id]`, `['week']`, `['teamUpdates']`
and `['dashboard']` — the team table's day strip, the open-blockers count, the project
hours and the "On leave" strip all read these. **Opening a week** marks it seen and
invalidates `['newMarks']`. **After changing a holiday or a project plan**, invalidate
`['holidays']`, `['projects']`, `['week']`, `['teamUpdates']` and `['dashboard']`:
expected days, day states and days left are derived from both.

**Cold start:** on first load, `isPending` may run 30–60 seconds while Render
wakes. Show the designed "starting up" state after ~3 seconds of pending, not a
bare spinner. This is a visible part of the free-tier tradeoff, so it deserves
real design attention rather than being treated as an edge case.

### 6.4 Route guarding

```jsx
// client/src/routes/ProtectedRoute.jsx
export default function ProtectedRoute({ allow }) {
  const { user, status, signInPath } = useAuth();
  const location = useLocation();
  if (status === "loading") return <AppBootSplash />;
  if (!user) return <Navigate to={signInPath} replace state={{ from: location }} />;
  // A 403 state inside the shell, not a redirect: product_design_system.md §3.13
  if (allow && !allow.includes(user.role)) return <ForbiddenPage allow={allow} />;
  return <Outlet />;
}
```

Used as a **layout route**, so a whole branch of the tree is protected by one
declaration:

```jsx
{ element: <ProtectedRoute allow={['manager', 'admin']} />, children: [
    { path: '/review', element: <ReviewDeskPage /> },
    { path: '/team',   element: <TeamDashboardPage /> },
]}
```

This blocks direct URL entry, not just nav links — which is what the verification
checklist requires — and shows the 403 state rather than silently redirecting. It is **UX only**; the server's `authorize` middleware is the
actual enforcement, and the RBAC tests target that.

### 6.5 Tailwind v4 theme

Tailwind v4 is configured in CSS. There is **no config file**, and the Vite plugin
is used rather than the PostCSS pipeline:

```js
// client/vite.config.js
import tailwindcss from "@tailwindcss/vite";
export default defineConfig({ plugins: [react(), tailwindcss()] });
```

**The `@theme` block is specified in full in `product_design_system.md` §9.4 and is
lifted from there verbatim** — colors, the spacing scale, the type scale, radii,
fonts and the `xs` breakpoint. That document owns the values; this one owns the
mechanism. Do not maintain a second copy of the block here: an earlier revision
carried an abbreviated version that mapped colors only, which would have silently
dropped the entire type scale (`text-metric`, `text-page`, `text-panel`,
`text-dense`, `text-micro`) and the px-keyed spacing scale while appearing complete.

**Two rules, and the second is the one that breaks things if ignored.**

First, `@theme` _replaces_ rather than extends — each scale is switched off with
`--color-*: initial`, `--spacing: initial`, `--text-*: initial`, `--font-*: initial`
and `--radius-*: initial` before the system's own values are declared. So
`bg-indigo-500`, `rounded-lg`, `text-sm` and `p-18` stop existing: the tooling
enforces the design system instead of quietly offering an escape from it. Spacing is
narrowed to the
`4 · 6 · 8 · 11 · 14 · 16 · 20 · 22 · 24 · 26 · 32 · 44 · 52 · 62 · 88 · 96` scale,
where the number in the class is the pixel value.

Second, **every color maps to `var(--token)` and never restates a hex value.**
`product_design_system.md` §9.3 ships `tokens.css` with a `:root` block and a
`[data-theme="dark"]` block, and the theme is switched by setting
`<html data-theme="dark">`. If a hex were pasted into `@theme` instead, Tailwind
would compile the light value into every utility and the dark theme would apply
to hand-written CSS while every `bg-card` and `text-ink` stayed stubbornly light
— a bug that looks like a theming failure and is actually a duplicated token.
`tokens.css` is authoritative; `@theme` is a mapping layer over it. The literals
that do appear — zero radius, the spacing steps, the font sizes, the `xs`
breakpoint — are identical in both themes and have no counterpart in `tokens.css`.

The design system's layout variables (`--nav-w`, `--bar-h`, `--row-h`, `--doc-max`,
…) stay as plain CSS variables and are used via arbitrary values where needed —
`h-[var(--row-h)]` — rather than being mirrored into `@theme`. Mirroring them would
create the same duplication problem for no benefit, since they aren't part of a
utility scale. `--shadow-pop` and the easing tokens are used the same way
(`shadow-[var(--shadow-pop)]`, `ease-[var(--ease-out)]`) for an additional reason:
v4's namespaces are literally `--shadow-*` and `--ease-*`, which `tokens.css`
already owns, so a mapping would define those variables as themselves.


### 6.6 Radix packages

Install only what's used: `react-dialog`, `react-dropdown-menu`, `react-popover`,
`react-tooltip`, `react-tabs`, `react-switch`, `react-label`, `react-slot`. There is
deliberately no `react-select` (the Select is the native element, design §6.4) and no
`react-accordion` (the FAQ is native `<details>`, and the form is "not accordions"). Each is independently versioned, so nothing
unused ships. (A unified `radix-ui` package also exists if you'd rather have one
dependency line; either is fine, don't mix them.)

### 6.7 Sonner, styled to the system

Sonner is optimized for the celebratory toast the brand explicitly forbids, so it
must be constrained at the mount point:

```jsx
<Toaster
  position="bottom-right"
  offset={24}
  visibleToasts={2}
  toastOptions={{
    unstyled: true,
    duration: 4000,
    classNames: {
      // The toast is a dark floating layer — design system §6.12
      toast:
        "flex w-[min(380px,calc(100vw-40px))] gap-11 border-l-2 border-l-acc " +
        "bg-ink px-16 py-14 font-ui text-dense text-d-text shadow-[var(--shadow-pop)]",
      success: "border-l-st-appr-fg",
      error: "border-l-st-corr-fg",
      actionButton: "text-acc-on-d",
    },
  }}
/>;

// Errors do not auto-dismiss: a failed write is not an announcement.
toast.error(message, { duration: Infinity });
```

**The surface is `--ink`, not `--card`.** An earlier revision of this section
specified a light toast on `--card` with a hairline border, which contradicted
`product_design_system.md` §6.12 — a toast is a floating layer, and floating layers
in this system are dark with `--shadow-pop`, the same treatment as the tooltip
(§6.13). The class names in that revision (`border-corr-br`, `bg-corr-bg`) also
referred to tokens that do not exist: the status tokens are `--st-corr-bd` /
`--st-corr-bg` / `--st-corr-fg`, and `-br` was never a suffix in the system.

Zero radius, a 2px left accent bar, no border, at most two visible at once, and
**errors that never auto-dismiss**. **No success toast on approval** — approval is a
filing action and the status chip changing is the whole feedback. Use
`toast.custom()` if the default anatomy resists the tokens.

### 6.8 Seed script

`npm run db:sample` connects, wipes the **seven** collections (`users`, `projects`, `tasks`,
`reports`, `revisions`, `holidays`, `seenMarks`), and inserts the development dataset
specified in `database_schema.md` §8. `npm run db:empty` (`--empty`) wipes the same seven
collections and syncs their indexes but inserts nothing, so the first person to sign up
becomes the owner. Both **refuse when `NODE_ENV` is `production`**. `seed` and `seed:reset`
remain as undocumented aliases of `db:sample`. The dataset, in short:

- **Users** — the fixed fictional cast from `brand_design_strategy.md` §10
  (Nadia F., Ruwan P., Imali J., Tharindu S., Ayesha C., Dinesh K., Malith W.,
  Sanduni B.), roles across admin / manager / member, a known password, the first admin
  as owner. **Plus** an invited user with a live link, a removed user, and a re-hired
  user with two work periods.
- **Projects** with plans covering every progress state — on track, overdue, planned
  hours, future start, extended.
- **Tasks** small and long, some done.
- **Reports** across roughly six ISO weeks, generated **relative to the week the seed
  runs**, so the current week always contains every state — Approved (asked and not
  asked), Submitted (asked and not asked), Needs correction, Draft, Not started, On
  leave — with daily updates, lines across projects and task types, blockers, an update
  open to team comments, and reply threads.
- **One complete correction cycle** with three revisions, and an approval with a comment.
- **Holidays**, including one in the current week.

Deterministic — a fixed array and index arithmetic, **not** `faker` — so screenshots
don't change between reseeds and names follow the brand's naming policy. `npm run db:sample`
must produce a dataset in which every design system §3.13 state and every status chip is
reachable **without a single write**.

**The seed is for development and tests only.** The public demo does not read it (§6.9).

### 6.9 The demo — the real app on hard-coded data

`requirments_doc.md` §14: a hands-on demo from the landing page, in three perspectives,
with no database, no server and no account, reset by refreshing the page.

**Mechanism: a demo adapter on the one Axios instance.** Every request in the client
already goes through `apiClient` (§6.2). In demo mode, that instance is given a **custom
Axios adapter** that never touches the network: it matches the request's method and path
against a table of handlers and answers from an **in-memory store** built from
hard-coded fixtures.

```js
// client/src/demo/demoAdapter.js
export function createDemoAdapter(store) {
  return async (config) => {
    const handler = matchRoute(config.method, config.url); // e.g. PUT /reports/week/:w/days/:d
    const { status, data, error } = handler(store, parseRequest(config));
    const envelope = status < 400
      ? { success: true, data, message: null, error: null }
      : { success: false, data: null, message: error.message, error: { code: error.code, ...error.extra } };
    const response = { status, data: envelope, headers: {}, config, statusText: "" };
    // A custom adapter is not validated against validateStatus: it must reject a 4xx itself,
    // or every error path in the pages would be skipped.
    if (status >= 400) throw new AxiosError(error.message, "ERR_BAD_REQUEST", config, null, response);
    return response;
  };
}
```

Because the adapter sits **below** the services and the TanStack Query hooks, every real
page, component, hook and service runs unchanged — the demo is the product, not a copy of
it that has to be kept in step by hand.

- **Entry.** The landing page's "See the demo" opens `/demo`, where the visitor picks a
  perspective: **Team member** (Imali J.), **Manager** (Nadia F.) or **Admin** (Sanduni B.,
  the owner). A bar above the app keeps the choice switchable and carries the `SAMPLE DATA`
  marker.
- **The store** is a plain object created from `client/src/demo/fixtures.js` when demo
  mode starts. Handlers read and mutate it, so a comment posted as Nadia is there when the
  visitor switches to Imali. It lives only in memory: **a refresh rebuilds it from the
  fixtures**, which is the whole reset mechanism.
- **Rules are applied in the handlers**, in simplified form — a member cannot approve, the
  author cannot review their own report, a comment is editable for 10 minutes — so each
  perspective shows what that role can and cannot do. The real rules live on the server;
  the demo reproduces their visible effect, not their enforcement.
- **Dates are relative.** Fixtures describe "this week", "last week" and "three weeks
  ago", resolved when demo mode starts, so the demo never shows a stale week.
- **No server call is possible.** The demo adapter has no fallback to the network; an
  unhandled route returns a 404 envelope rather than reaching the API.
- **The guided tour** *(owner decision, 2026-10-17)* is an overlay over these same pages,
  mounted under `/demo` only, in its own chunk; its setup helpers act on the store through
  the same handlers (`frontend_architecture.md` §11.6). It adds no dependency (§10).

**What this replaces.** An earlier plan signed visitors into a seeded demo account on the
real API and refused every write server-side with a demo flag. That put a special account
in the production database, a rule in every mutating service, and a demo that went stale
a week after each reseed. None of that exists now: no `isDemo`, no `canPerformDemoWrite`,
no `DEMO_READ_ONLY`, no reseeding.

**The one test it needs.** A client test calls every function in `services/` against the
demo adapter and asserts each returns the envelope shape its hook expects. When the API
gains an endpoint, the test fails until the demo handles it, which is how the demo stays
honest about the product it imitates.

---

## 7. Deployment

### 7.1 Repository layout

```
weekly-report-generator/
├── client/                 # Vercel root directory
│   ├── src/
│   │   ├── components/     # ui/ (the design system) + one folder per domain; project_structure.md §3.1
│   │   ├── hooks/          # useAuth, query hooks wrapping services
│   │   ├── layouts/
│   │   ├── pages/          # smart, page-level
│   │   ├── routes/         # router config + ProtectedRoute
│   │   ├── services/       # apiClient + one file per resource
│   │   ├── lib/            # cn(), date helpers, status maps
│   │   ├── demo/           # demo adapter, in-memory store, hard-coded fixtures (§6.9)
│   │   └── styles/
│   ├── .env.example
│   └── vercel.json
├── server/                 # root directory of the Vercel API project (or of Render, Option B)
│   ├── src/
│   │   ├── config/         # env.js, db.js
│   │   ├── models/
│   │   ├── routes/
│   │   ├── controllers/    # thin
│   │   ├── services/       # business logic
│   │   ├── policies/       # reportPolicy.js — access rules (see §3.1)
│   │   ├── middleware/     # authenticate, authorize, validate, errorHandler
│   │   ├── validators/     # zod schemas
│   │   ├── utils/          # ok(), AppError, paginate()
│   │   ├── seed/
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/              # RBAC only
│   └── .env.example
├── docs/                   # the planning documents
└── README.md
```

### 7.2 Vercel (client)

- Root directory: `client`. Build: `npm run build`. Output: `dist`.
- Env: `VITE_API_BASE_URL=https://<api-project>.vercel.app/api` (Option B: `https://<service>.onrender.com/api`)
- **`client/vercel.json`** — without this, a refresh on `/review` 404s:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }],
  "headers": [{ "source": "/(.*)", "headers": [{ "key": "Referrer-Policy", "value": "no-referrer" }] }]
}
```

The header keeps `/invite/:token` and `/reset/:token` — whose URL *is* the credential — from
being sent as a `Referer` to the one third party the client loads (Google Fonts).

Vite env vars are inlined at build time, so changing `VITE_API_BASE_URL`
requires a redeploy, not just a settings save.

### 7.3 Render (API) — the documented alternative

The original plan, kept as Option B in `docs/DEPLOYMENT.md`; the API runs on Vercel instead (§7.5).


- Root directory: `server`. Build: `npm install`. Start: `node src/server.js`.
- Env: `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET`, `JWT_EXPIRES_IN`,
  `CLIENT_URL=https://<app>.vercel.app`, and `PORT` (Render supplies this —
  bind to `process.env.PORT`, never a hardcoded 5000).
- Health check path: `/api/health`.
- **Free tier reality:** spins down after ~15 minutes idle; 30–60s to wake;
  750 compute hours/month. Accepted, and handled by the loading state in §6.3.
  Do **not** add an external uptime ping: it's unsupported by Render, and 24/7
  uptime is 720 of the 750 hours, so one redeploy would exceed the allowance.

### 7.4 Atlas

- **M0**, one cluster, one database (`weeklyview`); the API runs in the region closest to it
  (Vercel: the API project's Function Region; Render: the service's region).
- **Network access must be `0.0.0.0/0`** — Vercel functions (and Render free instances) have no
  static outbound IP, so there is nothing to allowlist. This is a deliberate tradeoff,
  not an oversight: compensate with a long unique database password, a
  least-privilege database user, and the credentials living only in the host's environment
  settings (Vercel, or Render). Document it in the README rather than leaving a reviewer to assume
  carelessness.
- **No automated backups on M0.** Since `db:sample` can rebuild the entire
  demo dataset, that's acceptable for now and stops being acceptable the day a
  real team files a real report.

---

### 7.5 The API on Vercel — the chosen host (owner decision, 2026-10-18)

Render may ask for a payment card, so the owner chose **Option A**: the client and the API both on
**Vercel**, the API as a serverless function, one shared Atlas database with sample data for now
(switched with `db:empty` / `db:sample` from the owner's PC). Render (§7.3) stays the documented
alternative. `server/api/index.js` connects to MongoDB once per warm instance and passes
each request to the unchanged `app.js`; `server/vercel.json` rewrites every path to it. The client
stays on Vercel either way. Step-by-step instructions for both options: `docs/DEPLOYMENT.md`.

---

## 8. Deliberately deferred

Not omissions — decisions, to be revisited if WeeklyView takes real users.

| Deferred                              | Add when                                              | Note                                                                                                   |
| ------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| An email provider (invites, resets, and a self-service "forgot password") | A real team uses this, or copy-and-paste links stop scaling | The token model in §2.1 is already the one an emailed link uses, so this changes the delivery step and nothing else. It is also what would let "new" markers grow into email alerts |
| `express-rate-limit` on `/auth/login`, `/auth/password` and `/auth/links/*` | Before any real user | ~6 lines. The public sign-in and link endpoints are the one genuinely exposed surface in this design; password change is included because it verifies a password too. The demo never reaches the server, so it adds nothing here |
| Refresh tokens + httpOnly cookies     | When a custom domain makes client and API same-site   | The `tokenVersion` field already anticipates a revocation story                                        |
| `compression`                         | If payloads grow                                      | Dashboard JSON is small; platform edge compression covers most of it                                   |
| CI (GitHub Actions)                   | When someone else commits                             | Would run lint + the RBAC tests                                                                        |
| Error monitoring (Sentry)             | First real users                                      | Vercel (or Render) logs are enough for one developer                                                   |
| Component and E2E tests               | If the project outlives the portfolio                 | Manual verification per `development_approach_doc.md` covers the build. **Owner decision (2026-10-18): a committed browser test (`@playwright/test`) for the landing → `/signin` computed-style check is declined for now;** that check stays the scripted Chromium run documented in `brand_design_strategy.md` §6.0 rule 14 |
| Atlas backups (paid tier)             | The day real reports are filed                        | M0 has none                                                                                            |

---

## 9. `server/package.json`

```json
{
  "name": "weeklyview-server",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=20" },
  "scripts": {
    "dev": "node --watch-path=src src/server.js",
    "start": "node src/server.js",
    "db:empty": "node src/seed/index.js --empty",
    "db:sample": "node src/seed/index.js",
    "seed": "node src/seed/index.js",
    "seed:reset": "node src/seed/index.js --reset",
    "test": "vitest run",
    "lint": "eslint .",
    "format": "prettier --write ."
  },
  "dependencies": {
    "bcryptjs": "^3.0.2",
    "cors": "^2.8.5",
    "date-fns": "^4.1.0",
    "dotenv": "^17.2.0",
    "express": "^5.1.0",
    "helmet": "^8.1.0",
    "jsonwebtoken": "^9.0.2",
    "mongoose": "^8.9.0",
    "morgan": "^1.10.0",
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.0.0",
    "eslint": "^9.0.0",
    "eslint-config-prettier": "^10.0.0",
    "globals": "^16.0.0",
    "mongodb-memory-server": "^10.1.0",
    "prettier": "^3.4.0",
    "supertest": "^7.0.0",
    "vitest": "^3.0.0"
  }
}
```

## 10. `client/package.json`

```json
{
  "name": "weeklyview-client",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "lint": "eslint .",
    "format": "prettier --write ."
  },
  "dependencies": {
    "@hookform/resolvers": "^5.0.0",
    "@radix-ui/react-dialog": "^1.1.0",
    "@radix-ui/react-dropdown-menu": "^2.1.0",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-popover": "^1.1.0",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-switch": "^1.1.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-tooltip": "^1.1.0",
    "@tanstack/react-query": "^5.60.0",
    "axios": "^1.7.0",
    "clsx": "^2.1.0",
    "date-fns": "^4.1.0",
    "gsap": "^3.15.0",
    "lucide-react": "^0.460.0",
    "motion": "^12.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-hook-form": "^7.54.0",
    "react-router-dom": "^7.1.0",
    "recharts": "^3.0.0",
    "sonner": "^2.0.0",
    "tailwind-merge": "^3.0.0",
    "zod": "^4.0.0"
  },
  "devDependencies": {
    "@eslint/js": "^9.0.0",
    "@tailwindcss/vite": "^4.0.0",
    "@tanstack/react-query-devtools": "^5.60.0",
    "@vitejs/plugin-react": "^5.0.0",
    "eslint": "^9.0.0",
    "eslint-config-prettier": "^10.0.0",
    "eslint-plugin-react-hooks": "^5.1.0",
    "eslint-plugin-react-refresh": "^0.4.14",
    "globals": "^16.0.0",
    "prettier": "^3.4.0",
    "prettier-plugin-tailwindcss": "^0.6.0",
    "tailwindcss": "^4.0.0",
    "vite": "^7.0.0",
    "vitest": "^3.0.0"
  }
}
```

**Owner decision (landing polish, 2026-10-10): `gsap` is added for the landing page only.** GSAP 3 with
its ScrollTrigger and ScrollToPlugin runs the landing page's two scroll stories (scrubbed, snapping to
each step), its entrances, the hero parallax and the footer's week. It is imported by
`hooks/useLandingMotion.js` alone, which `LandingPage` alone imports, so it ships in the landing chunk and
is never loaded by the app or the demo (`landingIsolation.test.js` asserts both). The app's own motion
stays `motion` (§1.2). GSAP is free under its "Standard 'no charge' license" (gsap.com/standard-license).
anime.js was considered and not added.

**Owner decision (guided demo tour, 2026-10-17; accepted as built on the PR #28 review, 2026-10-18): no
library — the tour is built on what is already in the stack, no dependency added.** The owner approved one small,
MIT-licensed tour library (driver.js was the candidate). It was not needed: the tour's steps span route
changes and changes of person, wait for data to load, act on the demo store and must sit above the
app's own Radix dialogs — all of it the tour's own logic either way — and the highlight, the tooltip and
the phone sheet are a few dozen lines of React on the design tokens (the jump panel is the Radix Dialog
already here). The tour is `client/src/demo/tour/`, loaded by a dynamic import under `/demo` only, so
neither the app's main bundle nor the landing chunk carries it (`demoTour.test.js` checks the imports;
the production build was checked by hand). See `frontend_architecture.md` §11.6.

`vitest` is on the client for one reason: the constants parity test
(`project_structure.md` §7.1), which asserts that the client's copy of the shared
vocabulary matches the server's. It is the client build whose correctness the check
protects, so the check runs on the client side. Nothing else here is unit-tested —
component and E2E testing stays deferred (§8).

**On versions:** majors are the decisions; minors and patches are not. Install
with plain `npm install <pkg>` and let npm resolve the current release inside the
major — the carets above record intent, not a lockfile. The one version that is
genuinely load-bearing is **Tailwind 4**, because the CSS-first `@theme` approach
in §6.5 does not exist in v3.

---

## 11. Express 5 gotchas worth knowing before the first commit

These bite once and cost an hour if unexpected:

- **Wildcards must be named.** `app.get('*', ...)` throws in v5 — use
  `app.use((req, res) => ...)` as the 404 handler, or `/*splat` if you need a
  path param.
- **Async errors are forwarded automatically.** Do not wrap controllers in
  try/catch just to call `next(err)`; throw and let the error middleware handle
  it. (Keep try/catch only where you're genuinely recovering from something.)
- **`req.query` is a getter** and no longer mutable, which is why validation
  middleware should attach the parsed result to something like `req.validated`
  rather than overwriting `req.query`.
- **`res.status(...).send(status)`** with a number no longer sets the status —
  use `res.sendStatus()`. Our `ok()` helper avoids this entirely.

---

## 12. Verification hooks

Mapping these choices to the checks in `development_approach_doc.md`:

| Check                                               | What makes it possible                                                                                                                                                 |
| --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "Report ownership authorization" (requirements §12) | `canOpenWeek`, `canReadContent` and `buildReportScope` in `policies/reportPolicy.js`, asserted directly as pure functions |
| "Days are shared; end-of-week content is not" (requirements §2, §4) | The no-private-content test in §3.1: a teammate reading a week gets its days and `content: null`; a manager reading a Draft gets the same; a manager reading a Needs-correction report gets the sent-back revision |
| "The demo works without a server" (requirements §14) | The demo-adapter test in §6.9: every service function answers from the in-memory store, and no request reaches the network |
| "Signup closes after the first account" (requirements §1) | RBAC test: `POST /auth/signup` against a non-empty database returns **403**, and the unique partial index on `isOwner` is asserted to exist                  |
| "One owner, transferable only by the owner" (requirements §11.2) | RBAC tests: a non-owner admin gets **403** on transfer, demote or remove of the owner; a transfer leaves exactly one `isOwner`, and a manager target comes out as admin |
| "Who may comment on a daily update" (requirements §2.1) | `canCommentOnDay` as a pure function, plus RBAC tests: a teammate gets **403** on a closed update and **201** once it is opened to the team; a manager may comment on their own update |
| "A week on leave is not expected" (requirements §15) | Seeded full-week leave: the week derives `on_leave` and the compliance denominator excludes it |
| "Approval is optional" (requirements §4) | RBAC tests: a submitted report without an approval request can still be approved by another manager; the author can never approve their own; a report left Submitted counts as filed |
| "Comments are editable for 10 minutes" (requirements §2.1) | A service test with an injected clock: an edit at 9 min 59 s succeeds, at 10 min 1 s returns 403; deleting a comment that has replies returns 409 |
| "Holidays and leave change what is expected" (requirements §15, §16) | Seeded holiday in the current week: submission succeeds without an update for that day, and a project's days used skips it |
| "A link is single-use and expires" (requirements §11.1, §11.3) | Unit tests on the hash-and-lookup path: a used token stops resolving, an expired one is refused, a reset link cannot complete an invite, and re-issuing invalidates the previous token |
| List scope and single-resource policy agree         | The parity test in §3.1 — rows carrying content must equal the set `canReadContent` allows |
| Forbidden vs missing are distinguishable            | RBAC tests assert **403** for a write on another member's week and **404** for a fabricated ObjectId |
| "Test with the wrong role — confirm blocked"        | `authorize` middleware + the Vitest/Supertest RBAC suite                                                                                                               |
| "Test with missing/invalid fields"                  | Zod validation middleware returns a field-level error map                                                                                                              |
| "Form validation errors inline next to the field"   | RHF `formState.errors` keyed by field name, fed by `zodResolver`                                                                                                       |
| "Check loading and empty states"                    | TanStack Query `isPending` / `isFetching` / empty `data`                                                                                                               |
| "Type the URL directly"                             | `ProtectedRoute` layout guard, backed by server-side `authorize`                                                                                                       |
| "Version history shows previous versions"           | `revisions` collection + its `{ report, revisionNumber }` unique index, seeded with a full correction cycle                                                            |
| "Charts render with real seeded data"               | Deterministic seed across six ISO weeks                                                                                                                                |
