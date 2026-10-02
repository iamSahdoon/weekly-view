# WeeklyView — instructions for the coding agent

WeeklyView is a MERN app: every team member posts a short **daily update** (work lines:
task, type, what was done, hours) and files one **weekly report** built from those days.
Managers read the days as they come in, comment, and may approve or send back the weekly
report. A dashboard shows the team's week and its projects. There is a public **landing
page** and a browser-only **demo**.

**The planning is finished and lives in `docs/`. Build from it; do not re-decide it.**
`MASTER_PROMPT.md` says how to build, in stages. `PROGRESS.md` says which stage is next.

## Read order for every session

1. This file.
2. `PROGRESS.md` — what is done, what is next, anything blocked.
3. The stage you were given in `MASTER_PROMPT.md`, and **only the document sections it names**.
   The documents total ~11,000 lines; do not read them whole.

## The documents, and who is right when they disagree

| Document | Owns |
| --- | --- |
| `docs/requirments_doc.md` *(sic — keep the spelling)* | What the product does: roles, rules, scope |
| `docs/product_design_system.md` | Everything behind the login: pages, components, tokens, states, copy |
| `docs/brand_design_strategy.md` | Identity, vocabulary, and the **landing page's** rules (§6.0) |
| `docs/tech_stack.md` | Libraries, versions, auth, layering, authorization pattern, deployment |
| `docs/database_schema.md` | Collections, fields, indexes, write order, derived-vs-stored |
| `docs/api_specification.md` | Every endpoint, payload, status code, error code, access matrix, RBAC tests |
| `docs/project_structure.md` | Where every file lives, naming, what must not change |
| `docs/frontend_architecture.md` | Client state, data layer, query keys, forms, page data flow |
| `docs/development_approach_doc.md` | Build standards and verification walkthroughs |

Authority is **by subject**, not by rank (`docs/project_structure.md` §0.5): scope →
requirements; visual and interaction detail → design system; technical mechanism →
`tech_stack.md`; endpoint shapes → API spec; data → schema. **Not for building from:**
`docs/conflicts_reconciliation.md` (pass-1 history) and `docs/reconciliation_changelog.md`
(what changed and why — read it only to understand a decision).

**If two documents disagree, or one is silent: stop, do not guess.** State the conflict,
pick the smallest choice that unblocks you only if it is reversible, and say so in
`PROGRESS.md` under *Open questions*. Never resolve a conflict silently in code.

## Stack (fixed)

- **Server:** Node ≥ 20, Express 5, Mongoose 8 on Atlas M0, **ESM JavaScript — no TypeScript**,
  Zod, jsonwebtoken, bcryptjs, helmet, cors, morgan, date-fns. Tests: Vitest + Supertest +
  mongodb-memory-server.
- **Client:** React, Vite, react-router-dom 7 (library mode, **no loaders/actions**), TanStack
  Query, axios, react-hook-form + zod, Tailwind 4 (CSS-first `@theme`, no config file), Radix,
  Motion, Recharts, date-fns, Sonner, lucide-react.
- **Hosting:** client on Vercel, API on Render. Two self-contained deployables: `client/` and
  `server/`. **Nothing imports across them.**

## Server rules

- Chain per route: `validate(zod) → authenticate → authorize(role) → controller → service → model`.
  Guards attach **per route**, never `router.use(authenticate)` — two routers share `/reports`.
- Controllers are under ~15 lines: build `actor = { id, role, isOwner }`, call **one** service
  function, respond with `ok(res, data, message, status)`. Services take an `actor`, **never `req`**.
- Every response is the envelope `{ success, data, message, error: { code } }`. Errors are
  `AppError(status, message, code)` thrown from services; one `errorHandler` formats them.
  Codes are exactly those in `docs/api_specification.md` §1.9.
- **Load, then authorize** — never `findOne({ _id, ...scope })` (it merges 403 and 404).
- All permission rules live in `server/src/policies/` as pure functions. A week has three
  layers: daily updates (whole team), end-of-week `content` and week comments (author, and
  managers once submitted — **never teammates**; withheld layers are `null`, not a 403).
