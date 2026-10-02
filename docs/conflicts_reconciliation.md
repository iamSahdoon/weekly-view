# WeeklyView — Cross-Document Conflict Audit & Reconciliation Brief

> **Historical record — pass 1 only.** This audit describes the documents as they were
> before reconciliation passes 1–6 and is kept for the evidence trail. Much of it is now
> out of date (the demo, sections, daily updates, approval and most of the model have
> changed). **Do not build from it.** The current state is in the documents themselves;
> what changed is in `reconciliation_changelog.md`.

> **What this is.** An audit of the seven planning documents in `docs/` for contradictions
> between them, plus the edit needed in each one. It is not a new decision-making
> document: where a conflict needs a judgement call, it is listed as an open decision
> rather than resolved here.
>
> **Docs audited:** `requirments_doc.md` · `development_approach_doc.md` ·
> `brand_design_strategy.md` · `product_design_system.md` · `tech_stack.md` ·
> `database_schema.md` · `project_structure.md`
>
> **Not audited:** `api_specification.md`, `frontend_architecture.md`, `CLAUDE.md`,
> `MASTER_PROMPT.md` — these are referenced by the existing docs but have not been
> written yet, which is expected: the Backend Engineer, Frontend Engineer and Tech Lead
> passes have not run.
>
> **How to use it.** Part 1 needs answers from the project owner. Part 2 is the evidence
> for every issue, numbered so it can be cited. Part 3 is the per-document edit list,
> pointing back at those numbers. Reconcile in pairs — edit both sides of a conflict in
> the same pass, as `project_structure.md` §0.4 requires.

---

## Part 1 — Three decisions to make first

Several edits below are written two ways depending on these. Nothing that depends on
them should be edited until they are settled.

### D1 — Tenancy: is there self-serve signup, or is it invite-only?

The brand and design docs sell a self-serve **"Create my workspace"** signup. The data
model has **no workspace or tenant concept at all** — see issue **#1**. These cannot both
stand.

| Option | Consequence |
| ------ | ----------- |
| **(a) Invite-only** — no `/signup`, one workspace, a seeded admin invites everyone | No schema change. Deletes `/signup`, the workspace-name field, "Join {workspace}", and the "Create my workspace" CTA. **Smallest path — collapses issues #1, #2 and most of #3.** |
| **(b) Multi-workspace** — real self-serve signup | A workspace collection, a tenant key on `users` / `sections` / `reports` / `revisions`, that key added to every index, every policy scope and every aggregation pipeline. A substantial schema and backend change. |

### D2 — Demo mode: read-only, or can the demo write?

`product_design_system.md` §0.2/§3.14 specifies an unauthenticated, **read-only**
workspace with every mutating control disabled. `tech_stack.md` §6.9/§3.1 specifies
login with fixed demo credentials and **report writing explicitly enabled**. Recorded as
C3 in `project_structure.md` §9 and still open. It decides `canPerformDemoWrite`, whether
`/demo` or two sign-in buttons is the entry point, and whether the blocker-resolve toggle
works in the demo.

### D3 — Tailwind: v3 config file, or v4 CSS-first?

Recorded as C1. `product_design_system.md` §9.4 ships a `tailwind.config.js` in Tailwind
v3 form; `tech_stack.md` §6.5 specifies Tailwind 4, CSS-first `@theme`, and no config
file. Both `package.json` listings install `tailwindcss ^4`, under which a v3 config file
does nothing. **Recommendation: v4 CSS-first** — but see issue **#11**, because the v4
block as currently written silently drops the type scale and the spacing scale.

---

## Part 2 — The issues, with evidence

### Blocking / architectural

**#1 — There is no tenancy model, but the product sells a workspace.**
`brand_design_strategy.md` §6.3, §7.1 and §12 make **"Create my workspace"** the primary
CTA at every fold. `product_design_system.md` §3.12 gives `/signup` a **workspace name**
field, §3.12's invite screen reads **"Join {workspace}"**, and §3.14's demo bar repeats
the button. But `database_schema.md` has no workspace or organization collection and no
tenant field on any document — `buildReportScope`, the §5.0 expected-filer pipeline, the
review desk query and every dashboard aggregation are global over `users` and `reports`.
As specified, the second person to sign up joins the first person's data.
*(This is broader than C4, which frames the same area as a missing mail library.)*
→ **Decide D1.**

