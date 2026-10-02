# Database Schema

MongoDB (Atlas M0) · Mongoose 8 · ESM · JavaScript.

Modelled for how the data is queried, not for third normal form. Every decision below
was settled in the schema interview or a later reconciliation pass; anything unresolved
is in §9 or §10 rather than silently chosen.

---

## 0. Conventions

| Convention  | Value                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------- |
| Collections | plural, lowercase — `users`, `projects`, `tasks`, `reports`, `revisions`, `holidays`, `seenMarks` |
| Fields      | camelCase                                                                                      |
| Enum values | lowercase snake — `needs_correction`, `not_started`, `research_study`                          |
| `_id`       | passes through untouched as `_id`; **no** `toJSON` mapping to `id`                             |
| Timestamps  | `timestamps: true` on every schema (`tech_stack.md` §4)                                        |
| Reads       | `.lean()` on every read-only query (`tech_stack.md` §4)                                        |
| Plugins     | none; pagination via the own `paginate()` helper                                               |

**Why `_id` is not remapped.** `.lean()` bypasses `toJSON` transforms. A transform would
apply on hydrated writes and silently not apply on every dashboard and list read, so the
same endpoint would return `id` sometimes and `_id` other times.

The only `toJSON` transform is the User schema's, stripping `passwordHash`,
`linkTokenHash` and `tokenVersion` — defence in depth behind `.select()`, not a
field-shape change.

