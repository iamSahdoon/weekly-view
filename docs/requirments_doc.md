# Weekly Report Generator & Team Dashboard

## Overview

A full-stack web application in which every member of a team posts a short update each
working day and files one structured weekly report at the end of the week. Managers
follow the daily updates as they come in, comment on them, and may approve or send back
the weekly reports. A consolidated dashboard shows the team's week, and the progress of
the projects the team works on.

---

## Tech Stack

- **MongoDB** — Database
- **Express.js** — Backend API framework
- **React** — Frontend framework
- **Node.js** — Backend runtime

### UI Expectations

- Responsive layout
- Component-based structure
- Clean, reusable components
- Well-structured folder organization
- Clear separation between the personal report page, report history, report detail,
  manager review, team updates and team dashboard
- Basic client-side form validation

---

## 1. User Authentication & Roles

### Roles

**Team Member** can:

- Post a daily update each working day: the work done, per task, with its project, type
  and hours, plus any blockers (§2.1)
- Read teammates' daily updates, and comment on one when it has been opened to the team
  (§2.1)
- Build and submit their weekly report, optionally asking for approval (§2.2, §4)
- View their own report history and statuses
- Read and reply to comments on their updates and their week
- See project progress for the projects they work on (§7)
- See who is on leave and which days are holidays, and set their own leave (§15, §16)

**Manager / Admin** can do everything a member can, and also:

- Comment on anyone's daily update, their own included, and on anyone's submitted week
- Read every team member's weekly report once submitted
- Approve or send back any submitted report except their own
- Open a teammate's daily updates to team comments
- View the team dashboard and each person's profile
- Create projects, set and extend their plans, and assign people to them (§7)
- Set anyone's leave (§15)

**Admins only:** manage people — invite, remove, change roles, change an email, issue a
password-reset link (§11) — and manage holidays (§16).

### Authentication Features

- User registration and login / logout
- Password protection and secure session handling
- Role assignment

**One team, no workspace entity.** Registration creates a *user account*, nothing more.
The product serves a single team: there is no workspace, organisation or tenant object,
no tenant key on any document, and no per-workspace scoping in any query. Marketing copy
that spoke of "creating a workspace" was naming a thing the product does not have and has
been corrected to "create your account" (`brand_design_strategy.md` §6.3).

**Registration is first-run bootstrap, and then it closes.**

- While **no user exists**, `/signup` is open and the account it creates is an **admin**
  and the **owner** (§11.2). This is how a fresh installation gets its first person, and
  it is what satisfies the registration requirement above.
- Once **any** user exists, `/signup` is closed. The endpoint returns 403 and the screen
  explains that the team is invite-only, offering the demo instead. The screen is
  courtesy; the endpoint is the control.
- Every account after the first is therefore created by an admin who picks its role
  explicitly (§11). **No account ever receives a role by guesswork.**

This closes a real exposure rather than a theoretical one. There is no tenancy here, so
an open form granting manager or admin would hand a stranger every team member's reports
— the opposite of the permission promise the product is built on. An open form granting
member would still let strangers onto the roster, where they would read everyone's daily
updates and drag the compliance rate down for weeks they were never expected to file.

---

## 2. Weekly Report Structure

A week has **two layers**, because that is how teams actually report: a short update
every working day, like a team sync, and one structured report at the end of the week.
The structure is fixed and identical for every user — same fields, same order, across
the whole team. Users cannot customize, reorder, or add their own fields.

### 2.1 Daily updates — Monday to Friday

**Every working day, everyone posts one update. It is not optional.** A working day is a
Monday to Friday that is not a holiday (§16) and on which the person is not on leave
(§15).

**An update is a list of work lines, plus optional blockers.**

- Each **work line** records one piece of work: the **task** it belongs to, the **task
  type** (§2.3), a short description of what was done, and the **hours** spent. A day
  has at least one line; the description and hours are required on every line.
- A line **picks one of the person's existing tasks, or starts a new one** (a name and a
  project). A task is a piece of work that can run across days and weeks — a small task
  may take an hour, a large one many days — and its hours add up across every line that
  names it (§2.2).
