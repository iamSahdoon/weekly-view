# WeeklyView — Product Design System

> **Scope: everything behind the login.** This document specifies the authenticated
> application — its shell, its pages, its components, its tokens, its motion.
>
> It is the fixed output of the **Design Systems Engineer** role. The Frontend
> Engineer should build against it and not re-decide any value in it.
>
> **Companion documents**
>
> - `brand_design_strategy.md` — brand, color, type, spacing, motion principle (§1–5),
>   landing page spec (§6–12). **Sections 1–5 are inherited here unchanged**, except
>   where §0.3 records a named extension or §0.4 records a named override. The landing
>   page's green theme (`brand_design_strategy.md` §6.0) is **not** part of this system:
>   everything described in this document, the demo included, is cobalt on cool neutrals.
> - `requirments_doc.md` — what the product does.
> - `development_approach_doc.md` — build standards and the differentiation reference.

---

## 0. Preamble

### 0.1 What was already settled (do not re-litigate)

Product name **WeeklyView**; the bracketed-bar glyph; cobalt `#1C39BB` as the single
action color; the cool-neutral surface palette; the four status colors plus
"Not started"; **Chivo / Instrument Sans / JetBrains Mono**; the spacing scale
`4 · 6 · 8 · 11 · 14 · 16 · 20 · 22 · 24 · 26 · 32 · 44 · 52 · 62 · 88 · 96`;
**zero border radius**; hairline 1px borders; and the governing motion principle —
**motion responds to user action, it does not decorate page load.**

### 0.2 Product decisions confirmed for this document

| Decision               | Answer                                                                                                                                                                                             |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Role model**         | **One navigation, filtered by role.** Admin = Manager + people and holiday management. Stored as a single `role` (`member · manager · admin`) in which admin includes manager; `isAdmin` is derived in the client, never stored (`project_structure.md` §9, C2). The admin extras are two nav items (Users, Holidays) in one extra group — there is no separate admin shell. |
| **Who files a report** | **Everyone.** Members, managers and admins all file a weekly report.                                                                                                                               |
| **Daily updates**      | **Every working day, everyone posts one — required.** It is a list of work lines (task, task type, what was done, hours) plus optional blockers. **The whole team reads them** as they are posted. Managers and admins comment on any update, their own included; teammates comment only on an update opened to the team. Comments are threads, editable for 10 minutes. `requirments_doc.md` §2.1. |
| **The weekly report**  | **Built from the days.** Its tasks, hours and blockers come from the week's lines; the person adds a status and a note per task and the optional sections, and submits — at the earliest once every working day has an update. `requirments_doc.md` §2.2. |
| **Approval**           | **Optional.** The author may ask for approval when submitting. Any manager or admin may approve any submitted report but their own, or send it back with a comment. Submitted is a complete end state. `requirments_doc.md` §4. |
| **Leave and holidays** | **Visible to everyone.** Anyone can be marked on leave, by themselves or a manager or admin. Admins add holidays. Neither a leave day nor a holiday expects an update. `requirments_doc.md` §15, §16. |
| **Who reviews whom**   | Managers and admins review members **and each other**. A team member never reviews anyone. **No one reviews their own report** — see the self-review guard in §3.5.                                |
| **The week**           | **Monday to Friday only.** Weekends do not exist in this product: no weekend cell, no weekend date in a range, no way to attribute an hour to a Saturday.                                          |
| **Mobile**             | **Full parity.** A person can post a daily update and submit a report on a phone. The day panel must be genuinely usable at 360px, not merely non-broken.                                         |
| **Notifications**      | **"New" markers only.** No email, no push, no bell, no notification list. Something a person hasn't seen yet — a comment or reply for them, a status change on their report, an approval request for a manager — carries a small "new" marker until they open it (§6.24). `requirments_doc.md` §17. |
| **Demo**               | **The real screens on hard-coded data, in the browser.** Reached from the landing page; the visitor picks Team member, Manager or Admin, and every control works. No server, no database; a refresh returns everything to its starting state. §3.14. |

### 0.3 Named extensions to `brand_design_strategy.md`

Values added beyond the brand document. They are recorded rather than introduced
silently, and anything marked **needs sign-off** is the Brand Strategist's call, not
this document's.