**Enum values are storage keys, not display text.** The labels ("Not started", "Research &
study", "Needs correction") are rendered from a label map in `client/src/lib/constants.js`.
Storing display strings would put text in the database that cannot change without a
migration, and a value containing a space and a capital letter ends up in URL query
params.

These enum sets are the shared vocabulary covered by the client/server parity test:
`server/src/constants/` and `client/src/lib/constants.js` must declare exactly these
strings, and the test asserts the sets match.

### 0.1 Vocabulary

Five enums, five files, one concept each — the naming rule in `project_structure.md`
§4.1. All five are mirrored in `client/src/lib/constants.js` and asserted by the parity
test (§7.1 there).

```js
// server/src/constants/reportStatus.js
["draft", "submitted", "needs_correction", "approved"];

// server/src/constants/roles.js   — admin ⊃ manager, via the authorize() hierarchy
["member", "manager", "admin"];

// server/src/constants/taskTypes.js    — requirments_doc.md §2.3, the seven hour categories
["development", "testing", "meetings", "documentation", "review", "research_study", "other"];

// server/src/constants/taskStatus.js   — a task's status in a week's report
["not_started", "in_progress", "done", "carried_over"];

// server/src/constants/weekdays.js     — the daily-update days
["mon", "tue", "wed", "thu", "fri"];
```

`taskPriority` is gone: tasks no longer carry a priority (`requirments_doc.md` §2.2).

`weekdays` is stored as a key rather than a date because a day always belongs to the
report's own week: `weekStart` plus the day's offset gives the date, and a key cannot
point at a Saturday or at another week by mistake.

`not_started`, `on_leave` and `holiday_week` are **week states**, not report statuses.
They are derived for a person and a week that have no report to review (§5.0), are never
stored, and are deliberately absent from `reportStatus`.

### 0.2 Week identity and working days

`tech_stack.md` §4: an ISO week key string plus resolved dates, never derived from a
locale-dependent function.

```js
weekKey: "2026-W38"; // String, grouping key and unique-index component
weekStart: Date; // Monday   — date-fns startOfISOWeek
weekEnd: Date; // Friday   — Mon–Fri model
```

**A working day** is a Monday to Friday that is not in `holidays` (§1.8). For one person,
their **expected days** in a week are its working days on which they were on the team
(`workPeriods`, §1.1) and not on leave (`leave`, §1.1). Every rule about daily updates,
submission and compliance is stated in terms of expected days, derived at read time from
those three sources — nothing about them is stored on the report.

---

## 1. Collections

### 1.1 `users`

| Field                | Type                    | Req | Default    | Notes                                                                                   |
| -------------------- | ----------------------- | --- | ---------- | --------------------------------------------------------------------------------------- |
| `name`               | String                  | yes | —          | trimmed; avatars are initials derived from this, no image field. Empty while `invited` (§10.16) |
| `email`              | String                  | yes | —          | lowercased, trimmed, globally unique. Changed only by an admin or the owner (`requirments_doc.md` §11.3) |
| `passwordHash`       | String                  | no  | —          | `select: false`; **absent** while `status: 'invited'`                                   |
| `role`               | String                  | yes | `'member'` | enum `roles`                                                                            |
| `projects`           | [ObjectId → `projects`] | no  | `[]`       | multikey; narrows the project list when starting a new task, nothing else               |
| `status`             | String                  | yes | `'active'` | enum `invited · active · removed`                                                       |
| `workPeriods`        | [Subdocument]           | no  | `[]`       | `{ from, to }`; `to: null` on the open period. The person's time on the team (§10.1)    |
| `linkTokenHash`      | String                  | no  | —          | `select: false`; SHA-256 of a one-time invite or reset token                            |
| `linkTokenPurpose`   | String                  | no  | —          | enum `invite · reset`                                                                   |
| `linkTokenExpiresAt` | Date                    | no  | —          | 7 days for an invite, 24 hours for a reset; cleared with the hash when used             |
| `isOwner`            | Boolean                 | no  | —          | `true` on exactly one account: set by bootstrap signup, moved only by an ownership transfer |
| `leave`              | [Subdocument]           | no  | `[]`       | `{ from, to, setBy }` periods; on leave while the last has `to: null`                   |
| `tokenVersion`       | Number                  | yes | `0`        | `$inc` on removal, role change, email change and password change kills live JWTs        |

Server sets: `status`, `workPeriods`, the three `linkToken*` fields, `isOwner`, `leave`,
`tokenVersion`, timestamps. Client supplies: `name`, `email`, `role`, `projects`, and a
password (never the hash). The leave toggle sends a boolean; the server turns it into a
period.

**Work periods replace `joinedAt` and `removedAt`** (§10.1). A single pair of dates can
describe only one stay on the team; a person who leaves and is re-hired has two. Accepting
an invite opens a period `{ from: now, to: null }`; removal sets `to: now` on it;
accepting a re-invite opens a second. "Joined" is the first period's `from` and "removed"
is the last closed period's `to` while `status: 'removed'` — both derived, and the API
still serves them under those names for the profile header.

**`isOwner` marks the owner, and closes the bootstrap race.** The first account is created
with `isOwner: true`. A unique partial index on `{ isOwner: true }` means two simultaneous
signups against an empty database cannot both succeed, and a transfer can never produce two
owners. It was first named `isBootstrap`; once ownership can be handed on, "signed up
first" and "owns it now" stop being the same person.

**Leave is a list of periods, not a flag.** A boolean `onLeave` would answer "is she away
today?" and nothing else — the dashboard for a past week would then ask today's flag
about last month. Switching the toggle on appends `{ from: now, to: null, setBy }`;
switching it off sets `to: now` on that open period. "On leave now" is derived as "the
last period is open". Periods never overlap, because a new one opens only when none is
open.

**One link token, two purposes.** An invite and a password reset are the same mechanism —
a one-time URL the admin delivers by hand (`requirments_doc.md` §11.1) — so they share
fields. A person has at most one live link: issuing a new one overwrites the hash, which
kills the previous link by construction.

- **SHA-256, not bcrypt** — and `bcryptjs` being already installed is precisely why this
  needs saying. `/invite/:token` and `/reset/:token` have nothing to look the row up by
  except the token, so the digest must be deterministic; a salted hash would make the
  lookup impossible. A fast hash is correct here anyway: the token is 256 bits of
  `crypto.randomBytes`, not a human-chosen password.
- **`select: false`, and the raw value appears in one response only** — the one that
  issues it. It is never in `GET /users`, or every admin page load would ship live
  credentials into the browser and into the query cache.
- **Using a link clears all three fields.** Single use is the absence of a hash.
- An invite is issued only to an `invited` person and a reset only to an `active` one;
  the purpose field stops a reset link being used to complete an invite, or the reverse.

**Login rejects any `status` other than `active`.** The `{ email: 1 }` unique index stays
global, so a removed person's address is not reusable — see §10.1.

### 1.2 `projects`

The entity earlier documents called a **section**; renamed by the project owner
(`requirments_doc.md` §7).

| Field         | Type          | Req | Default    | Notes                                                          |
| ------------- | ------------- | --- | ---------- | -------------------------------------------------------------- |
| `name`        | String        | yes | —          | trimmed; **globally unique, case-insensitive** (§10.4)         |
| `description` | String        | no  | `''`       | one line                                                       |
| `status`      | String        | yes | `'active'` | enum `active · inactive`                                       |
| `plan`        | Subdocument   | no  | `null`     | `{ startDate, plannedDays, plannedHours }` — see below         |
| `planHistory` | [Subdocument] | no  | `[]`       | `{ plannedDays, plannedHours, startDate, changedAt, changedBy }` — every earlier plan, append-only |

**The plan.**

- `startDate` — a date (UTC midnight). The first working day counted.
- `plannedDays` — a whole number of **working days** (§0.2).
- `plannedHours` — optional, a number of hours, or `null`.

Setting or extending a plan pushes the plan being replaced onto `planHistory`, so "extended
from 20 to 25 days on 2 Oct, by Nadia F." can always be shown.

**Progress is derived, never stored** (§5.3). Days used = working days from `startDate` to
today, inclusive, excluding holidays; days left = `plannedDays − days used`, and a
negative value is shown as "overdue by N days". Hours logged = the sum of `hours` on every
work line naming the project. **There is no conversion between days and hours**
(`requirments_doc.md` §7): each view compares like with like, and a project with no
`plannedHours` shows hours logged with nothing to compare against.

**Deleting a project sets `status: 'inactive'`.** It leaves every project picker and the
default management list. Tasks and work lines that reference it are never rewritten, so a
historical week always resolves the project's name. There is no restore UI.

**An inactive project keeps its name reserved.** The unique index ignores `status`, so
"Client A" cannot be created again after "Client A" is deactivated — two different
projects under one label in the workload chart would be unreadable.

### 1.3 `tasks`

A piece of work that belongs to one person and one project, and can run across days and
weeks (`requirments_doc.md` §2.1). Work lines point at it; its hours are theirs.

| Field     | Type                  | Req | Default | Notes                                                                    |
| --------- | --------------------- | --- | ------- | ------------------------------------------------------------------------ |
| `owner`   | ObjectId → `users`    | yes | —       | immutable                                                                |
| `name`    | String                | yes | —       | trimmed, 1–200 chars                                                     |
| `project` | ObjectId → `projects` | yes | —       | immutable once any line names the task                                   |
| `doneAt`  | Date                  | no  | `null`  | set when a **submitted** report marks the task `done`; cleared if a later submission reverses it |

**Why a collection, not an array on the report.** A task outlives a week: "Checkout
redesign" can take four weeks, and every week's lines must add to the same task.
Embedding it in one report would give it one week's identity. Tasks are small, always
queried by owner, and never read without their owner's context.

**The task picker** offers the person's tasks with `doneAt: null`, plus "start a new task".
Starting one inserts a task in the same write as the line that names it (§3.3).

**Status is not stored here.** A task's status belongs to a week — it was In progress in
week 38 and Done in week 39 — and lives in each report's `content.tasks` (§1.6). `doneAt`
is the one denormalised fact, kept only so the picker can hide finished work without
reading every report.

A task's `project` is fixed once work is logged against it: moving it would silently
move that work's hours between projects in every past week.

### 1.4 `reports`

One document per person per week, enforced by a unique index.

| Field                | Type                  | Req | Default   | Notes                                                                       |
| -------------------- | --------------------- | --- | --------- | --------------------------------------------------------------------------- |
| `author`             | ObjectId → `users`    | yes | —         | immutable after creation                                                    |
| `weekKey`            | String                | yes | —         | `'2026-W38'`; immutable after creation                                      |
| `weekStart`          | Date                  | yes | —         | Monday                                                                      |
| `weekEnd`            | Date                  | yes | —         | Friday                                                                      |
| `status`             | String                | yes | `'draft'` | enum `reportStatus`; server-set only                                        |
| `approvalRequested`  | Boolean               | yes | `false`   | set by the author on each submission (§3.3)                                 |
| `content`            | Subdocument           | yes | `{}`      | §1.6 — the end-of-week additions, **private to the author until submitted** |
| `days`               | [Subdocument]         | no  | `[]`      | §1.7 — the daily updates, **visible to the whole team** once posted         |
| `blockerResolutions` | [Subdocument]         | no  | `[]`      | `{ blockerId, resolvedAt, resolvedBy }` — outside `content` and `days`, §3.5 |
| `weekComments`       | [Thread]              | no  | `[]`      | §1.9 — overall comments on the week; managers and the author only           |
| `revisionNumber`     | Number                | yes | `0`       | count of submissions; `$inc` assigns the next revision                      |
| `submittedAt`        | Date                  | no  | —         | most recent submission                                                      |
| `lastActivityAt`     | Date                  | no  | —         | set on submit and review only — never on a daily update or an edit          |
| `interactionAt`      | Date                  | no  | —         | set on every comment, reply and status change; drives "new" markers (§1.10) |
| `latestComment`      | Subdocument           | no  | `null`    | `{ text, author, revisionNumber, createdAt }` — the send-back comment      |

Server sets everything except `content`, and each day's lines, blockers and team-comment
switch, which the author supplies (the switch may also be set by a manager or admin).

**The report is created by its author's first daily update of the week**
(`requirments_doc.md` §2.1). There is no separate "start" step and no way to create an
empty report, so the `{ author, weekKey }` unique index is the only rule needed to
guarantee one report per person per week. **The week never changes** after creation: the
days inside the report are that week's days, and re-pointing the report would mis-date
every one of them.

**`lastActivityAt` is not `updatedAt`.** Mongoose touches `updatedAt` on any write,
including autosave and every daily update, and the activity feed means something
narrower. `updatedAt` is what "Last saved" reads.

**`latestComment` is denormalised** so the author's correction panel renders without
touching `revisions`. Written when the report is sent back, and cleared on approval and
on resubmit — the correction panel belongs to Needs correction only. The authoritative
record is the revision it was written on, and the same text is also a thread in
`weekComments` (§3.2).

### 1.5 `revisions`

Immutable content. Written once on submission, then amended exactly once by a review
outcome.

| Field               | Type                 | Req | Default | Notes                                                                          |
| ------------------- | -------------------- | --- | ------- | ------------------------------------------------------------------------------ |
| `report`            | ObjectId → `reports` | yes | —       |                                                                                |
| `revisionNumber`    | Number               | yes | —       | 1-based, per report                                                            |
| `content`           | Subdocument          | yes | —       | full snapshot, §1.6 shape verbatim                                             |
| `days`              | [Subdocument]        | yes | `[]`    | snapshot of the days as submitted — lines, blockers and key flag, **without comments** |
| `approvalRequested` | Boolean              | yes | `false` | whether this submission asked for approval                                     |
| `submittedAt`       | Date                 | yes | —       | when it happened, never backfilled                                             |
| `submittedBy`       | ObjectId → `users`   | yes | —       | the author at submission time                                                  |
| `action`            | String               | no  | `null`  | enum `approved · changes_requested`                                            |
| `comment`           | String               | no  | —       | the review's comment; required with `changes_requested`, ≥ 10 chars           |
| `reviewedBy`        | ObjectId → `users`   | no  | —       |                                                                                |
| `reviewedAt`        | Date                 | no  | —       |                                                                                |

The snapshot is never edited after creation. The review fields are the one permitted
subsequent write, and they are write-once — a revision is reviewed at most once, because
sending it back ends that revision's life and the next submission creates a new one.
**A revision can also stay unreviewed forever**: approval is optional
(`requirments_doc.md` §4), and a submitted report that asked for nothing and received
nothing is complete.

### 1.6 `content` — the end-of-week additions

Identical shape in `reports.content` and `revisions.content`, declared once as a shared
Mongoose schema. That is what makes the snapshot a verbatim copy rather than a mapping
that can drift.

```js
content: {
  tasks: [{                 // one entry per task named by any of the week's work lines
    task:   ObjectId,       // → tasks
    status: String,         // enum taskStatus; required at submit
    note:   String,         // optional, 0–2000 chars
  }],
  nextWeek:     [String],                           // optional
  achievements: [{ text: String, isKey: Boolean }], // optional; subdocument _id retained
  notes: String,                                    // optional
  links: [{ label: String, url: String }],          // optional
}
```

**The task list follows the lines.** When a daily update names a task the report's
`content.tasks` doesn't yet list, the day-save path adds it; when no line in any day still
names a listed task, the same path removes it. The author never adds or deletes a task
row directly — the rows are the week's work — and only ever sets its `status` and `note`.

**Hours are not in `content` at all.** Every hour lives on a work line (§1.7), grouped at
read time: by task for the tasks table, by task type for "hours by task type", by project
for the workload chart. A stored total would be a second copy of the same numbers with a
second write path, which is how totals drift. The earlier six-field `hours` object and its
±10% reconciliation warning are gone, because there is now only one source of hours.

**Key flags are booleans on the item, not a pointer.** A `keyAchievementId` on the report
would make "exactly one" structural, but it dangles the moment the flagged item is
deleted, and a dangling pointer is indistinguishable from nothing flagged. A boolean
disappears with the item it is attached to. "At most one `isKey: true`" is enforced by a
Mongoose array validator on both the Report and the Revision schema, and by normalisation
in the service. The same rule applies to the key blocker, whose flag lives on the blocker
inside `days` and is counted across all five days.

### 1.7 `days` — the daily updates

`requirments_doc.md` §2.1. Up to five entries per report, one per weekday, embedded on the
report and outside `content`.

```js
days: [{
  weekday: String,          // enum weekdays — unique within the array
  lines: [{                 // at least 1; the work done
    task:     ObjectId,     // → tasks
    project:  ObjectId,     // → projects; copied from the task when the line is written
    taskType: String,       // enum taskTypes
    text:     String,       // 1–500 chars, required
    hours:    Number,       // > 0, step 0.25; no daily maximum
  }],
  blockers: [{              // 0–10; subdocument _id retained — blockerResolutions reference it
    text:  String,          // 1–500 chars
    isKey: Boolean,         // the week's key issue; at most one true across every day
  }],
  openToTeam: Boolean,      // teammates may comment while true; default false
  postedAt:  Date,
  editedAt:  Date,          // null if never edited
  comments:  [Thread],      // §1.9
}]
```

**Why outside `content`.** `content` is private to the author until submission; a daily
update is shared with the whole team the moment it is posted. Keeping them in different
fields lets each rule be one check on one field (`tech_stack.md` §3.1): `days` are served
to anyone on the team, `content` only when `canReadContent` allows it.

**Why embedded, not a collection.** Five entries at most, always read with their week,
small. Comments grow with human attention rather than without bound.

**`project` is copied onto the line.** It always equals the task's project, which is fixed
once a line names the task (§1.3); copying it lets the workload chart and the project
progress group lines by project without a `$lookup` to `tasks` on every dashboard load.

**Blocker subdocuments keep their `_id`**, because `blockerResolutions` references it. A
day is saved whole, so the client must round-trip the `_id` of every unchanged blocker;
the service prunes resolutions whose `blockerId` no longer appears in any day, so a
dropped id makes resolutions vanish visibly rather than silently.

**Editable while the week is open.** A day can be written while the report is `draft` or
`needs_correction`, for today or an earlier weekday of that week, and only for one of the
author's **expected days** (§0.2) — not a holiday, not a day on leave. Once the report is
`submitted` or `approved` the days are frozen with it; comments, replies, resolutions and
the team-comment switch still work.

### 1.8 `holidays`

| Field       | Type               | Req | Notes                                                      |
| ----------- | ------------------ | --- | ---------------------------------------------------------- |
| `date`      | Date               | yes | UTC midnight; **unique**; must be a Monday to Friday       |
| `name`      | String             | yes | 1–100 chars — "Vesak Full Moon Poya Day"                   |
| `createdBy` | ObjectId → `users` | yes | an admin                                                   |

Managed by admins only (`requirments_doc.md` §16). No holiday library or feed: the team's
admin types them in, which also covers the one-off holidays a government declares at
short notice.

**Adding or removing a holiday changes no stored document.** Every rule that depends on
holidays — expected days, submission, compliance, project days used — derives from this
collection at read time, so a holiday added in October correctly changes September's
figures, and removing one restores them. The only thing it cannot undo is a report
already submitted without an update for a day that later became a holiday — which needs
no undoing.

### 1.9 Threads — comments and replies

One shared subdocument schema, used for daily-update comments (`days[].comments`) and for
overall comments on the week (`reports.weekComments`).

```js
Thread: {
  author:    ObjectId,   // → users
  text:      String,     // 1–2000 chars
  createdAt: Date,
  editedAt:  Date,       // null unless edited
  replies: [{            // the back-and-forth
    author: ObjectId, text: String, createdAt: Date, editedAt: Date,
  }],
  // week comments only:
  revisionNumber: Number,  // the version the comment was written on
  kind: String,            // enum comment · approval · send_back
}
```

**The 10-minute rule** (`requirments_doc.md` §2.1). The writer of a comment or reply may
edit or delete it until 10 minutes after `createdAt`; after that it is permanent. Enforced
in the service against the server's clock. A comment that already has replies can be
edited in its window but **not deleted**, since deleting it would leave replies answering
nothing. A `send_back` comment cannot be deleted at all — it is the recorded reason for a
status change, and its text is also on the revision.

**Who may write where** is policy, not schema (`tech_stack.md` §3.1): day comments by the
author, any manager or admin, and teammates while `openToTeam`; week comments by managers
and admins once submitted, with the author replying.

### 1.10 `seenMarks` — what each person has already seen

| Field    | Type                 | Req | Notes                              |
| -------- | -------------------- | --- | ---------------------------------- |
| `user`   | ObjectId → `users`   | yes |                                    |
| `report` | ObjectId → `reports` | yes |                                    |
| `seenAt` | Date                 | yes | set when the user opens the report |

Unique on `{ user, report }`. Written when a person opens a week — theirs or someone
else's — and read to decide the **"new" markers** (`requirments_doc.md` §17). Nothing is
stored per notification: whether something is new is derived by comparing the report's
activity with `seenAt` (§5.4).

**Why not a notifications collection.** A notification list stores one row per event per
recipient and then has to be kept in step with the things it describes — a deleted
comment leaves a notification about nothing. A single "seen at" per person per week,
compared against data that already exists, cannot disagree with that data. The cost is a
comparison at read time, bounded by the handful of weeks a person has open.

---

## 2. Relationships — reference or embed, and why

| Relation                                   | Modelled as                   | Why                                                                                                                                  |
| ------------------------------------------ | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `report.author` → user                     | reference                     | A user is shared and independently updated. Embedding would copy a name that changes.                                                |
| `task.project`, `line.project` → project   | reference                     | Renaming a project is one write.                                                                                                     |
| `line.task` → task                         | reference                     | A task spans weeks; its identity cannot live inside one report.                                                                      |
| `user.projects` → projects                 | array of refs **on the user** | The deciding query is the new-task project list: it needs the current user's projects, already loaded by the auth middleware.        |
| Work lines, blockers, comments             | **embedded** in `days`        | At most five days per week, always read with their week.                                                                             |
| Task statuses, achievements, notes, links  | **embedded** in `content`     | No identity outside their report; always read with it.                                                                               |
| Week comments                              | **embedded** in `weekComments`| Always read with the report; bounded by human attention.                                                                             |
| Leave and work periods                     | **embedded** on the user      | Read with the person on every dashboard load; a handful per account over its life.                                                   |
| Revisions                                  | **separate collection**       | Unbounded growth and an append-only write pattern, never touched by a daily update.                                                  |
| Holidays, seen marks                       | **separate collections**      | Holidays are team-wide, not anyone's; seen marks are per person per report and would bloat every report if embedded.                  |

### 2.1 The 16MB limit

A full report with five days of lines runs roughly 4–12 KB. Embedding revisions inside
the report would make the document grow by that much per submission, and every daily
update would carry the entire version history through the working set. Revisions are
separate for the working-set cost, not the ceiling.

Lines, blockers, comments, achievements and links are bounded by what a person types into
a week. None grows without bound.

### 2.2 Three rules about project assignment

1. **Assignment is not authorization.** It narrows the project list when starting a new
   task. Who may read a week is decided entirely by `policies/reportPolicy.js`.
2. **Work is independent of current assignment.** Unassigning someone from a project later
   must not alter or hide the tasks and hours they already logged on it.
3. **A project is never hard-deleted** (§1.2), so no task or line can dangle.

---

## 3. The revision model

The hardest part, and the one `requirments_doc.md` §5 exists for.

### 3.1 The rule

> **`reports` holds the live week. `revisions` holds an immutable copy of `content` and
> `days`, appended on every submission — the first one included, not only on send-back.**

History is created by the event it records. A report submitted once and never reviewed
still has a stored version of exactly what was filed. Drafts are never snapshotted.

A revision's `days` are the days as they stood when the week was filed — the part the
person handed in. Comments and resolutions are what others did about the week, and belong
to the live report only.

### 3.2 Review outcomes, and where comments live

A review outcome — `action`, `comment`, `reviewedBy`, `reviewedAt` — is stored on the
revision it concerns, so "which version was this about" is structural
(`requirments_doc.md` §5).

**Every review comment is also an overall comment.** Sending back pushes a `weekComments`
thread with `kind: 'send_back'` and the revision number; an approval with a comment pushes
one with `kind: 'approval'`. So the author and every manager read one conversation about
the week — free comments, send-back reasons and approval remarks together, each labelled
with its version — and can reply to any of them. The revision keeps the text as the
permanent record; the thread is where the conversation happens.

### 3.3 Write order, transition by transition

Every sequence runs in the service. Atlas M0 supports transactions on a replica set; only
the ownership transfer uses one. The rest are ordered so that a crash between writes
leaves a recoverable state.

**Post or edit a daily update**

1. Assert the weekday is one of the author's expected days (§0.2) and not after today.
2. If the author has no report for the week, insert one (`status: 'draft'`). A
   duplicate-key race with a concurrent first post loads the other request's report.
3. Assert the report is `draft` or `needs_correction`.
4. For each line that starts a new task, insert the task (owner, name, project).
5. Upsert the day by `weekday`, conditioned on the status still being open: `$set` lines
   (with `project` copied from each task), blockers and `openToTeam`; `postedAt` on first
   post, `editedAt` otherwise. Normalise "at most one `isKey`" across all days, sync
   `content.tasks` with the lines (§1.6), and prune orphaned `blockerResolutions`.
   `comments` are never touched. No revision, no `lastActivityAt`.

**Submit** — `draft → submitted`, or `needs_correction → submitted`

1. Assert the submit rules (shared module, `requirments_doc.md` §2.2): **every expected
   day of the week has a posted update**, and **every task in `content.tasks` has a
   status**. Reject before any write.
2. `findOneAndUpdate` on the report: `$inc: { revisionNumber: 1 }`, `$set: { status:
   'submitted', approvalRequested, submittedAt: now, lastActivityAt: now, interactionAt:
   now, latestComment: null }`, returning the **new** document. The `$inc` is the atomic
   allocator — two rapid submits cannot both write the same revision number.
3. Insert the revision with that number, `content` and `days` (without comments) copied
   from the report.
4. For every task in `content.tasks`: set `doneAt` if its status is `done`, clear it
   otherwise.

**Send back** — `submitted → needs_correction`

1. Assert `comment.length ≥ 10` and that the reviewer is not the author.
2. Claim the current revision: `$set: { action: 'changes_requested', comment, reviewedBy,
   reviewedAt: now }`, conditioned on `action: null`.
3. Update the report: `$set: { status: 'needs_correction', lastActivityAt: now,
   interactionAt: now, latestComment: {…} }`, `$push weekComments { kind: 'send_back',
   … }`.

The comment is written to the revision **first**. If step 3 fails, the record of what was
said about that version survives.

**Approve** — `submitted → approved`. **Any submitted report**, whether or not approval was
requested (`requirments_doc.md` §4).

1. Self-review guard.
2. Claim the current revision: `$set: { action: 'approved', comment, reviewedBy,
   reviewedAt: now }`, conditioned on `action: null`.
3. Update the report: `$set: { status: 'approved', lastActivityAt: now, interactionAt:
   now, latestComment: null }`; if a comment was given, `$push weekComments { kind:
   'approval', … }`.

**Leave it Submitted.** Nothing happens. A submitted report that nobody reviews is a
complete, valid end state.

**Edit the end-of-week content** while `draft` or `needs_correction` (autosave)

1. `$set` on `content` only — task statuses and notes, next week, achievements, notes,
   links — plus the key-blocker choice on the days. No revision, no status change, no
   `lastActivityAt`.

**Comment or reply**

1. Assert the writer may write in that place (policy).
2. `$push` the thread, or the reply into the thread; `$set interactionAt: now`. Any
   status. No revision.
3. **Edit or delete within 10 minutes**: conditioned on the writer and on `createdAt >
   now − 10 min`, so a request arriving at 10:01 matches nothing.

**Toggle a day's team comments** — `$set days.$.openToTeam`, by the author or any manager
or admin. Any status.

**Toggle leave** — on: `$push { from: now, to: null, setBy }` unless a period is open;
off: `$set to: now` on the open period, conditioned on it still being open.

**Remove a person** — `status: 'removed'`, `to: now` on the open work period, `$inc
tokenVersion`, clear any link token.

**Accept an invite** — conditioned on the token hash: set name and password, `status:
'active'`, clear the link token, `$push workPeriods { from: now, to: null }`. A re-hired
person gets a second period; their first stays closed.

**Reset a password** — conditioned on the token hash and purpose `reset`: set the new
`passwordHash`, clear the link token, `$inc tokenVersion`.

**Change an email** — `$set email`, `$inc tokenVersion` (the person signs in again with the
new address). Uniqueness is the `{ email: 1 }` index.

**Transfer ownership** — the one transaction. The unique index on `isOwner` allows no safe
order of two separate writes: setting the new owner first violates it, unsetting the old
first leaves a moment with no owner.

1. In one transaction: `$unset isOwner` on the current owner; `$set { isOwner: true }` on
   the target, plus `role: 'admin'` and `$inc tokenVersion` if the target was a manager.
2. The target must be `active` and a manager or admin; the actor must be the current
   owner. Both re-checked inside the transaction.

### 3.4 A full correction cycle

| #   | Event                     | `reports`                                                        | `revisions`                                                   |
| --- | ------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------- |
| 1   | Mon–Fri daily updates     | created by Monday's post; `draft`, `days` growing                | —                                                             |
| 2   | Submits, asks for approval| `submitted`, `approvalRequested: true`, `revisionNumber: 1`      | **rev 1** `{ content: C1, days: D1 }`                         |
| 3   | Manager sends back        | `needs_correction`, `latestComment`, `weekComments` + send_back  | rev 1 `+ { action: changes_requested, comment }`              |
| 4   | Author corrects           | `content: C2` live; days may change too                          | rev 1 untouched — **C1 and D1 survive**                       |
| 5   | Resubmits                 | `submitted`, `revisionNumber: 2`                                 | **rev 2** `{ content: C2, days: D2 }`                         |
| 6   | Another manager approves  | `approved`                                                       | rev 2 `+ { action: approved }`                                |

**While step 4 is in progress, managers read revision 1**, not the live content
(`requirments_doc.md` §4). The live `content` of a `needs_correction` report is the
author's unfinished correction, private in the same way a draft is. The live `days` are a
different matter: daily updates are shared as posted, so they are always read live.

"Current" is derived — `revisionNumber === report.revisionNumber` — not stored.

### 3.5 Blocker resolution — deliberately outside the revision model

```js
blockerResolutions: [{
  blockerId:  ObjectId,   // the blocker subdocument's own _id, inside days[].blockers
  resolvedAt: Date,
  resolvedBy: ObjectId → users,
}]
```

- **`content` and `days` stay untouched.** Resolving touches a sibling field, so a
  manager resolving a blocker has not edited the author's week.
- **No revision is written**, and revisions carry no resolutions: a snapshot is what was
  filed; resolution happened afterwards.
- **Permitted at every status**, by the author, a manager or an admin — gated by
  `canResolveBlocker`, not `canEditContent`. **Teammates cannot resolve** a blocker; they
  can see it.
- **Reversible, no confirm.** Unresolving deletes the entry, so "open" has one
  representation: absence.

**Carried over** is derived: compare a blocker's normalised text against the blockers in
the same author's previous week's `days`.

### 3.6 What is not modelled

No diff or comparison view (`requirments_doc.md` §5). No notification list (§1.10). No
priority, planned percentage or output on tasks (`requirments_doc.md` §2.2). No
days-to-hours conversion (§1.2).

---

## 4. Derived versus stored

The distinction is **denormalisation versus recording**. `revisionNumber`,
`submittedAt` and `interactionAt` are facts about events. Everything derivable from data
already inside a document is computed.

| Value                                      | Where      | Why                                                                                    |
| ------------------------------------------ | ---------- | -------------------------------------------------------------------------------------- |
| `revisionNumber`, `submittedAt`            | **stored** | Recorded events + the atomic allocator.                                                |
| `lastActivityAt`, `interactionAt`          | **stored** | Recorded events; each set explicitly, never read off `updatedAt`.                      |
| `latestComment`                            | **stored** | Single copy so the correction panel avoids `revisions`.                                |
| `line.project`                             | **stored** | Copy of the task's fixed project, to group without a lookup (§1.7).                    |
| `task.doneAt`                              | **stored** | Lets the picker hide finished tasks without reading reports.                           |
| Hours per task, per type, per project      | derived    | Summed from lines. One source of hours (§1.6).                                         |
| Expected days; week state                  | derived    | From holidays, work periods and leave (§0.2, §5.0).                                    |
| Project days used, days left, hours logged | derived    | From the plan, holidays and lines (§5.3).                                              |
| Compliance, Not started, open blockers     | derived    | §5.                                                                                    |
| "New" markers                              | derived    | Report activity compared with `seenMarks` (§5.4).                                      |
| Joined date, removed date                  | derived    | From `workPeriods`.                                                                    |
| "Current" revision flag                    | derived    | `revisionNumber === report.revisionNumber`.                                            |

---

## 5. Aggregation pipelines

All week-scoped queries filter `weekKey` first. The two layers of a week follow two rules
(`requirments_doc.md` §2, §4):

- **`days` are included at every status, for everyone on the team.** Lines, hours,
  blockers and comments are shared as posted, so every hours chart, the open-blockers
  count and the updates strip read Draft weeks too.
- **`content` is excluded for non-authors while `draft`**, and read from the sent-back
  revision while `needs_correction` (§3.4). Only the tasks-completed trend reads
  `content`, and it counts submitted reports only.

### 5.0 Expected filers — defined once

_Not started_, _On leave_, _Holiday week_ and the compliance denominator all derive from
one set, so they cannot diverge.

For week W, with its working days `WD` (Mon–Fri minus holidays), each user row is built in
three stages:

1. **On the team.** A user is in the set for W if one of their `workPeriods` covers W:
   `from ≤ weekEnd` and (`to` is `null` or `to > weekEnd`). A person removed during the
   week is not expected that week; a person who joined during it is.
2. **Expected days.** `WD` minus the days one of their `leave` periods covers. A period
   covers a day when the day's date is on or after `from`'s date and before `to`'s date (or
   `to` is `null`) — **the day leave is switched on is the first day away; the day it is
   switched off is the first day back.** Dates compared in UTC.