- The project comes from the task, so a person working on three projects in a day simply
  writes three lines.
- **Blockers** are optional: short lines naming what is holding work up. A blocker can be
  marked resolved later (§4).
- There is no limit on hours in a day. The product records what people did; it does not
  police how long they worked.

**Who sees an update.** Once posted, a daily update — its lines, blockers and comments —
is visible to **the whole team**: the author, every teammate, and every manager and admin.
That is how a real team sync works: everyone hears what everyone did.

**Who comments on an update.**

- The author, and any manager or admin — managers may comment on their own update, to
  add something they forgot.
- **Teammates can comment only when the update has been opened to the team.** Each update
  has an "open to team comments" switch, which the author or any manager or admin can
  turn on. While it is on, any teammate can comment on that update.
- Comments are **threads**: anyone who can comment can reply, back and forth.
- A comment or reply can be **edited or deleted within 10 minutes** of posting, by its
  writer. After that it is permanent.

**When updates can be written.**

- For today, or for any earlier working day of an open week — a missed day can be filled
  in later that week. Never for a day that hasn't happened yet.
- **Posting the first update of a week starts that week's report** as a Draft; there is
  no separate "start" step.
- Updates can be edited while the week is **open** — its report is Draft or Needs
  correction — and are frozen with the report once it is submitted and not sent back.

### 2.2 The weekly report — filed at the end of the week

At the end of the week — normally Friday — the person reviews and submits the weekly
report. Most of it is **built from the days**, so nothing is typed twice.

- **Tasks** — every task that appears in the week's work lines, with its project and the
  hours logged on it this week (summed from the lines). For each task the person sets:
  - **Status** — Not started, In progress, Done or Carried over. **Required.** An
    unfinished task carries over into the next week, where its status can change.
  - **Note** — optional free text for any detail worth adding.

  The earlier fields — priority, planned % vs actual %, output — are gone. Planned % and
  actual % were not realistic to fill in; planned time now lives on the project (§7).
- **Planned for next week** — optional.
- **Blockers** — **gathered from the week's daily updates**, so a blocker is written once,
  on the day it happens. The author flags one as the key issue for the week.
- **Achievements / Highlights** — optional, with the ability to flag one as the key
  achievement for the week.
- **Hours by task type** — **calculated** from the work lines (§2.3). Read-only; it can
  never disagree with the task hours, because it is the same hours grouped differently.
- **Notes / Links** — optional.

There is no single "project for the week" any more: a week's projects are whichever
projects its tasks belong to, and a week spent on three projects shows all three.

**What the report keeps private.** The daily updates are shared as they are posted (§2.1),
so the hours and tasks in them are visible to the team from the day they are written.
What stays with the author until submission is what is added at the end of the week: the
tasks' statuses and notes, next week's plan, achievements and notes. After submission
those are visible to managers and admins — never to teammates.

**Submitting.** A report can be submitted only when:

1. **Every working day of the week has an update** — so the report cannot be submitted
   before the last working day's update is posted, normally Friday's. Days on leave and
   holidays don't need one.
2. **Every task has a status.**

When submitting, the person may tick **"Ask for approval"** (§4).

### 2.3 Task types

Seven fixed categories, used on every work line and in every hours chart: **Development,
Testing, Meetings, Documentation, Review, Research & study, Other.** Research & study was
added because investigating and learning take real time that belongs to no other
category.

---

## 3. Report Management

Team members can:

- Post a daily update each working day (§2.1). The first one of a week starts that week's
  report as a draft
- Complete the weekly report from the days — status and notes per task, plus the optional
  sections (§2.2)
- Submit it, optionally asking for approval
- Correct and resubmit a report that was sent back
- View their report history with the current status of each report

### Report Statuses

- **Draft** — the week is under way. Its daily updates are visible to the team as they
  are posted; its end-of-week additions are the author's alone until submission
- **Submitted** — handed in. For a report that did not ask for approval, **this can be its
  final state**; nothing more has to happen to it
- **Needs Correction** — a manager sent it back with a comment; it becomes editable again
  by its author
