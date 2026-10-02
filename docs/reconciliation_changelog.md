# Reconciliation Changelog

Every edit made in the reconciliation pass that worked from `conflicts_reconciliation.md`,
followed by passes 2, 3 and 4, each in its own section below. The latest state of the
product is pass 4's.
Both sides of each conflict were edited together; issue numbers (`#n`) and decisions
(`D1`–`D4`) refer to that document, except `D4`, which was added by the project owner.

**The four decisions applied:**

- **D1 — Signup stays, "workspace" goes.** Registration creates a user account; the
  product serves one team and models no workspace or tenant. Copy corrected everywhere.
- **D2 — Demo is read-only.** `/demo` signs into a seeded account and issues a real
  token; `canPerformDemoWrite` refuses every mutation, blocker resolution included.
  _Superseded in pass 4: the demo now runs entirely in the browser and every control
  works._
- **D3 — Tailwind v4 CSS-first**, with the spacing and type scales ported into `@theme`
  rather than lost with the config file.
- **D4 — `/` branches on the session** — landing page signed out, "This week" signed in —
  and the landing page is declared as scope in the requirements.

---

## `requirments_doc.md`

| §            | Issue      | Change                                                                                                                                             |
| ------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| §1           | #1, D1     | Added "One team, no workspace entity": registration creates an account, and no tenant object or tenant key exists in any collection or query        |
| §1           | —          | Added an **open flag**: which role a self-registered account receives, and whether registration is open at all                                     |
| §3           | #2         | Draft status now distinguishes content from existence — content is the author's, existence is visible to managers as a status                       |
| §4           | #2         | New access rule: the API refuses a draft document to anyone but its author, enforced in `canAccessReport`, not only in the UI                       |
| §11          | D1, #3     | Password reset dropped with its reasoning; re-invite reactivates the existing account (`database_schema.md` §10.1); **open flag** on invite delivery |
| §13 (new)    | D4         | Landing page declared as deliberate scope, with the `/` split and its two entry points. It had been specified in the brand doc but never agreed     |
| §14 (new)    | D2         | Demo mode declared as scope: real session, every mutation refused, `SAMPLE DATA` on every screen                                                    |

## `development_approach_doc.md`

| §                    | Issue | Change                                                                                                                      |
| -------------------- | ----- | ----------------------------------------------------------------------------------------------------------------------------- |
| Backend Standards    | #10   | "try/catch in every controller" replaced with throw-and-let-Express-5-forward; the centralized error middleware is unchanged |
| Design Pattern Usage | #10   | Zustand closed as an option — Query owns server state, so only the auth user is global                                      |
| Layout Direction     | —     | "landing/login page" reworded to "landing page and the sign-in screen"; `/login` is not a route in this product             |

## `brand_design_strategy.md`

| §     | Issue | Change                                                                                                                                       |
| ----- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| §1.4  | #6    | Vocabulary row no longer calls "late" a compliance sub-state — there is no deadline, so none of those words are computable                    |
| §3.4  | #6    | The ochre `#8A5A17` late modifier deleted; replaced with an explicit statement that there is no sixth state, and why the earlier one was wrong |
| §3.6  | #16   | Focus ring aligned to the one system value: `2px solid var(--acc)` with an `--acc-l` halo. `--acc-l` is the halo, never the ring              |
| §6.3  | #1    | Primary CTA "Create my workspace" → **"Create your account"**, with the reason recorded                                                       |
| §7.1  | #1    | Nav CTA updated to match                                                                                                                     |
| §12   | #6    | Checklist line requiring "late" as a compliance sub-state replaced with one forbidding it                                                     |
| §12   | #1    | Checklist CTA line updated; added a check that "workspace" appears nowhere in the copy                                                        |

## `product_design_system.md`

| §         | Issue      | Change                                                                                                                                                   |
| --------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §0.2      | D2         | Demo row rewritten: a seeded session rather than an unauthenticated mode, mutations refused server-side                                                   |
| §0.4      | #6         | The reserved `--late` hex removed — keeping a value in waiting is what kept the concept alive across four documents                                       |
| §1.3      | #16        | Nav item focus changed from an `--acc-l` inset ring to the universal ring                                                                                 |
| §2.3      | #12        | Theme persistence is **per device**; the promise that it follows the account is gone, with the reasoning for preferring per-device                        |
| §3.1      | D4         | `/` resolves by session: landing page signed out, "This week" signed in                                                                                  |
| §3.4      | #4         | Second route added — `/people/:userId/reports/:week` — for a manager reading someone else's week; access still decided by policy, not by URL             |
| §3.4      | #15        | Document sections renumbered `01`–`07` to match the form; `01 Week & section` now renders here, and the blocker resolve toggle moved from section 03 → 04 |
| §3.7      | #2         | A Draft row on the team table shows its chip and `—` in every content column, and is not clickable through to the report                                  |
| §3.8      | #4, #2     | History rows open the new manager route, read-only; Draft weeks are not clickable and carry no figures                                                   |
| §3.11     | #12        | Appearance panel copy now reads "Applies to this device."                                                                                                 |
| §3.12     | #1, #3     | Five auth screens reduced to three: no workspace field, "Join the team" on the invite screen, `/forgot` and `/reset/:token` removed with password reset  |
| §3.12     | #7         | Session expiry: the modal stays and preserves form state; **request retry and the retry queue are removed**, with the recovery path stated instead       |
| §3.13     | #19        | 404 copy no longer speculates that a report was removed — reports are never deleted, and 403 covers "exists but not yours"                               |
| §3.13     | #13        | Offline copy reworded to "Unsaved changes are kept until you reconnect" — no local persistence or sync is implemented                                     |
| §3.14     | D2         | Demo rewritten: `/demo` is a real session, `canPerformDemoWrite` is the enforcement, `Create your account` on the bar                                    |
| §3.15     | #5         | **New:** the People list page — columns, sort, states, and a status filter defaulting to Active with search that deliberately reaches every status       |
| §4.5      | #16        | Key-toggle focus aligned to the universal ring                                                                                                           |
| §6.0      | #16        | States the one ring rule, and that an inset ring is the same treatment where an outline would be clipped                                                 |
| §6.8      | #6         | StatusChip: no late modifier, no reserved value                                                                                                          |
| §9.1      | D3         | Recommendation now names Tailwind 4's `@theme` as the mechanism, and records why the v3 config was wrong                                                 |
| §9.3      | #18        | `--d-hover` added to `tokens.css` (brand §3.3 defined it and it never landed); the late comment's reserved hex removed                                   |
| §9.4      | D3, #11    | The v3 `tailwind.config.js` replaced with the complete `@theme` block — **colors, spacing scale, type scale, radii, fonts, breakpoint**                  |
| §9.4      | #11        | Records what is deliberately outside `@theme` (dimensions, `--shadow-pop`, easings) and that the last two would otherwise define variables as themselves |
| §12       | D3         | Build order step 1 now names the `@theme` block instead of a Tailwind config                                                                             |
| §13       | D2, #2, #12 | Checklist gained: scale replacement compiles as intended, per-device theme, 403 on a teammate's draft, `/people` default and search, demo writes refused |