3. **The report**, looked up by `{ author, weekKey }`, projecting `status` and
   `days.weekday` only — never `content`.

The derived week state is then:

- the report's `status`, if a report exists and has been submitted at least once;
- `holiday_week` if `WD` is empty;
- `on_leave` if the person's expected days are empty;
- otherwise the report's `status` (`draft`) if one exists, and `not_started` if not.

**Compliance** counts rows whose state is not `holiday_week` or `on_leave`; filed rows are
`submitted`, `needs_correction` and `approved`. Approval plays no part: a submitted
report is filed.

**This must be a `users`-first pipeline.** A report-first query cannot see people who
filed nothing, and _Not started_ is precisely the absence of a report. Index: the
`$lookup` uses `{ author: 1, weekKey: 1 }`.

**The projection is a permission boundary.** It carries no `content`, because the team
table is read by managers about drafts. Hours for the table come from `days.lines`, which
are shared; statuses and notes of tasks never reach a dashboard row.

| Metric                            | Pipeline                                                                                                                                              | Index                           |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Total submitted this week         | `countDocuments({ weekKey, status: { $in: ['submitted','needs_correction','approved'] } })`                                                           | `{ weekKey: 1, status: 1 }`     |
| Compliance                        | §5.0, drop `on_leave` and `holiday_week` rows, then `$group` by derived state                                                                         | `{ author: 1, weekKey: 1 }`     |
| In Needs correction               | `countDocuments({ weekKey, status: 'needs_correction' })`                                                                                             | `{ weekKey: 1, status: 1 }`     |
| Open blockers                     | `$match { weekKey }` (every status) → `$unwind days` → `$unwind days.blockers` → keep ids not in `blockerResolutions.blockerId` → `$count`; "raised by N people" is `$addToSet: '$author'` on the same pass | `{ weekKey: 1, status: 1 }`     |
| Tasks completed trend (4/8/12 wk) | `$match { weekKey: { $in: window }, status: { $ne: 'draft' } }` → `$unwind content.tasks` → `$match status: 'done'` → `$group by weekKey` (and `author` when per-person) | `{ weekKey: 1, status: 1 }`     |
| Status by team member             | §5.0 verbatim, plus hours = sum of `days.lines.hours`                                                                                                 | `{ author: 1, weekKey: 1 }`     |
| Workload by project               | `$match { weekKey }` → `$unwind days` → `$unwind days.lines` → `$group { project, taskType }` summing hours → `$lookup projects` for names           | `{ weekKey: 1, status: 1 }`     |
| Time by task type                 | `$match { weekKey }` → `$unwind days` → `$unwind days.lines` → `$group` by `taskType` summing hours                                                  | `{ weekKey: 1, status: 1 }`     |
| Review desk queue                 | `find({ status: 'submitted', author: { $ne: me } })`, plus `approvalRequested: true` unless "all submitted" is chosen; sort `submittedAt: 1`          | `{ status: 1, approvalRequested: 1, submittedAt: 1 }` |
| Report history (member)           | `find({ author }).sort({ weekKey: -1 })`                                                                                                              | `{ author: 1, weekKey: 1 }`     |
| Report history (manager)          | the same, with `content`-derived fields projected only where `status ≠ 'draft'`                                                                       | `{ author: 1, weekKey: 1 }`     |