**#2 — A manager can read a member's Draft, which the requirements forbid.**
`requirments_doc.md` §3: *"Draft — team member is still filling in the report; only
visible to them."* But `tech_stack.md` §3.1's `buildReportScope` gives managers and admins
"the team-wide filter unchanged", and `canAccessReport` carries **no status condition** —
so a manager `GET`ing a member's draft by id succeeds. Separately,
`product_design_system.md` §3.7's team table renders a **Draft chip per person**, and
`tech_stack.md` §4 justifies the `{ weekKey: 1, status: 1 }` index precisely because that
table "shows all four statuses plus Not started". `database_schema.md` §5 cites §3 as the
reason drafts are excluded from *metrics* — but exclusion from metrics is not exclusion
from reads.
**Fix:** decide and state once — draft *existence* is visible to managers, draft
*content* is not — then add the status condition to `canAccessReport`.

**#3 — Auth screens exceed what the rest of the stack can deliver.** *(recorded as C4)*
`product_design_system.md` §3.12 specifies five screens including `/forgot` and
`/reset/:token`. `requirments_doc.md` §1/§11 require registration, login/logout and
invitation but **no password reset**, and `tech_stack.md` §1.1 includes **no mail
library** — an invite link and a reset link cannot be delivered. `database_schema.md` §9
records that invite-token and reset-token fields are deliberately unspecified until
delivery is settled.
**Fix:** per **D1**, and drop password reset unless an email provider is added to the
stack.

**#4 — No route can address another person's report.**
`product_design_system.md` §3.4 puts report detail at `/reports/:week` — week only, no
author — while stating it is *"visible to the author and to any manager or admin"*. §3.8's
person profile shows that person's full report history as a clickable table, and §1.6
names a three-level breadcrumb **`People → Nadia F. → Week 31`** as the Breadcrumb
component's only reason to exist. `/review/:reportId` is the only id-addressed route and
it carries review semantics plus the self-review guard.
**Fix:** add a route, e.g. `/people/:userId/reports/:week`, to §3.4 and to
`project_structure.md` §3.1.

**#5 — The "People" list page is in the navigation with no spec and no file.**
`product_design_system.md` §1.3/§1.4 put **People** in the manager nav and §3.8's
back-link reads `‹ People`, but no §3.x specifies the `/people` page.
`project_structure.md`'s pages tree has `PersonProfilePage.jsx` and **no
`PeoplePage.jsx`**. (§10 flags the missing spec; the missing file is not flagged.)

### Contradictions between documents

**#6 — "Late" is removed from three documents and alive in the brand doc.**
`requirments_doc.md` §6 and `product_design_system.md` §0.4 remove it, and §13 checks
*"No 'late' state appears anywhere in the UI or the tokens."* But
`brand_design_strategy.md` §3.4 still states late *"is rendered as an ochre modifier
`#8A5A17`"*, §1.4 defines it as a compliance sub-state, and §12's checklist still
requires *"Compliance eventually breaks out 'late' as a sub-state."* The S6
reconciliation edited the requirements and never touched the brand document.