## `tech_stack.md`

| §     | Issue  | Change                                                                                                                                                   |
| ----- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §3.1  | #2     | `canAccessReport` gains the draft condition; `buildReportScope` gains the matching draft clause so the two faces stay in step and the parity test covers it |
| §3.1  | #2     | Error-semantics table gains the "someone else's Draft" case — 403, saying nothing more than the general case                                              |
| §3.1  | D2     | `canPerformDemoWrite` refuses **every** mutation; `canResolveBlocker` notes that a demo actor is refused like any other write                             |
| §4    | §10.4  | Third recorded amendment: `sections` gains `{ name: 1 }` unique with case-insensitive collation                                                           |
| §6.2  | #7     | 401 no longer hard-redirects; the interceptor clears the token and emits one event that opens the re-auth modal. No retry, with the reasoning             |
| §6.4  | #7     | `ProtectedRoute` redirects to `/signin`                                                                                                                  |
| §6.5  | D3, #11 | Now defers to `product_design_system.md` §9.4 for the block rather than carrying an abbreviated copy that dropped the type and spacing scales            |
| §6.7  | #8     | Sonner restyled to §6.12's dark toast — `--ink`, 2px left accent bar, errors that never auto-dismiss — and the invalid `corr-br` class names corrected   |
| §6.8  | D2     | Seed flags `isDemo` on one account only; flagging the cast would leave a seeded database nothing can be written to                                        |
| §6.9  | D2, #9 | Demo rewritten as a `/demo` session; the sign-in page's role buttons dropped; **`blockDemoWrites` middleware deleted**, resolving the doc's self-contradiction |
| §10   | #20    | Client `package.json` gains `vitest` and `"test": "vitest run"`, with what the test is for                                                               |
| §12   | #2, D2 | Verification hooks gained rows for draft access and for demo writes                                                                                      |

## `database_schema.md`

| §     | Issue     | Change                                                                                                                              |
| ----- | --------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| §0.1  | #17       | Vocabulary split into five named constants files — `taskStatus.js` and `taskPriority.js` now have homes, and all five are parity-tested |
| §1.1  | #9        | `isDemo` note points at `canPerformDemoWrite`, not the deleted middleware                                                           |
| §1.2  | §10.4     | `sections.name` is globally unique, case-insensitive; an inactive section keeps its name reserved                                    |
| §5    | #2        | Draft content excluded from every team-facing **read**, not just every metric                                                        |
| §5.0  | #2        | `$project: { status: 1 }` documented as a permission boundary; the `removedAt` predicate marked settled rather than contingent       |
| §5    | #2        | Added the manager-side report-history query, which excludes draft bodies                                                            |
| §6    | §10.4     | Index table gains `sections { name: 1 }` unique with collation                                                                      |
| §7.2  | §10.1     | Re-inviting a removed person reactivates the same document, preserving their history under one `_id`                                |
| §8    | D2        | Seed: `isDemo` on one account; the seed is now the only source of demo state, since nothing can be written                          |
| §9    | C3, C4    | Both rows moved from **Open** to resolved, with what was decided                                                                    |
| §9    | S6        | Row updated — the reserved hex is gone too, and the brand document has been corrected                                               |
| §10   | 1–4       | All four open decisions settled and rewritten as decisions with their reasoning, not questions                                      |

## `project_structure.md`

| §        | Issue  | Change                                                                                                                                       |
| -------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| header   | #14    | The linear authority order removed from the preamble; points at §0.5                                                                         |
| §0.5     | #14    | **New:** authority by subject — scope to the requirements, visual detail to the design system, implementation to the tech stack — plus "no document outranks reality" and the rule that an out-of-lane feature is a scope proposal |
| §1       | —      | `docs/` listing gains `conflicts_reconciliation.md` and `reconciliation_changelog.md`                                                         |
| §2.1     | #17    | `constants/` gains `taskStatus.js` and `taskPriority.js`                                                                                      |
| §3.1     | #5     | `PeoplePage.jsx` added at `/people`                                                                                                          |
| §3.1     | #4     | `ReportDetailPage.jsx` annotated with both its routes                                                                                        |
| §3.1     | #3, D1 | `ForgotPasswordPage.jsx` and `ResetPasswordPage.jsx` removed; `SignUpPage.jsx` annotated as account, not workspace                           |
| §3.1     | D4     | `LandingPage.jsx` and `ThisWeekPage.jsx` both annotated with the `/` split; the C6 marker is gone                                             |
| §3.2     | #4, D4 | New note explaining the two routes that look like mistakes in the table — `/`'s branch and the two paths onto one detail page                 |
| §3.3     | D3     | The `tailwind.config.js` line now states C1's resolution instead of citing an open conflict                                                   |
| §7.1     | #17    | Parity test covers five enums on both sides                                                                                                  |
| §8       | #20    | The `vitest` amendment marked applied                                                                                                        |
| §9       | all    | Rewritten as a resolution register: C1–C7 each carry what was decided, and a closing note points at the contradictions found after the table  |
| §10      | —      | Provisional items closed: auth pages, demo rules, the People page and `vitest`. One genuinely open item called out — invite link delivery     |