**The project filter** on the dashboard keeps a person's row if any of their lines that
week names the project, or — for someone with no lines yet — if they are assigned to it.

### 5.0b A person's week history

`GET /users/:id/reports` lists every week inside the person's work periods up to the
current week — not only weeks with a report. Generate the week keys from the periods, left-
join `reports` on `{ author, weekKey }` (index `{ author: 1, weekKey: 1 }`), and give each
week without a report the state §5.0 derives (`not_started`, `on_leave`, `holiday_week`).
Weeks are generated in memory — a few hundred at most — then filtered, sorted and paged;
nothing is stored for them.

### 5.1 Activity feed

```
revisions.aggregate([
  { $match: { $or: [ { submittedAt: { $gte: since } }, { reviewedAt: { $gte: since } } ] } },
  { $addFields: { events: [ …submitted…, …review (null when unreviewed)… ] } },
  { $unwind: '$events' }, { $match: { 'events.at': { $ne: null } } },
  { $sort: { 'events.at': -1 } }, { $limit: 8 },
  { $lookup: users }, { $lookup: reports },
])
```

`$match` bounds the input first and the `$lookup`s run last, over the page. The feed shows
the latest eight events; there is no longer "all activity" view to paginate
(`requirments_doc.md` §6). A revision never reviewed contributes one event — which, with
approval optional, is now the common case.