**#7 — 401 handling is specified two incompatible ways.** *(recorded as C5)*
`product_design_system.md` §3.12 opens a **re-authentication modal** over the current
page, preserving form state and retrying the failed request — §4.8 and §13 both depend on
it, because the report form autosaves and a token expiring mid-edit must lose nothing.
`tech_stack.md` §6.2 clears the token and **hard-redirects**. The two also disagree on the
route name: `/login` (tech stack, twice — the interceptor and `ProtectedRoute`) vs
`/signin` (design system §3.12, and `project_structure.md`'s pages tree).
**Fix:** the design system's modal wins by the stated authority order and is implementable
with the current single-JWT model; rewrite `tech_stack.md` §6.2 and §6.4.

**#8 — Toast styling is specified twice, differently.**
`product_design_system.md` §6.12: `--ink` background, `--d-text` text, a 2px left accent
bar, error toasts never auto-dismiss, max 2 stacked — a dark toast.
`tech_stack.md` §6.7's Sonner config produces a **light** toast: `bg-card`,
`border border-hair`, `text-ink`. The same snippet also uses class names that exist in
neither token mapping — `border-corr-br bg-corr-bg text-corr-fg`, where the tokens are
`--st-corr-bd` / `--st-corr-bg` / `--st-corr-fg` and `-br` was never a suffix.

**#9 — `tech_stack.md` argues against a demo middleware, then specifies one.**
§3.1: *"`isDemo` rides on the actor so demo write-blocking is enforced alongside every
other rule rather than in a separate middleware with its own coverage gaps."*
§6.9: *"a small `blockDemoWrites` middleware on destructive routes."*
`project_structure.md`'s `middleware/` folder lists no such file and its §2.6 puts the
rule in `policies/`.
**Fix:** keep the policy-function version (`canPerformDemoWrite`), delete the middleware
from §6.9.

**#10 — Express 5 error handling.**
`development_approach_doc.md`, Backend Standards: *"try/catch in every controller, errors
passed to a centralized error-handling middleware."*
`tech_stack.md` §11: *"Do not wrap controllers in try/catch just to call `next(err)`"* —
Express 5 forwards async rejections automatically.
Same shape, smaller stakes: the approach doc leaves the door open to Zustand
("then evaluate Zustand"); `tech_stack.md` §1.2 closes it ("No Zustand, no Redux").

**#11 — Resolving the Tailwind conflict needs more than deleting the config file.**
`tech_stack.md` §6.5's `@theme` block maps **colors and radii only**. It asserts that
spacing "is likewise narrowed to the scale", but the block does not do that, and it
defines no `--text-*` entries — so the design system's entire type scale
(`text-metric`, `text-page`, `text-panel`, `text-dense`, `text-micro`) and its px-keyed
spacing scale would not exist. Whoever applies **D3** must port `product_design_system.md`
§9.4's `spacing` and `fontSize` blocks into `@theme`, not just delete the config file.

**#12 — The theme preference has nowhere to live.**
`product_design_system.md` §2.3 says the choice is *"mirrored to the user record so it
follows the account"*, and §3.11's Appearance panel promises the user exactly that. The
`users` schema in `database_schema.md` §1.1 has **no theme field**, and `tech_stack.md`
§9.2 reads `localStorage` only.
**Fix:** either add `theme: 'light' | 'dark'` to the user document plus an endpoint, or
change the copy to say the choice is per-device.

**#13 — The offline state promises sync that nothing implements.**
`product_design_system.md` §3.13: *"You're offline. Changes are saved locally and will
sync when you reconnect."* §4.8 says a failed autosave *"keeps everything in memory"* and
blocks navigation via `beforeunload` — which is not local persistence, and the stack has
no IndexedDB, service worker or replay queue. As written the strip is untrue after a
refresh.
**Fix:** reword to something the build delivers, e.g. "You're offline. Unsaved changes are
kept until you reconnect."

**#14 — The authority order resolves the Tailwind conflict the wrong way.**
`project_structure.md` §0 sets `product_design_system > brand > tech_stack >
development_approach > requirements`. Applied literally to C1 that selects the Tailwind v3
config, which cannot work under the installed Tailwind 4 — and `project_structure.md`
itself quietly builds against `tech_stack.md` there ("There is no `tailwind.config.js`").
**Fix:** record C1 as an explicit exception to the authority order once **D3** lands.

### Minor / cosmetic

**#15 — Report section numbering disagrees with itself.** `product_design_system.md` §4.1
says the form matches the §3.4 detail view *"section-for-section"*, but the form numbers
01–07 (01 = Week & section) and the detail view numbers 01–06 (01 = Tasks completed).

**#16 — Focus ring.** §6.0 mandates `outline: 2px solid var(--acc)`; §1.3 gives nav items
a `2px --acc-l` inset ring; `brand_design_strategy.md` §3.6 says "2–3px `--acc-l` ring".

**#17 — `taskStatus` / `taskPriority` have no home file.** `database_schema.md` §0.1
includes them in the parity-tested shared vocabulary; `project_structure.md` §2.1's
`constants/` folder holds only `reportStatus.js`, `roles.js`, `taskTypes.js`.

**#18 — `--d-hover`** is defined in `brand_design_strategy.md` §3.3 and never appears in
`product_design_system.md` §9.3's `tokens.css`.

**#19 — 404 copy contradicts the data model.** `product_design_system.md` §3.13: *"the
report may have been removed"*; `database_schema.md` §7.3: reports are never deleted in
MVP.

**#20 — Client `vitest` is missing.** `project_structure.md` §6/§7.1 requires the client
parity test and §7.4's root `test` script runs it; `tech_stack.md` §10's client
`package.json` lists no `vitest` and no `test` script. Already flagged in
`project_structure.md` §8 and §10.

### Open decisions already recorded (not conflicts)

`database_schema.md` §10 carries four unresolved data decisions: re-inviting a removed
person; whether compliance excludes someone after `removedAt`; whether the dashboard's
member filter lists people active during the week being viewed; and whether
`sections.name` is unique. The first two decide seed content, so settle them before the
seed script is written.

`project_structure.md` §9 C6 remains open: `brand_design_strategy.md` §6–7 specifies a
twelve-section landing page, `product_design_system.md` §3.1 assigns `/` to "This week",
and no document gives the landing page a route.

---

## Part 3 — Edit list per document

### `requirments_doc.md`

| § | Issue | Edit |
| - | ----- | ---- |
| §3, §4 | #2 | State the draft rule: existence visible to managers, content not |
| §1, §11 | #1, #3 | Rewrite registration vs invitation per **D1** |

### `development_approach_doc.md`

| § | Issue | Edit |
| - | ----- | ---- |
| Backend Standards | #10 | Replace "try/catch in every controller" with "throw; Express 5 forwards to the error middleware" |
| Design Pattern Usage | #10 | Note that client state is settled: Context + useReducer, no Zustand |

### `brand_design_strategy.md`

| § | Issue | Edit |
| - | ----- | ---- |
| §1.4, §3.4, §12 | #6 | Delete all three "late" references |
| §3.3 | #18 | Add `--d-hover` to `tokens.css`, or drop the token |
| §6.3, §7.1, §12 | #1 | Rewrite the "Create my workspace" CTA per **D1** |

### `product_design_system.md`

| § | Issue | Edit |
| - | ----- | ---- |
| §9.1, §9.4 | #11, #14, **D3** | Replace the v3 config with the v4 `@theme` block, **carrying over the `spacing` and `fontSize` scales** |
| §3.12 | #1, #3 | Trim the auth screens per **D1**; drop `/forgot` and `/reset/:token` unless email is added |
| §2.3, §3.11 | #12 | Add the user theme field, or change the copy to per-device |
| §3.13 | #13 | Reword the offline strip to match what is built |
| §3.4 | #4 | Add the manager route to another person's report |
| §3.x | #5 | Write the `/people` list page spec |
| §0.2, §3.14 | **D2** | Confirm demo mode |
| §4.1 vs §3.4 | #15 | Align the section numbering |
| §6.0 vs §1.3 | #16 | Pick one focus-ring treatment |
| §3.13 | #19 | Reword the 404 copy |

### `tech_stack.md`

| § | Issue | Edit |
| - | ----- | ---- |
| §6.2, §6.4 | #7 | Rewrite 401 handling as the re-auth modal; fix `/login` → `/signin` |
| §6.5 | #11 | Complete the `@theme` block with the type and spacing scales |
| §6.7 | #8 | Restyle Sonner to §6.12's dark toast; fix `corr-br` → `st-corr-bd` etc. |
| §3.1, §6.9 | #9 | Keep `canPerformDemoWrite`, delete the `blockDemoWrites` middleware |
| §3.1 | #2 | Add the draft condition to `canAccessReport` |
| §10 | #20 | Add `vitest` and `"test": "vitest run"` to the client package |
| §6.9 | **D2** | Align the demo mechanism |

### `database_schema.md`

| § | Issue | Edit |
| - | ----- | ---- |
| §1.1 | #12 | Add `theme` to `users` if the preference follows the account |
| all | #1 | Per **D1(b)** only: add the workspace collection and tenant key across all four collections, every index and every pipeline. **D1(a)** needs no change |
| §0.1 | #17 | Give `taskStatus` / `taskPriority` a constants file |
| §7.3 | #19 | No change — the copy in the design system is what is wrong |
| §10 | — | Settle the four open decisions; the first two gate the seed script |

### `project_structure.md`

| § | Issue | Edit |
| - | ----- | ---- |
| §0 | #14 | Record C1 as an explicit exception to the authority order |
| §2.1 | #17 | Add the task-enum constants file |
| §3.1 | #5 | Add `PeoplePage.jsx` |
| §3.1 | #4 | Add the manager's report-detail route |
| §2.1 | #9 | Confirm `middleware/` carries no `blockDemoWrites` |
| §9 | all | Mark C1, C3, C4, C5 resolved once **D1–D3** land; C6 stays open |
| §10 | #20 | Remove the `vitest` row once `tech_stack.md` §10 is amended |

---

## Suggested order

1. **D1** (tenancy) — gates #1, #3, and the auth screens
2. **D2** (demo) and **D3** (Tailwind) — gate #9 / #11 / #14
3. **#2** — draft visibility; it is a permissions defect, and permissions are the brand promise
4. **#4, #5** — the two missing routes/pages
5. **#6, #7, #8, #10, #12, #13** — document-to-document contradictions
6. **#15–#20** — cosmetic, safe to batch

Items **#6, #8, #10, #15, #16, #17, #18, #19, #20** depend on none of the three decisions
and can be applied immediately.