- Nothing reads `process.env` except `config/env.js`. `.lean()` on read-only queries.
  `timestamps: true` everywhere. `_id` is never remapped.
- Validation puts parsed input on `req.validated` (Express 5 `req.query` is read-only).
- **Never log, return, or cache a link token or password.** Link tokens are SHA-256 hashed,
  single use, shown in one response only, and travel in request bodies, never URLs.

## Client rules

- **One path to the network:** `service → api → apiClient`. Axios appears only in
  `services/apiClient.js` and `demo/`. Components call hooks; hooks call services.
- Query keys come from `lib/queryKeys.js` only. Filters, sort, page, week and day live in the
  URL. **A refetch never resets a form** (`docs/frontend_architecture.md` §6.2).
- **Pages never branch on the demo** (three presentation exceptions: demo bar, `SAMPLE DATA`
  pill, hidden Sign out). The demo is an in-browser axios adapter on hard-coded data; write its
  handlers **in the same stage as the feature**, and keep `demoCoverage.test.js` green.
- No hex values in components — `var(--token)` only, charts included. Zero border radius,
  hairline borders, no shadows except `--shadow-pop` on floating layers.
- Exact vocabulary: Draft · Submitted · Needs correction · Approved · Not started · On leave ·
  Holiday week; *project*, *task*, *daily update*, *overall comment*, *send back*, *review desk*.
  Sentence case. Mono only where `docs/product_design_system.md` §0.5 allows.
- One primary action per page. Four designed states for every list (skeleton, empty-new,
  empty-filtered, error) via `QueryView`. **No success toasts**; no confetti, no exclamation marks.
- Nobody reviews their own report; the UI hides it and the server refuses it.

## The landing page is a different look — keep it that way

The landing page (`/`, signed out) is **green, Bricolage Grotesque, pill shapes**, ported from
the built reference `landing-reference/index.html`. **The app and the demo are
cobalt on cool neutrals in Chivo / Instrument Sans / JetBrains Mono.** Landing styles live in
`client/src/styles/landing.css`, scoped to `.landing`, imported by the landing chunk only.
No landing token or font may reach the app (`docs/brand_design_strategy.md` §6.0).

## Naming and layout

Follow `docs/project_structure.md` — it lists every file. Server files are
`camelCase` + the folder's singular role (`reportService.js`, `reportModel.js`); client
components are `PascalCase.jsx`; domain folders singular; URL paths plural; error codes
`SCREAMING_SNAKE`. If the build genuinely needs a file the tree lacks, add it where §4's
conventions say, **and update `project_structure.md` in the same change** with a one-line note.
Do not create empty files to satisfy the tree.

## Commands (available once Stage 0 is done)

```bash
npm --prefix server run dev        # API on :5000
npm --prefix client run dev        # Vite on :5173
npm run seed                       # development dataset (server)
npm test                           # server RBAC/policy tests + client parity/demo tests
npm run lint
```

Environment: copy each `.env.example` to `.env`. **Never commit `.env`.** `MONGODB_URI` is the
owner's Atlas string — ask for it; tests use an in-memory Mongo and never touch Atlas.

## Working agreements

- **One stage per session**, then stop. Finish what the stage's *done* list says; do not start
  the next stage.
- Before saying a stage is done: lint clean, tests pass, the stage's manual checks done (the
  checks in `docs/development_approach_doc.md` "After each backend/frontend step" plus the
  stage's own list), `PROGRESS.md` updated, and one commit.
- Report outcomes plainly: failing tests, skipped checks and unverified UI are stated, not
  glossed. You cannot see a browser unless a tool gives you one — say when a visual check is
  unverified.
- Ask the owner before anything outward-facing or hard to reverse: pushing, deploying,
  creating cloud accounts or databases, changing a decision in `docs/`.
- Windows is the owner's machine: use cross-platform npm scripts, forward-slash paths, and
  no shell-specific syntax in `package.json`.
- Do not add dependencies outside `docs/tech_stack.md` §9–§10 without asking.
- Prefer the plainest thing that satisfies the requirement. No speculative abstractions,
  no features outside `docs/requirments_doc.md`.