### 5.2 The team updates feed

Daily updates by date, for the whole team: `$match { weekKey }` → `$unwind days` →
`$match` the chosen weekday → project author, day and lines, blockers, comment count,
`openToTeam`. Every status is included and no `content` is read. Index
`{ weekKey: 1, status: 1 }`.

### 5.3 Project progress

For each project with a plan:

- **Days used** — working days from `plan.startDate` to today inclusive, i.e. weekdays not
  in `holidays`. Zero while the start date is in the future.
- **Days left** — `plannedDays − days used`; a negative value is "overdue by N days".
- **Hours logged** — `reports.aggregate`: `$unwind days` → `$unwind days.lines` →
  `$match { 'days.lines.project': id }` → sum `hours`, and `$group` by `author` for the
  per-person table. Every status, since lines are shared. Index on
  `{ 'days.lines.project': 1 }`.

Counting working days is arithmetic over a date range minus the holidays in it — a query
on `holidays` by date range, not an aggregation over reports.

### 5.4 "New" markers

For a person P and a report R they can see, R shows as new when `R.interactionAt` is later
than P's `seenMarks.seenAt` for R (or P has no mark), **and** the new activity concerns P:

- P is R's author — any comment, reply or status change by someone else;
- P has written in a thread on R — a later reply or comment in that thread;
- P is a manager or admin and R is `submitted` with `approvalRequested` — an approval
  request.