- **Approved** — a manager approved it. Approval is optional (§4)

- **On leave** and **Not started** are not statuses. They describe a *week* with no
  report to review: someone away for the whole week, or someone who hasn't posted anything
  yet (§15).

**What can still change after submission.** Marking a blocker resolved, and comments and
replies — on the days or on the week — are permitted at any status, Approved included.
They are remarks about the week, not report content: they are stored outside the report
body, change no field anyone reviewed, and create no new version.

---

## 4. Review, Approval & Comments

**Approval is optional.** Some work needs a manager's sign-off and most doesn't, so a
submitted report is complete on its own.

- **The author asks for it.** When submitting, the author can tick "Ask for approval". A
  report that asks goes to the managers' **review desk**.
- **Any manager or admin can approve any submitted report** except their own — whether or
  not approval was asked for. A manager's own report is approved by another manager or an
  admin.
- **Any manager or admin can send any submitted report back** for correction, with a
  required comment explaining what needs to change. Its author corrects the same report
  and resubmits it.

When changes are requested:

1. Report status changes to Needs Correction
2. The author sees the comment on their week
3. The author edits the same report and resubmits (and may ask for approval again)
4. Status changes back to Submitted
5. Any manager can then approve it, send it back again, or leave it Submitted

**While a sent-back report is being corrected, managers see the version they sent
back** — not the half-corrected one. Unfinished corrections stay with the author, the
same way a draft does; the new version becomes visible when it is resubmitted. The
earlier version stays in the history with its comment.

**Overall comments on the week.** Once a report is submitted, **every manager and admin
can leave their own comment on the week** — as many as they like, with or without
approving it. The author can reply, and the conversation continues as a thread. Comments
follow the same 10-minute edit and delete rule as on daily updates (§2.1). The comment
that sends a report back, and any comment given with an approval, are overall comments
too, and are tied to the version they were written on.

**Access rules:**

- Daily updates, their blockers and comments: **the whole team** (§2.1)
- The weekly report's end-of-week content and the overall comments: **the author**, and
  **managers and admins once it is submitted**. Never teammates
- Managers change status and comments only — never the author's report content
- Blockers can be marked resolved at any status by the author or any manager or admin.
  Teammates can't. A blocker is **open** until it is marked resolved
- Enforced by separate policy checks on the server (`tech_stack.md` §3.1), not only in
  the UI

---

## 5. Report Version History

Each time a report goes through a correction cycle (Needs Correction → edited →
resubmitted), the previous version of the report content must remain available rather
than being overwritten.

A manager reviewing a report must be able to:

- See the current version under review
- See previous versions of that week's report with submission timestamps
- Identify which version a review comment was associated with

A simple list of past versions viewable on demand is sufficient — no diff or comparison
view required.

---

## 6. Team Dashboard (Manager View)

Managers have a team-wide dashboard for viewing and analyzing the team's weeks.

### Features

- View every person's week for a selected week. **The dashboard shows one week at a
  time**; earlier weeks are reached by choosing them in the week picker
- Filter by team member and by project
- **No page-wide date-range filter.** This requirement originally asked for one. It was
  replaced, with the project owner's agreement, because on a one-week page a date range
  could only ever change one chart. The **tasks-completed trend** carries its own window
  instead — the last 4, 8 or 12 weeks — and every *list* of reports (my reports, a
  person's history, the review desk) keeps a week-range filter
- **A status filter on the team table only.** Filtering the headline numbers by status
  would make them meaningless (compliance among approved people is always 100%), so the
  status filter lives on the team table, the one block it makes sense for
- Track each person's status for the week (Draft / Submitted / Needs Correction /
  Approved / Not yet started / On leave / Holiday week), and **see which days of the week
  each person has posted an update for**
- Open any person's week to read it, comment, approve or send it back
- A **project table**: each project's plan and progress, and who has worked on it with
  how many hours (§7)

### Summary Metrics

