# WeeklyView — User Manual

*The complete guide to every part of WeeklyView: what it is, who can do what, and how each
feature works, in the order you meet them.*

Version: built through stage C10, the landing page revamp and the landing polish (October 2026).
Stage C11 (deployment) and the whole-app polish may change some screens' look, not how they work.

---

## How to use this manual

- **New to WeeklyView?** Read Parts 1–3 in order. They explain the idea, the roles and the
  everyday week.
- **Looking for one feature?** Use the **Feature index** (straight after the Table of contents).
  It lists every feature, the section that explains it, and where it lives in the app.
- **Words in bold italics** (like ***Needs correction***) are the exact words you see on screen.
- Page addresses are shown like `/reports/2026-W40`. They're what appears after the site name
  in your browser.

---

## Table of contents

**Part 1 — The idea**
1. What WeeklyView is
2. Key words (glossary)

**Part 2 — Getting in**
3. Roles: Team member, Manager, Admin, Owner
4. Creating the first account (the owner)
5. Signing in and out
6. Joining from an invite link
7. Forgotten passwords and changing your details
8. Your Account page (name, password, theme, leave)

**Part 3 — Finding your way around**
9. The layout: sidebar, top bar, week picker
10. "New" markers and the review desk count
11. Loading, offline, "Starting up" and error screens
12. Session expiry (signing back in without losing work)