The first two are read from the report itself: each thread's latest `createdAt` against
`seenAt`, filtered to threads P wrote in or to P's own report. It runs over the reports
on the current page of whatever list is shown, never over the collection. The sidebar's
review-desk count is the review-desk query (§5) minus reports P has seen since their
submission.

### 5.5 What M0 will not serve well

| Concern                               | Assessment                                                                    |
| ------------------------------------- | ----------------------------------------------------------------------------- |
| `$unwind` of days and lines per week  | ~10 people × 5 days × ~4 lines = 200 rows per week. Trivial.                  |
| Project hours across all weeks        | Grows with the project's life. Fine for months of a small team; a stored rollup would be the fix at scale, not an index. |
| §5.0's `$lookup` per user             | One per person per dashboard load. Fine at this size.                         |
| Feed sort after `$unwind`             | In memory, over a bounded input. Fine.                                        |
| Connections                           | `maxPoolSize: 10` against M0's 500.                                           |

---

## 6. Indexes

| Collection  | Index                                                        | Serves                                                     |
| ----------- | ------------------------------------------------------------ | ---------------------------------------------------------- |
| `users`     | `{ email: 1 }` unique                                        | Login; email change uniqueness                             |
| `users`     | `{ projects: 1 }` multikey                                   | Project member lists                                       |
| `users`     | `{ status: 1 }`                                              | Expected-filer set, Users and People pages                 |
| `users`     | `{ linkTokenHash: 1 }` unique, sparse                        | The only lookup key `/invite/:token` and `/reset/:token` have |
| `users`     | `{ isOwner: 1 }` unique, partial on `{ isOwner: true }`      | Exactly one owner; closes the bootstrap race               |
| `projects`  | `{ name: 1 }` unique, collation `{ locale: 'en', strength: 2 }` | Name uniqueness across active and inactive              |
| `tasks`     | `{ owner: 1, doneAt: 1 }`                                    | The task picker                                            |
| `reports`   | `{ author: 1, weekKey: 1 }` unique                           | One report per person per week; history                    |
| `reports`   | `{ weekKey: 1, status: 1 }`                                  | Week dashboard, feeds, hours charts                        |
| `reports`   | `{ status: 1, approvalRequested: 1, submittedAt: 1 }`        | Review desk, oldest first                                  |
| `reports`   | `{ "days.lines.project": 1 }` multikey                       | Project hours and the per-person table                     |
| `revisions` | `{ report: 1, revisionNumber: 1 }` unique                    | Version history; no duplicate numbers                      |
| `revisions` | `{ submittedAt: -1 }`, `{ reviewedAt: -1 }`                  | Activity feed                                              |
| `holidays`  | `{ date: 1 }` unique                                         | One holiday per date; range lookups                        |
| `seenMarks` | `{ user: 1, report: 1 }` unique                              | "New" markers                                              |