- Total reports submitted this week
- **Compliance rate**: of the people expected to file this week, the share who have
  submitted. **Someone on leave for the whole week is not expected**, nor is anyone not
  employed that week (§11.4, §15). A week made up entirely of holidays expects nobody
  (§16). A report counts as submitted once handed in, whether or not it is approved.
  **"Late" is not part of the product** — no submission deadline exists anywhere in it, so
  lateness cannot be computed (`product_design_system.md` §0.4)
- Number of reports currently in Needs Correction
- Number of open blockers across the team — raised in a daily update and not yet marked
  resolved, including weeks still in Draft

### Visual Insights

- Tasks completed trend over time (per person or team-wide) — tasks marked Done
- Report status by team member (the team table)
- Workload by project: hours per project, split by task type
- Time spent by task type, team-wide
- Recent activity feed — the latest events: reports submitted, approved, or sent back.
  It shows the latest few only; there is no separate "all activity" page

---

## 7. Projects

> **The product calls these projects** — in every field, route, collection and UI label.
> An earlier version called them "sections"; the project owner chose the plain word.

Projects are what the team's work belongs to. Examples: Client A, Internal Tooling,
R&D, Marketing. Managers and admins manage them.

### Features

- Add, edit, and delete a project. **Deleting deactivates rather than erases:** the
  project leaves every picker, while tasks and hours that already reference it keep its
  name, which keeps past weeks and charts intact
- Assign team members to relevant projects. Assignment narrows the project list a person
  sees when starting a new task; someone with no assignment sees every active project. It
  is never an access-control rule
- **A plan for each project.** A manager or admin sets:
  - a **start date** — today by default, or a later date for a project that hasn't begun;
  - a **planned duration in working days** — Mondays to Fridays, excluding holidays
    (§16);
  - optionally, **planned hours**.
- **Progress, shown two ways with a toggle:**
  - **Days** — working days used since the start date against the planned days: "12 of 20
    days · 8 left". Each working day that passes reduces the days left, whether or not
    anyone logged time on it. Once the plan is exceeded it shows **"overdue by 3 days"**,
    in plain words, and a manager or admin can **extend the plan**.
  - **Hours** — hours logged on the project by everyone, from their daily work lines,
    against the planned hours if any were set: "96 h of 160 h".
- **Who sees it:** everyone assigned to a project sees its progress. The **per-person
  table** — who worked on the project and how many hours — is on the manager dashboard.

The product does not convert days to hours. A working day has no fixed length here:
people log the hours they actually worked, and the two views are shown side by side
rather than one being derived from the other.

---

## 8. Team Member Profile (Manager View)

Managers can open a team member's profile to view:

- Team member information, including whether they are **on leave** (§15)
- Full week-by-week history from the day they joined: every week with a report openable to
  its daily updates, and every other week marked Not started, On leave or Holiday week
- Report statuses
- Basic activity statistics

---

## 9. Report Detail View

A read-only report detail view, opened by the author, by managers and admins, and — for the
daily updates only — by any teammate (§2.1, §4). It displays:

- The week's daily updates, with their work lines, blockers and comments
- All report fields (for a manager, once submitted)
- Current status, whether approval was asked for, and the overall comments
- Relevant version history

---

## 10. Manager Review Page

A dedicated review interface where a manager can:

- View the complete report, the week's daily updates, and its version history
- Approve the report, send it back with a required comment, or just add an overall
  comment — any of the three, on any submitted report except their own

---

## 11. User Management

Authorized admins can:

- View, invite, and remove team members. **Removal deactivates the account** and keeps
  their report history readable and correctly attributed
- Assign roles (Team Member / Manager / Admin)
- Re-invite someone previously removed. This **reactivates their existing account** rather
  than creating a second one, so their report history stays attached to the same `_id`
  (`database_schema.md` §10, decision 1)
- **Change a person's email address**, and **issue a password-reset link** for someone who
  has forgotten their password (§11.3)

### 11.1 How an invitation or a reset link reaches its recipient

**The admin delivers the link. The product does not send email.**

1. Creating an invite makes a `users` document in `invited` status with no password, and
   returns a **one-time invite URL**. The Users page shows that URL once, with a copy
   button and a line stating that it is single-use, expires in seven days, and lets
   whoever holds it join as the role it was issued for.