---

## Pass 2 — the two open flags, closed

Both flags below were answered by the project owner and applied in a second pass. **No
open flags remain.**

- **F1 — Invite delivery: the admin sends the link.** No email provider. Creating an
  invite returns a one-time URL that the Users page shows once with a copy button; the
  admin delivers it however they already talk to that person.
- **F2 — Self-registration: first-run bootstrap, invite-only thereafter.** `/signup` is
  open only while no account exists and creates an **admin**; every later attempt is 403.

| Document                   | §                | Change                                                                                                                                                              |
| -------------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `requirments_doc.md`       | §1               | The open flag replaced by the bootstrap rule, with the exposure it closes — no tenancy means an open form leaks reports or pollutes the roster either way            |
| `requirments_doc.md`       | §11.1 (new)      | The four-step invite flow, and why hand delivery is a decision rather than an omission: the token model is the one an emailed invite uses, so a provider changes only the delivery step |
| `requirments_doc.md`       | §13              | Landing CTA made conditional on bootstrap availability (see the note below)                                                                                         |
| `database_schema.md`       | §1.1             | `inviteTokenHash`, `inviteTokenExpiresAt`, `isBootstrap` added; SHA-256-not-bcrypt recorded, with `select: false` and the rule that the raw token never enters a list |
| `database_schema.md`       | §6               | Two indexes: `{ inviteTokenHash: 1 }` unique sparse, `{ isBootstrap: 1 }` unique partial                                                                             |
| `database_schema.md`       | §7.2             | Re-invite now issues a fresh token alongside the existing reactivation                                                                                              |
| `database_schema.md`       | §8               | Seed: the invited user gets a real token and expiry; the first admin carries `isBootstrap`                                                                          |
| `database_schema.md`       | §9, §10          | C4 fully resolved; decisions 6 and 7 added with their reasoning                                                                                                     |
| `tech_stack.md`            | §2.1 (new)       | Invite tokens as a bearer credential: `randomBytes(32)`, SHA-256, returned by two endpoints only, never logged, cleared on acceptance                                |
| `tech_stack.md`            | §2.2 (new)       | Bootstrap signup, the two-concurrent-signups race, and the unique partial index that closes it; plus `GET /api/auth/bootstrap`                                       |
| `tech_stack.md`            | §8, §12          | Email provider added as a deferred item; three verification rows for signup closure and invite-token behaviour                                                      |
| `product_design_system.md` | §3.10            | `Send invite` → **`Create invite link`**; the link state that replaces the modal body; `Re-issue link` row action; invite expiry shown in the `Joined` column        |
| `product_design_system.md` | §3.12            | `/signup` gains its **closed** state; the invite-failure state reduced to one message that does not distinguish expired from already-used                            |
| `product_design_system.md` | §3.15            | States that inviting lives on `/users`, since `/people` is open to managers who cannot invite                                                                        |
| `brand_design_strategy.md` | §6.3, §7.1, §12  | Primary CTA conditional: "Create your account" on a fresh instance, "See the live demo" on a seeded one                                                              |
| `project_structure.md`     | §3.1, §9, §10    | `SignUpPage.jsx` annotated with both states; C4 updated; the last open provisional item closed                                                                      |

**Seven corrections applied to the two proposals as written**, each because the proposal
would otherwise have contradicted something already settled:

1. The copy-link affordance moved from `/people` to **`/users`** — `/people` is the
   manager-visible directory and has no primary action; inviting is admin-only.
2. **`Send invite` renamed**, because nothing is sent and rule 8 binds button labels to
   outcomes.
3. **`Re-issue link` added** — without it, closing the modal makes the link
   unrecoverable and the only route back is deleting the account.
4. **The raw token is barred from list responses**, or every admin page load would ship
   live credentials into the query cache.
5. **SHA-256 specified over bcrypt**, which is already a dependency and would make the
   token lookup impossible; the unique sparse index is what the lookup uses.
6. **The failure state stays in §3.12, and is one state**, not two in §3.13 — §3.13 is
   404/403/500/offline, and separating "expired" from "already used" confirms to a
   stranger that the account exists.
7. **A conditional landing CTA**, because seeding closes signup permanently and
   "Create your account" is repeated at every fold. See the note below.

> **One judgement call, flagged for review.** The conditional CTA was my recommendation,
> not something the decisions specified. `npm run seed` closes `/signup` forever on every
> deployed instance, so the landing page's most-repeated element would have led every
> visitor to "this team is invite-only". The page now reads `GET /api/auth/bootstrap` and
> promotes the demo when signup is shut. If you would rather keep "Create your account"
> unconditional and let it lead to the closed screen, the edits to revert are
> `brand_design_strategy.md` §6.3/§7.1/§12 and `requirments_doc.md` §13.

---

## Pass 1 open flags — now closed

Recorded as raised; both were answered above.

### 1. How an invited person receives their invite link — **closed**

`requirments_doc.md` §11.1 · the admin delivers a one-time link

Inviting creates a `users` document in `invited` status with no `passwordHash`, and the
person completes it on `/invite/:token`. Nothing in the document set says how that link
reaches them, and `tech_stack.md` §1.1 has no mail library — so it is either delivered out
of band by the admin (copy the link, send it however) or the stack gains an email
provider, which is a dependency decision, not a documentation one. **Invite-token fields
were deliberately left unspecified for this reason** — they are now in
`database_schema.md` §1.1. Password reset was dropped for the same missing capability;
the invite flow was kept because `requirments_doc.md` §11 requires it.