**Why `{ status, weekKey }` was dropped earlier and stays dropped.** Key order follows
equality → sort → range. The week dashboard's equality predicate is `weekKey` with no
status filter, so a status-first index cannot answer it. The review desk's index now
carries `approvalRequested` between the equality field and the sort field, so the default
"asked for approval" view is served without an in-memory filter.

The earlier `{ section: 1, weekKey: 1 }` index is gone with the report-level section
field; project filtering now runs on line projects.

---

## 7. Referential integrity Mongo will not enforce

### 7.1 Deactivating a project (`requirments_doc.md` §7)

Never a hard delete. `status: 'inactive'`; tasks and lines untouched. Names resolve on
historical weeks regardless of status. Open tasks on an inactive project stay open and can
still be logged against — the work may still be finishing — but no new task can start on
it.

### 7.2 Removing a user with reports (`requirments_doc.md` §11)

Never a hard delete. `status: 'removed'`, the open work period closed, `$inc tokenVersion`
(their JWT dies immediately — `tech_stack.md` §2).

Hard-deleting would leave `report.author`, `task.owner` and every comment author pointing
at nothing: the work survives but the authorship does not.

- Removed users still resolve by `_id` wherever their work is shown; the name carries a
  removed marker, never a blank cell.
- Team lists and pickers filter to `status: 'active'` by default. The People page's
  search deliberately reaches removed people.
- **Re-inviting reactivates the same document** (§10.1): `status: 'invited'`, a fresh
  invite link, `$inc tokenVersion`, `passwordHash` unset. Their earlier work periods stay
  closed; accepting opens a new one. Everything they authored stays attached to the same
  `_id`.

### 7.3 Reports, revisions and tasks

Reports are never deleted; nothing in `requirments_doc.md` asks for it, so revisions are
never orphaned. A **task** is never deleted either: if every line naming it is removed
before any submission, it simply has no hours and drops out of `content.tasks`, and it
stays in its owner's picker until marked done.

### 7.4 Blocker resolutions and threads

`blockerId` points inside the same document; the day-save path prunes orphans (§3.5).
Thread and reply authors, `resolvedBy`, `setBy` and `createdBy` may point at a user later
removed — they resolve under §7.2.

### 7.5 What the database cannot enforce

