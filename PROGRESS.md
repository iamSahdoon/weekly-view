# Build progress

> Updated by the agent at the end of every stage. `MASTER_PROMPT.md` defines the stages.

**Next stage: S1**

| Stage | What | Status |
| --- | --- | --- |
| S0 | Repo scaffold | done |
| S1 | Server foundation, models, test harness | not started |
| S2 | Auth, users, links, leave, ownership | not started |
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

## Open questions for the owner
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
- Temporary: `server/tests/smoke.test.js` (bare app → 404), so `npm test` has a server test before
  the harness exists. **Delete it in S1.** Not added to the tree because it does not outlive S1.