**Type scale (extends §4.2's five roles)**

| Step            | Value                                               | Why the brand scale doesn't cover it                                                                                                                                                                            |
| --------------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dense UI**    | Instrument Sans 400/500, **13px**, line-height 1.45 | The brand body role floors at 14px. Table cells, form labels and chips in a dense product surface need one step below that. §5.1 already calls for dense, efficient tables; 13px is the value that delivers it. |
| **Micro label** | Instrument Sans 500, **11px**, `+.02em`             | Replaces mono-caps on table headers, nav group labels and metric labels — see §0.5. Sentence case.                                                                                                              |
| **Metric**      | Chivo 700, **34px**, tabular-nums, −.03em           | §4.2 says metric numbers use Chivo but assigns no size. Compact variant 26px for narrow cells.                                                                                                                  |
| **Page title**  | Chivo 700, **28px**                                 | The floor of the brand's H2 role, fixed rather than clamped, because in-app titles sit in a fixed-height bar.                                                                                                   |

**Dark-theme colors (extends §3.3, which covers surfaces only)**

The brand document supplies eight dark surface tokens and lightened variants for two
chart colors. The dark theme needs more than that. These eight values are new:

| Token                 | Value     | Reason                                                                                                             | Contrast                       |
| --------------------- | --------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------ |
| `--acc` (dark)        | `#3552D6` | Cobalt `#1C39BB` on `--card #14171B` is too close in luminance to read as a button. Lightened two steps, hue held. | 6.2:1 with white — clears §3.6 |
| `--acc-d` (dark)      | `#2942B8` | Hover for the above                                                                                                | —                              |
| `--hair2` (dark)      | `#2E353D` | §3.3 gives one border value (`--d-line`); the system needs an emphasised divider                                   | **needs verification**         |
| `--rule` (dark)       | `#39414A` | Button outlines and dashed outlines on dark                                                                        | **needs verification**         |
| `--c1` (dark)         | `#6E86EE` | `#1C39BB` is illegible as a chart series on `--card #14171B`                                                       | **needs sign-off**             |
| `--c4` (dark)         | `#9A9D96` | Lightened Documentation grey                                                                                       | **needs sign-off**             |
| `--c6` (dark)         | `#9E82AB` | Lightened Other                                                                                                    | **needs sign-off**             |
| `--c7` (both)         | `#9A7B2F` / `#D1AE63` (now `#D49A0C` / `#F2B932`, see §9.3's vibrancy note) | Research & study, the seventh task type added by the project owner. An ochre, clear of cobalt, pine and the corrections red | **approved by the owner as built, 2026-10-07** |
| `--st-none-bd` (dark) | `#242A31` | §3.4 specifies `--d-line`; named explicitly so the chip doesn't depend on a surface token                          | —                              |

`--c3` and `--c5` use the lightened alternates the brand document already supplies
(`#7FB889`, `#E0685E`). Every other color in §9 is the brand's own value, unchanged.

**Dimension rule.** The brand spacing scale governs **padding, margin and gap only**.
Component widths and heights (a 240px sidebar, a 38px input, an 860px document column)
are not spacing and are not required to fall on the scale; every one of them is
enumerated in §9.3 as a token so they can't drift. This rule is stated because the
brand document says not to invent intermediate spacing values and the two things were
being confused.

### 0.4 Named overrides of `requirments_doc.md`

| Requirement                                                                                         | Override                                                                                                                                                               | Reason                                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| §6 — "Submission compliance rate (submitted vs **pending vs late**)"                                | **"Late" is removed from the product.** There are two states for compliance: filed and not yet filed. No deadline, no late chip, no ochre modifier, no `--late` token, and no reserved value held in waiting. | No submission deadline exists in the product, so "late" could not be computed. It also sits badly against the brand's "never nagging on pending work." Introducing a deadline later would be a product decision that designs its own affordance; reserving a hex for it in advance only kept a dead concept alive across four documents. `brand_design_strategy.md` §3.4 has been corrected to match. |
| §2 — "Hours Worked — broken down by task type (e.g. Development, Testing, Meetings, Documentation)" | **Seven fixed categories**: Development, Testing, Meetings, Documentation, Review, Research & study, Other. Now recorded in `requirments_doc.md` §2.3 itself.          | The original list was illustrative ("e.g."). The first design fixed six to match the brand's six chart colors; the project owner added Research & study, and the palette gained a seventh color (§9.3, `brand_design_strategy.md` §3.5). |

### 0.5 Typographic discipline — where mono is allowed

`development_approach_doc.md` names "ALL-CAPS labels above every section" and
"monospace for small data labels as decoration" as generic template chrome, and
`brand_design_strategy.md` §11 carries both forward. A dashboard is the easiest place
in the world to violate this, because every label is small. So the permission is a
**closed list**, and anything not on it uses Instrument Sans in **sentence case**.

**JetBrains Mono is used only for:**

1. Timestamps and dates — `11 Sep 09:14`, `14–18 Sep`
2. Week and revision identifiers — `W38`, `rev 3`
3. Numbers in data positions — table numerics, metric values' sub-line figures, axis
   tick labels, pagination counts, hours, percentages
4. The section number in a report form eyebrow — the `01`, not the words after it
5. The `SAMPLE DATA` pill — one deliberate marker, carried over from the landing page

**Moved off mono and out of caps in this revision:** table headers, sidebar group
labels, metric cell labels, the top-bar back-link, the autosave indicator's words
(its clock time stays mono), the `+ Add task` button, the `Key` flag label, the
read-only strip, breadcrumbs, the role chip, empty-state eyebrows.

**All-caps appears in exactly one place in the product**: the `SAMPLE DATA` pill.

### 0.6 The surface model — memorise this

Four levels, and every panel in the product sits on exactly one of them.

```
L0  --paper   page background                        the canvas
L1  --card    chrome (sidebar, top bar) and panels   the sheet
L2  --tint    sunken fills: inputs, table headers, alternating cells
L3  --tint2   sunken-inside-sunken: mini-UI, totals rows, disabled fills
```

There is **no fifth level and no shadow-based elevation.** Separation is done with
1px `--hair` borders. The single exception is floating layers (modal, dropdown,
popover, toast, tooltip), which get `--shadow-pop` — see §6.19.

---

## 1. Application shell

### 1.1 The decision: persistent left sidebar + a 62px top bar

**Chosen: sidebar.** Justification, since the brief asks for one:

1. **An admin's nav reaches nine destinations in four groups.** A top bar can hold a
   handful of flat links; it cannot hold labelled groups without a dropdown, and
   burying the review desk or the team's updates in a dropdown buries the product's
   core loops.
2. **The vertical hairline is the identity.** The design language is a ruled ledger.
   A full-height 1px rule down the left edge is that language applied to the frame;
   a top bar alone gives you one horizontal rule and nothing else.
3. **Width is recoverable.** The rail collapses to 62px, which answers the real
   objection to sidebars in table-heavy products.
4. **The top bar is freed for work** — page title, week context, primary action,
   consistently, on every page.
5. **One frame for both roles.** A member sees the same shell with fewer items.

The member's sidebar is short — three destinations. That is fine and it is not padded
out with invented pages. The sparseness is honest.

### 1.2 Dimensions

| Element                            | Value                                               |
| ---------------------------------- | --------------------------------------------------- |
| Sidebar expanded width             | `240px`                                             |
| Sidebar collapsed width (rail)     | `62px`                                              |
| Top bar height                     | `62px`                                              |
| Brand cell                         | `62px × 62px` (square at the corner when collapsed) |
| Sidebar background / border        | `--card`, 1px `--hair` right border                 |
| Top bar background / border        | `--card`, 1px `--hair` bottom border                |
| Content background                 | `--paper`                                           |
| Content gutter                     | `32px` (`20px` below 768px)                         |
| Content max width — document pages | `1240px`, centred                                   |
| Content max width — data pages     | `1560px`, centred                                   |
| Sidebar / top bar z-index          | `40` / `30`                                         |

Sidebar is `position: sticky; top: 0; height: 100dvh`. The top bar is sticky within
the content column, not across the sidebar.

### 1.3 Sidebar anatomy

```
┌──────────────────────────────┐  240px
│ [ | ]  WeeklyView        ⟨⟩  │  62px brand cell + collapse toggle
├──────────────────────────────┤  1px --hair
│  My work                     │  group label, sentence case
│  ▸ This week          •      │  nav item, 38px; "new" dot (§6.24)
│  ▸ My reports                │
│  ▸ Team updates              │  everyone
│                              │
│  Review           (manager)  │
│  ▸ Review desk          4    │  approval requests not yet seen
│  ▸ Team dashboard            │
│                              │
│  Team             (manager)  │
│  ▸ People                    │
│  ▸ Projects                  │
│                              │
│  Admin              (admin)  │
│  ▸ Users                     │
│  ▸ Holidays                  │
│              ⋮ (flex spacer) │
├──────────────────────────────┤  1px --hair
│ [NF] Nadia F.   Manager   ⌃  │  user block, 62px
└──────────────────────────────┘
```

- **Brand cell.** Glyph 18px + wordmark Chivo 800, 16px, −.045em. Collapsed: glyph
  only, centred. Collapse toggle is a 26px ghost button at the cell's right edge;
  collapsed, it moves to the centre below the glyph.
- **Group labels.** Instrument Sans 500 **11px**, `--mut`, **sentence case**, padding
  `20px 20px 6px`. Hidden when collapsed; a 1px `--hair` divider replaces each.
- **Nav item.** Height `38px`, padding `0 20px`, Instrument Sans 400 `14px`,
  `--body`. Icon 16px stroke 1.5px `--mut`, gap `11px`.
  - _Hover:_ background `--tint`, text `--ink`. 120ms.
  - _Active:_ background `--acc-l`, text and icon `--acc-txt`, **2px `--acc` left
    bar**. Weight stays 400 — the bar and tint carry the state, not bold text.
    *(Owner decision, polish 2026-10-10: the tint and bar are one layer that slides from
    the page you left to the one you opened, 200ms — §8.5, entry 23.)*
  - _Focus-visible:_ the universal ring, 2px `--acc`, inset (§6.0).
  - _Count_ (review desk only): right-aligned, **mono 11px** `--mut`, tabular — the
    number of reports asking for approval that this manager hasn't opened yet. No
    colored pill. Absent when zero.
  - _New dot_ (This week, My reports): a `6×6px` `--acc` square at the right edge when
    something on that page is new for this person (§6.24). No number.
- **Collapsed rail.** Icon only, centred. Label appears as a tooltip after 350ms.
  The active 2px left bar remains.
- **User block.** Avatar 28px square; name Instrument Sans 500 13px `--ink`; role chip
  below — Instrument Sans 500 11px `--mut`, sentence case (`Member` / `Manager` /
  `Admin`), `--tint` background, 1px `--hair`, `3px 6px`. Chevron right. Click opens a
  popover **upward**: _Account · Appearance (Light / Dark) · Sign out_.

### 1.4 Role differences in the shell

|                     | Team Member                         | Manager                                          | Admin            |
| ------------------- | ----------------------------------- | ------------------------------------------------ | ---------------- |
| My work             | This week, My reports, Team updates | same                                             | same             |
| Review              | —                                   | Review desk, Team dashboard                      | same             |
| Team                | —                                   | People, Projects                                 | same             |
| Admin               | —                                   | —                                                | Users, Holidays  |
| Top-bar week picker | on _This week_, _Team updates_      | also on _Team dashboard_                         | same             |
| Role chip           | `Member`                            | `Manager`                                        | `Admin`          |

The review desk has **no** week picker: it is a queue, oldest first across weeks, and its
week-range filter (§3.5) is the only week control it needs.

Because managers and admins also file reports, **My work is present for every role**.
It is the **first** group for members and the **last** group for managers, reflecting
where each role's attention actually starts.

### 1.5 Top bar anatomy

Two-line left block, single-line right block, vertically centred in 62px.

```
┌────────────────────────────────────────────────────────────────────┐
│ ‹ My reports                      ⟨ W38 · 14–18 Sep ⟩              │
│ Week 38 report                             [Save] [Submit]        │
└────────────────────────────────────────────────────────────────────┘
```

- **Line 1 (back-link / context):** Instrument Sans 400 **12px** `--mut`, sentence
  case. Rendered only on second-level pages. Hover: `--ink`, 1px underline.
- **Line 2 (page title):** Chivo 700 `17px`, −.02em, `--ink`. The 28px page-title step
  is used _inside_ the content column on top-level pages, not in the bar — the bar's
  title is wayfinding, the in-page title is the heading.
- **Right:** week picker → secondary action → primary action. Gap `11px`.
  **Never more than one primary action in the bar.**

### 1.6 Breadcrumbs

**There are none on ordinary routes.** The IA is two levels deep and a two-crumb
breadcrumb is chrome for its own sake; the back-link does the same job in less space.
A Breadcrumb component exists (§6.20) for the one three-level route,
`People → Nadia F. → Week 31`, and for nothing else.

### 1.7 Skip link and persistence

A visually-hidden "Skip to content" link is the first focusable element; on focus it
appears at `16px/16px` as a cobalt-outlined button. `<nav>`, `<main>`, `<header>`
landmarks required. Collapse state persists in `localStorage` as `wv.nav.collapsed`.

---

## 2. Light or dark — the product's base surface

### 2.1 Decision

**The product's base surface is LIGHT.** `--paper` `#F6F8F8` is the page, `--card`
`#FFFFFF` is the panel. A complete **dark theme ships as a user toggle**, defaulting
to light for every account on first load.

### 2.2 Why light is the base, not dark

`brand_design_strategy.md` §3.3 calls the product's personality a dark control room
and uses dark as two accent bands on the light marketing page. It is tempting to read
that as "the real product is dark." It shouldn't be.

1. **The product's primary act is writing, not monitoring.** The report form is the
   most-used surface and it is text entry every working day, plus a weekly form with a
   multi-column table. Light-on-dark is worse for sustained reading and text entry,
   and the brand's own line — _"written for the writer, not the watcher"_ — puts the
   writer first.
2. **The identity is a printed ledger.** Hairlines, zero radius, tabular figures,
   "every revision kept." That is paper. Cobalt ink on cool white _is_ the brand.
3. **Dark is worth more as an accent than as a default.** If the whole product is
   dark, the marketing page's two dark bands stop meaning anything.
4. **The dark tokens largely exist**, so offering dark as a preference costs one CSS
   block plus the eight values recorded in §0.3.

### 2.3 The toggle

- Location: sidebar user popover → **Appearance**, a two-option segmented control
  (`Light` / `Dark`). Also on the account settings page (§3.11). Not a floating icon.
- Default: **light for everyone on first load**, deliberately ignoring
  `prefers-color-scheme`, so the first impression matches the authored design and the
  marketing page it followed.
- Persistence: **per device**, not per account. The choice is written to the
  `localStorage` key `wv.theme` and applied before paint via
  `<html data-theme="light|dark">`. It does not travel with the account: there is no
  theme field on the user document and no endpoint to write one
  (`database_schema.md` §1.1). Appearance is a property of the screen you are looking
  at — a phone in the evening and a desk monitor at noon are not the same request — so
  storing it server-side would be the wrong default as often as the right one, and it
  would buy a field, an endpoint and a sync path for it.
- `color-scheme: light dark` on `:root` so native controls and scrollbars follow.

### 2.4 Completeness requirement

Both token sets in §9 are complete: surfaces, text, borders, accent, focus, all five
statuses, all seven chart colors, the shadow, disabled states. A component may **never**
hard-code a hex value. If a value is missing in dark mode, the fix is to add a token
to both sets — not a `dark:` override on the component.

### 2.5 If scope must be cut

Ship light-only first. Because every color is referenced through a semantic custom
property, adding dark later is one `[data-theme="dark"]` block and a toggle, with no
component changes. Do **not** cut the token indirection to save time; that is the part
that makes dark cheap later.

---

## 3. Page-by-page specification

Conventions: **L0–L3** are the surface levels from §0.6. "Panel" means a `--card`
surface with a 1px `--hair` border and zero radius. Every page's loading state uses
layout-matched skeletons (§6.16), never a centred spinner; every error state uses the
inline error panel (§6.15).

### 3.0 Grid and page rhythm

|                          | Value                                                                            |
| ------------------------ | -------------------------------------------------------------------------------- |
| Page top padding         | `32px` below the top bar                                                         |
| Page bottom padding      | `88px`                                                                           |
| Gap between major blocks | `32px`                                                                           |
| Gap inside a panel       | `20px`                                                                           |
| Panel interior padding   | `24px` (`20px` dense data panels)                                                |
| Grid                     | 12 columns, `24px` gutter                                                        |
| In-page H1               | Chivo 700 28px, −.035em, `--ink`, optional `--mut` 14px support line `6px` below |

> **Owner decision (polish, 2026-10-10) — containers keep to the left.** A page's container
> starts at the content column's left gutter instead of centring in it. The top-bar title
> sits at that edge, so a narrow page (Holidays, Account at `doc` width) lines up under its
> own title instead of floating in the middle of a wide screen. Max widths are unchanged.

Pages whose top-bar title is sufficient (_Report history_, _Users_, _Holidays_,
_Team updates_, _Review desk_) skip the in-page H1 and start with the filter bar. Pages
that are a document or a briefing (_This week_, _Team dashboard_, _Profile_, _Projects_)
carry it.

---

### 3.1 Home — "This week" (every role)

**Route:** `/` · **Top bar:** title "This week", week picker, primary action varies by
state (table below).

**`/` resolves by session.** A signed-in user gets this page. An unauthenticated visitor
gets the marketing landing page specified in `brand_design_strategy.md` §6–§7 and
declared as scope in `requirments_doc.md` §13. One route, two pages: the landing page is
a first impression, and a returning user should never be shown it again.

**Grid:** 12-col, max `1240px`.

```
┌─────────────────────────────────────────────────────────────┐
│  This week                                    (H1 28px)     │
│  Mon  Tue  Wed  Thu  Fri      week strip = daily updates    │
│  On leave: Dinesh K.   ·   Holiday Wed: Vesak Poya          │
├─────────────────────────────────────────────────────────────┤
│  DAY PANEL — the selected day's update (§4.11)              │
├─────────────────────────────────────────────────────────────┤
│  ┃ Needs correction — the send-back comment   (conditional) │
├─────────────────────────────────────────────────────────────┤
│  cols 1–8  this week's report   │  cols 9–12  my projects   │
├─────────────────────────────────────────────────────────────┤
│  cols 1–8  recent weeks         │  cols 9–12  personal strip│
└─────────────────────────────────────────────────────────────┘
```

- **Week strip — the daily-update control.** The signature five-day device, doing real
  work: each cell is one day (`requirments_doc.md` §2.1). Five equal cells labelled
  Mon–Fri, 1px `--hair` dividers, height `52px`, each a button:

  | Cell state     | Rendering                                                                                                  |
  | -------------- | ---------------------------------------------------------------------------------------------------------- |
  | Posted         | `--card`, day label `--ink`, the day's hours in mono 11px, a 6×6px `--acc` square; comment count in mono 11px `--mut`, with a "new" dot (§6.24) when a comment is unread |
  | Missing        | past working day, nothing posted: `--st-corr-bg`, "Missing" in 11px `--st-corr-fg`. Required days are marked, not hidden — the report can't be submitted until they're filled |
  | Today, not yet | `--acc-l` with a 2px `--acc` bottom bar and the word "Today"                                              |
  | On leave       | `--tint2`, "On leave" in 11px `--mut` — not selectable                                                     |
  | Holiday        | `--tint2`, the holiday's name in 11px `--mut`, truncated with a tooltip — not selectable                   |
  | Future         | `--tint`, label `--mut`, `aria-disabled`                                                                   |

  Selecting a cell opens that day in the **day panel** directly beneath. Today is selected
  on load, or the earliest missing day if there is one. **It does not animate** — the
  landing page's sweep is a marketing device, banned in-product (§8.4). Once the report is
  submitted and not sent back, cells stay selectable but their updates read-only.

  > **Owner decision (polish, 2026-10-10) — one square language.** Every cell carries its
  > day's **Updates square** (§3.7) at `10px` beside the label, in place of the posted-only
  > 6×6 square: solid cobalt posted, the red × missing, the cobalt outline today, the hatch on
  > leave, the dots on a holiday, a faint outline later in the week — so the strip, the team
  > table, the profile and the legend read the same. Cells you can open get a hover tint.
  > The strip still never sweeps; only the chosen day's 2px bar slides to the day you pick,
  > and the day panel's new content fades in from the side it came from (§8.5, 25–26).
- **Leave and holiday strip.** A single `--tint` line under the week strip, present only
  when there is something to say: "On leave: Dinesh K., Malith W." and, if the week has a
  holiday, "Holiday Thu 17 Sep: Vesak Full Moon Poya Day". Names as plain text. A person
  on leave sees "You're on leave" with a `Turn off` text button. *(Owner decision, polish
  2026-10-10: each item leads with its 10px Updates square — the leave hatch, the holiday
  dots — instead of a middle-dot separator, so the line wraps cleanly on a phone.)*
- **Day panel.** Specified in §4.11: the composer for the selected day, or the posted
  update with its lines, blockers and comment threads.
- **Correction panel (conditional).** Only when status is _Needs correction_. Background
  `--st-corr-bg`, 1px `--st-corr-bd`, **2px `--st-corr-fg` left bar**, padding
  `20px 24px`: "Sent back by Ruwan P." in 12px `--mut` with `11 Sep 09:14 · rev 2` in
  mono; the comment in 16px `--ink`; a secondary `Open and fix`; and `Reply` opening the
  thread (§6.23).
- **This week's report panel.** Header: "Week 38" (Chivo 700 17px), date range (mono 11px
  `--mut`), status chip right, and an `Approval asked` label (11px `--mut`) when it was
  asked for. Body, a 2-col definition grid: _Days posted_ (`3 of 4` — holidays and leave
  excluded), _Hours logged_, _Tasks_, _Projects_, _Key blocker_, _Last saved_. Absent
  values render `—` in `--mut`. Beneath, when the week has **overall comments**, the
  newest in full with its author and "+ 2 more" linking to the week's threads. *(Owner
  decision, polish 2026-10-10: the grid is 3 columns from 640px and 2 below, values in mono
  14px (was 13px); _Key blocker_, free text, takes the last row across the grid; _Days
  posted_ carries the week's five 10px Updates squares after its count.)*
- **My projects panel** (every role). One row per active project the person is assigned
  to: name, a §6.25 progress bar, and "8 days left" or "overdue by 2 days" in 12px. The
  days/hours toggle sits in the panel header. Absent when the person has no projects.
- **Primary action follows the week's state** — the action keeps its name everywhere:

  | State                               | Top bar primary        | Panel button                        |
  | ----------------------------------- | ---------------------- | ----------------------------------- |
  | Today not posted, week open         | `Post today's update`  | `Open this week's report` (secondary) |
  | Days missing, week open             | `Fill in Tuesday`      | same (secondary)                    |
  | All days posted, Draft              | `Review and submit`    | same                                |
  | Needs correction                    | `Fix and resubmit`     | `Open and fix`                      |
  | Submitted / Approved                | none                   | `View report` (secondary)           |

  The daily update leads because it is the action taken every working day; the report
  is taken once. Needs correction is the exception: a sent-back report is the thing
  demanding attention.
- **Recent weeks.** Five rows, `40px`: week id mono, status chip right, hours mono, a
  "new" dot when something on that week is unread. Footer text link `All reports`.
- **Personal strip.** Three cells, metric type (§7.1). Factual, never evaluative:
  **Weeks filed · Hours logged this month · Open blockers.** No streaks, no compliance
  score, no approval rate on your own page.

| State                       | Treatment                                                                                                                                                                     |
| --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Empty** (nothing ever)    | Week strip renders. A single panel: Chivo 17px "Your first week starts here.", body "Post what you did today. Your weekly report builds itself from your daily updates.", primary `Post today's update`. Other panels not rendered — no zero-filled cells. *(Owner decision, auth pages 2026-10-17 — **joined after the week**: when none of the shown week's days can be posted because the person joined after its Friday (e.g. the owner signs up on a Saturday, so every day reads "Not on the team", or a holiday), the panel says instead: Chivo 17px "Your first week starts Mon 19 Oct.", body "You joined on Sat 17 Oct, after this week's working days. Your daily updates start that Monday, and your weekly report builds itself from them.", and a secondary `Go to that week` once that week has begun (before then it can't be opened) — accepted as built by the owner, 2026-10-18. No `Post today's update`. The server rule is unchanged: updates are expected from the join date.)* |
| **Loading**                 | Skeletons: H1 `220×28`, week strip live, day panel at real height, the 8/4 pairs at real heights.                                                                             |
| **Error**                   | Inline error panel replaces the affected panel; H1 and week strip still render.                                                                                               |

---

### 3.2 The weekly report form

Full specification in **§4**. The frame:

**Route:** `/reports/:week/edit` · **Top bar:** back-link `‹ This week` and title
"Week 38 report" only — no week picker (the week never changes once its first update is
posted) and no actions: `Save` and `Submit` live in the sticky bottom bar (§4.9), so the
page has exactly one primary action (§11 rule 3).
**Layout:** sticky section rail `200px` + form column `max 1080px`, gap `44px`,
centred. Sticky bottom action bar `62px`.

---

### 3.3 Report history

**Route:** `/reports` · **Top bar:** title "My reports".
**Layout:** max `1560px`. Filter bar → table → pagination.

- Columns: `Week` (mono, w-120) · `Dates` (mono `--mut`, w-150) · `Projects` (comma list,
  truncated) · `Tasks` (`8 / 12` — done over total, w-100, numerals mono with the
  denominator in `--mut`) · `Hours` (num, w-90) · `Versions` (num, w-100) ·
  `Last activity` (mono `--mut`, w-160) · `Status` (chip, right, w-150).
- A week that asked for approval shows `Approval asked` (11px `--mut`) left of its chip
  until it is approved or sent back. A "new" dot (§6.24) sits before the week id when
  something on that week is unread.
- Sorted by week descending. Row click opens the detail; if the report is Draft or Needs
  correction it opens the **form**, and the row carries a small `Editable` hint.
- Filters: status (multi), project, week range.

| State                           | Treatment                                                                                                                                                                  |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Empty — no reports**          | Table header hidden. EmptyState: "No reports yet." / "Each week you post updates for is listed here." / primary `Post today's update`.                                      |
| **Empty — filters exclude all** | Table header **stays**. "No reports match these filters." / secondary `Clear filters`.                                                                                     |
| **Loading**                     | 8 skeleton rows at `40px` with per-column widths. Filter bar live.                                                                                                         |
| **Error**                       | Inline error panel replaces the body; filter bar and header stay.                                                                                                          |

---

### 3.4 A week, read in full

**Routes:** `/reports/:week` — your own week. `/people/:userId/reports/:week` — someone
else's. Both render this page identically; only the addressing differs. The second route
is what §3.8's history table, §3.16's team updates and the dashboard link to, and the only
route deep enough to need §1.6's breadcrumb (`People → Nadia F. → Week 31`).

**What the page shows depends on who is reading** (`requirments_doc.md` §4,
`tech_stack.md` §3.1):

| Reader                         | Daily updates | Weekly report and overall comments                          |
| ------------------------------ | ------------- | ------------------------------------------------------------ |
| The author                     | Yes           | Yes, always                                                  |
| A manager or admin             | Yes           | Once submitted; while sent back, the version they sent back  |
| A teammate                     | Yes           | No — a `--tint` note: "Weekly reports are shared with managers only." |

**Layout:** document `max 860px` + right rail `280px`, gap `44px`. This is the one page
in the product that is typographically a document.

```
┌──────────────────────────────────┬──────────────────┐
│ W38 · 14–18 Sep · rev 3          │  Status          │
│ Week 38 report          (H1 28)  │  [ Approved ]    │
│ Nadia F. · Client A, R&D         │  Approval asked  │
│ ──────────────────────────────── │  ──────────────  │
│ DAILY UPDATES  Mon … Fri         │  Versions        │
│ ──────────────────────────────── │  rev 3  current  │
│ 01  Tasks                        │  rev 2  sent back│
│ 02  Planned for next week        │  ──────────────  │
│ 03  Blockers        ┃ Key        │  Overall comments│
│ 04  Achievements    ┃ Key        │  (threads)       │
│ 05  Hours by task type           │                  │
│ 06  Notes & links                │                  │
└──────────────────────────────────┴──────────────────┘
```

- **Daily updates block**, above the document: five rows, Mon–Fri. Each posted day shows
  its **work lines** as a dense table — task, project, task type (with its §4.6 color
  swatch), what was done, hours in mono — then its blockers as §4.5 rows, then its
  comment threads (§6.23). Missing days show "Missing" in `--st-corr-fg`; leave and
  holiday days show their label. Each day carries its "Open to team comments" state as a
  small label, and a switch for the author and managers.
  > **Owner decision (2026-10-07) — daily updates are day cards.** The block was read as
  > flat, cluttered and demotivating, so each day is now its own card, and the bullet above
  > is read through this note. A card is `--card` with a 1px `--hair` border, square, no
  > shadow; cards are `20px` apart (the heading sits `16px` above the first). A **posted day**
  > has a header on the card (weekday in full in Chivo 700 17px with the date beside it in
  > mono 11px `--mut`, the day's hours in mono 13px `--ink`; at the right the comment count
  > with a small speech-bubble icon, then the "Open to team comments" switch; they wrap below
  > the title under 640px), a `--hair` rule, then up to three sections separated by `--hair`
  > rules, each `20px` side padding and `14px` top and bottom: the **work lines** (a table with
  > a 11px `--mut` header row; task over project, the type with its §4.6 swatch, what was done,
  > hours right-aligned in mono; stacked under 640px), the **blockers** (under a "Blockers"
  > label, §4.5 rows) and the **comments**. Comment threads on a day read as a conversation, not
  > a block: no `--tint` fill; the first comment sits flush with the card's padding, replies
  > hang off a 1px `--hair2` line under the first avatar, `Reply` and `Comment` follow. (The
  > `--tint` thread of §6.23 stays on the overall comments.) A day with **no update** is a
  > short card, one row, no table: **Holiday** and **On leave** sit on `--tint` ("No update
  > needed." in `--mut`, then the word `Holiday` in `--ink` or the `On leave` chip);
  > **Missing** keeps `--st-corr-fg`, with a 2px `--st-corr-fg` bar on the card's left edge;
  > "Not posted yet", "Not yet" and "Not on the team yet" are plain `--mut` on `--card`. The same card is used for the
  > day panel on This week (its header keeps the date, hours, posted time and `Edit`; the count
  > and switch sit in a strip beneath it; a holiday or leave day is `--tint`) and for each
  > person's posted day on Team updates (the person's heading, the strip, then the same
  > sections), `16px` apart.
- **When a manager or admin opens a teammate's Draft week**, the daily updates render in
  full and the document is replaced by a `--tint` panel: "Weekly report not submitted
  yet." / "You can read and comment on the daily updates. The rest of the report appears
  here once Imali submits it." No 403: the week is readable, only its end-of-week part
  is not.
- **When a manager opens a week in Needs correction**, the document shows the version
  they sent back, with a `--tint2` banner: "Imali is correcting this report. You're
  seeing the version sent back on 11 Sep." The corrected version appears when it is
  resubmitted (`requirments_doc.md` §4).
- **The numbering is the form's numbering** (§4.1, `01`–`06`), section for section, so a
  number quoted by a manager names the same thing the author sees.
- Section headings: mono `01` + Chivo 700 17px, with a 1px `--hair` rule `14px` beneath.
  Sections separated by `44px`.
- **01 Tasks** — one row per task: name, project, status chip (§6.8 task variant), the
  week's hours on it in mono, and the note beneath in 13px `--body`.
- The **key blocker** and **key achievement** carry a 2px `--acc` left bar and a `Key`
  label in Instrument Sans 500 11px `--acc-txt` — the same expression as the form.
- **Blocker resolution.** Every blocker row carries a resolve toggle in the left gutter,
  reusing the §4.5 key-toggle geometry: `26×26px` square, 1px `--rule`, a `10×10px`
  square outline in `--mut`. Accessible name "Mark this blocker as resolved."
  _Resolved:_ inner square filled `--body`, text drops to `--body`, and a `Resolved`
  label at the row's right edge in 11px `--mut` with the date in mono. **Never struck
  through.** Shown to the author and any manager or admin, at every status; teammates see
  the resolved state but no toggle. Saves immediately, no confirm.
- **03 Blockers gathers the week's blockers** from the days, each prefixed with its day in
  mono 11px `--mut`.
- **Carried over.** A blocker whose normalised text matches one on the same person's
  previous week carries a `Carried over` label in mono 11px `--mut`. Derived; nothing is
  stored.
- **Right rail** `position: sticky; top: 94px`: status chip, `Approval asked` when it was,
  the versions list, then **Overall comments** — every thread on the week (§6.23), each
  labelled with its version and, for a send-back or approval, the action it came with.
  Selecting a past version swaps the document and shows a `--tint2` banner "Viewing rev 2
  — sent back" with a `Back to current` text button.
- If the viewer is the author **and** status is Draft or Needs correction, the top bar
  carries a primary `Edit report`.
- **Print.** A `@media print` stylesheet: sidebar, top bar, rail and buttons hidden;
  document full width; white page; hairs to `#CCC`; status as text; a footer line with
  week, author, version and print date.

| State         | Treatment                                                                                                                         |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Empty**     | A section with no content renders its heading and a `--mut` `—`, so the document's structure is constant across people.           |
| **Loading**   | Daily-updates skeleton (five rows), document skeleton, rail skeleton.                                                             |
| **Not found** | "No report for week 31." + `Back`. Not an error panel — it isn't an error.                                                        |
| **403**       | "You don't have access to this report." Only reached by someone not on the team.                                                  |

---

### 3.5 Review desk (manager / admin)

The manager's queue: reports that asked for approval, oldest first.

**Route:** `/review` · **Top bar:** title "Review desk", no week picker and no primary
action — this page is a queue across weeks, its actions live one level down.
**Layout:** max `1560px`. Filter bar → table → pagination.

- **A two-option segmented control** leads the filter bar: **`Asked for approval`**
  (default) and **`All submitted`**. Approval is optional (`requirments_doc.md` §4): the
  default view is the work someone asked a manager to sign off; the second view is every
  report still sitting at Submitted, for a manager who wants to approve or comment on
  one that didn't ask.
- Columns: `Person` (avatar 22px + name + role chip for managers and admins) ·
  `Projects` · `Week` (mono) · `Submitted` (mono, relative, exact in a tooltip) ·
  `Versions` (num) · `Asked` (a small `Approval asked` label or `—`) · `Status` (chip,
  right). A "new" dot before the name marks a request this manager hasn't opened.
- **Default sort: submitted ascending — oldest first.** A queue is a queue.
- Filters: person, project, week range, role.
- Row click → the review page (§3.6).

**The self-review guard.** Managers and admins file reports and review each other, so the
product never lets anyone approve their own work:

- Your own report **never appears in your review desk**, in any filter combination.
- Navigating directly to `/review/:id` for your own report renders the §3.4 view with a
  `--tint` strip: "You can't review your own report." The action panel is absent, not
  disabled.
- A member who reaches `/review` gets the 403 state (§3.13).
- When the person under review is a manager or admin, their role chip appears next to
  their name in the desk, the review page and the team table.

| State                           | Treatment                                                                                           |
| ------------------------------- | --------------------------------------------------------------------------------------------------- |
| **Empty — nothing asked**       | "Nothing waiting." / "Reports that ask for approval land here." No exclamation mark, no icon.       |
| **Empty — filters exclude all** | Header stays. "No reports match these filters." + `Clear filters`.                                  |
| **Loading**                     | 6 skeleton rows. Filter bar live.                                                                   |
| **Error**                       | Inline error panel replaces the body.                                                               |

---

### 3.6 Review page

**Route:** `/review/:reportId` · **Top bar:** back-link `‹ Review desk`, title
"Nadia F. · Week 38", no primary action in the bar — the actions live in the rail, next
to the evidence.
**Layout:** document `1fr (max 860px)` + sticky right rail `320px`, gap `44px`.

- **Document pane:** exactly the §3.4 rendering, daily updates included. Above it, a
  `--tint` strip: "Read-only — you can comment, but you can't edit."
- **Right rail, top to bottom:**
  1. **Person block** — avatar 32px, name, projects, role chip.
  2. **Status block** — chip, `Approval asked` or "Approval not asked", submitted time in
     mono, version count.
  3. **Versions** — selectable, as §3.4.
  4. **Overall comments** — every thread on the week (§6.23), with a `Reply` on each.
  5. **Action panel** — `--tint` background, 1px `--hair` top:
     - Label "Overall comment", textarea, 4 rows, placeholder "Add a comment on the week,
       or say what needs to change if you're sending it back."
     - Three actions: primary `Approve`, secondary `Send back`, ghost `Comment only`.
       The same textarea serves all three: optional with `Approve`, required (≥ 10
       characters) with `Send back`, and required with `Comment only`, which adds a
       thread without changing the status.
     - `Approve` is available **whether or not approval was asked** — any manager may
       approve any submitted report but their own. No dialog, no celebratory toast; the
       chip changes and that is the feedback.
     - `Send back` opens a confirm modal, because it moves work back to another person:
       "Send week 38 back to Nadia F.?", the comment shown back, `Cancel` / `Send back`.
- After `Approve` or `Send back` the action panel is replaced by a `--tint` block stating
  the outcome and its time, plus `Next in review desk ›`. After `Comment only` the panel
  clears and stays, since the report is still open to review.

| State                                | Treatment                                                                                                              |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------- |
| **Loading**                          | Document + rail skeletons; the action panel renders disabled, not hidden.                                              |
| **Own report**                       | The self-review guard in §3.5.                                                                                         |
| **Already reviewed by someone else** | The action panel becomes a `--tint2` block: "Approved by Ruwan P. at 10:22." Comments stay possible.                  |
| **Action failed**                    | Inline error above the buttons; textarea content preserved; buttons re-enabled. Never a toast alone for a failed write.|

---

### 3.7 Team dashboard (manager / admin)

**Route:** `/team` · **Top bar:** title "Team dashboard", week picker, no primary
action — this page is for reading.

**One week at a time.** The dashboard always shows the week in the top-bar week picker;
an earlier week is reached by picking it. There is no page-wide date-range filter
(`requirments_doc.md` §6): on a one-week page a range could only move one chart, so the
tasks-completed trend carries its own 4 / 8 / 12-week window instead (§7.4).
**Layout:** max `1560px`, 12-col. Filter bar sticky under the top bar (`top: 62px`).

```
┌──────────────────────────────────────────────────────────────┐
│  Team dashboard              Week 38 · 14–18 Sep     (H1)    │
├──────────────────────────────────────────────────────────────┤
│  [ FILTER BAR: person · project ]                            │
├──────────────────────────────────────────────────────────────┤
│  4 metric cells in ONE panel: Filed · Compliance ·           │
│  Needs correction · Open blockers                            │
├──────────────────────────────────────────────────────────────┤
│  cols 1–12   TEAM TABLE   [ status filter ▾ ]                │
├──────────────────────────────────────────────────────────────┤
│  cols 1–12   PROJECTS TABLE   [ Days | Hours ]               │
├──────────────────────────────────────────────────────────────┤
│  cols 1–8  Tasks completed trend │ cols 9–12 Hours by type   │
├──────────────────────────────────────────────────────────────┤
│  cols 1–6  Workload by project   │ cols 7–12 Recent activity │
└──────────────────────────────────────────────────────────────┘
```

**Order is a decision, not a default.** The team table sits _above_ the charts because
the manager's first question every Monday is "who hasn't filed," and that is a table
question. Projects come second, charts third.

**Filters.** The page-level bar holds **person** and **project** only — the two filters
that mean something to every block. **Status lives on the team table** (below), because
a status filter applied to the headline numbers would make them meaningless: compliance
among approved people is always 100% (`requirments_doc.md` §6).

- **Metric strip:** §7.1.
  1. **Filed this week** — `9 / 12`, sub-line "3 not yet filed · 1 on leave". The
     denominator is the people **expected** this week (`requirments_doc.md` §6).
  2. **Compliance** — `75%`, sub-line "this week · 82% over 8 weeks".
  3. **Needs correction** — `2`, number in `--st-corr-fg`, sub-line "oldest sent back 3
     days ago".
  4. **Open blockers** — `3`, sub-line "raised by 3 people", counted across every report
     for the week, Drafts included.
- **Team table:** person (avatar 22px + name + role chip) · **updates** · projects ·
  status chip · approval asked · versions · hours · last activity. Everyone who files is
  in the table, managers and admins included. **Its own header carries the status
  filter** — a Secondary `sm` multi-select, `Status: Draft, Not started` when set — so it
  visibly filters this table and nothing else. Row click → the review page if Submitted
  and reviewable by you, otherwise that person's week (§3.4).
- **The updates column** is the five-day strip at table scale: five square `14×14px` cells,
  in the product's own palette (cobalt, the Needs-correction red, cool neutrals), each with a
  *shape or pattern* as well as a colour so no state depends on colour alone. *(Owner decision,
  C7 feedback, 2026-10-07 — twice amended: the first version used green and purple, which sat
  outside the system; this is the second.)* **Posted:** solid `--acc` (cobalt). **Missing:** a
  `--st-corr-bg` tint, a 2px `--st-corr-fg` edge and a `×` through it — the same danger as a
  Needs correction chip. **Today, not posted yet:** hollow, a 2px `--acc` outline. **On leave**
  and **Holiday** are two indicators, never one: leave is a `--tint2` cell with a diagonal
  hatch of `--mut` stripes, holiday a `--tint2` cell with a grid of `--mut` dots, both with a
  1px `--hair2` edge. **Later this week:** hollow, a faint 1px `--hair` outline. (A day before
  the person joined is a dashed `--hair2` outline.) A legend of the six cells with their words
  sits under the table, and a visually-hidden text equivalent ("Posted Mon, Tue; missing Wed;
  on leave Thu; holiday Fri") is always present.
- **Hours come from the daily work lines**, so every row shows them, Drafts included —
  they are shared as posted. A Draft row shows `—` only for what is still private:
  task statuses, and so the "tasks done" figure.
- **An On leave row** shows the `On leave` chip (§6.8) and doesn't count toward "Filed
  this week". A **Holiday week** row shows its chip and is likewise left out of "Filed this
  week" and of compliance.
- **Projects table.** One row per active project with a plan: name · start date (mono) ·
  §6.25 progress bar · days (`12 of 20 · 8 left` or `overdue by 3 days`) or hours
  (`96 h of 160 h`, or `96 h` without a plan), switched by a `Days | Hours` segmented
  control in the panel header · people (avatar stack). Expanding a row shows **who worked
  on it**: each person, their hours this week and in total, and their last day on it.
  Row menu: `Extend plan` (managers and admins).
- **Charts:** §7. Every visual insight in `requirments_doc.md` §6 is placed. The recent
  activity panel shows the latest eight events and has **no "All activity" button**.

| State                              | Treatment                                                                                                                                                                    |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Empty — no team**                | Metric strip hidden. One EmptyState: "No one is on the team yet." / "Invite people and their weeks will show up here." / primary `Invite people` (admin only).               |
| **Empty — nobody posted**          | Metrics render real zeros. Team table lists every person as _Not started_. Charts render their axes with "No data for week 38." centred in the plot.                         |
| **Empty — no project plans**       | The projects table shows "No project has a plan yet." / secondary `Open projects`.                                                                                          |
| **Loading**                        | Metric skeleton, 6 table rows, chart containers at real height. Filter bar live.                                                                                             |
| **Error**                          | Each block fails independently, with a compact inline error and `Retry`.                                                                                                     |

---

### 3.8 Person profile (manager / admin view)

**Route:** `/people/:userId` · Reached from the People list (§3.15), which the
back-link returns to. **Top bar:** back-link `‹ People`, title = person's name.
**Layout:** max `1240px`.

```
┌──────────────────────────────────────────────────────────────┐
│  [NF]  Nadia F.                          Manager             │
│        nadia@…  ·  Client A, Internal Tooling                │
│        Joined 04 Mar 2026                    (mono date)     │
├──────────────────────────────────────────────────────────────┤
│  4-cell metric strip: Reports filed · Compliance ·           │
│  Avg hours / week · Corrections                              │
├──────────────────────────────────────────────────────────────┤
│  Report history table (as §3.3)                              │
└──────────────────────────────────────────────────────────────┘
```

- Header: avatar 44px square, name Chivo 700 20px, role chip, projects as plain text,
  join date mono. No cover image, no banner. When the person is on leave, an `On leave`
  chip (§6.8) sits beside the role chip with "since 22 Sep" in mono.
- **Leave toggle.** Managers and admins get a `Mark as on leave` / `End leave` secondary
  in the top bar — for someone who is away and can't set it themselves
  (`requirments_doc.md` §15). No confirm: it is reversible, and the leave history keeps
  both ends of every period.
- Metrics here _are_ evaluative, because this is one person seen by a manager; the
  wording stays factual — `Corrections`, not `Rejections`; `Compliance`, not `Score`.
- **Row click opens `/people/:userId/reports/:week`** — §3.4's read-only document. Never
  the editor: §3.3's "open the editor if it's editable" shortcut is for your own reports,
  and a manager cannot edit content at all (`requirments_doc.md` §4). **Draft rows are
  clickable too**, and open the week's daily updates with the report marked "not
  submitted yet" (§3.4). They carry no hours or task counts, because the report content
  is the author's until submitted (`requirments_doc.md` §3). **Every week the person was on the team is a row, not only weeks with a report**
  (`requirments_doc.md` §8): a week with nothing filed shows `Not started`, a week spent
  away shows `On leave`, and an all-holiday week shows `Holiday week` (§6.8), so the history
  has no unexplained gaps. Those rows have no report behind them: they are not clickable
  and carry `—` for hours and tasks. Weeks outside the person's work periods are not listed.
  The status filter offers these three states as well as the four report statuses.
- Admin only: a `Manage` secondary in the top bar linking to this person's row in Users.

| State       | Treatment                                                                        |
| ----------- | -------------------------------------------------------------------------------- |
| **Empty**   | Metric strip renders zeros; table shows "This person hasn't filed a report yet." |
| **Loading** | Header skeleton (avatar + two lines), metric skeleton, 6 table rows.             |
| **Error**   | Full-page inline error + `Back to people`.                                       |

---

### 3.9 Projects (manager / admin)

**Route:** `/projects` · Page title "Projects", support line "What the team's work belongs
to, and how each project is tracking." Earlier documents called these **sections**; the
project owner chose the plain word (`requirments_doc.md` §7).
**Top bar:** primary `New project`. **Layout:** max `1240px`, table only — this list is
short and needs no filter bar.

- Columns: `Name` · `Start` (mono) · `Progress` (§6.25 bar) · `Days` (`12 of 20 · 8
  left`, or `overdue by 3 days`) or `Hours` (`96 h of 160 h`), switched by a `Days |
  Hours` segmented control in the table header · `People` (avatar stack) · actions
  (right: `Edit`, `Extend plan`, `Delete`).
- A project with no plan shows `No plan` in `--mut` in the progress columns, and `Set
  plan` in place of `Extend plan`.
- **Overdue** is stated in words — "overdue by 3 days" in 12px `--ink` — with the bar full
  and its overrun segment in `--st-corr-bd`. Not red text, not a banner: a project past its
  plan is information for a manager, not an alarm.
- **Create / edit uses a modal** (§6.11): name, description, people (multi-select), and a
  **Plan** group — start date (date picker, default today, weekends not selectable),
  planned duration in working days (number), planned hours (number, optional). Under the
  duration, a `--mut` 12px line computes the finish: "Ends Fri 16 Oct, skipping 1 holiday."
- **Extend plan** opens the same Plan group alone, with the current values filled in and
  a line naming the change: "From 20 to 25 working days." The old plan is kept in the
  project's history, shown in the edit modal under "Earlier plans".
- **Delete** opens a destructive confirm that states the consequence with the real
  number: "Delete 'Client A'? 14 tasks belong to it. Their hours stay in past weeks; the
  project stops being available for new tasks." It **deactivates**: the project leaves
  every picker and this list's default view, and past weeks keep its name. No restore UI.

| State       | Treatment                                                                                          |
| ----------- | -------------------------------------------------------------------------------------------------- |
| **Empty**   | "No projects yet." / "Projects are what the team's tasks and hours belong to." / primary `New project`. |
| **Loading** | 5 skeleton rows.                                                                                   |
| **Error**   | Inline error panel replacing the body.                                                             |

---

### 3.10 Users (admin only)

**Route:** `/users` · **Top bar:** primary `Invite person`. **Layout:** max `1560px`.
Filter bar: role, status, search.

- Columns: `Person` (avatar + name + email stacked, 13px / 12px; an **invited** person has
  no name until they accept, so the email takes the name's place and the avatar shows the
  email's first letter) · `Role` (inline
  Select) · `Projects` · `Status` (chip — `Active` and `Invited` reuse the Approved and
  Draft palettes, always with their text label) · `Joined` (mono) · actions (row menu).
- **Inline role change:** the Select writes immediately and shows a 900ms `Saved` in the
  cell. On failure it reverts and raises an error toast with `Retry`.
- **You cannot change your own role** — your row's Select is disabled with the tooltip
  "You can't change your own role."
- **Row menu:** `Edit email` · `Password reset link` · `Mark as on leave` / `End leave` ·
  `Re-issue invite` (invited rows) · `Make owner` (the owner's view, eligible rows) ·
  `Remove` (destructive, last).
- **Whose details an admin can change** (`requirments_doc.md` §11.3): any admin, for
  members and managers; only the owner, for other admins; the owner, for their own
  email. On rows the viewer can't change, those two items are disabled with the tooltip
  "Only the owner can change another admin's details."
- **Edit email** opens a small modal: the current email read-only, a new-email field,
  and a `--mut` line: "Nadia will be signed out and must sign in with the new address."
  Primary `Change email`. An address already in use is an inline field error.
- **Password reset link** opens the §3.10 link state (below) with a reset URL and the
  line "This link lets whoever has it set a new password for Nadia F. It works once and
  expires in 24 hours." Confirm first: "Create a reset link for Nadia F.? Any earlier
  link stops working." An admin never types or sees a password.
- **Remove** opens a destructive confirm naming what is kept: "Remove Nadia F.? Their
  reports stay in the archive and remain visible to managers."
- **The owner's row** carries an `Owner` chip after the name. For every other admin, its
  Role select, `Remove`, `Edit email` and `Password reset link` render disabled with the
  tooltip "The owner can't be changed by other admins."
- **Make owner (owner only).** Every row of an active manager or admin gets `Make owner`.
  It opens a destructive confirm: "Make Ruwan P. the owner? Ruwan becomes an admin and
  the protected account. You stay an admin but lose the protection. Only Ruwan can undo
  this." Buttons `Cancel` / `Make owner`.
- **Leave** — `Mark as on leave` / `End leave`, and the `On leave` chip beside the name.
- **Invite modal:** email, role, projects (optional), primary `Create invite link` — not
  `Send invite`, because nothing is sent.
- **The link state** (invites and resets) replaces the modal's body once the link exists
  — the modal does not close, because closing it would destroy the one copy of the token:
  - The URL in a `--tint` block, mono 12px `--ink`, selectable, with a `Copy link`
    secondary beside it that reads `Copied` for 900ms. No toast.
  - One `--mut` 12px line stating what the link is: "Anyone with this link can join as
    Manager. It works once and expires in 7 days."
  - Footer: a single `Done`. There is no second chance to see this link, and the block
    says so.
- **`Re-issue invite`** on an `Invited` row opens the same link state with a fresh URL:
  "Re-issue the link for nadia@…? The previous link stops working."
- An `Invited` row shows `Invited · expires 30 Sep` in the `Joined` column, and `Invite
  expired` in `--st-corr-fg` once it has.

| State       | Treatment                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------- |
| **Empty**   | Can't be truly empty. If filters exclude all: "No people match these filters." + `Clear filters`. |
| **Loading** | 8 skeleton rows.                                                                                  |
| **Error**   | Inline error panel; the invite button stays enabled.                                              |

---

### 3.11 Account settings (every role)

**Route:** `/account` · Reached from the sidebar user popover. This is a person's view
of **themselves**; §3.8 is a manager's view of _someone else_.

**Top bar:** title "Account". **Layout:** max `860px`, single column, four panels
separated by `32px`.

1. **Profile** — avatar (initials only), display name, email (read-only), role
   (read-only chip), projects (read-only list). Primary `Save changes`, enabled only when
   something has changed. Beneath the email, a `--mut` 12px line naming who can change it
   (`requirments_doc.md` §11.3):
   - **Members and managers:** "To change your email, ask the owner, **Sanduni B.**, or
     any admin."
   - **Admins:** "To change your email, ask the owner, **Sanduni B.**" — only the owner
     changes an admin's details.
   - **The owner:** "You can change your email on the Users page," with a link.

   The owner's name is a `mailto:` link addressed to them with the subject "Email change
   request", and **the owner's address sits beside it as selectable text**, because a
   `mailto:` link does nothing on a machine with no email app set up.
2. **Password** — current password, new password, confirm. Strength is a 4px meter
   (§6.22) with a plain-language line. Primary `Change password`. A `--mut` line beneath:
   "Other devices will be signed out." Forgot it? The line under the panel says: "If you
   can't remember your current password, ask an admin for a reset link."
3. **Appearance** — the Light / Dark segmented control, with "Applies to this device."
4. **Leave** — a switch "I'm on leave", with "Your team sees that you're away, and days
   you're away need no update." It starts leave now and ends it now; no date picker.

| State            | Treatment                                                |
| ---------------- | -------------------------------------------------------- |
| **Loading**      | Panel skeletons at real heights.                         |
| **Error**        | Per-panel inline error; the other panels stay usable.    |
| **Save failure** | Inline error above the panel's button, values preserved. |

---

### 3.12 Authentication screens

Product screens outside the shell: no sidebar, no top bar.

> **Owner decision (auth pages, 2026-10-17): a calm split layout.** It replaces the centred
> column described in the next paragraph for the five auth screens (sign in, create account
> open and closed, accept invite, reset password; "Forgot your password?" stays a panel on
> sign in, not a page, with no route of its own — owner decision, accepted in the PR #27 review,
> 2026-10-17). The look is the app's: cobalt on cool neutrals, Chivo / Instrument
> Sans, square corners, hairlines, no shadow, tokens only.
>
> - **From 1024px: two equal halves.** The **form side** (`--paper`) holds a 420px column:
>   at the top a `--mut` 13px "← Back to home" link to `/`; then, `max(52px, 14vh)` down, the
>   heading in Chivo 700 **40px** (`--text-title`: line-height 1.08, tracking −0.04em; 28px
>   `text-page` below 640px), the optional `--mut` line at 16px, the form panel as before, and
>   the secondary links stacked under it. The **brand panel** (`--card`, a 1px `--hair` line
>   between, sticky at full height) holds the glyph and wordmark (Chivo 800, 22px) on the same
>   line as "Back to home", and, centred in the panel, a quiet week: five 22px Updates squares
>   Mon–Fri in a hairline strip that fill in once (§8.5, entry 32), then "One short update a
>   day." (Chivo 700 20px) and "Each person posts what they did, and Friday's weekly report
>   builds itself from the five days." Nothing else — no illustration, no marketing copy.
> - **Below 1024px:** the brand panel collapses to a 52px `--card` header with a hairline
>   under it: the wordmark (17px) on the left, "← Back to home" on the right. The form comes
>   straight after it, `32px` down (`max(52px, 10vh)` from 640px).
> - **Headings and links.** Sign in: "Sign in to WeeklyView" (the tab still says "Sign in");
>   under the panel "Forgot your password?" and, **only when the bootstrap check says sign-up
>   is open**, "No team here yet? Create the owner account" (sign in asks the same A1 check as
>   the landing page — owner decision, accepted in the PR #27 review, 2026-10-17). Create account (open): "Create
>   the owner account" / "You're the first person here, so this account will be the admin and
>   the owner. Everyone else joins with an invite link from you." The other headings, every
>   field, error, route and request are unchanged.
> - The demo's chooser keeps the earlier centred column; the auth routes are not in the demo,
>   so "Back to home" never appears inside `/demo`.

> **Owner decisions (auth pages, round two after testing, 2026-10-17)** — these replace the
> composition above where they differ; the headings, copy and links above stand.
>
> - **The form is always on the left**, on every auth screen (sign in, create account open
>   and closed, accept invite, reset password, the expired-link and response-lost states).
> - **Split 55 / 45** (`11fr / 9fr`) from 1024px; checked at 1440, 1280 and 1024.
> - **Form side:** one 420px column, centred in its half both ways, with "← Back to home",
>   the heading, the panel and the links on one left edge (Back to home 24px above the
>   heading). No fixed top offset: the column is centred, so there is no dead band above it.
> - **Brand panel:** `--tint` with a faint `--hair` grid (32px); one block, max 400px, centred
>   both ways — the wordmark (22px), then a small **sample week** in the app's own style, then
>   "One short update a day." and its line. The sample week is a `--card` panel: a "This week"
>   header with the dashed `SAMPLE DATA` marker, the week strip with the real Updates states
>   (Mon–Wed posted, Thu today with its `--acc` underline, Fri a holiday on `--tint`; Wed
>   chosen, with the 2px `--ink` bar), and the posted Wednesday as a day card — "Posted
>   17:42", 7 h, two work lines with their type marks (`--c1` Development, `--c2` Testing) and
>   hours in mono. It is `aria-hidden`; the sentence under it says the same. Its squares are
>   the §8.5 entry 32 motion.
> - **Below 1024px:** unchanged — the slim header, the form first from the top.
> - **When an answer never arrives** (owner report, 2026-10-17): if Create account, Join the
>   team or Save password fails with no response, and the server then shows it already
>   happened (sign-up closed; the link used up), the screen does not say "This team is
>   invite-only." or "This link has expired". It shows a `--tint` block, drawn like the
>   expired-link one: "Your account may already have been created." / "Sign in with the email
>   you just used." (reset: "Your new password may already have been saved." / "Sign in with
>   your new password.") and a primary `Sign in`, which opens `/signin` with that email filled
>   in. Sign-up re-checks by itself right after the failure; the link screens show it when
>   the next try finds the link used.

> **Owner decisions (auth pages, round three after the second test, 2026-10-17)** — these
> replace the round-two composition where they differ (the copy, links and the response-lost
> state stand):
>
> - **The brand panel is on the left and the form on the right**, on every auth screen (sign
>   in, create account open and closed, accept invite, reset password, the expired-link and
>   response-lost states). This reverses round two's "form on the left". The form stays first
>   in the DOM, so focus, screen readers and the phone layout (slim header, form first) are
>   unchanged.
> - **A matched pair.** Two equal halves from 1024px, each holding one 420px block centred in
>   it, so the outer margins mirror (1440: 150px each side). The blocks share one grid (CSS
>   subgrid) with four rows: "Back to home" level with the wordmark; the heading's row; the
>   form's panel level with the sample card, which stretches to the panel's height (the
>   expired-link and response-lost blocks stretch the same way); the form's links level with
>   the caption. So the two blocks' top and bottom edges line up exactly, and the sample card
>   and the form card are one size. The sign-up-closed screen, whose body is one button,
>   keeps its link under the button.
> - **Never clipped.** The rows above and below the pair are at least 52px and share the rest
>   of the height, so the pair sits on the screen's centre line; when the content is taller
>   than the screen (sign up at 768px high) the page scrolls with 52px kept top and bottom.
>   Checked at 1920×1080, 1440×900, 1366×768, 1280×800/768, 1024×768 and 360, light and dark.
> - **The sample card** gains a footer, "Friday's weekly report" with a `Draft` chip, and its
>   days loop (§8.5 entry 32): Monday to Wednesday posted, Thursday today then posted, Friday a
>   holiday that is never chosen.

> **Owner decisions (auth pages, round four after the third test, 2026-10-17)** — on top of
> round three:
>
> - **The panel's own line.** Under the wordmark, beside the heading and the form panel, the
>   brand panel says something for this screen (`panelIntros.js`), Chivo 700 17px with one
>   `--body` line: sign in "Welcome back." / "Your week is where you left it."; create
>   account (open) "Three steps to your team's first week" with three numbered steps (create
>   the owner account; invite your team; everyone posts a short update each day); sign-up
>   closed "This team is already set up."; accept invite "You've been invited to join the
>   team."; reset password "A new password, then back to your week."; an expired link "Links
>   work once, for a limited time."; a lost answer "The connection dropped, not your work."
>   The page names its line; an expired link or a lost answer replaces it while it shows.
>   Any room left beside a taller form is shared above and below the line.
> - **The sample card keeps its natural height**, its bottom level with the form panel's.
>   It is never stretched.
> - **Short screens** (sign-up closed, an expired link, a lost answer) keep the heading, the
>   message and its button together, top-aligned with the brand side, instead of spreading
>   them over the shared rows.
> - **One selection mark.** The sample week's only "chosen" mark is the 2px `--ink` bar; the
>   blue "today" underline is gone (today is still the hollow square).
> - **The day change is sequential** — §8.5 entry 32.
> - **Arrival and the grid** — §8.5 entries 33 and 34.

> **Owner decisions (auth pages, round five after the fourth test, 2026-10-17):**
>
> - **The panel's line sits on a card**, drawn like the sample card: `--card`, a 1px `--hair`
>   border, square corners, no shadow, the same width, `20px` / `16px` inner padding. Every
>   screen gets the card, the one-line intros included: side by side in the screenshots, the
>   one-liners on a card read as one set with the three-step list, and bare text on the
>   moving grid was the less finished of the two.
> - **The two cards keep one 24px gap on every screen**; any room a taller form leaves goes
>   above the pair, beside the form's heading. Top and bottom edges still match the form's.
> - **A livelier grid** — §8.5 entry 34.

**Shared layout** *(before the owner decision above)*. Full-viewport `--paper`. A centred `420px` column. *(Owner decision,
polish 2026-10-10: the column starts `18vh` down, never less than `52px` (`32px` below
480px), so it sits in the upper middle of the screen rather than hugging the top; a fixed
offset, not flex centring, so nothing jumps when a skeleton gives way to a taller form. The
demo chooser shares it, and each of its three choices gains the nav's 2px `--acc` bar and a
`--mut` chevron on hover — §8.5, entry 31.)* At the top, the
brand glyph + wordmark (Chivo 800, 20px). Then a Chivo 700 28px heading, an optional
`--mut` 14px line, then the form in a `--card` panel with 1px `--hair`, `32px` padding,
fields at `44px`. Below the panel, one secondary text link. Nothing else — no marketing
copy, no illustration.

| Screen             | Route            | Heading                 | Fields                                  | Primary          | Secondary link                     |
| ------------------ | ---------------- | ----------------------- | --------------------------------------- | ---------------- | ---------------------------------- |
| **Sign in**        | `/signin`        | "Sign in to WeeklyView" | email, password                         | `Sign in`        | "Forgot your password?" (see below) |
| **Create account** | `/signup`        | "Create the owner account" | name, email, password                   | `Create account` | "Already have an account? Sign in" |
| **Accept invite**  | `/invite/:token` | "Join the team"         | name, password (email and role shown read-only) | `Join the team` | —                          |
| **Reset password** | `/reset/:token`  | "Choose a new password" | new password, confirm (email shown read-only) | `Save password` | —                             |

**"Forgot your password?"** opens a small panel, not a form: "Ask an admin to create a
password reset link for you. WeeklyView doesn't send emails, so the link comes from them."
Honest about the mechanism, and it collects nothing it cannot use.

**`/signup` has two states, and the second is the usual one.** Registration is first-run
bootstrap (`requirments_doc.md` §1). **Open**: the form, with the line "You're the first
person here, so this account will be the admin and the owner." **Closed**: "This team is
invite-only." / "Ask an admin for an invite link. You can look around the demo in the
meantime." / primary `Open the demo`. The endpoint returns 403 either way.

- **Errors are inline.** Credential failure is a single `--st-corr-bg` strip: "That email
  and password don't match." — never revealing whether the email exists.
- **A link that no longer works** (invite or reset): the panel is replaced by a `--tint`
  block — "This link has expired or has already been used." / "Ask an admin for a new
  one." / `Back to sign in`. **One state, not three**, so a stranger holding an old link
  learns nothing.
- **Loading:** primary button in its loading state; fields disabled, values preserved.

**Session expiry.** On a `401` from any request, the app opens a **re-authentication
modal** over the current page rather than redirecting: "Your session expired. Sign in to
keep working." The page underneath is untouched and **all form state stays in memory**;
the failed request is not retried, since the next autosave and TanStack Query's own
refetches recover it. Only `Sign out`, or dismissing the modal, leaves the page — and
dismissing triggers the unsaved-changes guard first.

---

### 3.13 System states

| State             | Treatment                                                                                                                                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **404**           | Inside the shell if signed in, standalone if not. "That page doesn't exist." / "Check the link — it may be mistyped or out of date." / primary `Go to this week`. It never speculates that something was removed. |
| **403**           | "You don't have access to this page." / "This area is for managers." / primary `Go to this week`. It never names what is behind the wall.                                                                   |
| **500 / network** | Inline error panel where the content would be, with `Try again`. The shell stays usable.                                                                                                                   |
| **Offline**       | A `--tint2` strip below the top bar: "You're offline. Unsaved changes are kept until you reconnect." The edit survives in memory; nothing is written to the device and nothing syncs.                       |

---

### 3.14 Demo

**Route:** `/demo` · Reached from the landing page. The real application, running on
hard-coded sample data in the browser (`requirments_doc.md` §14, `tech_stack.md` §6.9).

- **Routes.** The demo lives under `/demo`: the chooser is `/demo`, and every page inside
  it has its normal path with that prefix (`/demo/team`, `/demo/updates`…). Leaving it —
  `Create your account`, `Sign in` — is a plain link to the real app
  (`frontend_architecture.md` §11.1).
- **Choosing a perspective.** `/demo` opens on a single centred panel, the auth screens'
  layout — since the guided tour (below) under "Explore on your own", after the tour's own
  choice: "Pick who you'd like to be. Everything works, nothing is
  saved." and three large choices, each with one line: **Team member** — "Post updates,
  build and submit a week" (Imali J.); **Manager** — "Read the team, comment, approve,
  track projects" (Nadia F.); **Admin** — "Everything a manager does, plus people and
  holidays" (Sanduni B., the owner).
- **The demo bar.** A `36px` bar **above** the top bar, full width, `--ink` background,
  `--d-text` text: `SAMPLE DATA` (mono, caps — the one sanctioned all-caps in the
  product), "Demo · you're Nadia F., Manager" with a `Switch` text button reopening the
  choice, and on the right `Tour` (the guided tour's launcher, below), `Start over` (ghost,
  inverted) and `Create your account` or `Sign in` (inverted primary, per the landing page's
  rule in `requirments_doc.md` §13).
- **Every control works.** Posting, commenting, replying, submitting, approving, sending
  back, adding a project, extending a plan, adding a holiday, marking leave, making
  someone owner — each acts on the in-memory data, and switching perspective shows the
  result from the other side: a comment Nadia posts is waiting for Imali.
- **Nothing is saved.** A refresh, or `Start over`, returns everything to its starting
  state. The choice screen says so up front, and `Start over` needs no confirm.
- **What cannot be demonstrated is said, not faked.** Invite and reset links are shown
  as the link state with a sample URL and the line "In the real product, you'd send this
  link to the person." Signing in and out are not part of the demo.
- Every data panel carries the dashed `SAMPLE DATA` pill in its header.

#### Guided tour *(owner decision, 2026-10-17; `requirments_doc.md` §14.1)*

> **Owner decisions, accepted as built** *(PR #28 review, 2026-10-18; (1)–(5) in the first round,
> (6)–(9) in the second)*: (1) **no library** —
> the tour is built on what is already in the stack, no dependency added; (2) **the Tour button
> lives in the demo bar** (an icon only on phones), not floating over the page; (3) **the story
> week replaces Imali's sample history** — the tour turns Imali's last week back into a Draft,
> replacing its sample sent-back history, and the visitor recreates that history themselves;
> (4) **a refresh ends the tour**, and the demo data resets too; (5) **"overall comment"** means
> the managers' comments on a submitted week (`requirments_doc.md` §4), not a field on the weekly
> form, and the tour covers it as week comments; (6) **steps re-prepare their data on Back and
> jumps.** Going Back, or jumping to a step, puts the demo data in the state that step needs
> (going Back to "Post the update" takes the posted day off again; a jump can reset the story
> week); (7) **the dim doesn't block the page.** The visitor can use the highlighted part and the
> rest of the page; if the highlighted part closes, the card says so and offers **Show it again**;
> (8) **seven features are left out**, because none can happen honestly in a browser-only demo:
> the landing page, sign-up, the session-expiry window, the "Starting up" screen, the offline
> strip, the error toast with Retry and the stale-version banner; (9) **the first screen's lead
> line** reads "Take the guided tour, or look around on your own."; the original line stays under
> **Explore on your own**, with the three choices unchanged.

An overlay on the real demo pages, never a change to them. Everything is cobalt on cool
neutrals in the app's fonts, square, hairline, tokens only; the tooltip and the panel are
floating layers, so they — and only they — carry `--shadow-pop`. Both themes are designed: every
colour below is a token that changes with `[data-theme="dark"]`.

- **The first screen** *(owner decision 9 for its lead line)*. `/demo` keeps the auth screens'
  single centred column (420px) and offers
  two ways in. Under "Try WeeklyView" / "Take the guided tour, or look around on your own.": a
  panel whose first row is **Take the guided tour** — "One team's week, from setting up to
  approving: every feature, for every role." and, in `--mut`, "About 15 minutes, or jump to any
  part" (the minutes are computed from the steps) — styled exactly like the role choices
  (Chivo 17px title, the 2px cobalt bar and chevron on hover), and below it a text link
  **Jump to a part**. Then an `h2` (Chivo 20px) **Explore on your own**, the original line "Pick
  who you'd like to be. Everything works, nothing is saved." and the three role choices,
  unchanged.
- **The launcher** *(owner decision 2)*. A text button **Tour** with a 13px route icon in the demo bar, between
  `Switch`'s group and `Start over`, in the bar's own button style (`--d-text`, `--d-hover`).
  It lives in the bar so it never covers a page's actions; below 480px it is the icon alone
  (its name stays for screen readers) so the bar still fits "Sanduni B." at 360px.
- **The highlight.** The page is dimmed with `--backdrop` everywhere except a cutout around the
  target, grown by 6px, with a 2px `--acc` outline. Both are `pointer-events: none` (owner
  decision 7): the visitor
  can always use the highlighted element (and the rest of the page). The cutout follows the
  target as the page scrolls; it never animates between steps. A target that scrolls with the
  page is outlined only below the sticky bars at the top, never across them.
- **The tooltip.** `--card`, 1px `--hair2`, `--shadow-pop`, 360px wide, 20px padding, 11px
  between parts. Top row: the chapter in `--mut` caption (`01` in mono, as a form eyebrow, then
  the chapter's name) and the audience label — **Everyone**, **Managers and admins** or **Admins
  only** — in the role chip's style (11px, `--tint`, 1px `--hair`); on the right a ghost
  **Exit ×**. Then the title (Chivo 17px), one or two sentences (14px `--body`) and, on a step
  with an action, what to press, led by a 6px `--acc` square. Bottom row: "Step 12 of
  72 · Team member" (12px `--mut`, tabular figures) and the buttons, small: ghost **Back**,
  secondary **Do it for me** (action steps only), primary **Next**. The last step offers
  secondary **Create your account** (a plain link to the real `/signup`) and primary **Explore
  on your own**. A step whose target doesn't appear within 6 seconds shows the same card in
  the middle of the screen, adds "This part of the screen didn't appear." and offers **Try
  again** and **Skip this step**; a target that disappears mid-step reads "This part of the
  screen has closed." with **Show it again**.
- **An action step** *(owner feedback on PR #28, 2026-10-18)*. The visitor can do the action
  or press **Do it for me**; either way the tour **never moves on by itself**.
  - **Do it for me works visibly.** It fills the real fields one after another — text typed
    quickly, a choice, a tick or a press after a 300ms pause — then presses the real button:
    about 1–3 seconds in all. The outline moves to the part being changed (the invite window,
    the ⋯ menu, the Tasks section, then the action bar). While it works the card's line reads
    "Doing it now. Watch the outlined part.", **Do it for me** shows its spinner and **Back**,
    **Next** and **Do it for me** are disabled; **Exit** still works and stops it at once. A
    second press does nothing.
  - **Then the card says what changed.** Once the action has saved and the screen shows it, the
    card fades in again with a short title and a "Done. …" sentence about the visible result
    ("Done. Imali's Friday update is posted, and its square on the strip is now filled."), and
    the outline moves to that result — the filled square, the link, the new comment, the status,
    the sent-back panel. The line and **Do it for me** go; **Back** and **Next** remain, and the
    step waits for **Next**. The same happens when the visitor does the action.
  - **Reduced motion:** everything is filled at once, with no typing and no pauses; then the
    same "Done." card, waiting for **Next**.
- **Placement (wide screens).** Beside the highlight, never on it: below, above, right or left,
  the first with room, centred on it and kept 12px inside the viewport and below the demo bar.
  When there is no room below, the page scrolls the target up so the two sit one above the
  other — so the tooltip never covers what the visitor is about to use. A step can ask for a
  side first (above, for a row's ⋯ menu, which opens below).
- **Phones (below 640px).** The tooltip is a sheet across the bottom of the screen, full width,
  no side borders, at most 55% of the height, scrolling inside. The page scrolls the target
  above it; when the target can't get there (the weekly form's bar, the end of a page) the sheet
  sits across the top instead, **under the demo bar**, which stays usable. The sheet never
  covers the highlight: a target taller than the space left is highlighted where it shows.
- **The jump panel.** A modal sheet on the right, 420px from 640px and the full width below,
  full height, `--card`, 1px `--hair2` left border, `--shadow-pop`, over `--backdrop`. Header:
  **Guided tour** (Chivo 20px) and "One team's week, about 15 minutes. Or jump to any part: each
  is grouped by who can use it."; a close button. A `--tint` strip: **Resume at step N** and
  **Start again** (or **Start the tour**), and **End the tour** while one is under way. Then three
  groups — **Everyone**, **Managers and admins**, **Admins only**, each with its count — of 40px
  rows: the step number (`--mut`), the title and "As Imali J." under it, a check when seen, a
  chevron that moves 2px on hover; the current step has the nav's `--acc-l` fill and 2px bar.
- **Accessibility.** The tooltip is a labelled, non-modal dialog (`aria-labelledby` the title,
  `aria-describedby` the body) and takes focus when its step opens, and again when an action's
  "Done." card comes in; when focus is already in it (pressing Next) a polite live region reads
  the new step. While **Do it for me** works, ← → do nothing. ← → move between steps, Tab from the
  last button reaches the highlighted element, Esc ends the tour (after closing the page's own
  open dialog or menu). Focus returns to where it was, or to **Tour**. The panel is a Radix
  dialog: focus is trapped, Esc closes it. The tooltip stays operable above the page's dialogs
  and menus: pointer and focus events that start in it don't reach them.
- **Copy.** Short, plain and kind, in the product's vocabulary and sentence case, no exclamation
  marks; people are named, never given a pronoun.

---

### 3.15 People (manager / admin)

The list behind the **People** nav item and the destination of §3.8's `‹ People`
back-link.

> **On its position in this document.** It belongs beside §3.8, its detail view. It is
> numbered after §3.14 because those sections are cited by number across other documents.

**Route:** `/people` · **Top bar:** title "People", no primary action. Admins get a
secondary `Manage users` linking to `/users`. Inviting is not on this page.
**Layout:** max `1560px`. Filter bar → table → pagination.

- Columns: `Person` (avatar 22px + name, email beneath) · `Role` (chip) · `Projects`
  (comma-separated, truncated) · `Reports filed` (num) · `Last activity` (mono `--mut`) ·
  `Status` (chip, right — `Active` / `Invited` / `Removed`).
- Sorted by name ascending. Row click → §3.8's profile.
- A **removed** person's row renders their name with the removed marker — never a blank
  cell, never struck through. A person **on leave** carries the `On leave` chip beside
  their name; leave is not an account status.

**Filters: search · role · project · status.**

- **Status defaults to `Active`**, with `Invited`, `Removed` and `All`.
- **Search matches across every status, whatever the status filter is set to** —
  looking up someone who has left is exactly when a directory is needed. When a search
  surfaces rows the filter would have hidden, a `--tint` note says "Showing matches in all
  statuses."

| State                           | Treatment                                                                                   |
| ------------------------------- | ------------------------------------------------------------------------------------------- |
| **Empty — no team**             | "No one else on the team yet." / secondary `Manage users` (admin only).                     |
| **Empty — filters exclude all** | Header stays. "No one matches these filters." + `Clear filters`.                            |
| **Loading**                     | 8 skeleton rows at `40px`. Filter bar live.                                                 |
| **Error**                       | Inline error panel replaces the body; the filter bar stays.                                 |

---

### 3.16 Team updates (every role)

**Route:** `/updates` · **Top bar:** title "Team updates", week picker. The team's daily
updates, day by day — the team sync, written down (`requirments_doc.md` §2.1). Every role
sees every teammate's updates here.
**Layout:** max `1240px`.

```
┌──────────────────────────────────────────────────────────────┐
│  Team updates                          Week 38 · 14–18 Sep   │
│  Mon  Tue  Wed  Thu  Fri        day tabs, today selected     │
├──────────────────────────────────────────────────────────────┤
│  [IJ] Imali J.            5.5 h · Client A, R&D     2 💬     │
│       Checkout redesign · Development · wired payments  3 h  │
│       Login bug · Testing · wrote regression tests      2.5 h│
│       ┃ Blocker: waiting on API keys          [Resolved]     │
│       Comments (thread)                  [Open to team ✓]    │
├──────────────────────────────────────────────────────────────┤
│  [DK] Dinesh K.           On leave                           │
│  [MW] Malith W.           Not posted yet                     │
└──────────────────────────────────────────────────────────────┘
```

- **Day tabs** are the five-day strip at tab scale (§6.14 Tabs): Mon–Fri, today selected,
  holidays shown and disabled with their name in a tooltip.
- **One panel per person** for the selected day, sorted by name, the viewer first. Posted
  updates show their lines (task · task type swatch · text · hours in mono), blockers and
  comment threads (§6.23). A person with nothing yet shows "Not posted yet" in `--mut`;
  someone on leave shows the `On leave` chip; both are one-line rows, not empty panels.
- **Comments.** Every teammate reads every thread. Whether they can write is the
  update's "Open to team comments" state: when closed, a teammate sees the threads and a
  `--mut` line "Comments on this update are limited to Imali and managers." The author
  and managers see the switch itself in the panel header.
- **Filters:** project (show only people who logged time on it that day), and "Only
  blockers" (show only updates with an open blocker).
- A person's name links to their week (§3.4).

| State                  | Treatment                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------- |
| **Empty — nobody yet** | Every person as a "Not posted yet" row. No empty-state panel: the list is the news. |
| **Holiday selected**   | Not selectable; the tab's tooltip names the holiday.                               |
| **Loading**            | 5 panel skeletons at real heights.                                                 |
| **Error**              | Inline error panel; day tabs stay live.                                            |

---

### 3.17 Holidays (admin only)

**Route:** `/holidays` · **Top bar:** title "Holidays", primary `Add holiday`, and a year
select (`2026 ▾`). **Layout:** max `860px`, table only.

- Columns: `Date` (mono, `Thu 17 Sep 2026`) · `Name` · `Added by` · actions (`Edit`,
  `Delete`).
- **Add / edit** uses a small modal: date (date picker, weekends not selectable — a
  Saturday is already a day off) and name. A date that already has a holiday is an inline
  error.
- **Delete** confirms with the consequence: "Remove 'Vesak Full Moon Poya Day'? Everyone
  will be expected to post an update on Thu 17 Sep, and project plans will count it as a
  working day."
- A `--mut` line under the title explains the effect once: "On a holiday, no one needs to
  post an update, and project plans skip the day."
- There is no import and no calendar feed — the admin types the team's holidays, which
  also covers holidays declared at short notice (`requirments_doc.md` §16).

| State       | Treatment                                                                                  |
| ----------- | ------------------------------------------------------------------------------------------ |
| **Empty**   | "No holidays for 2026." / "Add the days the whole team is off." / primary `Add holiday`.   |
| **Loading** | 6 skeleton rows.                                                                           |
| **Error**   | Inline error panel replacing the body.                                                     |

---

## 4. The report form, and the day panel

Two surfaces write a week. The **day panel** (§4.11) is used every working day and is the
product's most-used control. The **weekly report form** (§4.1–§4.10) is used once, at the
end of the week, and is now mostly a review of what the days already contain
(`requirments_doc.md` §2.2).

### 4.1 Structure: one scroll, sectioned, with a sticky rail

**Not a wizard. Not accordions. One continuous scroll.**

- **Not a wizard**, because the form is edited at least twice — once at the end of the
  week and again after a correction. Forcing someone through six steps to fix one
  flagged note is hostile, and a wizard hides the whole week, which is what the report is
  _for_.
- **Not accordions**, because collapsed sections hide validation errors, break browser
  find, and make "how much is left" unknowable.
- **One scroll** with a persistent rail gives orientation without hiding anything, and
  matches the read-only view (§3.4) section for section.

| #   | Section               | Contents                                                                    |
| --- | --------------------- | --------------------------------------------------------------------------- |
| 01  | Tasks                 | Every task from the week's work lines, with its hours; **status** and **note** per task (§4.3) |
| 02  | Planned for next week | Repeatable single-line items — optional                                     |
| 03  | Blockers & challenges | **Gathered from the days**; one flaggable as the key issue (§4.5)           |
| 04  | Achievements          | Repeatable items, one flaggable as key — optional                           |
| 05  | Hours by task type    | **Calculated** from the lines; read-only (§4.6)                             |
| 06  | Notes & links         | Optional textarea + link rows                                               |

Above section 01 sits a **week summary**, not a section: the week in mono, the five-day
strip at `36px` showing which days are posted, missing, on leave or a holiday, and
"Days posted: 4 of 4". A missing day is a link straight to it in the day panel.

The week never changes: a report belongs to the week its first daily update was posted
in, and its days are that week's days (`database_schema.md` §1.4).

Section headings: mono `01` at `--mut` + Chivo 700 20px + a 1px `--hair` rule beneath.
Section gap `52px`; field gap within a section `20px`.

### 4.2 The section rail

- `200px`, `position: sticky; top: 94px`, visible at **≥1280px only**.
- Rows `32px`: mono 11px number + Instrument Sans 13px name.
- States: _default_ `--mut`; _complete_ `--body` with a 2px `--acc` left bar;
  _current_ (nearest section in viewport) `--ink` on `--tint`; _has errors_
  `--st-corr-fg` text with a 2px `--st-corr-fg` left bar.
- Below the list, the submit checklist in plain words, each line ticked as it is met:
  "Every working day has an update" and "Every task has a status". This is where a
  person sees why `Submit` is disabled, without trying it.
- Below 1280px the rail is removed; the checklist moves into the action bar's disabled
  state as a tooltip and a line above it on mobile.

### 4.3 Section 01 — Tasks

The week's tasks are **not typed here**. They are every task named by any of the week's
work lines, listed in the order they first appear, and they change only when the lines
do (`database_schema.md` §1.6).

```
┌──────────────────────────────────────────────────────────────────────┐
│ Checkout redesign           Client A   11.5 h  [ In progress ▾ ]     │
│   Note (optional)  [ Payments wired; styling left for Monday     ]   │
├──────────────────────────────────────────────────────────────────────┤
│ Fix login timeout           Client A    4 h    [ Done ▾ ]            │
│   Note (optional)  [                                              ]  │
└──────────────────────────────────────────────────────────────────────┘
```

- One row per task: **name** (13px/500 `--ink`), **project** (13px `--body`), **this
  week's hours** (mono, right-aligned, summed from the lines), and a **status** Select —
  Not started / In progress / Done / Carried over — `140px`, **required**.
- **Note** beneath each row: a single-line input that grows to a 3-row textarea on
  focus, `Optional` marker, 0–2000 characters.
- A task continued from an earlier week shows "since W35" in mono 11px `--mut` after its
  name, and its total hours across weeks in the tooltip.
- **No add or remove controls.** A task appears because a line names it and disappears
  when no line does. A line under the section says so: "Tasks come from your daily
  updates. To add or change one, edit that day." with the day links.
- Priority, planned % and actual %, planned and spent hours, and output are gone
  (`requirments_doc.md` §2.2). Planned time lives on projects (§3.9); spent time is the
  lines.

### 4.4 Narrow widths (< 768px)

Each task becomes a card: `--card`, 1px `--hair`, `16px` padding; name and project on
line 1, hours right; status Select full width at `44px`; note beneath. Inputs are `44px`
tall with `16px` font, so iOS does not zoom on focus.

### 4.5 "Key blocker" and "key achievement"

One blocker may be flagged as _the_ key issue and one achievement as _the_ key win.
That is radio semantics — selecting a second deselects the first — and the markup is a
`role="radiogroup"` so screen readers say so.

**Blockers are not typed here.** They are raised in the daily updates, on the day they
happen (§4.11), and section 03 lists them — each with its day in mono 11px `--mut` — so
the one remaining job at the end of the week is choosing the key issue. A blocker is
edited or removed in its day's update, reached from a `Tue ›` text link on the row.
Achievements are still typed in section 04, since they are a weekly judgement rather
than a daily event.

```
┌──┬───────────────────────────────────────────────┬─────┐
│[ ]│ Tue  Waiting on API keys from the client     │ Tue›│
└──┴───────────────────────────────────────────────┴─────┘
 ↑ 26px key toggle in the left gutter
```

- **Toggle:** `26×26px` square, zero radius, 1px `--rule`, transparent, containing a
  `10×10px` square outline in `--mut`. **It does not use the brand glyph.**
- _Hover:_ border `--hair2`, inner square `--body`.
- _Selected:_ background `--acc-l`, border `--acc`, inner square filled `--acc`, the row
  gains a 2px `--acc` left bar and a `Key` label in 11px `--acc-txt`. Color is never the
  only signal — the word is.
- _Focus-visible:_ the universal ring (§6.0).
- Selecting a second item deselects the first with a 160ms crossfade on both rows.
- Flagging is optional and never blocks submission.
- **Resolving a blocker is not part of this form.** The resolve control lives on the
  blocker wherever it is read — the day panel and the week view — because a blocker is
  resolved whenever it stops blocking, often mid-week.

### 4.6 Section 05 — Hours by task type

**Calculated, not typed.** Seven rows — **Development · Testing · Meetings ·
Documentation · Review · Research & study · Other** — each a 4px color swatch (`--c1`…
`--c7`), the label, and the week's hours from every work line of that type, in mono. A
`--tint2` total row beneath: "Total 38.5 h".

The swatches match the dashboard chart (§7.4), so the form and the chart are visibly the
same seven things. There is no reconciliation warning any more: task hours and type hours
are the same lines grouped two ways, so they cannot disagree.

### 4.7 Labels, inputs, alignment

- **Labels stack above inputs, left-aligned.** Two-column label/field layouts collapse
  badly at mobile parity and slow top-to-bottom scanning.
- Label: Instrument Sans **500, 13px**, `--ink`, `6px` above the input.
- Optional marker: Instrument Sans 11px "Optional" in `--mut`, right-aligned on the label
  line. Required fields carry **no asterisk**.
- Helper text: 12px `--mut`, `6px` below.
- **Field width is meaning-based, not full-bleed.** Text inputs max `560px`, numerics
  `120px`, selects `260px`, textareas full column.
- Two-up rows use a `20px` gap and collapse to one column below 768px.

### 4.8 Autosave and draft state

- The weekly form autosaves 1200ms after the last keystroke, on blur and on route change.
  Draft and Needs correction only. The day panel does not autosave: an update is posted
  with a button (§4.11), because posting is what shares it with the team.
- **Indicator location:** the sticky bottom bar, left side — the same place every time.

| State         | Rendering                                               |
| ------------- | ------------------------------------------------------- |
| Idle, saved   | "Saved" Instrument Sans 12px `--mut` + `14:32` in mono  |
| Pending edits | "Unsaved changes" 12px `--mut`                          |
| Saving        | "Saving…" 12px `--mut`, no spinner                      |
| Failed        | "Not saved" 12px `--st-corr-fg` + a `Retry` text button |

- **No toast on a successful autosave, ever.**
- On failure the form blocks navigation via `beforeunload` and keeps everything in
  memory. A 401 opens the re-auth modal (§3.12).
- **"Draft" is a status, not a save state.** Never write "Draft saved" — write "Saved
  14:32."

### 4.9 Sticky action bar

`62px`, spanning the form column, `--card`, 1px `--hair` top, `position: sticky;
bottom: 0`. Left: save indicator. Right, gap `11px`:

- a checkbox **"Ask for approval"** with a `--mut` line on hover or focus: "A manager
  will be asked to approve this week. Without it, your report is complete once
  submitted." Unticked by default (`requirments_doc.md` §4);
- secondary `Save`;
- primary `Submit` (or `Resubmit` when correcting), **disabled until the submit checklist
  is met** (§4.2), with a tooltip naming what is missing: "Wednesday has no update."

On mobile the bar spans the viewport, grows to `88px`, and puts the checkbox and the save
state on their own line above equal-width buttons.

### 4.10 Validation

- **Timing:** validate on **blur**; after a field has errored once, re-validate on every
  change. Never on first keystroke.
- **Submit-blocking rules** (`requirments_doc.md` §2.2), and nothing else:
  1. every working day of the week — not a holiday, not on leave — has a posted update;
  2. every task has a status.

  Next week's plan, achievements, notes, links and task notes are all optional. Being
  strict about little is deliberate: a report someone can't submit is a report that
  doesn't exist.
- **A missing day** is shown in the week summary and the rail checklist, with a link to
  that day. It is never a field error, because the fix is in the day panel, not here.
- **A task without a status:** the Select takes a 1px `--st-corr-fg` border and the
  message "Choose a status." beneath it, preceded by a 12px alert glyph, with a 120ms
  opacity fade — no slide, no shake. `aria-invalid="true"` and `aria-describedby`.
- **On a blocked submit,** scroll the first problem to `top: 140px`, focus it, and mark
  its section in the rail.
- **No top-of-form error banner.** The rail checklist and the inline messages do the
  aggregate job.

---

### 4.11 The day panel — posting a daily update

The five-day strip on "This week" (§3.1) selects a day; this panel shows it. It is used
every working day by everyone, so it is small, fast and forgiving.

```
┌──────────────────────────────────────────────────────────────────────┐
│ Tue 15 Sep                                  5.5 h     Posted 17:42   │
├──────────────────────────────────────────────────────────────────────┤
│ What did you do?                                                     │
│ [Task ▾ Checkout redesign ] [Type ▾ Development] [ wired payments ] [3 ]│
│ [Task ▾ Login timeout     ] [Type ▾ Testing    ] [ regression tests][2.5]│
│ + Add a line                                                          │
│ Blockers                                                   Optional  │
│ [ Waiting on API keys from the client                      ] [×]     │
│ + Add a blocker                                                       │
│ [ ] Open to team comments                     [Save]  [Post update]  │
├──────────────────────────────────────────────────────────────────────┤
│ Nadia F.  15 Sep 18:05                                     • new     │
│ I've chased the client for the keys — should land tomorrow.          │
│   ↳ Imali J.  18:20   Thanks — I'll switch to the login bug.         │
│ [ Reply ]                                                            │
└──────────────────────────────────────────────────────────────────────┘
```

- **Work lines.** Each line is four fields in a row at ≥768px:
  - **Task** — a combobox listing the person's open tasks, grouped by project, with a
    final option **"Start a new task…"** that expands inline into a task name and a
    project Select (the person's assigned projects, or every active project if they have
    none). `240px`.
  - **Task type** — a Select of the seven types, each with its color swatch. `180px`.
  - **What I did** — text, required, 1–500 characters. Fills the remaining width.
  - **Hours** — number, `inputmode="decimal"`, step 0.25, greater than zero, no maximum.
    `90px`, right-aligned, mono.
  - A ghost remove button at the row's end; the last remaining line can only be cleared.

  `+ Add a line` beneath, the §4.3 dashed button style at `38px`. A day needs **at least
  one line**. The header shows the day's total hours in mono, updating live.
- **Blockers** — optional single-line inputs, `+ Add a blocker`, up to 10. An empty
  blocker input is dropped on post, never an error.
- **"Open to team comments"** — a checkbox at the bottom left. Off by default; while on,
  any teammate may comment on this update. The author or any manager or admin can change
  it later from the posted view.
- **Buttons.** Secondary `Save` keeps the text in the panel without posting — nothing is
  shared yet — and primary `Post update` posts it. Posting is the act that shares, so it
  is always a deliberate button, never an autosave. Posting the week's first update
  creates the week's report as a Draft.
- **Posted state.** The lines as a dense table, the blockers as §4.5 rows with the resolve
  toggle, "Posted" and the time in mono in the header ("edited" appended when it has been).
  `Edit` text button while the week is open. Editing reopens the composer and keeps every
  existing blocker's identity, so its resolution survives.
- **Comments** render beneath as threads (§6.23). The author, managers and admins always
  see `Comment`; teammates see it only while the update is open to team comments. A
  manager may comment on their own update.
- **Validation.** Every line needs a task, a type, text and hours. Errors appear inline
  beneath the line, as in §4.10.
- **Day states.** A future day is not selectable. A holiday or a day on leave shows "Holiday
  — no update needed" or "You were on leave." and no composer. A missing past day opens the
  composer with "Wednesday's update is missing — your report can't be submitted without
  it." in 13px `--body`. A frozen week (Submitted, Approved) shows posted days read-only;
  comments, replies and resolutions still work.
- **Mobile (< 768px).** Each line stacks: task full width, then type and hours two-up,
  then the text; inputs `44px` tall at `16px` font. The strip above compresses to single
  letters (§10).

---

## 5. Data table specification

One table component serves every list in the product. Differences are props, not
variants built per page.

### 5.1 Metrics

| Property                                   | Value                                                                      |
| ------------------------------------------ | -------------------------------------------------------------------------- |
| Row height                                 | `40px` (11px vertical padding + 18px line box)                             |
| Dense row height (read-only report tables) | `36px` (8px padding)                                                       |
| Header row height                          | `36px`                                                                     |
| Horizontal cell padding                    | `16px`; first and last cell `20px`                                         |
| Body font                                  | Instrument Sans 400 **13px** `--body`; primary column 13px **500** `--ink` |
| Header font                                | **Instrument Sans 500, 11px, `--mut`, sentence case, `+.02em`**            |
| Header background                          | `--tint`                                                                   |
| Header border                              | 1px `--hair2` bottom                                                       |
| Row border                                 | 1px `--hair` bottom; none on the last row                                  |
| Table border                               | 1px `--hair` all round, zero radius                                        |
| Zebra striping                             | **None.** Hairlines do the work.                                           |

### 5.2 Column alignment

| Content                                   | Alignment                                | Type                            |
| ----------------------------------------- | ---------------------------------------- | ------------------------------- |
| Text, names, projects                     | left                                     | Instrument Sans                 |
| Numbers, hours, percentages, counts       | **right**, `tabular-nums`                | Instrument Sans or Chivo        |
| Dates, timestamps, week IDs, revision IDs | left                                     | **JetBrains Mono 12px `--mut`** |
| Status chips                              | **right**, last or second-to-last column | —                               |
| Row actions                               | right, fixed width, icon buttons         | —                               |

Numeric right-alignment with tabular figures is non-negotiable: it is the cheapest
thing that makes a data table look engineered rather than generated.

### 5.3 Sorting

- Sortable headers are `<button>` filling the header cell, text left, sort glyph
  trailing at `6px`.
- Glyph: a 10px chevron. **Hidden at rest**; `--hair2` on header hover; `--ink` when
  the column is the active sort.
- One column sorts at a time; the active header's text is `--ink`.
- Sort state lives in the URL (`?sort=week&dir=desc`) so a sorted view is shareable and
  survives a refresh.

### 5.4 Row interaction

| State         | Treatment                                                       |
| ------------- | --------------------------------------------------------------- |
| Hover         | background `--tint`, 120ms; `cursor: pointer` only if clickable |
| Focus-visible | 2px inset `--acc` ring on the row                               |
| Active        | background `--tint2`, no transform                              |
| Selected      | background `--acc-l`, 2px `--acc` left bar                      |
| Disabled      | text `--mut`, no hover, `aria-disabled`                         |

- **Click target:** the whole row, via a row-level handler _plus_ a real `<a>` wrapping
  the primary cell's text so middle-click, `⌘`-click and right-click work. Cells
  containing their own controls stop propagation.
- **Selection** (Users only) uses a leading 40px checkbox column with a tri-state
  header checkbox. While anything is selected, a selection toolbar replaces the filter
  bar: `--ink` background, `--d-text` text, count in mono, actions right, `Clear` at
  the far right.

### 5.5 Pagination

Below the table, outside its border, `20px` above, height `44px`.

```
Rows per page [ 20 ▾ ]            1–20 of 84         [ ‹ ] [ › ]
```

- Left: Select — 20 / 50 / 100, default **20**.
- Centre-right: mono 12px `--mut`, tabular.
- Right: two `32×32px` secondary icon buttons, disabled at the ends.
- **No numbered page pills, no infinite scroll.** Pills are template chrome; infinite
  scroll destroys "how many are there," which is the question a manager has.
- Page state lives in the URL (`?page=2`).

### 5.6 Mobile degradation (< 768px)

Tables become **stacked rows**, with one exception.

| Table                                                    | Mobile form                                                                                                                                                                                                                                                                  |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Report history, Review desk, Team table, Users, Projects, Holidays | **Stacked row cards.** `--card`, 1px `--hair`, `14px` padding, `11px` gap. Line 1: primary identifier (13px 500 `--ink`) + status chip right. Line 2: two or three `label value` pairs — label Instrument Sans 11px `--mut`, value 13px. The whole card is the click target. |
| Read-only task table inside a report                     | Horizontal scroll with a sticky first column — a completed task table is reference data, and restructuring it would misrepresent a document.                                                                                                                                 |
| Editable task table                                      | Stacked task cards (§4.4).                                                                                                                                                                                                                                                   |

Sorting becomes a single `Sort` Select in the filter bar. Pagination keeps its layout
with `Rows per page` hidden.

---

## 6. Component inventory

Sizes are exact; every color is a token; zero border radius everywhere. All
interactive elements have a visible `:focus-visible`; `:focus` without `-visible` is
never styled.

### 6.0 Universal focus ring

```
outline: 2px solid var(--acc);
outline-offset: 2px;
```

On `--tint` / `--card` backgrounds add `box-shadow: 0 0 0 4px var(--acc-l)` for the
halo. On dark, `--acc` resolves to the lightened value, so no per-theme override is
needed. Focus is never removed, delayed or animated.

**One ring, one color, everywhere.** The ring is always `2px` of `--acc`. Where an
outline would be clipped by a scroll container or a shared border — table rows (§5.4),
the tab strip (§6.14), sidebar nav items (§1.3), table cells (§4.3) — the same 2px
`--acc` is applied *inset* instead of outset. That is a geometry decision, not a
different treatment. `--acc-l` is the halo and the selected-row tint; it is never the
ring itself, because at 4.5:1 against `--card` it is too faint to locate focus.

### 6.1 Button

| Size           | Height | Padding X | Font                         | Icon |
| -------------- | ------ | --------- | ---------------------------- | ---- |
| `sm`           | 30px   | 11px      | Instrument Sans 500 **13px** | 14px |
| `md` (default) | 38px   | 16px      | Instrument Sans 500 **14px** | 16px |
| `lg`           | 44px   | 22px      | Instrument Sans 500 **15px** | 16px |

Icon-only buttons are square at the same heights; icon gap `8px`.

| Variant                        | Default                                              | Hover                         | Active                                   | Disabled                                   | Loading                                                                             |
| ------------------------------ | ---------------------------------------------------- | ----------------------------- | ---------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------- |
| **Primary**                    | bg `--acc`, text `--on-acc`                          | bg `--acc-d`                  | bg `--acc-d`, `scale(.985)`              | bg `--tint2`, text `--mut`, `not-allowed`  | size held, label at 40% opacity, 12px 2px-stroke spinner in `--on-acc`, `aria-busy` |
| **Secondary**                  | bg `--card`, 1px `--rule`, text `--ink`              | bg `--tint`, border `--hair2` | bg `--tint2`                             | bg `--card`, border `--hair`, text `--mut` | spinner `--ink`                                                                     |
| **Ghost**                      | transparent, text `--body`                           | bg `--tint`, text `--ink`     | bg `--tint2`                             | text `--mut`                               | spinner `--mut`                                                                     |
| **Destructive**                | bg `--card`, 1px `--st-corr-bd`, text `--st-corr-fg` | bg `--st-corr-bg`             | bg `--st-corr-bg`, border `--st-corr-fg` | border `--hair`, text `--mut`              | spinner `--st-corr-fg`                                                              |
| **Inverted** (on `--ink` only) | bg `--paper`, text `--ink`                           | bg `#FFFFFF`                  | `scale(.985)`                            | bg `--d-panel2`, text `--d-mut`            | spinner `--ink`                                                                     |

- Transition: `background-color 120ms linear, border-color 120ms linear`;
  `transform 80ms var(--ease-out)` on press only.
- *Owner decision (polish, 2026-10-10):* the press is `scale(.97)` on **every** variant
  (and on a link drawn as a button), 120ms `--ease-out`, so every button answers on
  pointer-down — §8.5, entry 2′. Tailwind 4's `scale-*` sets the `scale` property, so that
  is the property that transitions.
- **No arrow appended to a button label.** No `→`, ever.
- Labels are sentence case, verb-first, and identical to the outcome they produce.

### 6.2 Input

| Property            | Value                                       |
| ------------------- | ------------------------------------------- |
| Height              | `38px` (`44px` on touch / below 768px)      |
| Padding             | `0 12px`                                    |
| Font                | Instrument Sans 400 14px (16px below 768px) |
| Background / border | `--tint` / 1px `--hair`                     |
| Text / placeholder  | `--ink` / `--mut`                           |

| State           | Treatment                                                     |
| --------------- | ------------------------------------------------------------- |
| Hover           | border `--hair2`                                              |
| Focus           | background `--card`, border `--acc`, halo (§6.0)              |
| Filled          | unchanged — no "has value" styling                            |
| Disabled        | background `--tint2`, text `--mut`, `not-allowed`             |
| Read-only       | transparent background, dashed `--hair` border, text `--body` |
| Error           | border `--st-corr-fg`, message below (§4.10)                  |
| Prefix / suffix | mono 12px `--mut`, 1px `--hair` divider, `11px` padding       |

Number inputs: native spinners hidden, right-aligned, tabular-nums.

### 6.3 Textarea

Input tokens. Min height `96px` (4 rows), padding `11px 12px`, line-height 1.55,
`resize: vertical`. Optional counter bottom-right, mono 11px `--mut`, turning
`--st-corr-fg` at 100%. **Auto-grow is off** — a jumping layout while typing is worse
than a scrollbar.

### 6.4 Select

Native `<select>` styled to match Input, with a custom 10px chevron in `--mut` at
`12px` from the right and `padding-right: 32px`. Native is deliberate: accessible,
keyboard-correct, and on mobile it gives the OS picker — which matters given full
mobile parity. A custom listbox is used **only** for multi-select filters (§6.21),
where native is genuinely poor. States mirror Input; the placeholder option is `--mut`
and `disabled`.

### 6.5 Week picker

Reports are week-scoped, so this is a first-class component, not a date input.

```
[ ‹ ]  W38 · 14–18 Sep  [ › ]
```

- Container `38px` tall, `--card`, 1px `--rule`, three segments divided by 1px
  `--hair`. Arrows are `32px` ghost buttons; the centre is a button opening a popover,
  label in **mono 12px `--ink`**, tabular.
- **Popover** (`280px`, `--card`, 1px `--hair2`, `--shadow-pop`): month header with
  arrows; a **Mon–Fri five-column grid — weekends are not rendered**, because the
  product's unit is the working week (§0.2) and this is the signature device doing
  work. Rows are whole-week targets.
  - Row hover: `--tint` across all five cells.
  - Selected week: `--acc-l` with a 2px `--acc` left bar.
  - Current week: 1px `--acc` dashed underline on the day numbers.
  - Holidays: the day number in `--mut` with a 1px `--hair2` underline and the holiday's
    name in a tooltip. Weeks before the person's join week are disabled like future ones.
  - Weeks with a report: a 3px `--acc` square in the left gutter; approved weeks use
    `--st-appr-fg`.
  - Future weeks beyond the current: `--mut`, disabled.
- Keyboard: `←`/`→` step weeks, `Enter` selects, `Esc` closes, focus returns to the
  trigger.
- Disabled: `--tint2` with `--mut` text. No page uses it in v1: the weekly form shows no
  week picker, because its week never changes (§3.2, §4.1).

### 6.6 Checkbox

`16×16px`, zero radius, 1px `--rule`, background `--card`.
Hover: border `--hair2`, background `--tint`. Checked: background and border `--acc`,
10px white check at 2px stroke. Indeterminate: `--acc` fill with an `8×2px` white bar.
Disabled: `--tint2` fill, `--hair` border, `--mut` mark. Focus: §6.0.
Label 13px `--body`, gap `8px`, whole label clickable, hit area ≥ 24px.
Check transition: `opacity 120ms` only — no draw animation.

### 6.7 Radio

`16×16px`, **square like everything else** — WeeklyView has no circles. Selected: 1px
`--acc` border, `--card` background, a `6×6px` `--acc` centred square. Same states as
Checkbox; the difference is the inner square and the grouping semantics.

### 6.8 StatusChip

| Property | Value                                                                           |
| -------- | ------------------------------------------------------------------------------- |
| Height   | `22px` (small variant `18px`)                                                   |
| Padding  | `4px 10px` (small `3px 8px`)                                                    |
| Font     | Instrument Sans **500, 12px** (small 11px), sentence case                       |
| Border   | 1px, zero radius                                                                |
| Text     | exactly `Draft` / `Submitted` / `Needs correction` / `Approved` / `Not started` |

- Colors from `brand_design_strategy.md` §3.4 via the `--st-*` tokens; the dark set
  applies automatically.
- **Not started** is transparent background, `--mut` text, **dashed** border.
- **Task status** (Not started / In progress / Done / Carried over) uses the same chip
  at the small size, in neutral colors only — `--tint`, `--body`, 1px `--hair`, with Done
  in `--st-appr-fg` text. A task's status is a fact about work, not a review outcome, so it
  borrows no status color beyond Done.
- **`Approval asked`** is not a chip: an 11px `--mut` label beside the status chip.
- **On leave** is `--tint2` background, `--body` text, **solid** `--hair2` border — the
  same neutral family as Not started, told apart by the solid edge and the word. Like Not
  started, it describes a week with no report to review rather than a report's status,
  so it adds no color to the system and is not a sixth status (§0.4).
- **Holiday week** — a week whose every working day is a holiday (`requirments_doc.md`
  §16) — uses the same neutral family as On leave: `--tint2` background, `--body` text,
  **solid** `--hair2` border, the words `Holiday week`. It is a derived week state like
  On leave, not a report status and not a sixth status.
- **There is no "late" modifier and no sixth chip** (§0.4). The product has no
  deadline, so there is nothing to render.
- Also used for `Active` / `Invited` in Users, reusing the Approved and Draft palettes
  with their own labels.
- Never a button, never carries an icon.
- **Transition:** when a status changes as a result of the viewer's own action,
  background and border crossfade over 200ms. On any other change (a data refresh) it
  renders at its new value with no animation.

### 6.9 Card / Panel

| Property                     | Value                                                                                                    |
| ---------------------------- | -------------------------------------------------------------------------------------------------------- |
| Background / border / radius | `--card` / 1px `--hair` / `0`                                                                            |
| Shadow                       | **none**                                                                                                 |
| Padding                      | `24px`; `20px` dense; `0` when wrapping a table                                                          |
| Header                       | optional `44px` row, `20px` horizontal padding, 1px `--hair` bottom, title Chivo 700 17px, actions right |
| Footer                       | optional `--tint`, 1px `--hair` top, `44px`, actions right                                               |

**Panels do not nest.** Separate content inside a panel with a 1px `--hair` rule or a
`--tint` sub-block — never a second bordered card. This single rule prevents the
cards-inside-cards look more than any other.

- *Owner decision (polish, 2026-10-10):* the 44px header is a minimum. On a narrow screen
  its actions (a segmented control, the SAMPLE DATA pill) wrap under the title, which never
  breaks across lines.

### 6.10 Table

See §5.

### 6.11 Modal

| Property | Value                                                                                                           |
| -------- | --------------------------------------------------------------------------------------------------------------- |
| Widths   | `sm 420px` · `md 560px` · `lg 720px`; max `calc(100vw - 40px)`                                                  |
| Surface  | `--card`, 1px `--hair2`, `--shadow-pop`                                                                         |
| Backdrop | `--backdrop`, no blur                                                                                           |
| Header   | `52px`, `24px` padding, Chivo 700 17px, close ghost icon right                                                  |
| Body     | `24px` padding, max-height `min(70dvh, 640px)`, scrolls with 1px `--hair` rules appearing at the scrolled edges |
| Footer   | `--tint`, 1px `--hair` top, `62px`, `24px` padding, secondary then primary, gap `11px`                          |

- Enter: opacity + `translateY(4px→0)`, **180ms** `--ease-out`. Exit: opacity only,
  **120ms**. Backdrop 180 / 120ms.
- Focus trapped; moves to the first interactive element (or close); returns to the
  trigger on close. `Esc` closes unless a write is in flight.
- Destructive confirms use the Destructive variant and state the consequence in the
  body. Never "Are you sure?" alone.
- **Below 640px** modals are full-screen sheets: 100dvw × 100dvh, `56px` header,
  footer buttons full-width stacked.

### 6.12 Toast

| Property | Value                                                                      |
| -------- | -------------------------------------------------------------------------- |
| Position | bottom-right, `24px` offsets; bottom-centre full-width below 640px         |
| Size     | `min(380px, calc(100vw - 40px))`, min-height `48px`, padding `14px 16px`   |
| Surface  | `--ink` background, `--d-text` text, `--shadow-pop`                        |
| Accent   | 2px left bar: `--acc` info · `--st-appr-fg` success · `--st-corr-fg` error |
| Font     | Instrument Sans 400 13px; optional action as a text button in `--acc-on-d` |
| Duration | info / success `4000ms`; **error toasts do not auto-dismiss**              |
| Stack    | max 2 visible, newest at the bottom                                        |

- Enter: `translateX(8px→0)` + opacity, **200ms** `--ease-out`. Exit: opacity +
  `translateX(0→8px)`, **140ms**.
- `role="status"` for info/success, `role="alert"` for errors.
- **Forbidden:** autosave confirmations; report approval (the chip changing is the
  feedback); anything congratulatory.
- **Sanctioned:** a background write failed; an inline change succeeded out of view
  (the Users role Select); a result the person can't see on screen. **Undo is not
  offered anywhere** — no soft-delete exists in the data model.

### 6.13 Tooltip

`--ink` background, `--d-text` text, Instrument Sans 400 12px, padding `6px 10px`,
max-width `240px`, `--shadow-pop`, offset `8px`, **no arrow**. Open delay `350ms`,
close `0ms`, fade `100ms`. Never interactive; never the only carrier of essential
information. On touch: long-press, or the content moves into helper text instead.

### 6.14 Tabs

Underline, not pills. Row `44px` with a 1px `--hair` bottom rule spanning the
container. Tab: Instrument Sans 500 14px `--mut`, padding `0 16px`.
Hover: `--ink` + a 2px `--hair2` bottom bar. Active: `--ink` + a 2px `--acc` bottom bar.
Focus: §6.0 inset. The active bar **slides** 180ms `--ease-out` — user-triggered, and
it shows what changed. Roving tabindex, `role="tablist"`. Used for profile sub-views;
never as a substitute for navigation.

### 6.15 Inline error panel

`--st-corr-bg` background, 1px `--st-corr-bd`, 2px `--st-corr-fg` left bar, padding
`20px 24px`. Heading Instrument Sans 500 14px `--ink` stating what failed; body 13px
`--body` stating the cause in plain words; a secondary `Try again`. No apology; no
error code unless it is actionable, and then in mono 11px `--mut` at the foot.

### 6.16 Skeleton

`--tint`, zero radius, exact height of the content it replaces. A single opacity pulse
`0.55 → 1 → 0.55` over **900ms** `ease-in-out`, looping while loading. This is the one
loop in the product and it is permitted because it is a loading indicator triggered by
the person's navigation. Under reduced motion it holds static at `0.7`. **No shimmer
gradient sweep.** Skeletons must match the real layout — right row count, right column
widths — so arriving content causes no reflow.

### 6.17 EmptyState

Centred, max-width `420px`, vertical padding `52px`.

```
Your first week starts here.   Chivo 700 17px --ink
Post what you did today.       Instrument Sans 14px --body
Your weekly report builds
itself from your daily updates.
[ Post today's update ]        primary md, 20px above
```

**No eyebrow label, no illustration, no icon, no emoji.** Exactly one action, or none.
Copy states what would be here and how to make it exist; it never apologises.

> **Owner decision (polish, 2026-10-10) — the week mark.** Above the title sits the product's
> own mark: five `10px` Updates squares, `4px` apart, `16px` above the title, `aria-hidden`.
> It is the squares' language (§3.7), not an illustration or icon, so the rule above stands.
> `new` (a list nothing has filled yet): the first square in the 2px `--acc` "today" outline,
> the rest 1px `--rule`. `filtered` (nothing matches): all five dashed `--rule`. `system`
> (404, 403, a report you can't read): five plain `--rule` squares. The whole-page states
> (404 and 403 in the shell) are optically centred in the content area, a little above the
> middle (`fill`), instead of sitting under the top bar over a blank screen.

### 6.18 Avatar

Square, zero radius. Sizes `22 / 28 / 32 / 44px`. Background `--tint2`, 1px `--hair`,
initials in **Chivo 700** `--body` at 45% of the avatar height, `+.02em`. No
photographs in v1, no status dot. Group stack: overlap `-6px` with a 2px `--card`
outline, max 4 then `+3` in mono `--mut`.

### 6.19 Dropdown menu / popover

`--card`, 1px `--hair2`, `--shadow-pop`, min-width `180px`, padding `4px 0`.
Item `34px` tall, `14px` horizontal padding, Instrument Sans 400 13px `--body`.
Hover / active-descendant: `--tint`, `--ink`. Disabled `--mut`. Destructive item:
`--st-corr-fg` text on `--st-corr-bg` hover. Separator 1px `--hair` with `4px` margin.
Section label Instrument Sans 500 11px `--mut` at `8px 14px`.
Enter 120ms opacity + `translateY(-2px→0)`; exit 100ms opacity.
Keyboard: `↑ ↓ Home End`, type-ahead, `Esc` closes and restores focus.

```
--shadow-pop: 0 10px 24px -12px rgba(13,15,18,.22),
              0 2px 6px -3px rgba(13,15,18,.14);
```

The **only** shadow in the system, on floating layers exclusively. A panel never
receives it. The brand's ban targets uniform soft shadows used as decoration on every
card; a floating layer needs depth to read as floating, and it is the one place depth
is real.

### 6.20 Breadcrumb

Three-level routes only (§1.6). Instrument Sans 400 **12px** `--mut`, sentence case,
separated by a `--hair2` slash `/` — not a chevron, not a middle dot. The current page
is `--ink` and not a link. Sits on line 1 of the top bar in place of the back-link.
Truncates the middle segment below 900px.

### 6.21 FilterBar

`--card`, 1px `--hair` bottom, height `56px`, horizontal padding equal to the page
gutter, controls at `sm` (30px) with `11px` gaps.

Order: **search → primary entity filter → secondary filters → date or week range →
(spacer) → active-filter count and `Clear`.**

- Search: `240px`, leading 14px glyph `--mut`, debounced 250ms.
- Filter triggers are Secondary `sm` buttons showing `Label` when unset and
  `Label: value` (or `Label: 3`) in `--ink` with a 1px `--acc` border when set.
- Multi-select opens a popover with a checkbox list, a search field above it when
  there are more than 8 options, and `Apply` / `Clear` in a `--tint` footer.
- `Clear` appears only when a filter is active: ghost `sm` with the count.
- **All filter state lives in the URL query string.** Shareable, back-button-correct,
  refresh-safe. Hard requirement.
- Below 900px: search + a single `Filters` button with a count, opening a full-screen
  sheet with the same controls stacked.

### 6.22 Progress / meter

A 4px `--tint2` track with an `--acc` fill, zero radius. Used only where a proportion
is the point — compliance, project progress, password strength. Width transitions
200ms and **only on a user-caused change**, never on mount.


### 6.23 Comment thread

Used on daily updates and on the week (`requirments_doc.md` §2.1, §4).

- **A comment**: avatar 22px, name 13px/500 `--ink`, role chip for managers and admins,
  time in mono 11px `--mut`, and — on a week comment — its version and kind
  (`rev 2 · sent back`, `rev 3 · approved`) in mono 11px. Text 14px `--body`. On `--tint`,
  `12px 14px` padding, no border.
- **Replies** indent `24px` under their comment with a 1px `--hair` left rule, same
  anatomy at 13px. Oldest first, all shown — threads here are short.
- **`Reply`** text button under each thread, opening a 2-row textarea with `Post reply`.
  **`Comment`** opens a new thread. Both appear only to people allowed to write there.
- **The 10-minute window.** For its writer, a comment shows `Edit` and `Delete` text
  buttons with a mono countdown ("9 min left") that ends silently — the buttons simply
  disappear. `Delete` is absent on a comment that has replies, and on a send-back comment.
  An edited comment shows "edited" after its time.
- **Closed to teammates.** When a teammate can read but not write, the thread ends with
  one `--mut` line: "Comments on this update are limited to Imali and managers."

### 6.24 "New" marker

The product's only notification device (`requirments_doc.md` §17). A `6×6px` `--acc`
square, zero radius, placed **on the thing that is new**: before a week in a list, beside
a day's comment count, on a thread in a rail, on a review-desk row, and at the right edge
of the nav item whose page holds it. Accessible text "New". No number except the review
desk count, no toast, no bell, no list of notifications. Opening the week clears it.

### 6.25 Project progress

A 4px `--tint2` track, zero radius, with an `--acc` fill for the share used. In the days
view: days used ÷ planned days. In the hours view: hours logged ÷ planned hours, or no
bar at all when no hours were planned. Past 100%, the track fills and an overrun segment
extends it in `--st-corr-bd`, capped visually at 150% — with the words "overdue by 3
days" beside it, since a bar alone doesn't say how late. The `Days | Hours` segmented
control switches every bar on the page at once.

---

## 7. Dashboard and chart specification

### 7.1 The metric cell

The ban is on _a grid of identical cards, each with an icon in a circle, a big number
and a label, in the charting library's default colors._ The replacement:

- **One panel, not four cards.** The four metrics share a single `--card` panel with
  1px `--hair` **vertical** dividers. It reads as one instrument, not four widgets.
- **No icons at all.**
- **Label above the number.** Instrument Sans 500 **12px** `--mut`, sentence case. The
  label is the question; the number is the answer; questions come first.
- **Number:** Chivo 700 **34px** `--ink`, tabular-nums, `-.03em`. A secondary unit or
  denominator (`/ 12`) renders at 20px `--mut` on the same baseline.
- **Sub-line:** Instrument Sans 12px `--mut`, one line, the breakdown that makes the
  number meaningful, with numerals in mono. If there is no honest breakdown the
  sub-line is omitted, not padded with a fake delta arrow.
- **Cell padding** `20px 24px`, min-height `92px`.
- **No color on a metric cell** except where the number _is_ a status count:
  `Needs correction` renders its number in `--st-corr-fg`. That is the only colored
  number on the dashboard, which is what makes it land. *(Owner decision, C7 feedback,
  2026-10-07, for the dashboard's strip only: the four numbers are coloured — Filed
  `--acc-txt`, Compliance `--st-appr-fg`, Needs correction `--st-corr-fg` (still the red
  alarm), Open blockers `--st-draft-fg` — because the strip read flat. The profile's strip
  and This week's keep this rule.)*

```
┌──────────────────┬──────────────────┬──────────────────┬──────────────────┐
│ Filed this week  │ Compliance       │ Needs correction │ Open blockers    │
│ 9 / 12           │ 75%              │ 2                │ 3                │
│ 3 not yet filed  │ 82% over 8 weeks │ oldest 3 days    │ raised by 3 people│
└──────────────────┴──────────────────┴──────────────────┴──────────────────┘
```

Below 900px: a 2×2 grid inside the same panel with hairlines both ways. Below 640px: a
single column.

### 7.2 Chart container

- Header row `44px` with a 1px `--hair` bottom: title Chivo 700 **15px** `--ink` left;
  a scope control (Select `sm`) or the legend right.
- Plot padding `20px 24px 16px`.
- **Fixed heights:** trend `260px`, bar charts `240px`, feed matches its neighbour.
  Charts never auto-size vertically; a dashboard whose row heights jump as data
  arrives looks broken.

### 7.3 Axes, gridlines, legend, tooltip

| Element       | Specification                                                                                                                                                                                                                                                                                         |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Gridlines     | **Horizontal only**, 1px `--hair`. No vertical, no dotted.                                                                                                                                                                                                                                            |
| Axis line     | X baseline only, 1px `--hair2`. No Y axis line.                                                                                                                                                                                                                                                       |
| Tick labels   | **JetBrains Mono 11px** `--mut`, tabular — numeric content, so mono is on the closed list. Y right-aligned with an `11px` gap; X centred.                                                                                                                                                             |
| Tick count    | Y: 4 maximum, rounded to nice values. X: every tick at ≤ 8 categories, else every other with the last always shown.                                                                                                                                                                                   |
| Axis titles   | **None.** The panel title plus unit suffixes on tick labels (`h`, `%`) carry it.                                                                                                                                                                                                                      |
| Legend        | **Top-right in the panel header**, horizontal: an 8×8px swatch + Instrument Sans 11px `--mut` label, gap `14px`. Never below the plot, never inside it, never boxed. Single-series charts have no legend.                                                                                             |
| Line series   | 2px stroke, no rest markers; markers on hover. No area fill, no gradient.                                                                                                                                                                                                                             |
| Bar series    | Bar width ≤ 28px, gap 40% of bar width, zero radius, no border.                                                                                                                                                                                                                                       |
| Series colors | Fixed by category from §3.5 — `--c1` Development, `--c2` Testing, `--c3` Meetings, `--c4` Documentation, `--c5` Review, `--c7` Research & study, `--c6` Other. **The same category is the same color in every chart on every page, and the same seven appear in the day panel and the report form (§4.6, §4.11).**                                        |
| Tooltip       | `--ink` surface, `--d-text` text, `10px 12px`, `--shadow-pop`, no arrow, `12px` cursor offset. Header mono 11px `--d-mut` (the x value). Rows: 8×8px swatch + 12px `--d-body` label + 13px `--d-text` value, tabular, right-aligned, `14px` gap. Crosshair: 1px `--hair2` vertical, line charts only. |
| Empty plot    | Axes render; centred 13px `--mut` "No data for week 38." No illustration.                                                                                                                                                                                                                             |

### 7.4 Chart-by-chart layout (against `requirments_doc.md` §6)

| Requirement                                 | Rendering                                                                                                                                                                                  | Placement                          |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------- |
| Submission / approval status by team member | **The team table** with status chips — not a chart. A manager needs names and a click target, not a pie.                                                                                   | Full width, under the metric strip |
| Tasks completed trend over time             | Line chart, one team-wide series plus an optional per-person series chosen in the panel header, beside a **window** Select — 4 / 8 / 12 weeks, default 8 — ending at the week in the picker. This window replaces the dashboard's old date-range filter (§3.7). Weeks on x in mono, `W31…W38`. | cols 1–8                           |
| Time spent by task type, team-wide          | **Horizontal** bars, seven rows (the §0.4 categories), value in mono at each bar's end. Horizontal because the category names are words.                                                     | cols 9–12                          |
| Workload by project                         | Horizontal stacked bar, one row per project, segments colored by task type, total in mono at the row end. Hours from the week's work lines, Drafts included, since they are shared as posted. | cols 1–6                           |
| Recent activity feed                        | Not a chart: `44px` rows — mono timestamp `--mut` (w-88) · actor · verb · target · status chip. Verbs: `submitted` / `approved` / `sent back`. The latest 8 rows; **no "All activity" button** (`requirments_doc.md` §6). | cols 7–12                          |

**No pie or donut chart anywhere in the product.** Proportions are stacked bars, which
are comparable across rows; pies are not.

### 7.5 Library note

The chart library choice belongs to the Software Architect. Whatever is chosen must be
configured to the values above — in particular: default color sequence **disabled**,
default legend **disabled** (the legend is built from this system's components),
default tooltip **replaced**, mount animation **disabled** (§8), gridlines
horizontal-only. If the library cannot do these things, it is the wrong library.

---

## 8. Motion inventory (product)

The landing page's sanctioned list does not apply here. This is the product's complete
list; anything not on it does not animate.

### 8.1 Easing tokens

```
--ease-out:  cubic-bezier(.2, 0, 0, 1);     /* entrances, expansions, the default */
--ease-in:   cubic-bezier(.4, 0, 1, 1);     /* exits */
--ease-soft: cubic-bezier(.4, 0, .2, 1);    /* layout and width changes */
```

### 8.2 The inventory

"How" names the implementation, because `development_approach_doc.md` chose **Motion
(formerly Framer Motion)** for this project. Most of this list is plain CSS; Motion is
reached for only where exit animations or layout projection genuinely need it, which
keeps the bundle honest.

| #   | Interaction                   | Property                           | Duration                 | Easing                     | How                            | Trigger                   |
| --- | ----------------------------- | ---------------------------------- | ------------------------ | -------------------------- | ------------------------------ | ------------------------- |
| 1   | Button hover                  | background, border                 | 120ms                    | linear                     | CSS                            | hover                     |
| 2   | Button press                  | `scale(.985)`                      | 80ms                     | `--ease-out`               | CSS                            | press                     |
| 3   | Nav item hover                | background, color                  | 120ms                    | linear                     | CSS                            | hover                     |
| 4   | Sidebar collapse              | width                              | 160ms                    | `--ease-soft`              | CSS                            | click                     |
| 5   | Table row hover               | background                         | 120ms                    | linear                     | CSS                            | hover                     |
| 6   | Input focus                   | border, background                 | 120ms                    | linear                     | CSS                            | focus                     |
| 7   | Dropdown / popover            | opacity, `translateY(-2px)`        | 120 / 100ms              | `--ease-out` / `--ease-in` | **Motion** (`AnimatePresence`) | click                     |
| 8   | Week-picker popover           | as above                           | 120ms                    | as above                   | **Motion**                     | click                     |
| 9   | Modal open / close            | opacity, `translateY(4px)`         | 180 / 120ms              | `--ease-out` / `--ease-in` | **Motion** (`AnimatePresence`) | click                     |
| 10  | Modal backdrop                | opacity                            | 180 / 120ms              | same                       | **Motion**                     | click                     |
| 11  | Toast in / out                | opacity, `translateX(8px)`         | 200 / 140ms              | same                       | **Motion** (`AnimatePresence`) | result of a click         |
| 12  | Tooltip                       | opacity                            | 100ms (350ms open delay) | `--ease-out`               | CSS                            | hover / focus             |
| 13  | Tab indicator slide           | `transform`                        | 180ms                    | `--ease-out`               | **Motion** (`layoutId`)        | click                     |
| 14  | Status chip change            | background, border, color          | 200ms                    | `--ease-out`               | CSS                            | your own submit / approve |
| 15  | Key-flag toggle               | background, border, opacity        | 160ms                    | `--ease-out`               | CSS                            | click                     |
| 16  | Inline error appear           | opacity                            | 120ms                    | `--ease-out`               | CSS                            | blur / submit             |
| 17  | Chart data transition         | series path / bar length           | 320ms                    | `--ease-out`               | chart library                  | filter or scope change    |
| 18  | Progress / meter fill         | width                              | 200ms                    | `--ease-out`               | CSS                            | edit or filter change     |
| 19  | Mobile nav drawer             | `translateX`, backdrop opacity     | 200 / 140ms              | `--ease-out` / `--ease-in` | **Motion**                     | click                     |
| 20  | Route transition              | opacity `0→1`, content column only | 140ms                    | `--ease-out`               | **Motion**                     | navigation                |
| 21  | Skeleton pulse                | opacity `.55→1`                    | 900ms loop               | `ease-in-out`              | CSS                            | loading (from navigation) |
| 22  | Scroll to first invalid field | scroll position                    | browser `smooth`         | —                          | native                         | submit                    |

Every entry is caused by something the person did. Entry 21 is the only loop and it is
a loading indicator. Entry 11 is the only thing that appears without a direct click,
and it is the acknowledgement of one.

### 8.3 Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }
}
```

Plus: the skeleton holds at `opacity: .7`; chart updates apply instantly; the tab
indicator jumps; modals, drawers and toasts appear at their final position with no
transform; scroll-to-error becomes an instant jump with focus, which is more reliable
anyway. Nothing is removed — every state change still happens, it just happens at once.
In Motion, set the same via `useReducedMotion()` so exit animations are skipped rather
than merely shortened.

### 8.4 Explicitly banned in the product

- The hero week-sweep. It is a marketing device; in the product the week strip is
  **static**.
- Count-up on dashboard metrics **on page load**. Numbers render at their value.
  (Entry 17 allows a transition when a filter changes — that shows what the person's
  action did.)
- Fade-and-slide-up on cards, rows, sections or charts entering the viewport.
- Any scroll-linked animation.
- Shimmer sweeps on skeletons.
- Confetti or any celebratory motion on approval, beyond entry 14.
- Page-load entrance staggering of any kind.

*Owner-approved exceptions (auth pages, PR #27; rounds three and four, 2026-10-17), on the
signed-out auth screens only, never inside the app:* (1) the brand panel's sample week is a
**continuous decorative loop** — it walks Monday to Thursday and posts Thursday, every 15 s
(§8.5, entry 32; it replaces the one-time fill-in accepted earlier); (2) the screens **arrive**
in a view transition from the landing page and with a staggered entrance (entries 33 and 35,
round six); (3) the panel's hairline grid **drifts** one cell every
14 s and a few of its cells softly light in turn (entry 34; round five sped the drift up from
48 s and added the cells). All three move only `opacity` and `transform`; the loop runs on one timer, the
grid on one CSS layer; both wait while the tab is hidden or the panel is out of view (the
phone layout hides it); under reduced motion none of them runs (the posted Thursday is shown).
Nothing else in the product is excused from the list above.

### 8.5 Owner decision — whole-app polish (2026-10-10)

> **Owner decision (polish pass after C10, 2026-10-10).** The app should not feel like a
> generic website, so the inventory in §8.2 gains the entries below. Every one is caused by
> something the person did, stays under 220ms, moves only `opacity` and position, and is
> covered by `MotionConfig reducedMotion="user"` or the §8.3 block (it jumps, or becomes a
> fade). §8.4 still stands in full: nothing animates on page load, nothing staggers, nothing
> is scroll-linked. Entry 2 is widened (all variants, `.97`); entries 7 and 8 gain a 2%
> scale from the trigger.

| #   | Interaction                         | Property                               | Duration     | Easing        | How                              | Trigger           |
| --- | ----------------------------------- | -------------------------------------- | ------------ | ------------- | -------------------------------- | ----------------- |
| 2′  | Button press — **every variant**    | `scale(.97)` (Tailwind's `scale`)      | 120ms        | `--ease-out`  | CSS                              | pointer-down      |
| 7′  | Popover / menu                      | opacity, `translateY(-2px) scale(.98)` from the trigger (Radix origin) | 140 / 100ms | `--ease-out` / linear | CSS | click |
| 23  | Sidebar: the active item            | the tint and 2px bar slide to the new item | 200ms    | `--ease-out`  | **Motion** (`layoutId`)          | navigation        |
| 24  | Segmented control selection         | the `--acc-l` fill slides              | 180ms        | `--ease-out`  | **Motion** (`layoutId`)          | click / arrows    |
| 25  | Week strip: the chosen day's bar    | the 2px `--ink` bar slides             | 180ms        | `--ease-out`  | **Motion** (`layoutId`)          | click / arrows    |
| 26  | Day switch (This week, Team updates)| new content: opacity, 8px from the side it came from | 180ms | `--ease-out` | **Motion** (`ContentSwap`) | day chosen |
| 27  | A row the person adds (work line, blocker, plan item, achievement, link) | opacity, `translateY(4px)` | 200ms | `--ease-out` | CSS (`[data-appended]`) | "Add a …" |
| 28  | A comment or reply the person just posted | opacity, `translateY(4px)`       | 200ms        | `--ease-out`  | CSS (`.wv-settle-in`)            | post              |
| 29  | Autosave state change               | the words fade in; the 6px square fills | 120 / 160ms | `--ease-out` / linear | CSS                  | save              |
| 30  | Light ↔ dark switch                 | background, border and text colours cross-fade | 200ms | `ease`     | CSS (`.wv-theme-easing`, 260ms)  | Appearance switch |
| 31  | Demo chooser: a choice under the pointer | 2px `--acc` bar fades in; the chevron moves 2px | 120 / 160ms | linear / `--ease-out` | CSS | hover |
| 32  | Auth screens' brand panel: the sample week loops *(owner decision, auth pages 2026-10-17, rounds three and four)* | each change in three moves that never overlap: the old day fades out (`opacity`, 0–160ms, `--ease-in`); the chosen day's 2px `--ink` bar slides (`transform`, 140–340ms); the new day fades in (240–420ms) — on Thursday its square fills (`opacity`, `scale(.5→1)`) and the posted lines rise 4px. Mon → Tue → Wed → Thu, Thursday posted, back to Monday | steps 3 / 3 / 3 / 2.2 / 3.8 s — a 15 s cycle | `--ease-out` | CSS transitions, one `setTimeout` (`previewSteps.js`) | continuous while visible |
| 33  | Landing ↔ auth screens: the view transition *(owner decision, round six; replaces round four's block rise)* | the old page fades out as the new one fades in and rises 6px (one length and curve both ways, so the browser's plus-lighter blend never washes out the middle); also between the auth screens, and for browser Back and Forward | 300ms | `--ease-soft` | React Router `viewTransition`; CSS on `::view-transition-old/new(root)` | a click on a `TransitionLink`, or Back / Forward |
| 35  | Auth screens: staggered entrance *(owner decision, round six)* | each part rises 10px with a fade, 50ms after the one before — brand side: wordmark, intro card, sample card, caption; form side 40ms behind: back link, heading, line, panel, links (the last done at about 600ms). Inside a view transition the parts only rise (the cross-fade fades them). The brand panel's background fades in (280ms). The form can be focused and typed in at once | 380ms each | `--ease-out` | CSS (`.wv-stagger` with `--stagger`, `.wv-in-transition`, `.wv-auth-fade`) | the screen mounts (a direct load, a refresh, an arrival, or a change of auth screen) |
| 34  | Auth screens' brand panel: the grid drifts and a few cells light *(owner decisions, rounds four and five)* | one oversized layer of the 32px `--hair` grid moves one cell down and right (`transform`), seamlessly; eight of its cells light to `--acc` at 12% (light) / 28% (dark) and back (`opacity`), in four turns, two at a time — placed only where they never sit behind text or a card | 14s, `infinite` (each cell: ~1.4s in, ~1.4s out, dark at the loop's seam) | linear | CSS (`.wv-grid-drift`, `.wv-grid-cell`), paused by `[data-paused]`; positions measured once and on resize (`ResizeObserver`) | continuous while visible |
| 36  | Demo tour: a step's tooltip appears *(owner decision, guided tour 2026-10-17)* | opacity `0→1`; the highlight and the tooltip's position change **instantly** — nothing travels between steps | 120ms | `--ease-out` | CSS (`.wv-fade-in`, keyed per step) | the visitor moves to a step, or a step's action finishes |
| 37  | Demo tour: the jump panel | backdrop fades in / out, sheet fades in (no slide) | 180 / 120ms; sheet 120ms | `--ease-out` / `--ease-in` | CSS (`.wv-backdrop`, `.wv-fade-in`) | Tour, Jump to a part |

- **Entries 32–34 are the exceptions to §8.4** — owner decisions (PR #27, rounds three and
  four, 2026-10-17); 32 replaces the one-time fill-in. Signed-out auth screens only, never in
  the app. **Round six (owner decision) changed 33:** the landing page's links are now
  client-side, so 33 is a real view transition (the earlier "full page loads" rule is
  withdrawn; `brand_design_strategy.md` §6.0 rule 14), and the arrival is the stagger (35).
  Without view transitions, navigation still works and 35 plays; under reduced motion the
  switch is instant and nothing staggers.
  Entry 32: It never moves the form or takes focus; it
  pauses on `visibilitychange` (tab hidden) and when an `IntersectionObserver` says the panel
  is out of view (the phone layout hides it); under reduced motion it does not start and the
  posted Thursday is shown. The card is `aria-hidden`; the caption is the real text.
- **Entries 36–37 (guided tour)** are caused by the visitor (Next, Back, a jump, finishing an
  action). The tour scrolls the page to its target smoothly — or instantly under reduced
  motion — and never animates the highlight; under reduced motion 36–37 are cut to 1ms by §8.3.
  **Do it for me**'s pace (typing, the short pauses) is not an animation but the tour working
  the real page where the visitor can follow it; under reduced motion it fills everything at
  once (§3.14 "Guided tour").
- **Reduced motion:** 23–25 jump; 26 is a fade with no travel (`useReducedMotion`); 27–29 and
  31 are cut to 1ms by §8.3; 30 stays — it is colour only, and a gentle cross-fade is kinder
  than a full-screen brightness jump (Apple's guidance, the owner's reference).
- **Not animated, on purpose:** keyboard focus moves, table sorting and paging, data
  refetches, chart first paint, metric numbers, status chips other than entry 14.

---

## 9. Implementable tokens

### 9.1 Recommendation

**CSS custom properties are the source of truth; Tailwind's `@theme` block maps onto
them.** The theme toggle becomes a single selector swap with no class rewriting; tokens
are readable in devtools; and non-Tailwind surfaces (chart configs, canvas, third-party
components) can read the same values via `getComputedStyle`. Tailwind alone would need
`dark:` variants on every colored element — exactly the drift that makes ten pages look
like ten products.

**The mechanism is Tailwind 4's CSS-first `@theme`, not a `tailwind.config.js`.** This
document previously specified a v3-style config file; the project installs Tailwind 4
(`tech_stack.md` §1.2), where that file is not read and the scales in it would silently
not exist. The configuration in §9.4 is the same set of decisions expressed in the form
the installed version executes — nothing about the values changed.

### 9.2 Font loading

In `index.html` `<head>`, before the stylesheet:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Chivo:wght@300..900&family=Instrument+Sans:wght@400..700&family=JetBrains+Mono:wght@400;500&display=swap"
  rel="stylesheet"
/>
```

One request, three variable families, `display=swap`. Do not self-host in v1 and do not
add a fourth family **to the product**. The landing page's own face (Bricolage Grotesque,
`brand_design_strategy.md` §6.0) is requested by the landing page alone, when it mounts;
the app and the demo never load it, and never use it.

```html
<script>
  document.documentElement.dataset.theme =
    localStorage.getItem("wv.theme") || "light";
</script>
```

Inline in `<head>` before the app bundle, to prevent a theme flash.

### 9.3 `src/styles/tokens.css`

> **Owner decision (C7 feedback, 2026-10-07) — vibrancy.** The dashboard read as flat, so the
> status and chart colours below are more saturated, each keeping its hue, in both themes. The
> status chips (`--st-draft-*` is now amber, `--st-subm-*` blue, `--st-corr-*` red, `--st-appr-*`
> green) are stronger, and `--st-corr-*` stays the red alarm. The seven chart colours `--c1`…`--c7`
> are the same hue per task type, more saturated; because the day panel, the weekly form and every
> chart read the same tokens, their swatches change together and still match (the parity is the
> token, not a copy). Values changed: every `--st-draft|subm|corr|appr-fg|bg|bd` and `--c1`…`--c7`,
> light and dark; nothing else in this block. On the dashboard the four metric numbers are coloured
> (Filed blue, Compliance green, Needs correction red, Open blockers amber) — §7.1's "no colour but
> Needs correction" is superseded for the dashboard — and the team table's five-day squares follow
> §3.7 as amended there. A whole-app visual-polish session is planned after C10 (`PROGRESS.md`).

```css
:root {
  color-scheme: light;

  /* ── Surfaces ─────────────────────────────────────────── */
  --paper: #f6f8f8;
  --paper-a: rgba(246, 248, 248, 0.9);
  --card: #ffffff;
  --tint: #edf1f2;
  --tint2: #e4eaeb;

  /* ── Text ─────────────────────────────────────────────── */
  --ink: #0d0f12;
  --body: #464c53;
  --mut: #7c838a;

  /* ── Lines ────────────────────────────────────────────── */
  --hair: #e0e5e6;
  --hair2: #d0d6d8;
  --rule: #cbd1d3;

  /* ── Accent ───────────────────────────────────────────── */
  --acc: #1c39bb;
  --acc-d: #152c94;
  --acc-l: #e8ecfb;
  --acc-txt: #1c39bb;
  --on-acc: #ffffff;

  /* ── Dark-band surfaces (demo bar, toasts, tooltips) ──── */
  --d-panel: #14171b;
  --d-panel2: #191d22;
  --d-line: #242a31;
  --d-hover: #1b2027; /* brand §3.3 — row hover on a dark surface */
  --d-text: #eef1f4;
  --d-body: #a4acb5;
  --d-mut: #727a83;
  --acc-on-d: #8aa0f2;

  /* ── Status ───────────────────────────────────────────── */
  --st-draft-fg: #6a4f00;
  --st-draft-bg: #fcf0c4;
  --st-draft-bd: #ecd16b;
  --st-subm-fg: #10458f;
  --st-subm-bg: #dbe9ff;
  --st-subm-bd: #8fb7f5;
  --st-corr-fg: #a3150e;
  --st-corr-bg: #fde0dc;
  --st-corr-bd: #f0847b;
  --st-appr-fg: #0f6b2c;
  --st-appr-bg: #d6f3df;
  --st-appr-bd: #75cc92;
  --st-none-fg: #7c838a;
  --st-none-bg: transparent;
  --st-none-bd: #cbd1d3;
  /* Five statuses, and there is no sixth. No --late token: the product
     has no deadline, so lateness is not computable (§0.4). */

  /* ── Chart sequence (fixed by category) ───────────────── */
  --c1: #1f44d6; /* Development   */
  --c2: #2e9ad8; /* Testing       */
  --c3: #1e8f43; /* Meetings      */
  --c4: #7a8794; /* Documentation */
  --c5: #d6342b; /* Review        */
  --c6: #8f3fb5; /* Other         */
  --c7: #d49a0c; /* Research & study — approved by the owner (§0.3) */

  /* ── Elevation (floating layers only) ─────────────────── */
  --shadow-pop:
    0 10px 24px -12px rgba(13, 15, 18, 0.22),
    0 2px 6px -3px rgba(13, 15, 18, 0.14);
  --backdrop: rgba(13, 15, 18, 0.44);

  /* ── Type ─────────────────────────────────────────────── */
  --f-display: "Chivo", "Helvetica Neue", Arial, sans-serif;
  --f-ui: "Instrument Sans", "Helvetica Neue", Arial, sans-serif;
  --f-mono: "JetBrains Mono", "SFMono-Regular", Consolas, monospace;

  /* ── Component dimensions (not spacing — see §0.3) ────── */
  --nav-w: 240px;
  --nav-w-min: 62px;
  --nav-drawer: 280px;
  --bar-h: 62px;
  --rail-w: 200px;
  --row-h: 40px;
  --row-h-dense: 36px;
  --head-h: 36px;
  --ctrl-h: 38px;
  --ctrl-h-sm: 30px;
  --ctrl-h-lg: 44px;
  --doc-max: 860px;
  --form-max: 1080px;
  --field-max: 560px;
  --page-max: 1240px;
  --data-max: 1560px;
  --rail-r: 280px; /* detail rail  */
  --rail-r-lg: 320px; /* review rail  */

  /* ── Motion ───────────────────────────────────────────── */
  --ease-out: cubic-bezier(0.2, 0, 0, 1);
  --ease-in: cubic-bezier(0.4, 0, 1, 1);
  --ease-soft: cubic-bezier(0.4, 0, 0.2, 1);
}

[data-theme="dark"] {
  color-scheme: dark;

  --paper: #0e1013;
  --paper-a: rgba(14, 16, 19, 0.9);
  --card: #14171b;
  --tint: #191d22;
  --tint2: #1b2027;

  --ink: #eef1f4;
  --body: #a4acb5;
  --mut: #727a83;

  --hair: #242a31;
  --hair2: #2e353d; /* §0.3 extension */
  --rule: #39414a; /* §0.3 extension */

  --acc: #3552d6; /* §0.3 extension — 6.2:1 with --on-acc */
  --acc-d: #2942b8; /* §0.3 extension */
  --acc-l: rgba(138, 160, 242, 0.14);
  --acc-txt: #8aa0f2;
  --on-acc: #ffffff;

  --st-draft-fg: #f2cf62;
  --st-draft-bg: rgba(242, 200, 70, 0.16);
  --st-draft-bd: rgba(242, 200, 70, 0.4);
  --st-subm-fg: #8fbcff;
  --st-subm-bg: rgba(60, 120, 230, 0.22);
  --st-subm-bd: rgba(110, 160, 250, 0.45);
  --st-corr-fg: #ff8f84;
  --st-corr-bg: rgba(230, 50, 40, 0.24);
  --st-corr-bd: rgba(255, 120, 110, 0.45);
  --st-appr-fg: #6fe09a;
  --st-appr-bg: rgba(40, 180, 90, 0.2);
  --st-appr-bd: rgba(90, 210, 130, 0.42);
  --st-none-fg: #727a83;
  --st-none-bg: transparent;
  --st-none-bd: #242a31;

  --c1: #7b93ff; /* vivid in both themes — owner decision, C7 */
  --c2: #4fb4f0;
  --c3: #52c27a;
  --c4: #9aa7b5;
  --c5: #ff6b5e;
  --c6: #b979e0;
  --c7: #f2b932; /* approved by the owner (§0.3) */

  --shadow-pop:
    0 12px 28px -14px rgba(0, 0, 0, 0.68), 0 2px 8px -4px rgba(0, 0, 0, 0.5);
  --backdrop: rgba(0, 0, 0, 0.58);
}

/* Base */
html {
  -webkit-text-size-adjust: 100%;
}
body {
  background: var(--paper);
  color: var(--body);
  font-family: var(--f-ui);
  font-size: 14px;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}
h1,
h2,
h3,
.metric {
  font-family: var(--f-display);
  font-weight: 700;
}
.tnum,
td.num,
.metric {
  font-variant-numeric: tabular-nums;
}
*,
*::before,
*::after {
  border-radius: 0;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 1ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 1ms !important;
    scroll-behavior: auto !important;
  }
}
```

### 9.4 The `@theme` block — `src/styles/index.css`

> **Read this first:** colors, spacing, radii, fonts and the type scale are **replaced**,
> not extended — `--color-*: initial` and its siblings switch the framework's own scales
> off, which makes an off-system value impossible to write by accident. `bg-indigo-500`
> and `rounded-lg` do not compile. The rule to remember: **the number in a spacing class
> is the pixel value.** `p-16` is 16px, not 64px.
>
> **This replaced a `tailwind.config.js`** written in Tailwind v3 form. The project
> installs Tailwind 4 (`tech_stack.md` §1.2), which does not read that file — so the
> spacing scale, the type scale and the palette lockdown would all have silently failed
> to exist while appearing to be specified. Same decisions, same values, expressed in the
> form the installed version executes. `tech_stack.md` §6.5 carries this block verbatim.

```css
/* client/src/styles/index.css */
@import "tailwindcss";
@import "./tokens.css"; /* §9.3 — :root + [data-theme="dark"] */
@import "./base.css"; /* global elements, focus ring, reduced motion */

@theme {
  /* ── Colors — REPLACED ──────────────────────────────────────────
     Every entry maps to a variable from tokens.css and never restates
     a hex. @theme does not participate in the [data-theme="dark"]
     cascade: a literal here would compile the light value into every
     utility, and dark mode would switch hand-written CSS while every
     bg-card and text-ink stayed light. tokens.css is the source of
     truth; this is a mapping layer over it. */
  --color-*: initial;

  --color-paper: var(--paper);
  --color-card: var(--card);
  --color-tint: var(--tint);
  --color-tint2: var(--tint2);

  --color-ink: var(--ink);
  --color-body: var(--body);
  --color-mut: var(--mut);

  --color-hair: var(--hair);
  --color-hair2: var(--hair2);
  --color-rule: var(--rule);

  --color-acc: var(--acc);
  --color-acc-d: var(--acc-d);
  --color-acc-l: var(--acc-l);
  --color-acc-txt: var(--acc-txt);
  --color-acc-on-d: var(--acc-on-d);
  --color-on-acc: var(--on-acc);

  --color-d-panel: var(--d-panel);
  --color-d-panel2: var(--d-panel2);
  --color-d-line: var(--d-line);
  --color-d-hover: var(--d-hover);
  --color-d-text: var(--d-text);
  --color-d-body: var(--d-body);
  --color-d-mut: var(--d-mut);

  --color-st-draft-fg: var(--st-draft-fg);
  --color-st-draft-bg: var(--st-draft-bg);
  --color-st-draft-bd: var(--st-draft-bd);
  --color-st-subm-fg: var(--st-subm-fg);
  --color-st-subm-bg: var(--st-subm-bg);
  --color-st-subm-bd: var(--st-subm-bd);
  --color-st-corr-fg: var(--st-corr-fg);
  --color-st-corr-bg: var(--st-corr-bg);
  --color-st-corr-bd: var(--st-corr-bd);
  --color-st-appr-fg: var(--st-appr-fg);
  --color-st-appr-bg: var(--st-appr-bg);
  --color-st-appr-bd: var(--st-appr-bd);
  --color-st-none-fg: var(--st-none-fg);
  --color-st-none-bg: var(--st-none-bg);
  --color-st-none-bd: var(--st-none-bd);

  --color-chart-1: var(--c1); /* Development   */
  --color-chart-2: var(--c2); /* Testing       */
  --color-chart-3: var(--c3); /* Meetings      */
  --color-chart-4: var(--c4); /* Documentation */
  --color-chart-5: var(--c5); /* Review        */
  --color-chart-6: var(--c6); /* Other         */
  --color-chart-7: var(--c7); /* Research & study */

  /* ── Spacing — REPLACED, keyed by px ────────────────────────────
     `--spacing: initial` switches off v4's dynamic scale, so only the
     brand's sixteen steps (§5.1) compile. p-18 is a build-time nothing,
     not a silent 72px. */
  --spacing: initial;
  --spacing-0: 0px;
  --spacing-px: 1px;
  --spacing-2: 2px;
  --spacing-4: 4px;
  --spacing-6: 6px;
  --spacing-8: 8px;
  --spacing-11: 11px;
  --spacing-14: 14px;
  --spacing-16: 16px;
  --spacing-20: 20px;
  --spacing-22: 22px;
  --spacing-24: 24px;
  --spacing-26: 26px;
  --spacing-32: 32px;
  --spacing-44: 44px;
  --spacing-52: 52px;
  --spacing-62: 62px;
  --spacing-88: 88px;
  --spacing-96: 96px;

  /* ── Type scale — REPLACED: the brand's roles + §0.3's extensions ─ */
  --text-*: initial;

  --text-metric: 34px;
  --text-metric--line-height: 1;
  --text-metric--letter-spacing: -0.03em;

  --text-metric-sm: 26px;
  --text-metric-sm--line-height: 1;
  --text-metric-sm--letter-spacing: -0.025em;

  /* Owner decision (auth pages, 2026-10-17): the auth screens' heading (§3.12). */
  --text-title: 40px;
  --text-title--line-height: 1.08;
  --text-title--letter-spacing: -0.04em;

  --text-page: 28px;
  --text-page--line-height: 1.12;
  --text-page--letter-spacing: -0.035em;

  --text-sub: 20px;
  --text-sub--line-height: 1.2;
  --text-sub--letter-spacing: -0.03em;

  --text-panel: 17px;
  --text-panel--line-height: 1.25;
  --text-panel--letter-spacing: -0.02em;

  --text-panel-sm: 15px;
  --text-panel-sm--line-height: 1.3;
  --text-panel-sm--letter-spacing: -0.015em;

  --text-lg: 16px;
  --text-lg--line-height: 1.55;

  --text-base: 14px;
  --text-base--line-height: 1.5;

  --text-dense: 13px;
  --text-dense--line-height: 1.45;

  --text-caption: 12px;
  --text-caption--line-height: 1.4;

  --text-micro: 11px;
  --text-micro--line-height: 1.2;
  --text-micro--letter-spacing: 0.02em;

  /* ── Fonts — REPLACED ───────────────────────────────────────────── */
  --font-*: initial;
  --font-display: var(--f-display);
  --font-ui: var(--f-ui);
  --font-mono: var(--f-mono);

  /* ── Shape — the editorial signature ────────────────────────────── */
  --radius-*: initial;
  --radius-none: 0px;
  --radius-sm: 0px;
  --radius-md: 0px;
  --radius-lg: 0px;
  --radius-xl: 0px;

  /* ── Breakpoints — the defaults plus xs ─────────────────────────── */
  --breakpoint-xs: 480px; /* sm 640 · md 768 · lg 1024 · xl 1280 · 2xl 1536 remain */
}
```

**Four literals appear above, and each is theme-independent.** The "never restate a
value" rule exists to keep `[data-theme="dark"]` working, so it binds every value that
differs between themes — which is every color, and nothing else. Zero radius, a pixel
spacing step, a font size and a breakpoint are the same in both themes, have no
counterpart in `tokens.css`, and would be indirection for its own sake.

**What is deliberately *not* in `@theme`.**

- **Component dimensions** — `--nav-w`, `--bar-h`, `--row-h`, `--doc-max`, `--rail-w` and
  the rest of §9.3's dimension block. They are not a utility scale (§0.3's dimension
  rule), and v4 has no theme namespace for a raw width or height, so they are used as
  arbitrary values: `h-[var(--row-h)]`, `w-[var(--nav-w)]`, `max-w-[var(--doc-max)]`.
- **`--shadow-pop` and the easing tokens.** Mapping them would collide: v4's namespaces
  are literally `--shadow-*` and `--ease-*`, and `tokens.css` already owns those exact
  names, so `--shadow-pop: var(--shadow-pop)` is a variable defined as itself. They are
  used as arbitrary values too — `shadow-[var(--shadow-pop)]`,
  `ease-[var(--ease-out)]` — which reads the one authoritative definition rather than
  duplicating it under a second name.
- **Durations.** `duration-[120ms]` and friends; the §8.2 inventory is the list, and a
  named scale would only be a second place to keep it.
- **Border widths.** `border` and `border-2` are static utilities in v4 and need no
  configuration; the system uses no other width.

**Caveat on opacity modifiers.** Because these colors are `var(--…)` holding hex strings,
Tailwind's slash syntax (`bg-acc/20`) will not work. Use the explicit `-bg` / `-l`
tokens, which is what the design calls for anyway. If a genuine need for alpha arises,
add channel-only tokens (`--acc-rgb: 28 57 187`) to `tokens.css` and reference them as
`rgb(var(--acc-rgb) / <alpha-value>)`.

---

## 10. Responsive strategy

Tailwind's default breakpoints are kept (plus `xs: 480px`) so no one has to remember
custom names.

### ≥ 1536px (`2xl`)

Nothing changes. Content stays capped at `1240px` / `1560px` and centres. The page does
not stretch; a 2000px-wide data table is unreadable.

### 1280–1535px (`xl`) — the reference width

Everything as specified. The report form's section rail is visible. Dashboard uses the
full 8/4 and 6/6 splits.

### 1024–1279px (`lg`)

- Sidebar auto-collapses to the 62px rail; a manual preference, once set, wins.
- Report form: rail removed, form column centres at `max 1080px`.
- Tasks table: still a table, horizontal scroll with sticky columns 1–2.
- Dashboard: 8/4 becomes 7/5; 6/6 unchanged. Chart heights unchanged.

### 768–1023px (`md`)

- Sidebar becomes an **off-canvas drawer**: `280px`, opened by a hamburger at the far
  left of the top bar, sliding over `--backdrop` in 200ms, closing on backdrop click,
  `Esc`, or route change.
- Dashboard: single column. Metric strip 2×2. Charts full width, heights unchanged.
- Tables: still tables; horizontal scroll with the primary column sticky.
- Report detail and review: the right rail moves **above** the document as a horizontal
  block, not below — a reviewer needs revision context before reading.
- Top bar: page title only; primary action stays, secondary actions move into an
  overflow `⋯` menu.

### 640–767px (`sm`)

- Tables become stacked row cards (§5.6); the editable tasks table becomes task cards
  (§4.4).
- Filter bar collapses to search + a `Filters` button opening a sheet.
- Form fields go full width; two-up rows become one column.
- Inputs grow to `44px` / 16px font.
- Page gutter drops to `20px`.
- Charts: trend keeps 240px and shows 5 x-ticks instead of 8; horizontal bar charts
  keep all rows.

### < 640px (`xs` and below)

- Modals become full-screen sheets; toasts full-width at the bottom.
- The form action bar spans the viewport, buttons equal-width `44px`, save state on its
  own line above (bar grows to `88px`).
- Metric strip becomes a single column of four cells with horizontal hairlines.
- The week strip compresses to `M T W T F` single letters at 36px.
- Top bar: back-link only on line 1; title truncates.
- Auth screens: the `420px` column becomes full width minus a `20px` gutter, and the
  panel loses its border (the page is the panel).

### Touch targets

Below 1024px every interactive element has a minimum `44×44px` hit area, achieved with
padding or a pseudo-element; visual size may remain smaller.

---

## 11. Consistency rules

The short list. Follow these and ten separately-built pages will look like one product.

1. **Surface levels are fixed.** Page `--paper`; chrome and panels `--card`; inputs,
   table headers and sunken blocks `--tint`; mini-UI and disabled fills `--tint2`.
   **Panels never nest** — separate content inside a panel with a 1px `--hair` rule or
   a `--tint` block.

2. **Card vs. bare content.** Use a panel when the content is a _bounded object_ — one
   report summary, one chart, one metric strip, one table. Use bare content on
   `--paper` for page headings, filter bars, and lists of panels. A page is never one
   giant card wrapping everything.

3. **The primary action is always top-right of the top bar** — except the report form
   (sticky bottom bar, because the form is long) and the review page (in the rail, next
   to the evidence). Those two exceptions are stated here so they are never invented
   elsewhere. **One primary action per page, ever.**

4. **Zero border radius. No shadows except `--shadow-pop` on floating layers.** If a
   component seems to need a shadow to separate from its background, it needs a
   hairline border instead.

5. **Cobalt is the only action color.** Status colors appear only on status chips, the
   correction panel, the `Needs correction` metric number, and validation errors. Chart
   category colors are the third and final exception. Nothing else in the product is
   colored.

6. **Mono is a closed list (§0.5)** — timestamps, week and revision IDs, numbers in
   data positions, the section number in a form eyebrow, and the `SAMPLE DATA` pill.
   Everything else is Instrument Sans in **sentence case**. Mono is never body text and
   never a heading.

7. **Every number in a column is `tabular-nums` and right-aligned.**

8. **Vocabulary is exact and never re-worded:** `Draft`, `Submitted`,
   `Needs correction`, `Approved`, `Not started`; _report_, _revision_, _review desk_,
   _project_, _daily update_, _overall comment_, _send back_. A button's label matches the outcome it produces and
   keeps that name through the whole flow.

9. **Motion is only what §8.2 lists.** If an animation isn't on that list, delete it.
   Nothing animates on page load.

10. **Every list view has four designed states** — loading (layout-matched skeletons),
    empty-because-new, empty-because-filtered, and error — and they look different from
    each other. A spinner is never the loading state.

11. **All filter, sort and pagination state lives in the URL.** No exceptions. A
    manager should be able to send another manager a link to exactly what they're
    looking at.

12. **Labels sit above inputs. Errors sit below the field they belong to.** There is no
    top-of-form error banner anywhere in the product.

13. **No icons in metric cells, no icon-in-a-circle anywhere, no illustrations, no
    emoji, no photographs.** Icons are 16px line glyphs used only in navigation, in
    buttons where the icon replaces a word, and on the privacy guards. A decorative
    icon doesn't ship.

14. **No arrow appended to any link or button label.** No middle-dot meta strings as a
    layout device — the one sanctioned `·` is inside a mono data string such as
    `W38 · 14–18 Sep`, where it separates two values of the same fact.

15. **Nothing congratulates the user.** Approval changes a chip. Submitting files a
    document. No confetti, no "Great job", no exclamation marks in system copy.

16. **Nobody reviews their own report.** Any surface that lists reviewable reports
    excludes the viewer's own; the review route renders the read-only view instead.

17. **The brand glyph appears in the wordmark and nowhere else.** It is not a bullet, a
    checkbox, a loading indicator or an empty-state decoration.

18. **Build the style-guide route first.** `/design` (dev-only) renders every component
    in every state from §6 on one page. `development_approach_doc.md` requires visual
    inspection against the tokens before any feature page is built; this route is how
    that happens, and how a regression gets caught.

---

## 12. Build order

Not a requirement, but the order that minimises rework.

1. `tokens.css` + the `@theme` block (§9.4) + font loading + the `/design` route skeleton.
2. Base components: Button, Input, Select, Textarea, Checkbox, StatusChip, Panel.
3. Auth screens (§3.12) — they need only the base components and they unblock everything
   behind them.
4. Application shell (§1) with both role nav sets and the theme toggle.
5. Table (§5) + Pagination + FilterBar + EmptyState + Skeleton.
6. Report detail (read-only) — it validates the document typography that the form and
   the review page both depend on.
7. Report form (§4) — the hardest screen, built once the primitives are proven.
8. Report history, review desk, review page (with the self-review guard).
9. Dashboard: metric strip, then the team table, then the charts.
10. Projects, Users, Holidays, People, Person profile, Account settings, Team updates.
11. System states (§3.13) and the print stylesheet.
12. The demo chooser, demo bar and `SAMPLE DATA` pill over the finished shell. The demo's
    data handlers are written alongside each feature, not here (`frontend_architecture.md`
    §13.1) — this step only adds the entry and the chrome.

---

## 13. Verification checklist (product)

Extends the landing page checklist in `brand_design_strategy.md` §12.

**Tokens & theme**

- [ ] No hex value appears in any component file — every color is `var(--…)`.
- [ ] Dark theme toggles with no flash of the wrong theme on reload.
- [ ] Every status chip is legible and distinct in both themes.
- [ ] Border radius is 0 on every element, including avatars and chips.
- [ ] The five §0.3 dark tokens marked "needs verification / sign-off" have been
      checked against the 4.5:1 floor and approved.
- [ ] `@theme` replaces the color, spacing, type and radius scales: `bg-indigo-500`,
      `rounded-lg`, `p-18` and `text-sm` all fail to compile.
- [ ] The theme choice persists per device and is never written to the account.

**Typography**

- [ ] Mono appears only where §0.5 permits it.
- [ ] `SAMPLE DATA` is the only all-caps string in the product.
- [ ] Table headers, nav group labels and metric labels are sentence case.

**Shell & permissions**

- [ ] A team member never sees a manager nav item, at any viewport, in the DOM.
- [ ] Typing a manager URL as a member renders 403, not a blank page.
- [ ] Your own report never appears in your review desk under any filter.
- [ ] `/review/:id` for your own report renders read-only with no action panel.
- [ ] A manager's report appears in another manager's review desk with a role chip.
- [ ] A manager opening a teammate's **Draft** week gets its daily updates and no report
      content, and the team table shows that row's chip, its updates strip, and `—` in
      every content column.
- [ ] `/people` opens on Active only; a search finds a removed person anyway and says so.
- [ ] No demo request reaches the server: the demo runs on the in-browser adapter, and
      every control in it works on the in-memory data.
- [ ] Sidebar collapse persists across reloads.
- [ ] Every page has exactly one primary action, positioned per rule 3.

**Daily updates, approval, leave and ownership**

- [ ] A daily update posted on Tuesday is readable by every teammate and manager on
      Tuesday, while the week is still a Draft; the week's end-of-week content is not.
- [ ] A teammate can't comment on an update until it is opened to the team; a manager can
      comment on any update, their own included.
- [ ] A comment can be edited and deleted for 10 minutes, then neither; a comment with
      replies can't be deleted.
- [ ] The week strip shows posted / missing / today / on leave / holiday / future, each with
      a text equivalent, and a missing day blocks `Submit` with its name in the tooltip.
- [ ] A new task started in Monday's line can be picked on Tuesday, and its hours add up
      in section 01.
- [ ] A blocker raised in Tuesday's update appears in section 03 and counts as open on the
      dashboard the same day.
- [ ] A report submitted without asking for approval stays Submitted and counts as filed; a
      manager can still approve it; nobody can approve their own.
- [ ] The review desk opens on "Asked for approval" and never lists your own report.
- [ ] A person on leave for the whole week shows `On leave`, not `Not started`, and is left
      out of the compliance denominator. A holiday needs no update from anyone.
- [ ] A member sees who is on leave, and the week's holidays, on their own "This week" page.
- [ ] Only the owner sees `Make owner`; other admins can't change the owner's row or another
      admin's email and password.
- [ ] A password reset link lets the person choose a password; no admin screen accepts one.
- [ ] "New" markers appear for comments, replies, status changes and approval requests, and
      clear when the week is opened.

**Projects and demo**

- [ ] A project planned for 20 working days from a Monday shows 19 left after that Monday,
      skips holidays, and reads "overdue by 1 day" on day 21.
- [ ] The Days | Hours toggle switches every progress bar on the page.
- [ ] The demo works from all three perspectives with the network disconnected, and a
      refresh restores the starting data.

**Form**

- [ ] A full week can be posted and submitted end-to-end at 360px width.
- [ ] Autosave shows all four states; no toast fires on autosave.
- [ ] A session expiring mid-edit opens the re-auth modal and loses nothing.
- [ ] A blocked submit focuses the first problem and marks its section.
- [ ] Flagging a second key blocker unflags the first.
- [ ] A blocker can be resolved on an **Approved** report without changing its status or
      version count.
- [ ] Hours by task type has seven categories, calculated from the lines, matching the chart
      palette.
- [ ] Section 01 lists exactly the tasks named by the week's lines; every task needs a
      status before submitting.

**Tables & dashboard**

- [ ] Row height 40px with 11px vertical padding.
- [ ] Numbers right-aligned and tabular in every table.
- [ ] Status chips right-aligned in every table.
- [ ] Filters and sort survive a refresh via the URL.
- [ ] "Development" is the same color in every chart on every page.
- [ ] No "late" state appears anywhere in the UI or the tokens.
- [ ] No pie chart, no icon-in-a-circle metric card, no default library palette.

**Week model**

- [ ] No surface renders a Saturday or Sunday — week strip, week picker, date ranges.

**Motion & access**

- [ ] Nothing animates on page load; the week strip is static.
- [ ] Everything no-ops under `prefers-reduced-motion`, including Motion exits.
- [ ] Every interactive element has a visible focus ring.
- [ ] Modals trap focus and restore it to the trigger.
- [ ] Color is never the sole carrier of status — a text label is always present.

**Copy**

- [ ] Statuses spelled exactly as rule 8.
- [ ] No celebratory or apologetic system copy anywhere.
- [ ] No arrows on buttons, no emoji, no exclamation marks.
- [ ] Empty states invite an action; error states state cause and fix.