### 2. What a self-registered account becomes — **closed**

`requirments_doc.md` §1 · first-run bootstrap creates an admin, then signup shuts

D1 keeps `/signup`, because §1 requires registration. But with one team and no tenancy,
two questions follow that no document answers: **which role** a self-registered account
receives, and **whether registration is open** to anyone who has the URL. The combination
matters — an open form that produced manager accounts would expose every team member's
report to a stranger, which is the exact promise `brand_design_strategy.md` §2.2 makes
the product's permissions keep. Invitation is unaffected: there, an admin picks the role.

---

## Pass 3 — daily updates, leave, ownership transfer

Applied on the project owner's instruction across all eight planning documents, including
`api_specification.md`. Five decisions, from the owner:

- **Daily updates.** Every weekday, everyone posts what they did and any blockers.
  Managers and admins can read them as soon as they are posted — while the week is still
  a Draft — and comment on them. At the end of the week the report is submitted, and the
  reviewing manager adds an **overall comment for the week**.
- **Dashboard one week at a time** (the API interview's I10). Earlier weeks through the
  week picker; the trend chart gets a 4 / 8 / 12-week window; the page-wide date range goes.
- **Ownership transfer.** The owner — the account that set the system up — stays
  protected, and can hand ownership to another admin or manager.
- **Leave.** An On leave toggle per person. Everyone, members included, can see who is
  away. A week on leave shows "On leave", not "Not started".
- **Email change.** "Contact an admin" becomes a `mailto:` link to the owner.

| Document | § | Change |
| --- | --- | --- |
| `requirments_doc.md` | §1 | Roles list gains daily updates, comments, leave |
| `requirments_doc.md` | §2.1, §2.2 (new) | The two layers of a week: daily updates (shared on posting) and the weekly report (private until submitted). Blockers are raised in daily updates |
| `requirments_doc.md` | §3, §4 | Draft visibility rewritten as two layers; overall comment defined as the review comment; comments on days are a second exception to Approved being final; blockers resolvable at every status |
| `requirments_doc.md` | §6 | Dashboard one week at a time; date-range filter removed with the owner's agreement; updates per day; compliance excludes whole-week leave; open blockers include Drafts |
| `requirments_doc.md` | §8–§10 | Profile shows leave; detail and review pages show the days and the overall comment |
| `requirments_doc.md` | §11.2, §11.3 (new) | The owner and ownership transfer; email change via the owner, with an open flag |
| `requirments_doc.md` | §15 (new) | Leave: toggle, who can set it, who sees it, the full-week rule, leave periods |
| `database_schema.md` | §0.1 | Sixth enum, `weekdays`; `on_leave` / `not_started` defined as week states |
| `database_schema.md` | §1.1 | `isBootstrap` → **`isOwner`**; `leave` periods on the user |
| `database_schema.md` | §1.3–§1.6 | `reports.days` (new §1.6) outside `content`; `content.blockers` removed; revisions snapshot `days` without comments; `comment` renamed "overall comment" |
| `database_schema.md` | §3.3, §3.5 | Write sequences for a day update, a comment, leave, and ownership transfer (the one transaction); resolution allowed at every status |
| `database_schema.md` | §5, §5.0 | Draft content still excluded; days included at every status; full-week leave rule; compliance drops `on_leave`; open blockers across all statuses |
| `database_schema.md` | §6, §7.5, §8, §10 | `isOwner` index; new service-enforced rules; seed gains updates, comments, leave, owner; decisions 8–10 |
| `tech_stack.md` | §2.2 | Owner field and transfer transaction |
| `tech_stack.md` | §3.1 | `canAccessReport` opens the week at every status for managers; new `canReadContent` and `canCommentOnDay`; `buildReportScope` loses its draft clause; a teammate's Draft is 200 with content withheld, not 403; a no-draft-content test beside the parity test |
| `tech_stack.md` | §6.3, §6.8, §6.9, §12 | Cache keys for the review desk and daily writes; seed; demo refuses the new writes; verification rows |
| `product_design_system.md` | §0.2 | Daily updates and leave rows |
| `product_design_system.md` | §3.1, §4.11 (new) | Week strip becomes the daily-update control; day panel spec; On leave strip; primary action is today's update; overall comment on an approved week |
| `product_design_system.md` | §3.4, §3.6 | Daily updates block with comments; a manager's view of a teammate's Draft week; section 04 gathers blockers; overall comment in the review panel |
| `product_design_system.md` | §3.7, §7.4 | One week at a time; filter bar without date range; updates column; On leave rows; metric sub-lines; trend window |
| `product_design_system.md` | §3.8, §3.10, §3.11, §3.15 | Leave toggle and chip; Draft history rows open; Owner chip and `Make owner`; email line to the owner; leave switch on Account |
| `product_design_system.md` | §4.1, §4.5, §6.8, §3.14, §13 | Blockers gathered from days; On leave chip; demo disables the new controls; checklist |
| `brand_design_strategy.md` | §1.4, §3.4, §6.2, §7.6, §7.7 | Vocabulary (daily update, overall comment, On leave, owner); positioning against standup bots; "Post daily. Review weekly."; "Private to you" → "Hidden from teammates" |
| `project_structure.md` | §2.1, §2.5, §2.6, §3.1, §7.1 | `weekdays.js`; `dailyUpdates.test.js`; which service owns each new write; new policy functions; new components |
| `development_approach_doc.md` | Verification | End-to-end walkthroughs include daily updates, comments and leave |
| `api_specification.md` | §0, §1.9, §1.10 | Decisions I15–I18; three error codes; `Day` shape; `Report.days`, `overallComment`, `contentSource: "withheld"`; `Me.owner`, `isOwner`, `onLeave` |
| `api_specification.md` | §2 | **New:** R13 (post a day), V5 (comment), U9 (leave), U10 (who is on leave), U11 (transfer). Changed: R5, R6 (`keyBlockerId`), R11, U1, U5, U7, U8, D1, D2, A2 |
| `api_specification.md` | §3–§7 | Status table, access matrix, coverage, tests 1, 4, 6, 7, 12–17, 22–23, 34, 39, 42; M4, M5 applied; O3 resolved; G2 partly resolved; new flag O6 |

**Two earlier wording conflicts fixed on the way**, because the rows being edited carried
them: `database_schema.md` §1.3 now says `lastActivityAt` moves on submit and review only
(the API interview's C10), and that the client can move a Draft's week before its first
submission (C4) — both matching what those documents already said elsewhere.

### Judgement calls made to apply the decisions — please confirm

Your instructions left these open. Each was settled the simplest consistent way and is
written into the documents; say the word and any of them changes.

| # | Call | Where |
| --- | --- | --- |
| J1 | The **overall comment is the review comment** — one per review, written by the manager who approves or sends back. Not a separate thread every manager can add to | req §4 |
| J2 | Daily updates are visible to **managers and admins only**, never to teammates — the same rule as reports | req §2.1 |
| J3 | **Blockers move into the daily updates.** The weekly report's Blockers section lists them and picks the key one; nobody types a blocker twice | req §2, schema §1.6 |
| J4 | Updates are editable while the week is open (Draft or Needs correction), then frozen with the report. Comments can still be added | req §2.1 |
| J5 | No one comments on their own update. Comments can't be edited or deleted. The author can't reply | req §2.1 |
| J6 | Posting the first update of a week starts that week's report | req §2.1 |
| J7 | Leave can be set by the person, a manager or an admin. A week counts as On leave only if leave covers all five days. No booking ahead | req §15 |
| J8 | Ownership goes to an active admin or manager; a manager becomes an admin; the old owner stays an admin | req §11.2 |
| J9 | The Account page shows the owner's address as text beside the `mailto:` link, since the link does nothing without an email app | design §3.11 |

### Still open after this pass

- **The owner can't change an email either** (`requirments_doc.md` §11.3). The new
  `mailto:` sends the request to someone who has no control to act on it.
- **What managers see while a sent-back report is being fixed** — the API interview's I13.
- **Notifications** — none today, which daily comments make more costly (API §7 O6).
- **"All activity"** (G1), **the name "Sections"**, **people who quit and are re-invited**
  (C7), **demo freshness** (C9) and **the dashboard status filter** (O1).

---

## Pass 4 — work lines, projects with plans, optional approval, threads, holidays, a client-side demo

The project owner answered J1–J9 and the open items from pass 3, then settled the
remaining questions in a round of pop-up questions. This pass applies those answers to
every document. The model changed enough that whole sections were rewritten rather than
patched: `requirments_doc.md`, `database_schema.md` and `api_specification.md` are
effectively new documents; the others were edited section by section.

### Decisions applied

| Area | Decision |
| --- | --- |
| **Daily updates** | Required on every expected day (Mon–Fri, minus holidays and leave). Each update is a set of **work lines** — task, task type, what was done, hours — plus optional blockers. Backfill is allowed within the week while it is open |
| **Who sees them** | **Everyone on the team.** Pass 3's J2 (managers only) is reversed |
| **Comments** | The author and any manager or admin, **their own update included**. Teammates only when the author, a manager or an admin **opens the update to team comments**. Comments are **threads with replies**; the writer may edit or delete for **10 minutes**. Pass 3's J5 is reversed |
| **Tasks** | A task runs across days and weeks. Each week, every task worked on needs a **status**; a **note** is optional |
| **The weekly report** | **Built from the days** — tasks, hours and blockers come from the lines. The person adds task statuses and notes, and optionally next week, achievements, notes and links |
| **Approval** | **Optional.** The author may tick "Ask for approval" when submitting. **Submitted can be the final state.** Any manager or admin except the author may approve **any** submitted report, asked or not |
| **Overall comments** | Threads on the week, started by managers and admins, answered by the author. Pass 3's J1 (one review comment only) is replaced |
| **While a report is being fixed** | Managers see the **sent-back version**, not the correction in progress (the API's I13) |
| **Task types** | Seven: **Research & study** added. The chart palette gains a seventh colour |
| **Sections → Projects** | Renamed everywhere. Managers and admins add projects |
| **Project plans** | A start date and a duration in **working days**, optionally planned hours. A **Days \| Hours** toggle; the countdown excludes weekends and holidays; past the end it says "overdue by N days"; managers and admins **extend** a plan, and earlier plans are kept |
| **Dashboard** | One week at a time. The **status filter applies to the team table only**. A **projects table** is added. "Compliance" keeps its name. The activity panel shows the latest eight events; **no "All activity"** |
| **People who leave and return** | **Work periods** (option A). The weeks between count neither as filed nor as missing. Leave stays separate from removal |
| **Email and passwords** | Admins change members' and managers' emails and issue **password reset links**; the owner does the same for admins. No self-service "forgot password", no email provider |
| **Holidays** | **Admins add them by hand.** No calendar library or API. A holiday is not an expected day for anyone |
| **Demo** | **Real screens, fake data**, reached from the landing page: three perspectives (Team member, Manager, Admin), everything works, **a refresh resets it**. Runs entirely in the browser — no database, no server, no demo account |
| **"New" markers** | On comments and replies, on a change to your own report's status, and — for managers — on approval requests. No notification list, no email |
| **Removed** | Task priority, planned % vs actual %, planned and spent hours per task, output |

### Changes by document

| Document | Sections | Change |
| --- | --- | --- |
| `requirments_doc.md` | whole document | **Rewritten.** §2 in two layers (§2.1 daily updates, §2.2 the weekly report, §2.3 seven task types); §3 statuses; §4 optional approval, overall comments, the sent-back version rule; §6 dashboard; §7 Projects; §11 users (§11.1 links, §11.2 owner, §11.3 email and password, §11.4 work periods); §13 landing; §14 demo; §15 leave; **new §16 holidays, §17 "new" markers** |
| `database_schema.md` | whole document | **Rewritten.** Seven collections — `users`, `projects`, `tasks`, `reports`, `revisions`, `holidays`, `seenMarks`. Work periods, leave periods, one link token for invites and resets, project plans and plan history, work lines, threads, `approvalRequested`, `interactionAt`. Write orders §3.3; expected filers §5.0 with `holiday_week` and `on_leave`; project progress §5.3; "new" markers §5.4; decisions 1–18 |
| `api_specification.md` | whole document | **Rewritten.** Decisions I1–I21. New resources: projects with plans (P1–P5), tasks (T1), the team updates feed (R12), comment threads (C1–C5), holidays (HD1–HD4), the projects table (D8), "new" markers (N1, R13). Email change and reset links (U12, U13); `/auth/links/*` serve both link purposes. A single `WeekView` for every single-week read. Every demo endpoint, flag and error code removed |
| `tech_stack.md` | §2, §2.1, §3, §3.1, §4, §6.2, §6.3, §6.8, §6.9, §7.1, §8, §12 | `tokenVersion` triggers; link tokens for invites and resets; `ok()` takes a status (M9); §3.1 rewritten around three layers of visibility and the new policy functions; §4's index table points at the schema; **the 401 interceptor conditions (M1)**; query keys and invalidation, the week key now per person; seed covers seven collections; **§6.9 rewritten — the demo is a custom Axios adapter over an in-memory store**; rate limiting extended to password change and links (M6) |
| `product_design_system.md` | §0.2–§0.4, §1, §3.1–§3.17, §4, §6.23–§6.25, §7, §9 | Named extension `--c7` (needs sign-off). This week with the day panel and "My projects"; the weekly form rebuilt from the days; review desk "Asked for approval" / "All submitted"; review page with Approve, Send back and Comment only; dashboard with the projects table; Projects page with plans; Users with email and reset links; **new §3.16 Team updates and §3.17 Holidays**; `/reset/:token`; the demo chooser; **new components §6.23 comment thread, §6.24 "new" marker, §6.25 project progress** |
| `project_structure.md` | §0.2, §1, §2, §3, §4, §5, §6, §7.1, §8, §9, §10 | Seven models and three shared subdocument schemas; `submitRules.js` beside `reportPolicy.js`; routers, controllers and services for projects, tasks, holidays and markers, and `calendarService`; the mounts from the API spec (M2); new pages (`/updates`, `/projects`, `/holidays`, `/reset/:token`); `comment/`, `updates/`, `project/` component folders; **new §3.4, the `demo/` folder** and its coverage test; five enums; §9 C3, C4 and C7 annotated with what pass 4 changed |
| `brand_design_strategy.md` | §1.4, §3.5, §6.3, §7.2, §7.3, §7.7–§7.10, §10, §12 | Vocabulary: project, task, send back, ask for approval, comment and reply, holiday, new. **Seventh chart colour** (Research & study, needs sign-off). Hero subhead no longer promises an approval step. Team-side chip "Hidden from teammates" → **"Reports reach managers only"**, since daily updates are now shared. Bento "Sections" → "Projects"; privacy guard and FAQ reworded; the demo is hard-coded, not seeded |
| `development_approach_doc.md` | End-to-end verification | Walkthroughs rewritten for work lines, team comments, the 10-minute window, optional approval, project plans, holidays, email and reset links, re-hiring, the demo with the API stopped, and "new" markers |

### Pass 3's open items — now closed

| Item | Closed by |
| --- | --- |
| The owner can't change an email | Admins change emails; the owner changes admins' and their own (req §11.3) |
| What managers see while a report is being fixed | The sent-back version (req §4, API I13) |
| Notifications | "New" markers, derived and never stored (req §17) |
| "All activity" | Removed; the feed shows the latest eight |
| The name "Sections" | Projects |
| People who quit and are re-invited | Work periods |
| Demo freshness | The demo is client-side with relative dates; nothing can go stale |
| The dashboard status filter | The team table only |

### Judgement calls made to apply the decisions — please confirm

Your answers left these open. Each was settled the simplest consistent way and is written
into the documents; say the word and any of them changes.

| # | Call | Where |
| --- | --- | --- |
| K1 | The review desk opens on **"Asked for approval"**, with an **"All submitted"** switch; it has no week picker | design §3.5, API V3 |
| K2 | Members see progress for their own projects in a **"My projects"** panel on This week | design §3.1 |
| K3 | **An invited person has no name until they accept** — the invite form asks for email, role and projects; the accept screen asks for the name | schema decision 16 |
| K4 | The activity panel is **recent, not week-scoped**: the latest eight events whatever week is picked | req §6, API D6 |
| K5 | Research & study is **ochre**, `#9A7B2F` light / `#D1AE63` dark — **needs sign-off** | brand §3.5, design §0.3 |
| K6 | Reset links last **24 hours**; invite links stay at 7 days | req §11.1 |
| K7 | A comment **with replies** can be edited in its window but not deleted; a **send-back** comment can never be deleted | req §2.1, schema §1.9 |
| K8 | **Teammates can't resolve blockers** — they can see one, not declare it cleared | req §2.1, policy `canResolveBlocker` |
| K9 | **Week comments are started only by managers and admins**; the author replies in them | req §4 |
| K10 | The day panel's **Save** keeps text without posting it; **Post** makes it visible to the team | design §4.11 |
| K11 | A week's report is created **only** by its first daily update, and never moves to another week — so the old "move a Draft's week" question no longer exists | schema §1.4, API I3 |
| K12 | A task's **project is fixed** once any line uses it | schema §1.3 |
| K13 | Holidays can be **weekdays only**; a week that is all holidays is expected of nobody (`holiday_week`) | req §16, schema §5.0 |
| K14 | The Account page's email line differs by role: members and managers are pointed to the owner or an admin; admins to the owner; the owner changes their own on the Users page | design §3.11 |
| K15 | Approving may carry an **optional comment**, which is posted as a week thread marked "approved" | API V1 |
| K16 | The team updates feed lists people **by name, the viewer first**, including those who haven't posted, as one-line rows | design §3.16, API R12 |
| K17 | The sidebar's "new" dots look back **12 weeks** of your own reports; older weeks are still marked in their lists | API N1, O7 |

**Superseded from pass 3:** J1 (the overall comment was the single review comment), J2
(updates visible to managers only) and J5 (no self-comments, no editing, no author
replies) — each replaced by the decisions above. J3, J4 and J6–J9 stand.

### Still open after this pass

- **Sign-off on `--c7`** (K5) and on the three dark chart colours already marked in
  `product_design_system.md` §0.3.
- **Two-tab autosave is last-write-wins** (API O2) — accepted, recorded.
- **`frontend_architecture.md`** was not written in this pass; it follows as pass 5, below.
- **The two client-facing pages** — the Client Guide and the Decision Guide — describe the
  product as it was before this pass. They were not updated.

### Verification — pass 4

Grepped all eight planning documents. The only remaining hits are deliberate records of
superseded decisions: `isDemo` · `DEMO_READ_ONLY` · `canPerformDemoWrite` ·
`blockDemoWrites` · `canAccessReport` · `inviteTokenHash` · `REPORT_EXISTS` ·
`WEEK_LOCKED` · `/auth/invites` · `taskPriority` · `request-changes` · "section" as the
work entity · `joinedAt` / `removedAt` as stored fields (the API still serves both as
values derived from work periods) · "All activity" · "Hidden from teammates".

`/reset/` was listed in pass 1's verification as having zero hits. It is back
deliberately, as the admin-issued reset link.

Confirmed positively:

- The API's mounts (§1.1) and `project_structure.md` §2.4 are the same twelve lines.
- Every page in `project_structure.md` §3.1 has its route in the design system,
  including `/updates`, `/projects`, `/holidays`, `/reset/:token` and `/demo`.
- The five enums in `database_schema.md` §0.1 match `project_structure.md` §7.1 and its
  `constants/` tree.
- The policy functions in `tech_stack.md` §3.1, `project_structure.md` §2.6 and the API's
  §6.1 tests are the same set.
- Amendments M1–M9 in `api_specification.md` §7.2 are all applied.

---

## Verification — pass 1

Grepped across `docs/` with zero remaining hits outside deliberate records of superseded
decisions: `Create my workspace` · `workspace` as a product entity · `"late"` as a status
or sub-state · `#8A5A17` · `/forgot` · `/reset/` · `blockDemoWrites` ·
`tailwind.config.js` as the live mechanism · `/login` as a client route · `corr-br` ·
"try/catch in every controller" · "may have been removed" · "follows the account" ·
"saved locally and will sync".

Confirmed positively:

- The `@theme` block carries colors, **spacing scale**, **type scale**, radii, fonts and
  the `xs` breakpoint, every color mapping to `var(--token)`.
- `/signin` is the only sign-in route in any document; `/auth/login` remains the API
  endpoint, which is a different thing.
- `canAccessReport` and `buildReportScope` both carry the draft condition, so the parity
  test in `tech_stack.md` §3.1 covers it.
- `project_structure.md` §9 marks C1–C7 resolved, C6 by D4.
- Every route in `project_structure.md` §3.1 has a page file and every page has a route;
  the design system's `**Route:**` lines and that tree now agree, including `/people`,
  `/people/:userId/reports/:week` and the `/` split.

---

## Pass 5 — `frontend_architecture.md`

The Frontend Engineer document, written against the pass-4 set. It owns state ownership,
the data layer (services, query keys, hooks, invalidation, error handling), forms and
autosave, the shell, component contracts, per-page data flow, charts and the client side of
the demo. Sixteen judgement calls (FA1–FA16) and three gaps in other documents (G1–G3) are
listed in its §14.

**Amendments applied to other documents**

| Document | Change |
| --- | --- |
| `tech_stack.md` | §6.2 `normalizeError` returns an `ApiError`; §6.4 `ProtectedRoute` renders the 403 state instead of redirecting (design §3.13 said so, this document said otherwise); **§6.9 the demo adapter now throws for a status ≥ 400** — as written it returned a response object for every status, so a demo error would have resolved as success and no page's error path would have run; §7.2 `vercel.json` gains `Referrer-Policy: no-referrer`, because the invite and reset URLs are credentials |
| `project_structure.md` | §3.1 tree gains the routes, layout, `ui/`, shell, hook, context and `lib/` files the architecture needs; §0.3 and §10 mark the document as written |
| `product_design_system.md` | §12 step 12 and a §13 checklist line still described the pass-3 read-only demo with server-side refusal; rewritten for the client-side demo |

**Open items it records** (none blocks the build): the week-comment permissions have no
server flag (G1); the on-leave list can't be asked for a past week (G2); the person filters
cannot be limited to people on the team during the week shown (G3); the "starting up"
state has no design spec (FA13); and the demo's refresh behaviour (FA1) and the landing
page's default call to action (FA14) need your confirmation.

---

## Pass 6 — cross-document verification

Before the build files (`CLAUDE.md`, `MASTER_PROMPT.md`) were written, every document was
checked against the others. Mechanical checks first, then a read of the high-risk areas.

**Mechanical checks, all clean after the fixes below**

| Check | Result |
| --- | --- |
| Every `doc.md §N.M` and shorthand (`design §…`, `req §…`) reference resolves to a real heading | 11 broken, all fixed (see below) |
| Every endpoint id (A1–N1) in other documents exists in the API spec, and every endpoint has a client service function | clean |
| All 33 API error codes appear in the frontend document's error table (except `ROUTE_NOT_FOUND`, which the client never meets) | clean |
| Policy function names are the same set in `tech_stack.md`, `project_structure.md`, `api_specification.md` | clean |
| Routes: design system, `project_structure.md`, `frontend_architecture.md` | clean |
| Numeric rules — 10-minute window, 24 h reset, 7 d invite, 5 d JWT, 1200 ms autosave, `limit` 20/50/100 | clean |
| Code fences balanced, table column counts consistent, in every document | clean |
| Stale terms (`isDemo`, `canAccessReport`, `DEMO_READ_ONLY`, section-as-project, task priority, "request changes") | only deliberate history notes remain |

**Contradictions found and fixed**

| # | Where | Problem | Fix |
| --- | --- | --- | --- |
| V1 | design §3.2 vs §11 rule 3 | The weekly form's top bar carried `Save` and `Submit` *and* the sticky bar did — two primary actions | Top bar is back-link and title only; actions live in the sticky bar |
| V2 | design §6.5 | Said the form's week picker is "disabled once submitted"; the form has no picker | Rewritten |
| V3 | design §0.2 | "Two shells… `isAdmin` is a flag on a Manager account" contradicted the three-value `role` | Rewritten to the single filtered navigation |
| V4 | design §6.17 | Empty-state example still had "Start week 38 report" and "save a draft" — there is no start step | Matches the This-week empty state |
| V5 | schema / design | The **Holiday week** state (schema §5.0) had no chip, no requirement line and no dashboard row | Chip in design §6.8, row rule in §3.7, requirement §6 and §16 |
| V6 | design §3.8 vs API U7 | Profile history was to show On-leave weeks as rows; U7 returns reports only | **Reversed at your request:** the profile lists every week on the team, away weeks as `Not started` / `On leave` / `Holiday week` rows. API U7, schema §5.0b, design §3.8 and the frontend doc follow |
| V7 | schema §3.5 / design §3.4 vs API | `Carried over` blocker label is derived, but the API's `Day.blockers` had no field to carry it | `carriedOver` restored on the API blocker shape, computed on read |
| V8 | API `Me.joinedAt` vs U1 | Same name, two meanings (current period vs first) | Both mean the first work period |
| V9 | API U11 | `authorize('manager')` on an owner-only action | `authorize('admin')`; matrix updated |
| V10 | `tech_stack.md` | Server uses date-fns (`utils/weeks.js`, `calendarService`) but it was not a server dependency | Added to the backend table and `server/package.json` |
| V11 | `tech_stack.md` | Radix list had `select` and `accordion` (both unused by design) and lacked `switch` (new `Switch`) | List and `client/package.json` corrected |
| V12 | `tech_stack.md` §12 | Revisions index named `{ report, createdAt }`; schema has `{ report, revisionNumber }` | Corrected |
| V13 | `tech_stack.md` §3.1 | `canCommentOnWeek` did not exclude the author, as the API does | Aligned |
| V14 | requirements §9 | Report detail "by the author and managers" ignored teammates reading daily updates | Aligned with §2.1 and §4 |
| V15 | brand §7.3, §6.4 | Showcase metric said "Reports submitted"; the dashboard says "Filed this week". A cross-reference pointed at requirements §8 (now Profile) | Aligned |
| V16 | `development_approach_doc.md` | "Local state for everything else" vs three new small contexts | Sentence extended |
| V17 | design, API | Example dates were 2025's weekdays (W38 as 15–19 Sep, "Wed 17 Sep 2026") against 2026 week keys | Re-dated to 2026 (W38 = 14–18 Sep) |
| V18 | several | `§10.1`, `§10.16`, `design §11.11` style references pointed at numbered *list items*, not headings | Rewritten as "§10, decision 16", "§11 rule 11" |
| V19 | design §3.10 | Invited people have no name (schema decision 16) but the Users row assumed one | Email takes the name's place |
| V20 | design §3.14 | Did not say the demo lives under `/demo` | Added |

`conflicts_reconciliation.md` is the pass-1 audit and was left as written: it is a
historical record and now carries a banner saying so.

**Not verified.** Nothing has been built, so every statement is a document-against-
document check, not a test. The landing-page reference in
`landing-reference/index.html` was not compared with the brand document.

---

## Pass 7 — the landing theme, and away weeks on the profile

**Two visual systems.** The built landing page (`landing-reference/index.html`) is
green with a sand accent, set in Bricolage Grotesque, with pill shapes — none of which is
the product's look. Recorded in `brand_design_strategy.md` §6.0: the landing page keeps its
own theme, scoped to `.landing` and loaded only by the landing route; **the app and the demo
keep the original cobalt, neutrals and Chivo / Instrument Sans / JetBrains Mono**. The
product mock-ups inside the landing page already use the product palette. v11 is the
authority for the landing page's layout, section order, copy and motion; the brand
document's honesty, vocabulary and permission rules still bind it. Carried into
`requirments_doc.md` §13, `product_design_system.md` (preamble, §9.2), `project_structure.md`
(`styles/landing.css`, `useLandingMotion`) and `frontend_architecture.md` §9.16.

**Comparison with the brand document** found, and the document now records: v11 replaces
the §7 section order and headline; it breaks the §3–§5 colour, type and zero-radius rules
(now landing-exempt); its only call to action is the demo, so the "Create your account"
swap still has to be added; and the brand checklist's "two dark bands" and "date range"
items were obsolete and are removed or reworded.

**Away weeks (V6 reversed).** The person profile lists every week on the team with
`Not started` / `On leave` / `Holiday week` rows. API U7 returns `ReportRow` or `WeekRow`
(`_id: null`), `database_schema.md` §5.0b describes the query, and `requirments_doc.md` §8
and the frontend doc follow.