Enforced in the service: the submit rules (§3.3); days written only for expected days, not
in the future, and only while the week is open; the self-review guard; the 10-minute edit
and delete window; comment permissions; "at most one `isKey`"; status transition legality;
managers never writing `content`; leave periods never overlapping; holidays only on
weekdays; a task's project fixed once used; link-token purpose. "Exactly one owner" is the
exception the database *does* enforce, through the unique partial index on `isOwner`.

---

## 8. Seed data shape

`npm run seed` wipes and inserts. Deterministic, hand-authored, no `faker`
(`tech_stack.md` §6.8). **The seed is for development and testing only.** The public demo
does not use the database at all — it runs on hard-coded sample data in the browser
(`requirments_doc.md` §14, `tech_stack.md` §6.9) — so no seeded account is special, and
there is no demo flag on any user.

Weeks are generated **relative to the week the seed runs**, never as fixed week keys, so a
reseed always has a populated current week.

| Collection  | Volume               | Must include                                                                                                                                                                                                                                  |
| ----------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`     | 8 + 3                | The fixed cast (Nadia F., Ruwan P., Imali J., Tharindu S., Ayesha C., Dinesh K., Malith W., Sanduni B.) across admin / manager / member, known password, the first admin as owner. **Plus** one `invited` user with a live invite link, one `removed` user with a closed work period mid-history, and **one re-hired user with two work periods** and a gap between them. |
| `projects`  | 4 + 1                | Client A, Internal Tooling, R&D, Marketing — **plus** one `inactive` project still named by older tasks. Plans that show every case: one on track, one **overdue**, one with **planned hours**, one with a **future start date**, one with an extended plan in `planHistory`. |
| `tasks`     | ~25                  | Small tasks finished in a day, and long tasks spanning three or more weeks; some `done`, some open.                                                                                                                                         |
| `reports`   | ~6 weeks × cast      | The current week contains **every** state: Approved (one asked for approval, one not), Submitted with and without an approval request, Needs correction, Draft, Not started, and **On leave**. Every report has daily updates with lines across several projects and task types, some with blockers. At least one update **open to team comments** with a teammate's comment, and threads with **replies** on both a day and a week. |
| `revisions` | ≥ 1 per submission   | **One complete correction cycle** — three revisions with the send-back comment on a specific revision — and one approval with a comment.                                                                                                  |
| `holidays`  | ~6                   | Sri Lankan public holidays across the seeded range, including **one in the current week**, so the week strip and expected days show it.                                                                                                     |

---

## 9. Conflicts found

Recorded, not resolved here, except where a document explicitly assigned the decision.

| #      | Where                                                                                     | Positions                                                                             | Status                                                                                                                                  |
| ------ | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| **S1** | `tech_stack.md` §4 vs the brand and design documents                                      | `project` vs `section` as the entity's name                                           | **Superseded.** `section` was chosen first; the project owner then chose **`project`** everywhere (reconciliation pass 4).              |
| **S2** | `tech_stack.md` §4                                                                        | `{ status: 1, weekKey: 1 }` served neither the review desk nor the week dashboard     | **Applied**, and extended with `approvalRequested` (§6).                                                                                |
| **S3** | `product_design_system.md` §3.9 vs §7.1                                                   | Delete copy promised "show no section"                                                | **Applied**: delete deactivates; names keep resolving.                                                                                  |
| **S5** | `tech_stack.md` §6.8                                                                      | "wipes the three collections"                                                         | **Superseded**: the seed now wipes all seven collections.                                                                               |
| **S6** | `requirments_doc.md` §6 vs `product_design_system.md` §0.4                                | "submitted vs pending vs late"                                                        | **Applied.** No deadline exists, so lateness was never computable.                                                                      |
| **C2** | `project_structure.md` §9                                                                 | Role storage                                                                          | Decided: one `role` enum, hierarchy in `authorize()`.                                                                                   |
| **C3** | `product_design_system.md` §3.14 vs `tech_stack.md` §6.9                                  | Read-only demo vs demo writes                                                         | **Superseded** (pass 4): the demo is client-side with hard-coded data, so it touches no database and needs no server-side rule.         |
| **C4** | `project_structure.md` §9                                                                 | No mail library, yet invites and password reset specified                             | **Resolved**: both are one-time links the admin delivers by hand (§1.1).                                                               |

---

## 10. Decisions, now settled

Kept with their reasoning, because each is the kind of rule that looks arbitrary in the
code that enforces it.

1. **People who leave and return — work periods, one document.** Re-inviting a removed
   person reactivates the same document, so their history stays attached to one `_id`;
   the global `{ email: 1 }` index makes a second document impossible anyway. Their time
   on the team is recorded as periods (§1.1), so the weeks between leaving and returning
   count neither as filed nor as missing. (Chosen as "option A: record work periods" in
   reconciliation pass 4, replacing `joinedAt` / `removedAt`.)
2. **Compliance covers only weeks a person was on the team** — §5.0 stage 1. Someone who
   left in week 12 is not expected in weeks 13–19, or the figure decays as people leave.
3. **The dashboard's member filter lists people on the team during the week being viewed**,
   not the currently-active set, so a departed person's past weeks stay reachable.
4. **`projects.name` is unique, case-insensitive, across active and inactive alike.**
5. **Blocker resolution** — outside `content` and `days`, at any status, never by
   teammates (§3.5).
6. **Invites and password resets are one-time links the admin delivers** (§1.1). One set of
   token fields with a purpose. Adding an email provider later changes delivery only.
7. **Self-registration — first-run bootstrap, then closed.** The first account is the
   owner; the unique partial index on `isOwner` closes the race.
8. **Daily updates are work lines, shared with the whole team** (§1.7). Every hour in the
   product comes from a line; there is no second source.
9. **Leave is periods** (§1.1); a week is `on_leave` when leave covers all its working
   days.
10. **Ownership is transferable** by the owner alone, in a transaction (§3.3).
11. **Tasks are their own collection** (§1.3), because they outlive a week.
12. **Projects carry a plan** in working days, with optional hours, and every earlier plan
    in `planHistory` (§1.2). No conversion between days and hours.
13. **Approval is optional** (§1.4, §3.3). `approvalRequested` routes a report to the
    review desk; any manager may approve any submitted report; Submitted is a valid end
    state.
14. **Comments are threads** with a 10-minute edit and delete window (§1.9), used for both
    daily updates and the week.
15. **Holidays are a collection admins maintain** (§1.8), read at query time, never copied
    onto reports.
16. **An invited person has no name until they accept.** The invite form collects email,
    role and projects; the name is set on the accept screen. `name` is therefore required
    only once `status` is `active` — the one conditional requirement in the schema,
    enforced in the service.
17. **"New" markers are derived from `seenMarks`** (§1.10, §5.4), never stored per event.
18. **The demo has no database presence** (§8). The `isDemo` flag and every server-side demo
    rule are removed.