2. The admin sends it however they already talk to that person — email, Slack, in person.
3. The recipient opens `/invite/:token`, sets a password, and the account flips from
   `invited` to `active`.
4. If the link is lost, the admin **re-issues** it from the person's row. That generates a
   new token and invalidates the old one; nothing is recoverable from the first link.

A **password-reset link** works the same way (§11.3), opens `/reset/:token`, and lets the
person choose a new password.

**This is a deliberate choice, not an omission.** An email dependency — a provider
account, a sending domain, deliverability, bounce handling — is out of scope for a
portfolio build. The token model here is the same one an emailed link would use, so
adding a provider later changes the delivery step and nothing else: no schema change, no
new states, no rework of the accept screens. A self-service "forgot password" page would
need that email step, so for now a forgotten password goes through an admin.

Token fields, expiry and storage: `database_schema.md` §1.1 and `tech_stack.md` §2.1.

### 11.2 The owner, and passing ownership on

The person who set the system up — the first account, created by bootstrap signup (§1) —
is its **owner**. There is exactly one owner at any time.

- **The owner is protected.** No other admin can demote or remove them, or change their
  email or password. Without this, a later admin could lock the founder out of their own
  installation.
- **The owner can pass ownership on**, to any active admin or manager. A manager who
  receives it becomes an admin, since an owner must be able to manage people. The previous
  owner stays an admin and loses only the protection. This is how an owner who is leaving
  hands the system over without anyone needing database access.
- Ownership is never taken, only given: no one but the current owner can move it.

### 11.3 Changing an email address or a forgotten password

A person can change their **own password** on the Account page. They cannot change their
own email; instead the Account page names the **owner**, with a link that opens the
person's email app addressed to them (a `mailto:` link), and shows the owner's address as
text beside it, because the link does nothing on a computer with no email app set up.

Admins act on those requests:

| Whose details        | Who can change the email or issue a reset link |
| -------------------- | ---------------------------------------------- |
| A member or manager  | Any admin                                      |
| Another admin        | The owner only                                 |
| The owner            | The owner, for their own email                 |

- **A password is never typed by an admin.** An admin issues a one-time **reset link**,
  valid for 24 hours, and sends it like an invite (§11.1); the person chooses the new
  password themselves. The admin never knows it.
- **Changing an email** takes effect at once and signs the person out everywhere; they
  sign in again with the new address.

### 11.4 People who leave and come back

A person's time with the team is recorded as **work periods** — from the day they joined
(or rejoined) to the day they were removed. Removing someone closes their current
period; re-inviting them opens a new one when they accept.

Every week-by-week figure uses these periods: a person is expected to file only in weeks
they were on the team. Someone who left in week 12 and returned in week 20 is simply not
counted for weeks 13–19, rather than appearing as "Not started" for seven weeks, and their
history before week 12 stays exactly as it was.

---

## 12. Backend Requirements