**Part 4 — A team member's week**
13. The This week page
14. The week strip (Mon–Fri) and day states
15. Writing a daily update: work lines, tasks, types, hours
16. Blockers
17. Saving, posting and editing a day
18. Unsaved changes and drafts
19. Comments on a day (threads, the 10-minute rule)
20. "Open to team comments"
21. The weekly report form
22. Autosave
23. Submitting, the submit checklist and "Ask for approval"
24. Report statuses and the week's life cycle
25. When a report is sent back (correcting and resubmitting)
26. Reading a week (the week page)
27. Versions (revision history)
28. Printing a report
29. My reports (your history)
30. Team updates (the team's days)
31. Your numbers and My projects (This week panels)

**Part 5 — A manager's work**
32. Who sees what (privacy rules)
33. The review desk
34. The review page: Approve, Send back, Comment only
35. When two managers act at once (stale version)
36. The team dashboard
37. The Updates squares and their legend
38. Projects: plans, progress and Extend plan
39. People and a person's profile
40. Setting someone's leave

**Part 6 — An admin's work**
41. Users: invite, roles, email, reset links, remove, re-invite
42. The owner and passing ownership on
43. Holidays

**Part 7 — Team-wide rules**
44. Leave
45. Holidays and holiday weeks
46. People who leave and come back
47. Task statuses and carried-over tasks

**Part 8 — Outside the app**
48. The landing page
49. The demo (and the guided tour)

**Part 9 — Reference**
50. Permission tables
51. Status and state reference
52. Running WeeklyView yourself (for the owner / developer)

---

## Feature index

| Feature | Section | Where in the app |
| --- | --- | --- |
| Account page (name, password, theme, leave) | §8 | Sidebar → your name → **Account** (`/account`) |
| Activity list (recent activity) | §36 | **Team dashboard** (`/team`) |
| Approve a report | §34 | **Review desk** → a request (`/review/...`) |
| Ask for approval | §23 | Weekly form, bottom bar |
| Autosave (weekly form) | §22 | Weekly form, bottom-left |
| Blockers (write) | §16 | This week → day panel |
| Blockers (resolve) | §16 | Week page, on the day's row |
| "Both sides" (team member vs manager) | §32 | Throughout |
| Carried-over tasks | §47 | Weekly form |
| Charts (tasks completed, hours by type, workload) | §36 | Team dashboard |
| Comments on a day | §19 | Week page / This week / Team updates |
| Comments on the week (overall comments) | §34 | Week page and review page, right-hand column |
| Compliance | §36 | Team dashboard, top numbers |
| Confirm before ending leave | §44 | Account, profile, Users, This week |
| Dark theme | §8 | Sidebar → your name → **Appearance** |
| Day cards | §26 | Week page, This week, Team updates |
| Demo (three perspectives) | §49 | Landing page → **See the live demo** (`/demo`) |
| Guided tour (demo) | §49 | `/demo` → **Take the guided tour**; in the demo, **Tour** in the demo bar |
| Drafts (unposted text kept until sign-out) | §18 | This week |
| Edit email (admin) | §41 | **Users** → **⋯** → **Edit email** |
| Edit / delete a comment (10 minutes) | §19 | On your comment |
| Error toast with Retry | §11 | Appears bottom-right on a failed save |
| Extend plan | §38 | **Projects**, or Team dashboard → Projects table |
| Holidays (manage) | §43 | **Holidays** (`/holidays`) |
| Holiday week | §45 | Week states everywhere |
| Hours | §15 | Day panel, every work line |
| Hours by task type | §21, §36 | Weekly form section 05; dashboard chart |
| Invite a person | §41 | **Users** → **Invite person** |
| Landing page | §48 | `/` when signed out |
| Leave (turn on/off) | §44 | Account, profile, Users (managers: anyone) |
| Leave history | §39 | A person's profile (managers and admins) |
| Make owner | §42 | **Users** → **⋯** → **Make owner** |
| My projects | §31 | This week |
| My reports (history) | §29 | Sidebar → **My reports** (`/reports`) |
| "New" markers | §10 | Sidebar dots, rows, comments |
| Next in review desk | §34 | Review page after a decision |
| Not started | §24 | Week states |
| Offline strip | §11 | Top of the app when the connection drops |
| On leave (week state) | §24, §44 | Week states |
| Open to team comments | §20 | Day header switch |
| Password change | §8 | Account |
| Password reset link (admin) | §7, §41 | **Users** → **⋯** → **Password reset link** |
| People list and profiles | §39 | **People** (`/people`) |
| Planned hours / working days | §38 | Project plan |
| Post a daily update | §17 | This week → day panel → **Post update** |
| Print a report | §28 | Week page → browser **Print** (Ctrl+P) |
| Privacy rules | §32, §50 | Throughout |
| Projects | §38 | **Projects** (`/projects`) |
| Remove a person / re-invite | §41, §46 | **Users** |
| Report statuses | §24 | Status chips everywhere |
| Review desk | §33 | Sidebar → **Review desk** (`/review`) |
| Roles | §3 | Users → Role column |
| Send back | §34 | Review page |
| Session expiry sign-in window | §12 | Appears over any page |
| Sign up (first account only) | §4 | `/signup` |
| "Starting up" screen | §11 | Appears when the server is waking |
| Stale version banner | §35 | Review page |
| Submit / Resubmit | §23, §25 | Weekly form bottom bar |
| Submit checklist ("Before you submit") | §23 | Weekly form, side rail |
| Task types (7 colours) | §15 | Every work line |
| Team dashboard | §36 | Sidebar → **Team dashboard** (`/team`) |
| Team updates | §30 | Sidebar → **Team updates** |
| This week | §13 | Sidebar → **This week** (`/`) |
| Updates squares and legend | §37 | Team dashboard, profile |
| Users (manage) | §41 | **Users** (`/users`) |
| Versions (revisions) | §27 | Week page, right-hand column |
| Week picker | §9 | Top bar |
| Week strip (Mon–Fri) | §14 | This week |
| Weekly report form | §21 | This week → **Review and submit** (`/reports/:week/edit`) |
| Your numbers | §31 | This week, bottom |

---

# Part 1 — The idea

## 1. What WeeklyView is

WeeklyView is a web app for **daily updates and weekly reports**.

- **Every working day**, each person posts a **short daily update**: a few lines saying what
  they worked on, for how long, and anything blocking them.
- **At the end of the week**, the **weekly report builds itself** from those days. The person
  only adds what the days can't say: each task's status, plans for next week, achievements.
  Then they **submit** it.
- **Managers** read the days as they come in, comment, and can **approve** a report or **send
  it back** for correction.
- A **team dashboard** shows the whole team's week at a glance: who has posted, what's
  blocked, and how projects are tracking.

What it deliberately does **not** do: no activity tracking, no screenshots, no idle timers, and
no emails or push notifications. It contains only what people choose to write.

## 2. Key words (glossary)

| Word | Meaning |
| --- | --- |
| **Daily update** | One day's post: work lines plus optional blockers. |
| **Work line** | One piece of work in a day: task, type, what was done, hours. |
| **Task** | A named piece of work inside a project. It can run across days and weeks; its hours add up. |
| **Project** | A piece of client or internal work that tasks belong to, optionally with a plan. |
| **Task type** | One of seven categories: Development, Testing, Meetings, Documentation, Review, Research & study, Other. |
| **Blocker** | Something holding work up, written on the day it happens. Can be marked resolved. |
| **Weekly report** | The end-of-week document built from the days, then completed and submitted. |
| **Overall comment** | A comment on the whole week (by managers, or the author). |
| **Send back** | A manager returns a submitted report for correction, with a comment. |
| **Review desk** | A manager's list of reports waiting for a decision. |
| **Working day** | Monday to Friday that isn't a holiday, and on which the person isn't on leave. |
| **Expected days** | The working days on which a person was on the team; these need an update. |
| **Revision / version** | Each submission of a report is kept as a numbered version (rev 1, rev 2…). |
| **Owner** | The admin who created the team; protected from other admins. |

---

# Part 2 — Getting in

## 3. Roles: Team member, Manager, Admin, Owner

| Role | In one line |
| --- | --- |
| **Team member** | Writes daily updates and their weekly report; reads the team's days. |
| **Manager** | Everything a member does, plus reads submitted reports, reviews (approve / send back), sees the dashboard and profiles, manages projects, sets anyone's leave. |
| **Admin** | Everything a manager does, plus manages people (invite, roles, email, reset links, remove) and holidays. |
| **Owner** | One admin, the first account. Other admins can't demote, remove or change the owner. Only the owner can make someone an admin, and only the owner can pass ownership on. |

The full permission tables are in §50.

## 4. Creating the first account (the owner)

A brand-new WeeklyView has no accounts. The **first person** to visit `/signup` (or click
***Create your account*** on the landing page) creates an account and becomes the **owner**
and an admin. After that, sign-up closes: everyone else joins **by invite** (§6). If two
people try to sign up at exactly the same moment, only one succeeds.

The page is titled **Create the owner account** and says that everyone else joins with an
invite link from you. While sign-up is open, the sign-in page also offers ***No team here yet?
Create the owner account***.

All the sign-in screens (sign in, create account, invite, reset password) share one layout: the
form on the right and, on a wide screen, a WeeklyView panel on the left: a short line for that
screen on a small card (on Create account, the three steps to a team's first week), and a
small sample week that quietly plays through a week, on a gently moving grid where a few
squares softly light up (on a phone, a slim bar at the top,
and nothing moves). With "reduce motion" on, nothing on these screens moves. ***← Back to home*** above the heading returns to the start
page.

**"Couldn't reach the server" when creating an account.** If the connection drops after the
server saved your account but before its answer reached you, the page says "Your account may
already have been created. Sign in with the email you just used." Click ***Sign in*** — your
email is filled in. The same happens on an invite link; on a reset link it says your new
password may already have been saved.

## 5. Signing in and out

- Go to `/signin` (or click ***Sign in*** on the landing page — in the top bar, or under the hero's
  buttons: "Already on a team? ***Sign in***"), enter your email and password. The page is titled
  **Sign in to WeeklyView**.
- You land on **This week** (§13).
- To sign out: click **your name** at the bottom of the sidebar → ***Sign out***.
- Your session lasts several days. If it expires while you're working, see §12.

## 6. Joining from an invite link

1. An admin invites you (§41) and sends you a link, by any means (email, chat, in person).
   WeeklyView doesn't send emails itself.
2. Open the link (`/invite/...`). It shows your email and role.
3. Choose your name and a password. Your account is now active.

Rules: an invite link works **once**, and **expires after 7 days**. If it's lost or expired, an
admin can **re-issue** it, and the old link stops working.

## 7. Forgotten passwords and changing your details

There's no self-service "forgot password", because WeeklyView doesn't send email. Someone hands
you a link instead. On the sign-in page, ***Forgot your password?*** says so in two lines: "Ask an
admin to send you a reset link. Admins: ask the owner." Who that is depends on who you are:

| Your situation | What to do |
| --- | --- |
| **You know your password and want a new one** (everyone) | Sidebar → your name → ***Account*** → change your password (§8). No link needed. |
| **You're a member or a manager and forgot it** | Ask any admin. They open **Users** → **⋯** → ***Password reset link*** (§41) and send you the link. |
| **You're an admin and forgot it** | Ask the **owner**. Only the owner can issue an admin's link. |
| **You're the owner and forgot it** | No one inside WeeklyView can help; the owner is protected. Use the recovery command below. |

Whichever way you get a link: open it (`/reset/...`) and choose a new password. A reset link
works **once** and **expires after 24 hours**; a newer link replaces an older one. Resetting a
password signs that person out of every other device. Nobody, including the admin who issued the
link, ever sees or sets your password.

**Changing your email address.** You can't change your own email, except for the owner.

| Whose email | Who changes it |
| --- | --- |
| A member or a manager | Ask any admin (**Users** → **⋯** → ***Edit email***). |
| An admin | Ask the owner. |
| The owner | The owner, for their own email. |

The Account page names the owner, with an email link and their address as text. Changing an
email signs that person out everywhere; they sign in again with the new address.

**If the owner forgets their password.** This is done by whoever controls the deployment: the
person who holds the database address (`MONGODB_URI`) in `server/.env`, normally the owner.

1. On the PC that has the project and `server/.env` pointing at the live database, open a
   terminal in the project folder.
2. For the live site run (the `--` and the address are both needed, or the link points at
   `http://localhost:5173`):
   `npm run owner:reset-link -- --url https://your-site-address`
3. It prints the owner's name and email, when the link expires and the link, once. Open it in a
   browser and choose a new password.

The link is single-use and lasts 24 hours; running the command again replaces it. The command
sets and shows no password, changes nobody else, and can't be run from the website. Treat the
printed link like a password.

## 8. Your Account page

Sidebar → **your name** → ***Account***. Here you can:

- **Change your name.**
- **Change your password.** Enter the current one, then the new one (8–72 characters; a strength
  meter guides you). You stay signed in on this device; other devices are signed out.
- **Appearance:** ***Light*** or ***Dark***. The choice is remembered on this device.
- **I'm on leave** switch (§44). Turning it **off** asks for confirmation first.
- **Email:** you can't change your own email. The page names the owner, with a link to email them.
  (The owner changes their own email here.)

---

# Part 3 — Finding your way around

## 9. The layout: sidebar, top bar, week picker

- **Sidebar (left).** Grouped into ***My work*** (This week, My reports, Team updates) and, for
  managers and admins, ***Review*** (Review desk, Team dashboard) and ***Team*** (People,
  Projects, plus Users and Holidays for admins). Items you can't use aren't shown at all.
  It can collapse to an icon rail; on phones it becomes a slide-in menu (☰).
- **Top bar.** The page title, the page's single main action (e.g. ***Review and submit***), and
  on week-based pages the **week picker**.
- **Week picker.** ‹ and › move a week back or forward; clicking it opens a calendar. Holidays
  show in it.
- **Your name (bottom of the sidebar).** Opens your menu: Account, Appearance (Light/Dark),
  Sign out.
- Filters, sorting, page numbers, the week and the day all live in the **address bar**, so
  refreshing the page or pressing Back keeps your view, and you can share a link to it.

## 10. "New" markers and the review desk count

WeeklyView sends no notifications. Instead, **anything you haven't seen yet carries a small blue
"new" marker** until you open it:

- new **comments and replies** on your days, your week, or threads you've written in;
- a report of yours that was **approved** or **sent back**;
- for managers: newly **submitted** reports.

**In the sidebar**, a small blue square on ***This week*** or ***My reports*** means something new
is waiting there. ***Review desk*** shows a **number**: how many requests are waiting.
Opening the item clears its marker; reopening it later shows no marker.

## 11. Loading, offline, "Starting up" and error screens

- **Loading.** Every page shows a grey placeholder ("skeleton") while it loads, so you never see
  a blank page.
- **Empty lists** say why they're empty and, where useful, what to do next. Lists you've filtered
  down to nothing show ***Clear filters***.
- **Offline.** If your connection drops, a strip appears at the top. Pages already open stay
  readable.
- **A failed save** (e.g. a switch or a blocker toggle) **undoes itself** and shows an **error
  message with *Retry*** at the bottom-right. WeeklyView never shows "success" pop-ups; a
  change simply appears.
- **"Starting up. The server sleeps when idle; this can take up to a minute."** Shown when the
  server hasn't answered after 3 seconds. On the live site the server is on Vercel and usually
  starts in a second or two, so you will rarely see it; on a host that sleeps (Render, the
  documented alternative) the first visit after a quiet spell can take up to a minute. If it
  doesn't answer after about a minute, you get ***Try again***.
- **Something went wrong.** If a page crashes, the sidebar stays usable and the page offers
  ***Try again***.
- **Not found / no access.** A wrong address shows a "not found" page. A page your role can't use
  (e.g. a member opening `/review`) shows a "you don't have access" page.

## 12. Session expiry (signing back in without losing work)

If your sign-in expires while a page is open, a **sign-in window opens over the page**. Sign in
again and carry on: **nothing you typed is lost**. If you open WeeklyView with an old, expired
sign-in, you're simply taken to the sign-in page.

---

# Part 4 — A team member's week

## 13. The This week page

Your home page (`/`). From top to bottom:

1. **A leave or holiday line**, if it applies (e.g. "You're on leave", with ***Turn off***).
2. **A correction panel**, if last week's report was **sent back**: the manager's comment, a
   ***Reply*** button and ***Fix and resubmit***.
3. **The week strip** (§14) and the **day panel** (§15), where you write each day.
4. **This week's report** panel: its status, and the button to open the form.
5. **My projects** (§31).
6. **Recent weeks**: your last few weeks with their statuses.
7. **Your numbers** (§31).

**The top-bar button changes with the week's state:**

| Week state | Top-bar button |
| --- | --- |
| Draft, days still to write | ***Fill in [day]*** |
| All days written | ***Review and submit*** |
| Needs correction | ***Fix and resubmit*** |
| Submitted / Approved | none |
| On leave | none; an on-leave line shows instead |

**Your very first visit.** With nothing written yet, one panel replaces the rest: "Your first
week starts here." and ***Post today's update***. If you joined after the shown week's Friday
(say, you created the owner account on a Saturday), every day reads *Not on the team*, so the
panel says when your first week starts instead — e.g. "Your first week starts Mon 19 Oct. You
joined on Sat 17 Oct…" — and, once that week has begun, offers ***Go to that week***. Daily
updates are expected from the day you joined, never before.

## 14. The week strip (Mon–Fri) and day states

The five days of the week, each showing its state. Click a day to open it in the day panel.

| Day state | Meaning |
| --- | --- |
| Posted | The update is posted. |
| Missing | An expected day that's passed without an update. You can still fill it in this week. |
| Today | Today, not posted yet. |
| Future | Hasn't happened yet. **You can't write a day before it arrives.** |
| Holiday | A team holiday; no update needed. |
| Leave | You're on leave; no update needed. |
| Not on the team | A day before you joined (or after you left). |

Each day also shows its **Updates square** (§37) next to its name, the same square the team
table uses, so a day reads the same everywhere. The leave and holiday line under the strip
leads each item with its square too (the hatch for leave, the dots for a holiday). On
***This week***, the report panel shows the five squares next to **Days posted**.

## 15. Writing a daily update: work lines, tasks, types, hours

A day is **one or more work lines**. Each line has:

- **Task.** Pick one of your existing tasks, or choose ***Start a new task…*** and give it a name
  and a project. The task picker shows your projects first. Tasks run across days and weeks.
- **Type.** One of the seven types, each with its own colour mark used everywhere (lines, form,
  charts):

  | Type | Colour |
  | --- | --- |
  | Development | blue |
  | Testing | light blue |
  | Meetings | green |
  | Documentation | grey |
  | Review | red |
  | Research & study | gold |
  | Other | purple |

- **What was done.** A short description (required).
- **Hours.** Required. **Why hours?** They make the week add up: the report totals hours per
  task and per type automatically, so nobody fills in a timesheet. There's no daily limit;
  WeeklyView records, it doesn't police.

Working on three projects in one day? Write three lines; each line's project comes from its task.

## 16. Blockers

- **Optional.** Add a blocker to a day when something is holding work up, e.g. "Waiting on
  API keys from the client".
- Blockers are **written once, on the day**, and later gathered into the weekly report
  automatically.
- In the weekly report, you can flag one blocker as the week's **key** issue.
- A blocker can be **marked resolved** later, on the week page (the box on the blocker's row).
  Resolving is allowed at any status, even after approval.
- Managers use the ***Has blocker*** filter and the **Open blockers** count (§36) to see what
  needs help.

## 17. Saving, posting and editing a day

- ***Post update*** publishes the day. It's then visible to the **whole team** (§32).
- ***Save*** keeps your text without posting it (a draft, §18).
- **Edit** a posted day by opening it and choosing edit; ***Cancel*** discards your changes.
- **When can you write?** Today, or any earlier working day **of an open week** (Draft or
  Needs correction), so a missed day can be filled in later that week. Never a future day.
- **Your first posted update of a week creates that week's report** as a ***Draft***. There's no
  separate "start week" step.
- Once the report is **Submitted** (and not sent back), the week's days are **frozen**.

## 18. Unsaved changes and drafts

- Text you've typed but not posted is **kept when you switch days**.
- Text you **Save** is kept **until you sign out**, even if you leave the page or reload.
- If you try to leave the page with **unposted, unsaved text**, WeeklyView asks you to confirm.
  Closing the browser tab shows the browser's own "Leave site?" prompt.

## 19. Comments on a day (threads, the 10-minute rule)

- Each posted day can have **comments**, and each comment can have **replies**: a conversation.
- **Who can comment on a day:** its author, any manager or admin, and teammates **only when the
  day is open to team comments** (§20).
- **Edit or delete** your own comment or reply **within 10 minutes** of posting. A small counter
  shows the minutes left. After that it's permanent. Deleting asks you to confirm.
- A comment with replies, or the comment that sent a report back, can't be deleted.
- New comments show a "new" marker (§10).

## 20. "Open to team comments"

Each day has a switch, ***Open to team comments***. When it's **on**, any teammate can comment
on that day; when it's off, only the author and managers can. The author or any manager can
switch it. If the save fails, the switch flips back and an error message with ***Retry***
appears.

## 21. The weekly report form

Open it from This week → ***Review and submit*** (address `/reports/:week/edit`). Most of it is
**already filled in from your days**:

| Section | What it holds | You do |
| --- | --- | --- |
| **01 Tasks** | Every task from the week's lines, with its project and this week's hours. | **Set a status for every task** (required) and add an optional note. |
| **02 Planned for next week** | A list. | Optional. |
| **03 Blockers** | Gathered from the days. | Flag one as **key** (optional). |
| **04 Achievements** | A list. | Optional; flag one as **key**. |
| **05 Hours by task type** | Calculated from your lines. | Nothing; it's read-only and always matches. |
| **06 Notes & links** | A list. | Optional. |

**Task statuses:** ***Not started***, ***In progress***, ***Done***, ***Carried over*** (§47).

## 22. Autosave

The form **saves itself as you type**. The bottom-left shows its state: ***Unsaved changes*** →
***Saving…*** → ***Saved 14:32***. If saving fails, it says so and retries. There are no pop-ups.
Text you're typing is never overwritten by a background refresh.

## 23. Submitting, the submit checklist and "Ask for approval"

**You can submit when:**
1. **Every expected day of the week has an update.** Holidays and leave days don't need one, so
   usually you submit after Friday's update.
2. **Every task has a status.**

- The side rail's ***Before you submit*** checklist shows what's left.
- ***Submit*** looks greyed out until everything is ready. Hovering it says what's missing (e.g.
  "Friday has no update." or "2 tasks have no status."). Clicking it anyway **scrolls to the
  first problem** and highlights it.
- **Ask for approval** (the framed tick box next to ***Save***): tick it if this week's work needs a
  manager's sign-off. It starts **unticked** every time. Without it, ***Submitted*** can be the
  report's final state.
- After submitting, you land on the filed week, showing ***Submitted***.

## 24. Report statuses and the week's life cycle

| Status / state | Meaning |
| --- | --- |
| ***Draft*** | The week is under way. Days are visible to the team; your end-of-week additions are private to you. |
| ***Submitted*** | Handed in. Managers can read it. If you didn't ask for approval, this can be final. |
| ***Needs correction*** | A manager sent it back with a comment. It's editable again (§25). |
| ***Approved*** | A manager approved it. |
| ***Not started*** | A week state (not a status): no update posted yet in an expected week. |
| ***On leave*** | A week state: leave covers every working day of the week; no report expected. |
| ***Holiday week*** | A week state: every working day is a holiday; no report expected. |

```
First update posted ─► Draft ─► Submit ─► Submitted ─► Approved
                                            │
                                            └─► Send back ─► Needs correction ─► Resubmit ─► Submitted …
```

**What can still change after submission, at any status:** marking blockers resolved, and
comments and replies. These don't change the reviewed content and don't create a new version.

## 25. When a report is sent back (correcting and resubmitting)

1. A manager clicks ***Send back*** with a comment (at least 10 characters).
2. You see a "new" marker, and This week shows a **correction panel** with the comment, plus
   ***Reply*** and ***Fix and resubmit***.
3. Open the form: a panel at the top shows ***Sent back by [name]*** and the comment. You can edit
   the report and its days again.
4. Click ***Resubmit***. You may tick ***Ask for approval*** again.
5. A **new version** is created (rev 2, rev 3…); the old one is kept (§27).

## 26. Reading a week (the week page)

Address: `/reports/:week` (your own) or `/people/:id/reports/:week` (someone else's).

- **Daily updates** as **day cards**: each day has a header (weekday, date, hours, comment count,
  the open-to-team switch), its work lines, its blockers and its comment thread. Holidays and
  leave days are short calm cards; a **missing** day has a red bar.
- **Sections 01–06** of the report, **if you're allowed to see them** (§32).
- **Right-hand column:** status, ***Approval asked*** (if ticked), **Versions** (§27) and
  **Overall comments** on the week.

**What you see depends on who you are:**

| You are… | You see |
| --- | --- |
| The author | Everything. |
| A teammate | The **daily updates only**, plus "Weekly reports are shared with managers only." |
| A manager, the week is a **Draft** | The daily updates only, plus "Weekly report not submitted yet." |
| A manager, **Submitted / Approved** | Everything. |
| A manager, **Needs correction** | The version they sent back, until it's resubmitted. |

## 27. Versions (revision history)

Each submission is saved as a **version** (***rev 1***, ***rev 2***…). The ***Versions*** list on
the week page shows them with dates; click one to read it as it was. Approvals and send-backs
always apply to a **specific** version (§35).

## 28. Printing a report

On a week page, press **Ctrl+P** (or the browser's Print). The print shows **only the report**:
no sidebar, buttons or right-hand column. It always prints on a **white** page (even in dark
mode), with a status line under the title and a footer: "Week N · Name · rev R · Printed
date". Tick ***Background graphics*** in the print dialog for coloured chips; untick it for plain
black and white.

## 29. My reports (your history)

Sidebar → ***My reports*** (`/reports`). Every week you were on the team, newest first, with its
status (including ***Not started***, ***On leave***, ***Holiday week***), ***Approval asked***,
and ***Editable*** on a Draft (click to open the form).

- **Sort** by clicking column headers.
- **Filter** with ***Status*** and ***Weeks*** (from/to). ***Clear*** resets.
- Click a week to open it (§26).

## 30. Team updates (the team's days)

Sidebar → ***Team updates***. Everyone's daily updates **for one day**:

- **Day tabs** (Mon–Fri) and the **week picker**. Future days are greyed out.
- You're listed first, then everyone by name. People who haven't posted that day show as a one-line row.
- Filters: ***Only blockers*** (days with an **open** blocker) and a **project** filter.
- Click a **person's name** to open their week (§26).
- You can comment here where allowed (§19), and toggle open-to-team where allowed (§20).

## 31. Your numbers and My projects (This week panels)

- **My projects:** the projects you work on, with progress (§38). A ***Days / Hours*** toggle
  switches the view.
- **Your numbers:** a small strip of three figures about your recent weeks (e.g. reports
  filed, hours).

---

# Part 5 — A manager's work

## 32. Who sees what (privacy rules)

- **Daily updates** (lines, hours, blockers, day comments) are visible to the **whole team**
  as soon as they're posted. Teammates comment only on days opened to the team.
- **The weekly report's end-of-week content** (task statuses and notes, next week's plan,
  achievements, notes) and **overall comments on the week** are visible to **the author**, and
  to **managers and admins once submitted**. **Never to teammates.**
- **Managers comment, but never edit** someone's report. The words stay the author's in every
  version.
- **Nobody reviews their own report**, managers included. Managers' reports are reviewed by
  another manager or an admin.
- The server enforces all of this on every request; hiding buttons is just a courtesy.

## 33. The review desk

Sidebar → ***Review desk*** (`/review`). The number in the sidebar is how many requests are
waiting.

- By default it lists submitted reports that **asked for approval**, oldest first.
  ***All submitted*** shows every submitted report.
- **Your own report never appears**, under any filter.
- Filters: ***Person***, ***Role***, week range. New items have a "new" marker.
- Click a row to open the review page.

## 34. The review page: Approve, Send back, Comment only

The report on the left; on the right, the person, status, versions, overall comments and the
**action panel** (pinned, so it's always visible):

- ***Approve*** marks it Approved (an optional comment is allowed). The panel then shows
  "Approved by [you] at [time]".
- ***Send back*** needs a comment of **at least 10 characters**, and asks for confirmation
  ("Send week N back to [name]?"). The report becomes ***Needs correction***.
- ***Comment only*** adds an overall comment without deciding.
- After a decision, ***Next in review desk*** takes you to the next request, keeping your desk
  filters.
- On your **own** report the page says "You can't review your own report." and shows no actions.
- You can approve **any** submitted report, even one that didn't ask for approval.

## 35. When two managers act at once (stale version)

A decision always applies to the **version you were reading**.

- If the author **resubmitted a new version** while you were reading, your Approve or Send back
  is refused. A banner says "[Name] submitted a new version. Reload to review it.", the buttons
  grey out, and **your typed comment is kept**. Click ***Reload***, then decide.
- If two managers click at the same moment, **only one decision counts**. The other gets the
  banner, and then sees who decided. **A report can never be approved twice.**

## 36. The team dashboard

Sidebar → ***Team dashboard*** (`/team`). Managers and admins only. For the chosen week:

**Four numbers at the top**

| Number | Meaning |
| --- | --- |
| **Filed this week** (blue) | Reports submitted, out of those expected (e.g. 6 / 8). |
| **Compliance** (green) | The share of expected reports that are in. On-leave and holiday weeks are left out. |
| **Needs correction** (red) | Reports sent back and not yet resubmitted. |
| **Open blockers** (amber) | Unresolved blockers raised this week. |

**Team table:** one row per person, with their **Updates squares** (§37), projects, hours,
blocker days and status. Sort by clicking headers. The ***Status*** filter (above the table)
changes **only the table**, not the numbers. Clicking a row opens the review page (someone
else's Submitted report) or the person's week.

**Projects table:** each project's plan progress (§38), with ***Days / Hours***, **overdue in
red**, ***Extend plan***, and click a name to see who worked on it.

**Charts** (each shows a bold total on its bars, so the axis top isn't mistaken for a target):
- ***Tasks completed***: tasks marked Done in submitted reports, per week, over 4, 8 or 12
  weeks; optionally with one person's line beside the team's.
- ***Hours by task type***: the week's hours in the seven type colours.
- ***Workload by project***: hours per project, split by type.

**Recent activity:** the latest submissions, approvals and send-backs (not limited to the week).

**Page filters:** ***Person*** and ***Project*** at the top narrow the numbers, table and charts.
The week picker changes everything except Recent activity. Each block loads (and can fail)
independently.

## 37. The Updates squares and their legend

Each person's Mon–Fri as five squares; the legend sits under the table:

| Square | Meaning |
| --- | --- |
| Solid cobalt | **Posted** |
| Red tint with a thick red edge and × | **Missing** |
| Blue outline | **Not posted yet today** |
| Diagonal hatch | **On leave** |
| Dotted / distinct pattern | **Holiday** |
| Faint outline | **Later this week** |

Each state has a different **shape or pattern**, so they're readable without colour too.

The same squares appear in the week strip on ***This week*** and above the weekly form (§14),
and five small hollow squares sit above the message on an empty list.

## 38. Projects: plans, progress and Extend plan

Sidebar → ***Projects*** (`/projects`). Managers and admins create and edit projects; members
see progress on This week (§31).

- **A project** has a name (unique), a description, its people, and optionally a **plan**.
- **A plan** has:
  - a **start date** (a weekday);
  - **working days**, e.g. 20 (weekdays only, holidays skipped automatically);
  - **planned hours** (optional): the total for the **whole project, all people combined**.
    It's typed in by the manager, not calculated, and compared with the hours logged.
- **Progress is calculated, never stored:**
  - **Days used:** working days from the start date to today, skipping holidays.
  - **Days left:** working days minus days used. Past the end it reads **"overdue by N days"**
    in red.
  - **Hours logged:** every hour anyone posted against that project's tasks.
- ***Extend plan*** changes the plan (e.g. 20 → 25 days, "From 20 to 25 working days."). The old
  plan is kept under ***Earlier plans***, with who changed it.
- Adding or removing a holiday changes the dates of every plan automatically.
- ***Delete*** a project asks for confirmation.
- A project with **no plan** shows ***Set plan***.

## 39. People and a person's profile

Sidebar → ***People*** (`/people`). Managers and admins.

- The list shows each person's role, status, reports filed, last activity, and **This week**
  (click it to open their week).
- **Search** by name or email. Searching shows matches in **all** statuses ("Showing matches
  in all statuses."), including removed people.
- Status filter: ***Active*** (default), ***Invited***, ***Removed***, ***All***.
- Admins see ***Manage users*** (to the Users page).

**A person's profile** (click their name):
- "On leave since …" if they're away, with the leave switch (§40).
- **This week:** their Mon–Fri squares and the week's status, with a link to the week. For
  someone who joined after that week's working days there is no status, only the squares.
- **Four figures** about their recent weeks.
- **Leave history** (managers and admins): every leave period's **start, end and who set it**,
  newest first.
- **Every week:** their full history; away and holiday weeks aren't clickable.

## 40. Setting someone's leave

Managers and admins can turn **anyone's** leave on or off (for someone who is away and can't do
it themselves), from the person's profile or the Users page. Turning leave **off asks for
confirmation**. Each change is recorded in the leave history with your name.

---

# Part 6 — An admin's work

## 41. Users: invite, roles, email, reset links, remove, re-invite

Sidebar → ***Users*** (`/users`). Admins only. Every person, with their status
(***Active***, ***Invited***, ***Removed***).

- ***Invite person:*** enter an email and a role, then ***Create invite link***. The link shows
  **once**, with ***Copy link***. Send it yourself (§6). It expires after 7 days.
- **Re-issue invite** (**⋯** menu, on an invited person): makes a new link; the old one stops
  working.
- **Change role:** pick from the **Role** column; it saves at once (***Saved*** flashes). **Only
  the owner** can make someone an ***Admin***, whether by role change or by invite.
- ***Edit email*** (**⋯**): changes a person's sign-in email; it must be unused. They're signed
  out everywhere.
- ***Password reset link*** (**⋯**): creates a one-time link (24 hours) to send them (§7). Only the owner can do this for an admin.
- ***Mark as on leave*** / ***End leave*** (**⋯**): see §44. Ending asks for confirmation.
- ***Remove*** (**⋯**): deactivates the account. Their history stays readable and correctly
  attributed. Removing someone also ends any leave they were on and signs them out.
- **Re-invite a removed person:** invite the same email again. Their **existing account** comes
  back, so their history stays attached (§46).
- **Security:** changing someone's role, email or password, or removing them, signs them out of
  every device. Links are stored only in scrambled (hashed) form and shown in one place only.

## 42. The owner and passing ownership on

- **Exactly one owner**: the person who created the team (§4).
- **The owner is protected:** no other admin can demote, remove or change the owner's email,
  or issue them a reset link. If the owner forgets their password, see §7.
- **Only the owner** can make someone an admin, and pass ownership on.
- ***Make owner*** (**Users** → **⋯**, owner only): choose an active admin or manager. A manager
  who receives it becomes an admin. The previous owner stays an admin and loses only the
  protection. The ***Owner*** chip moves.

## 43. Holidays

Sidebar → ***Holidays*** (`/holidays`). Admins manage; everyone sees holidays in week strips and
the week picker.

- ***Add holiday:*** a weekday date and a name (e.g. "Vesak Full Moon Poya Day"). Each date can
  only be used once.
- Rename or ***Delete*** a holiday. The year selector in the top bar switches years.
- Effects: see §45.

---

# Part 7 — Team-wide rules

## 44. Leave

- Everyone has an **On leave** switch: on your **Account** page, and (for managers and admins)
  on any person's profile and the Users page.
- **Turning it on** starts leave **now**. **Turning it off** ends it now, after a confirmation
  ("Turn off your leave? Today will need a daily update.").
- **The day leave is switched on is the first day away; the day it's switched off is the first
  day back.** So turning it off today makes today a working day again.
- **Days on leave need no update.** A week counts as ***On leave*** only when leave covers **all**
  its working days; that week expects no report and is left out of compliance. A partly-away
  week still expects updates and a report for the days worked.
- **Everyone can see who is on leave**: This week lists them, and profiles, People, Team updates
  and the dashboard show it.
- Each on/off is recorded as a **leave period** (start, end, who set it) in the leave history (§39).
- Booking leave in advance isn't supported yet.

## 45. Holidays and holiday weeks

- A holiday applies to **everyone**: no update is expected, the day shows ***Holiday*** in every
  week strip, and it **doesn't count** as a used day in project plans.
- If every working day of a week is a holiday, it's a ***Holiday week***: no report expected, and
  it's left out of compliance.

## 46. People who leave and come back

Time on the team is recorded as **work periods**. Removing someone closes their period;
re-inviting them opens a new one when they accept. People are only expected to file in weeks
they were on the team. Someone who left in week 12 and returned in week 20 simply isn't counted
for weeks 13–19. Someone who **joins mid-week** is only expected on the days from their start.

## 47. Task statuses and carried-over tasks

- ***Not started***, ***In progress***, ***Done***, ***Carried over***: set in the weekly form.
- An unfinished task **carries over** into the next week, where its status can change.
- ***Tasks completed*** on the dashboard counts tasks marked ***Done*** in **submitted** reports
  (for a sent-back report, the version that was sent back).

---

# Part 8 — Outside the app

## 48. The landing page

What signed-out visitors see at `/`: a green page in its own style (Bricolage Grotesque, pill
shapes), separate from the app's look. It tells the story in order:

1. **Hero:** "A web app for daily updates and weekly reports", "Short daily notes. A weekly
   report that builds itself." Animated laptop and phone mock-ups (***Play it again*** replays
   the phone typing a blocker).
2. **Before → after:** "In most teams…" vs "With WeeklyView…".
3. **"Follow one person's week."** A guided scroll story: the section holds still while you
   scroll through 8 steps. Typed captions and drawn lines explain a work line, hours, a blocker,
   a teammate's comment, the rest of the week, and the report building itself and being
   submitted.
4. **"The manager's side."** The dashboard holds still through 10 steps: arrows explain each
   number, the squares and the legend, and the ***Show*** tabs switch by themselves.
5. **"Private where it matters."** Three privacy benefits and the no-tracking promise. ***See
   exactly who sees what*** opens the full rules table.
6. **Try the demo, FAQ, final call to action and footer** (the Mon–Fri squares animate in).

- The main button is ***See the live demo*** ("No account needed. Nothing is saved."). When the
  server says sign-up is still open (no account exists yet), it's ***Create your account***
  instead, with ***See the live demo*** beside it and no line under them. When the server says the team already exists, a line under
  the buttons reads "Already on a team? ***Sign in***". If the server hasn't answered (it may be
  waking up), only the demo button shows.
- **Phones and "reduce motion":** nothing pins, types or draws. Captions become a numbered list
  above each picture, and every picture shows its final state.
- ***Sign in*** and ***Create your account*** open their screens without reloading, with a short
  cross-fade; ***← Back to home*** (and the browser's Back button) returns the same way. The demo
  still opens as a separate page. With "reduce motion" on, the switch is instant.
- If your browser remembers a sign-in, `/` takes you into the app instead. Use a private window
  to see the landing page.

## 49. The demo (and the guided tour)

Landing page → ***See the live demo***, or go to `/demo`. **No sign-up, no server, no database.**

1. **The first screen** ("Try WeeklyView") offers two ways in: ***Take the guided tour*** (see
   below), or ***Explore on your own***: pick ***Team member***, ***Manager*** or ***Admin***.
2. **The real app** opens with **sample data** (a fictional team of eight: Nadia, Ruwan, Imali,
   Tharindu, Ayesha, Dinesh, Malith, Sanduni). A dark **demo bar** across the top shows
   ***SAMPLE DATA***, who you are, ***Switch***, ***Tour***, ***Start over*** and ***Sign in***
   (on a phone, ***Tour*** is a small route icon). Data panels carry a dashed ***SAMPLE DATA***
   tag.
3. **Everything works** for your role: post and edit days, comment, submit, approve, send back,
   add projects and holidays, change roles, mark leave. Two reports are waiting on the review
   desk, so the manager view isn't empty.
4. ***Switch*** goes back to the chooser **keeping** what you did, so you can see it from the
   other side (e.g. submit as a member, then approve as a manager).
5. ***Start over***, **refreshing the page**, or closing the tab **resets everything** to the
   starting data.
6. ***Sign in*** leaves the demo for the real sign-in page.

The demo's dates are always relative to today, so it never looks stale. At weekends, Friday is
shown as posted so the team doesn't look behind.

### The guided tour

A walk through every feature, for every role, on the real screens: about 15 minutes, or jump to
any part.

- **The story.** One team's week, in six parts: ***01 Setting up the team*** (as Sanduni, the
  owner), ***02 A member's week*** (as Imali), ***03 Reviewing and running the team*** (as
  Nadia), ***04 Fixing a sent-back report*** (Imali), ***05 Approving it*** (Nadia) and ***06
  For everyone*** (Account, appearance, where to go next). The tour switches person by itself.
  The week Imali files is **last week** (all its days are posted, so it can be submitted on any
  day); what Imali submits really lands on Nadia's review desk.
- **Each step** highlights part of the screen (the rest is dimmed) and shows a short card: the
  part of the story, who the feature is for — ***Everyone***, ***Managers and admins*** or
  ***Admins only*** — what it is, and ***Step 12 of 72 · Team member***. Each feature is
  explained once, in the part for the lowest role that has it: a manager can do everything a
  member can, so posting a day is shown once, as Imali.
- **Controls:** ***Back***, ***Next***, ***Exit***, and ***Do it for me*** where a step needs an
  action (post a day, submit, send back…). You can do it yourself, or press ***Do it for me***
  and watch: the tour fills the fields one after another, then presses the real button, with
  the outline on the part it is changing (about 1–3 seconds; with reduced motion turned on,
  everything is filled at once). While it works, ***Back***, ***Next*** and ***Do it for me***
  wait; ***Exit*** still works. Either way, once the result is on screen the card says what
  changed — for example "Done. Imali's Friday update is posted, and its square on the strip is
  now filled." — the outline moves to that result, and the tour waits for ***Next***. It never
  moves on by itself. You can always use the highlighted part of the screen.
- **Keyboard:** ← and → move between steps; Tab from the card's last button reaches the
  highlighted part; Esc ends the tour (when a window of the app is open, the first Esc closes
  that window). Focus goes back to where it was, or to ***Tour***.
- **Jump to any part:** ***Tour*** in the demo bar (or ***Jump to a part*** on the first
  screen) opens a panel listing every step, grouped under ***Everyone***, ***Managers and
  admins*** and ***Admins only***. Choosing one switches to the right person, prepares the
  sample data that step needs (for example, a submitted report waiting for ***Send back***)
  and starts there. The panel also offers ***Resume at step N***, ***Start again*** and
  ***End the tour***.
- **On a phone** the card is a sheet across the bottom of the screen (across the top, below the
  demo bar, when the highlighted part is at the bottom), and the panel fills the screen.
- **If a part of the screen doesn't appear** within a few seconds, the card says so in the
  middle of the screen and offers ***Try again*** and ***Skip this step***.
- **Switch** pauses the tour; **refreshing the page** or ***Start over*** ends it, like
  everything else in the demo.
- **Not in the tour** (they can't happen in a browser-only demo): the landing page, signing up,
  the session-expiry window, the "Starting up" screen, the offline strip, the error toast with
  ***Retry***, and the stale-version banner.

---

# Part 9 — Reference

## 50. Permission tables

**Daily updates and the week**

| Action | Author | Teammate | Manager / Admin |
| --- | --- | --- | --- |
| Read daily updates | Yes | Yes | Yes |
| Comment on a day | Yes | Only if opened to the team | Yes |
| Switch "open to team comments" | Yes | No | Yes |
| Resolve a blocker | Yes | No | Yes |
| Read the weekly report content | Yes | **No** | Once submitted |
| Edit the weekly report | While Draft or Needs correction | No | **No** |
| Comment on the week (overall) | Yes | No | Once submitted |
| Approve / send back | **No (never your own)** | No | Yes, except their own |
| Edit or delete a comment | Own, within 10 minutes | Own, within 10 minutes | Own, within 10 minutes |

**Pages**

| Page | Member | Manager | Admin |
| --- | --- | --- | --- |
| This week, My reports, Team updates, Account | Yes | Yes | Yes |
| Review desk, Team dashboard, People, profiles, Projects (manage) | No | Yes | Yes |
| Users, Holidays (manage) | No | No | Yes |

**People management**

| Action | Who |
| --- | --- |
| Invite, change role, edit email, reset link, remove | Admins (not on the owner) |
| Make someone an admin | Owner only |
| Pass ownership on | Owner only |
| Set anyone's leave | Managers and admins |
| Set your own leave | Everyone |

## 51. Status and state reference

| Name | Kind | Who sees it where |
| --- | --- | --- |
| Draft | Report status | My reports, dashboard, This week |
| Submitted | Report status | Everywhere a report is listed |
| Needs correction | Report status | Red; dashboard number, This week panel |
| Approved | Report status | Green chip |
| Not started | Week state | No update posted yet in an expected week |
| On leave | Week state | Leave covers every working day |
| Holiday week | Week state | Every working day is a holiday |
| Approval asked | Flag | Next to the status when ticked at submit |
| Posted / Missing / Today / Future / Holiday / Leave / Not on the team | Day states | Week strip, squares, day cards |

## 52. Running WeeklyView yourself (for the owner / developer)

**Parts:** `client/` (React app, landing page and demo; hosted on **Vercel**), `server/` (API;
also on **Vercel**, as a serverless function; Render is the documented alternative), database on
**MongoDB Atlas**. Planning documents are in `docs/`, progress in `PROGRESS.md`. Going live:
`docs/DEPLOYMENT.md` (Option A). For now the live site shares your `weeklyview` database, so the
database commands below change the live site too (`docs/DEPLOYMENT.md` §1.3).

**On your Windows PC** (PowerShell, in the project folder):
```
cd server
npm install
cd ..
cd client
npm install
cd ..
```
Use `cd` then `npm install`, **not** `npm --prefix client install` (on this PC that adds a bad
`file:..` line to `client/package.json`; if it appears, run `git restore client/package.json`).

- `server\.env` holds `MONGODB_URI` (your Atlas string), `JWT_SECRET` (32+ random characters),
  `CLIENT_URL`. Never commit `.env`.
- `client\.env` holds `VITE_API_BASE_URL=http://localhost:5000/api`.

**Run it** (two windows): `npm --prefix server run dev` (API on :5000) and
`npm --prefix client run dev` (app on http://localhost:5173).

**Database commands** (from the project folder, PowerShell):

| Command | What it does |
| --- | --- |
| `npm run db:empty` | Wipes the database and inserts nothing. The first person to sign up becomes the owner. |
| `npm run db:sample` | Wipes the database, then loads the sample team and six weeks of reports, relative to the current week. |
| `npm run owner:reset-link -- --url <site address>` | Prints the owner a one-time password-reset link, once (§7). Changes no password; the `--` is needed before `--url`. |

- **Both wipe whatever database `server\.env` points at.** Check `MONGODB_URI` before you run
  either. Neither runs when `NODE_ENV` is `production`.
- **After either command, sign out** in any browser that was signed in (or use a private
  window). Its old sign-in belongs to a person who no longer exists.
- **The sample accounts share the public password `weekly-view-dev`.** Don't use them on a
  database real people will use.
- To check the result, open a **private window**: after `db:empty` the landing page offers
  *Create your account*; after `db:sample` sign-up is closed and you can sign in as any account below.

(`seed` and `seed:reset` still work as older names for `db:sample`.)

Sample accounts, all with the password `weekly-view-dev`:

| Account | Role |
| --- | --- |
| sanduni@example.com | Admin, owner |
| nadia@example.com, ruwan@example.com | Managers |
| imali, tharindu, ayesha, dinesh, malith @example.com | Members |

**Checks:** `npm test` (server and client tests), `npm run lint`.

**Tips:**
- To see the landing page, use a **private window** (a remembered sign-in skips it).
- On Vercel the API starts within a second or two after a quiet spell. (On Render it sleeps, and
  the first visit shows "Starting up" for up to a minute.)
- Known, harmless warnings: `npm audit` advisories in the dev-only test tool (vitest) and
  "ESLint 9 no longer supported". A tool upgrade is planned after C11.