- REST API with proper request validation
- Role-based access control on all relevant endpoints
- Report ownership authorization (a team member's end-of-week report content is theirs
  and their managers' only)
- Clean controller / service structure with separation of business logic and routes
- Pagination and filtering on all endpoints returning lists of reports

### Database (MongoDB)

The schema should clearly represent:

- Users, roles, work periods, leave periods, and which account is the owner
- Projects and their plans
- Tasks, which span days and weeks
- Reports, their daily updates and work lines
- Report versions and submission timestamps
- Report statuses, approval requests, and comment threads
- Blocker resolution state, stored outside report content
- Holidays
- What each person has already seen, for the "new" markers (§17)

---

## 13. Public Landing Page

A marketing landing page is **in scope**, recorded here because it was specified in
`brand_design_strategy.md` §6–§7 and never declared as a requirement — which made it
undeclared scope rather than an agreed feature.

It exists for one reason: this is a portfolio project, and the product has no customers,
so the page has to carry the credibility a customer list normally would. It is the only
part of the product that is not behind the login.

- **Route `/` serves two pages.** An unauthenticated visitor gets the landing page; a
  signed-in user gets "This week" (`product_design_system.md` §3.1). One route, resolved
  by session, so a returning user never lands on marketing.
- **The primary call to action follows what the instance can actually do.** Registration
  is first-run bootstrap only (§1), so on a seeded instance `/signup` is closed and
  advertising it would send every visitor into a wall. The page asks the API whether
  bootstrap is still available: if it is, the primary action is **Create your account**;
  if it is not, the primary action is the **demo** (§14) and the signup link is not
  rendered. One endpoint, one condition, and the page never promises what the instance
  will refuse.
- Its full specification — copy rules, the honesty rules and the checklist — is
  `brand_design_strategy.md` §6–§12; its visual design is the built reference
  `landing-reference/index.html`. **The landing page has its own green theme
  and typeface; the app and the demo do not use it** (`brand_design_strategy.md` §6.0).
- No pricing, no payment, no invented testimonials or customer logos.

---

## 14. Demo

A hands-on tour of the product, reachable from the landing page without signing up.

- **Three perspectives.** The visitor chooses to try the product as a **Team member**, a
  **Manager** or an **Admin**, and can switch between them.
- **The real screens, with made-up data.** The demo runs the actual application pages,
  fed by a fixed set of hard-coded sample data held in the browser. **No database, no
  server and no account are involved.**
- **Everything works.** Each perspective can do what that role can do — post an update,
  comment, submit, approve, send back, add a project, mark someone on leave. The changes
  live only in that browser tab: **refreshing the page returns everything to its
  starting state.**
- Every screen carries a `SAMPLE DATA` marker, and the data is the fictional cast in
  `brand_design_strategy.md` §10.

Because the demo never touches the server or the database, it cannot go stale, cannot be
damaged by a visitor, and needs no special accounts or permissions on the server.

Full specification: `product_design_system.md` §3.14 and `tech_stack.md` §6.9.

---

## 15. Leave

Everyone at work needs to know who is away. A person on leave is not missing a report —
they are on leave, and the product says so.

- **Every person has an On leave toggle.** It can be switched on and off by the person
  themselves, or by any manager or admin (for someone who is away and can't do it).
- **Everyone can see who is on leave — team members included.** Each person's "This week"
  page lists who is currently on leave, and the person's profile, the People page, the
  team updates and the dashboard all show it.
- Switching the toggle on and off records a **leave period** — when it started, when it
  ended and who set it — so past weeks stay accurate after the person is back.
- **Days on leave need no daily update.** A week counts as "On leave" only when leave
  covers all of its working days. Such a week shows "On leave" instead of "Not started",
  expects no report, and is left out of the compliance rate. A partly-away week still
  expects updates and a report for the days worked.
- The toggle starts leave now and ends it now. **Booking leave in advance is not in
  scope**; it would be a later addition, and the period model already supports it.

**Not the same as leaving the company.** Someone who leaves the job is *removed* (§11)
and may later be re-invited; that is recorded as work periods (§11.4), not as leave.

---

## 16. Holidays

Admins record the team's public holidays; there is no holiday calendar library or feed,
by decision, to keep the product simple.

- **Admins add, rename and remove holidays**, each a date and a name ("Vesak Full Moon
  Poya Day"). Only weekdays matter; weekends are already days off.
- **A holiday applies to everyone.** No daily update is expected that day, the day shows
  "Holiday" in every week strip, and it does not count as a used day in any project's
  plan (§7).
- If every working day of a week is a holiday, that week expects no report; the dashboard
  shows it as a **Holiday week** and leaves it out of the compliance rate.
- Everyone can see the holidays: they appear in the week strips and the week picker.

---

## 17. "New" Markers

The product sends no emails and no push notifications. Instead, anything a person hasn't
seen yet carries a **"new" marker** until they open it:

- **Comments and replies** — on their daily updates, on their week, or in any thread they
  have written in
- **Their report's status changed** — it was approved or sent back
- **Approval requests** (managers and admins) — submitted reports asking for approval,
  counted beside "Review desk" in the sidebar

Opening the item clears its marker. There is no notification list and no bell; the marker
sits on the thing itself.
