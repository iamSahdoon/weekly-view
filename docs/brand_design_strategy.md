# WeeklyView — Brand & Design Strategy

> This document is the single source of truth for WeeklyView's identity, visual
> language, and landing page. It is the fixed output of the **Brand Strategist**
> and **Design Systems Engineer** roles. Downstream roles (Frontend Engineer,
> Design Systems Engineer implementation) should treat every decision here as
> settled input and build against it rather than re-deciding it.
>
> Companion docs: `requirments_doc.md` (what the product does),
> `development_approach_doc.md` (how it's built and the design-differentiation
> reference this document operationalizes).

---

## 0. How to use this document

- **Sections 1–5** are the brand and design system: name, personality, color,
  type, space, motion. **They govern the product — the app and the demo — and
  nothing else about colour, type or shape.** The landing page has its own theme
  (§6.0).
- **Sections 6–10** are the landing page specification: strategy, copy rules, the
  demo data policy, and the verification checklist. Its *visual* design is the
  built reference `landing-reference/index.html` (§6.0).
- **Section 11** is the "do not do this" list — the concrete generic/AI-templated
  patterns to avoid, carried over and sharpened from `development_approach_doc.md`.

When a decision here conflicts with an instinct during implementation, the
document wins unless there is a functional bug. Aesthetic re-litigation mid-build
is how a coherent product turns generic.

---

## 1. Product name & vocabulary

### 1.1 Name

**WeeklyView.**

It is descriptive rather than inventive, and that carries one strategic
consequence that governs everything else: **a descriptive name is not memorable
on its own, so the visual identity has to do the remembering.** The wordmark, the
one signature device (the five-day week), and the typographic discipline are what
make the product recognizable — not the name. This raises the bar on visual
craft; it does not lower it.

### 1.2 Wordmark

- Written as one word, **WeeklyView**, camel-cased. Never "Weekly View" (two
  words), never "weeklyview" (all lower), never "WEEKLYVIEW" outside of a
  mono/label context.
- Paired with a **small static geometric glyph** (see 1.3). The wordmark can also
  stand alone.
- Nav wordmark weight: heavy (Chivo 800), tight tracking (−.045em).

### 1.3 Brand glyph

A small **bracketed vertical bar** mark: `[ | ]` rendered as an SVG — two
bracket strokes framing a single accent-colored vertical bar. It reads as _one
column, framed_ — a single week held in view. It is deliberately static.

```
The mark, conceptually:
[  |  ]   — brackets in ink, center bar in cobalt accent
```

**Hard rule:** the mark never pulses, blinks, animates, or uses a filled dot.
A pulsing or blinking dot reads as a live-recording / "on-air" / alarm indicator,
which is the exact surveillance connotation a reporting tool must avoid. This was
an actual earlier mistake; do not reintroduce it.

### 1.4 Product vocabulary

Consistent nouns across UI and marketing. Do not drift into synonyms.

| Concept                                  | Term to use                                      | Do not use                                                                    |
| ---------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------- |
| A week's report                          | **report** (or "this week's report")             | "entry", "log", "submission form"                                             |
| The manager's queue of submitted reports | **review desk**                                  | "inbox", "queue", "approvals list"                                            |
| What the team's work belongs to          | **project**                                      | "section" (now only a part of the weekly form), "tag", "team", "group"        |
| A piece of work that runs across days    | **task**                                         | "ticket", "item", "job"                                                       |
| A saved prior version after a correction | **revision**                                     | "history item", "snapshot"                                                    |
| Manager returning a report for changes   | **send back** / **correction**                   | "reject", "deny", "return"                                                    |
| The author's optional request on submit  | **ask for approval**                             | "request sign-off", "escalate"                                                |
| The four report states                   | **Draft, Submitted, Needs correction, Approved** | any re-wording                                                                |
| A member who hasn't begun                | **Not started**                                  | "missing", "overdue", "late" — the product has no deadline, so none of these are computable |
| A person's post for one working day      | **daily update** ("today's update")              | "standup", "check-in", "log", "status" — status already means the four report states |
| The manager's remark on a whole week     | **overall comment**                              | "feedback", "rating", "verdict"                                               |
| A remark on one daily update             | **comment**, answered by a **reply**             | "note", "reaction", "message"                                                 |
| A day the whole team is off              | **holiday**                                      | "day off", "closure", "bank holiday"                                          |
| Something you haven't seen yet           | **new**                                          | "unread", "notification", "alert"                                             |
| A person away for the whole week         | **On leave**                                     | "absent", "off", "OOO", "missing"                                             |
| The account that owns the installation   | **owner**                                        | "super admin", "root", "founder"                                              |

---

## 2. Brand personality & voice

### 2.1 Personality in one line

**WeeklyView is the team's exacting, discreet record-keeper: it treats a week of
work as a document worth keeping accurately, states what is true in plain
language, marks the one thing that needs attention, and otherwise stays quiet.**

### 2.2 The core tension the brand must hold

There are two users with opposite incentives:

- **The manager / founder (the buyer)** wants visibility.
- **The team member (the end user)** may fear being surveilled.

The brand resolves this structurally, not with reassurance copy. The product's
permissions _are_ the brand promise: managers can comment but cannot edit a
member's words; teammates cannot read each other's reports; nothing is
overwritten. The voice states these as **facts, enforced on the server** — never
as "don't worry."

Guiding line for the member-facing voice: **"written for the writer, not the
watcher."**

### 2.3 Voice rules

- **Plain, declarative, specific.** "Read the week in four minutes," not
  "Unlock unprecedented visibility into team performance."
- **Concrete over abstract.** Name the real artifact (a report, a revision, a
  comment), not the abstraction ("insights", "productivity").
- **No hype words:** no "unlock", "supercharge", "seamless", "effortless",
  "revolutionary", "powerful", "10x", "AI-powered" (it isn't).
- **Never celebratory on approval.** Approval is a filing action, not a
  win. The chip changes state; nothing cheers.
- **Never nagging on pending work.** State the fact ("Not started"), not a scold.
- **Honest about maturity.** The product is new and has no customers. The page
  says so plainly; it never fakes logos, testimonials, or "trusted by thousands."

### 2.4 What the brand forbids downstream

No congratulatory confetti/toasts on approval. No urgency styling (red banners,
countdowns) on unsubmitted work. No apologetic empty states. No stock
photography of smiling teams. No icon-in-a-circle stat cards. No animation that
plays without a user action (the one sanctioned exception is the hero week-sweep,
see 5.3).

---

## 3. Color system

The system is built on one idea: **restrained cool-neutral surfaces, a single
cobalt action color, and status colors that are the only other chroma on the
page.** Color is earned, not scattered.

### 3.1 Foundation tokens (light — primary theme)

| Token       | Hex                    | Role                                              |
| ----------- | ---------------------- | ------------------------------------------------- |
| `--paper`   | `#F6F8F8`              | Page background (cool off-white)                  |
| `--paper-a` | `rgba(246,248,248,.9)` | Sticky nav backdrop (with blur)                   |
| `--card`    | `#FFFFFF`              | Cards, panels, table surfaces                     |
| `--tint`    | `#EDF1F2`              | Sunken fills: input backgrounds, hover, alt cells |
| `--tint2`   | `#E4EAEB`              | Deeper sunken / mini-UI fills                     |
| `--ink`     | `#0D0F12`              | Primary text; the dark persona panel              |
| `--body`    | `#464C53`              | Body copy                                         |
| `--mut`     | `#7C838A`              | Labels, metadata, timestamps, captions            |
| `--hair`    | `#E0E5E6`              | Default 1px borders and dividers                  |
| `--hair2`   | `#D0D6D8`              | Emphasized dividers, mini-UI strokes              |
| `--rule`    | `#CBD1D3`              | Button outlines, dashed outlines                  |

### 3.2 Accent (action)

| Token        | Hex       | Role                                                        |
| ------------ | --------- | ----------------------------------------------------------- |
| `--acc`      | `#1C39BB` | Cobalt. Primary buttons, links, the live day, the brand bar |
| `--acc-d`    | `#152C94` | Accent hover                                                |
| `--acc-l`    | `#E8ECFB` | Accent focus ring, selected-row tint                        |
| `--acc-on-d` | `#8AA0F2` | Accent on dark surfaces (lightened for contrast)            |
| `--on-acc`   | `#FFFFFF` | Text on the accent button                                   |

Cobalt is deliberate — **not** the default framework blue, not indigo/purple
gradients, not teal. It is a single, confident, slightly-classical blue.

### 3.3 Dark surface tokens (the "control room" showcase & final CTA)

The product's own aesthetic is a dark control room. On the **light** marketing
page, that personality appears as **two dark accent bands** — the product
showcase and the closing CTA — for editorial rhythm. Dark is an accent here, not
the base.

| Token        | Hex       | Role                                    |
| ------------ | --------- | --------------------------------------- |
| `--dark`     | `#0E1013` | Dark band background (never pure black) |
| `--d-panel`  | `#14171B` | Panel surface on dark                   |
| `--d-panel2` | `#191D22` | Raised surface on dark                  |
| `--d-line`   | `#242A31` | Borders on dark                         |
| `--d-hover`  | `#1B2027` | Row hover on dark                       |
| `--d-text`   | `#EEF1F4` | Primary text on dark                    |
| `--d-body`   | `#A4ACB5` | Body on dark                            |
| `--d-mut`    | `#727A83` | Muted/labels on dark                    |

### 3.4 Status colors — the semantic system

Each status has its own palette-native color, used as **foreground / tint
background / border**. These are the ONLY traffic-light-style colors allowed, and
they are custom, not a component library's defaults.

**On light surfaces:**

| Status           | Foreground        | Tint bg     | Border               |
| ---------------- | ----------------- | ----------- | -------------------- |
| Draft            | `#4A463E`         | `#EFEFEA`   | `#DBDBD3`            |
| Submitted        | `#204760`         | `#E7EDF2`   | `#C3D3DE`            |
| Needs correction | `#7C211C`         | `#F6E9E7`   | `#E6C7C3`            |
| Approved         | `#26502F`         | `#E8EFE9`   | `#C7D8CA`            |
| Not started      | `#7C838A` (muted) | transparent | `#CBD1D3` **dashed** |

**On dark surfaces:**

| Status           | Foreground | Tint bg                 | Border                  |
| ---------------- | ---------- | ----------------------- | ----------------------- |
| Draft            | `#B6B2A8`  | `rgba(255,255,255,.05)` | `rgba(255,255,255,.14)` |
| Submitted        | `#9CC3E0`  | `rgba(44,93,124,.18)`   | `rgba(120,175,210,.3)`  |
| Needs correction | `#EC9188`  | `rgba(158,43,37,.2)`    | `rgba(220,120,110,.32)` |
| Approved         | `#9FD3A8`  | `rgba(53,96,63,.22)`    | `rgba(120,190,135,.3)`  |
| Not started      | `#727A83`  | transparent             | `--d-line` **dashed**   |

**Two rules that make this a system, not a traffic light:**

1. **Draft is colorless.** Work that isn't submitted has no opinion attached to
   it, so it's neutral grey.
2. **Approved is a muted pine, never bright green.** Approval is filing, not
   celebration. The loudest status color stays reserved for **Needs correction**,
   because that is the one demanding action.

**On leave is not a sixth state either.** Like Not started, it describes a week with no
report to review, uses the same neutral family, and is told apart by a solid edge and
its word (`product_design_system.md` §6.8).

**There is no sixth state and no "late" modifier.** An earlier revision of this
document specified an ochre chip modifier for lateness. The product has no
submission deadline anywhere in it, so lateness was never computable, and a
nagging chip sits badly against §2.3's "never nagging on pending work." Compliance
has exactly two states: filed and not yet filed. Removed in full, in every
document — see `product_design_system.md` §0.4.

### 3.5 Chart / data-viz sequence

Assign by category and keep the assignment **stable across every chart** so
"Development" is the same color everywhere.

`#1C39BB` (Development) → `#6FA3C7` (Testing) → `#35603F`/`#7FB889` (Meetings) →
`#8A8D86` (Documentation) → `#9E2B25`/`#E0685E` (Review) → `#9A7B2F`/`#D1AE63`
(Research & study) → `#6B4E77` (Other)

- Grid lines: `--hair` on light, `--d-line` on dark.
- Axis labels: `--mut` at 11–12px in JetBrains Mono.
- **Research & study is the seventh color, added in reconciliation pass 4** when the
  project owner added the seventh task type. An ochre, chosen to stay clear of cobalt
  (action), pine (Approved) and the corrections red. **Needs sign-off** — it is
  recorded as a named extension in `product_design_system.md` §0.3 until then.
- If a chart needs an 8th color, it's wrong — group the tail into "Other".

### 3.6 Accessibility

All body/foreground colors clear **4.5:1** on their background; white clears 7:1
on the cobalt button. **Focus is always visible and always the same ring:**
`2px solid var(--acc)` at a 2px offset, with an `--acc-l` halo on light surfaces
(`product_design_system.md` §6.0). `--acc-l` is the halo and the selected tint; it
is never the ring itself, which needs the full accent to carry contrast. On dark,
`--acc` resolves to its lightened value, so no per-theme override exists. Never
rely on color alone to carry status — every status also has a text label.

---

## 4. Typography

### 4.1 The three families

| Family              | Role                                                                               | Source / license   |
| ------------------- | ---------------------------------------------------------------------------------- | ------------------ |
| **Chivo**           | Display, all headings, the wordmark, big metric numbers                            | Google Fonts (OFL) |
| **Instrument Sans** | Body, UI, nav links, buttons, table cells                                          | Google Fonts (OFL) |
| **JetBrains Mono**  | Data accents: timestamps, week IDs, `rev` labels, %, hours, eyebrow labels, ticker | Google Fonts (OFL) |

Chivo is a grotesque with real character at large sizes and tight tracking —
chosen precisely because it is **not** Inter/Roboto/Montserrat/system-ui, which
`development_approach_doc.md` names as invisible through overuse. Instrument Sans
carries dense tables and long UI text cleanly. JetBrains Mono earns its place
functionally (tabular figures align numeric columns) and stylistically (the
"printed record" accent).

**Load:** all three from Google Fonts, one `<link>`, `display=swap`. Weights:
Chivo 300–900 (use 700 for headings, 800 for wordmark), Instrument Sans 400–700,
JetBrains Mono 400–500.

### 4.2 Type scale & roles

Five roles only. Do not introduce a size outside this set without a reason.

| Role                          | Family / weight     | Size                       | Tracking      | Line-height |
| ----------------------------- | ------------------- | -------------------------- | ------------- | ----------- |
| **Hero H1**                   | Chivo 700           | `clamp(42px, 6vw, 84px)`   | −.045em       | 1.03        |
| **Section lead (H2)**         | Chivo 700           | `clamp(28px, 3.4vw, 46px)` | −.04em        | 1.06        |
| **Card / block heading (H3)** | Chivo 700           | 17–21px                    | −.03em        | 1.05        |
| **Body**                      | Instrument Sans 400 | 14–19px (16 base)          | 0             | 1.5–1.6     |
| **Data label / eyebrow**      | JetBrains Mono 400  | 10.5–11px                  | +.06 to +.1em | —           |

- **Mono is never body text.** It is only timestamps, IDs, %, hours, eyebrow
  labels, and the ticker.
- Big dashboard/metric numbers use Chivo with `font-variant-numeric: tabular-nums`.
- Hierarchy comes from **weight and size contrast**, not from color. Do not color
  a single word of a headline to "accent" it (that pattern is on the banned list).

---

## 5. Space, motion & interaction

### 5.1 Spacing scale

A restrained scale, in px. Use these; do not invent intermediate values.

`4 · 6 · 8 · 11 · 14 · 16 · 20 · 22 · 24 · 26 · 32 · 44 · 52 · 62 · 88 · 96`

- **Section vertical padding:** `88–96px` (`.band` uses 96).
- **Content max width:** `1240px`, `32px` gutters (20px on mobile).
- **Card interior padding:** `24px` standard, `20px` for dense data cells.
- **Table row padding:** `11px` vertical — dense-and-scannable, _not_ airy. A data
  table should feel efficient, not sparse.
- **Generous whitespace is a tool, not waste.** Sections breathe; the product
  surfaces are dense. That contrast is the point.

### 5.2 Shape & borders

- **Zero border radius** on structural elements (cards, panels, buttons, cells,
  chips). This is a deliberate editorial/technical signature — sharp, precise,
  "printed". Do not round corners.
- **1px hairline borders** (`--hair`) do the dividing work. The whole page is
  built on a visible grid of hairlines, like a ruled ledger.
- Chips/status pills: rectangular, 1px border, 4px vertical / 10px horizontal
  padding.

### 5.3 Motion — the governing principle

**Motion responds to user action; it does not decorate page load.** This is the
single most important interaction rule and it comes straight from
`development_approach_doc.md`.

**Sanctioned motions:**

1. **Hero week-sweep (the one ambient exception).** The five columns light
   **Monday → Friday, one at a time, on a ~1.1s loop**: the column gets a faint
   cobalt tint and the day label gets a growing underline. This is sanctioned
   because it _is_ the brand's signature device demonstrating itself — the
   product's core unit (the week) animating. It is subtle, slow, and respects
   `prefers-reduced-motion` (settles on one day, no loop).
2. **Scroll progress rail** — a 2px cobalt bar at the very top tracking scroll.
3. **Section reveals** — a **left-to-right clip-path wipe** (not fade-and-slide-
   up), fired once by IntersectionObserver when a section enters view. The wipe
   echoes the ruled-ledger identity.
4. **Count-up metrics** — dashboard numbers count from 0 to value once, on view.
5. **Bar grow-in** — hours-by-task bars animate width once, on view.
6. **Showcase tab switch** — user clicks Dashboard / Correction loop; the panel
   swaps. This is the **one true interactive moment** and the page's proof.
7. **Hover feedback** — row hover, button focus ring, nav underline. Fast
   (≤200ms), user-triggered.

**Banned motions:** fade-and-slide-up on every element; parallax; scroll-jacking;
entrance animations on load; anything that loops forever competing for attention
(the hero sweep is the _only_ permitted loop, and it is quiet).

**Reduced motion:** every animation must no-op or settle to a static end state
under `@media (prefers-reduced-motion: reduce)`.

### 5.4 The signature device — the five-day week

This is the identity. It must recur so the page feels authored, not assembled:

- **Hero:** five full-height background columns + MON–FRI labels, sweeping.
- **Problem section:** a five-cell MON→FRI strip telling the "week scattered
  across six places" story — the motif as narrative.
- **How it works:** three steps, but each mini-UI glyph nods to the week.
- Anywhere a set of five fits naturally, prefer it.

Do not overuse it to the point of gimmick — it appears where it means something
(the week), not as wallpaper on every section.

---

## 6. Landing page — strategy & goals

### 6.0 Two visual systems: the landing page and the product

**The landing page is deliberately a different look from the product.** The landing page
is green; the product is cobalt on cool neutrals. They meet only inside the product
mock-ups on the landing page, which are drawn in the product's own palette so a visitor
sees the real thing.

| | **Landing page** | **Product (app and demo)** |
| --- | --- | --- |
| Reference | `landing-reference/index.html` — built, and the authority for layout, section order, copy, motion and colour | §3–§5 of this document and `product_design_system.md` |
| Surfaces | Deep green `#123F35`, darker `#0E342C`, lifted `#1A4A3F`; text `#EEF2EC`, `#B4D6C6`, `#9FC6B4`; lines `#2C5E52` | `--paper`, `--card`, `--tint` cool neutrals (§3.1) |
| Accent | Warm sand `#F2B880` (on-accent `#0E342C`); the CTA pill is `#EEF2EC` on green | Cobalt `#1C39BB` — the only action colour (§3.2) |
| Type | **Bricolage Grotesque**, one variable family, the only font on the page | Chivo + Instrument Sans + JetBrains Mono (§4) |
| Shape | Pills and round icons are allowed (CTA pill, chips) | Zero border radius (§5.2) |
| Where it lives | `/` for a signed-out visitor, nothing else | Everything behind the login, and `/demo` |

**The rules that keep them apart**

1. **The green theme never enters the product.** No landing token appears in
   `tokens.css`, the `@theme` block or any app component, and the app and the demo —
   including the demo's chooser at `/demo` — use the product palette and type only.
2. **The landing page carries its own tokens**, scoped to a `.landing` root, and ignores
   the light/dark toggle: it is one fixed theme.
3. **Mock-ups inside the landing page use the product palette** (`--u-paper`, `--u-ink`,
   `--u-acc` `#1C39BB`, the four `--st-*` status sets), exactly as v11 does, so the
   status colours, the cobalt action and the `SAMPLE DATA` marker look as they do in the
   app.
4. **Bricolage Grotesque is loaded by the landing page only.** The product keeps its
   three-family load (`product_design_system.md` §9.2) and never fetches it.
5. **What v11 overrides in this document, for the landing page only:** the hero headline
   and subhead (§7.2), the section order and names (§7.3–§7.11), the colour, type and
   radius rules (§3–§5), and the ban-list items about pills, arrows and rounded shapes
   (§11). Where v11 and §7 describe the same section differently, v11 wins.
6. **What v11 does not override**, and still binds: the honesty rules (§6.4, §8, §10) —
   no customer logos, no testimonials, no pricing, no "workspace", no hard-coded team
   size; `SAMPLE DATA` on every product surface; the exact status and vocabulary words
   (§1.4); the permission claims in the Limits section, which must match
   `requirments_doc.md` §4; reduced-motion behaviour; accessibility.
7. **One thing v11 does not yet do:** its only primary action is "See the live demo".
   The page must also ask `GET /api/auth/bootstrap` and, when sign-up is open, make
   **"Create your account"** the primary action (§6.3, `requirments_doc.md` §13). On a
   closed instance it stays as built.
8. **Owner decision (C10, 2026-10-10): the product mock-ups on the landing page show the app as it is now.** After
   C7 (the update squares, the four coloured metrics, the status chips), the daily updates as day cards (task
   type colour marks, a key-blocker row, comments as a conversation), C8 and C9, every mock-up (the hero's laptop
   and phone, the week's day cards and report, the single-day card, the manager's dashboard and the ledger's
   pieces) is drawn from the app's current components and `product_design_system.md`. The app's light palette
   is restated as landing-scoped `--l-app-*` tokens in `landing.css` (a test keeps them equal to `tokens.css`);
   the mock-ups' size, placement, framing and animation are as in the reference. The page's own font is used
   inside the frames (no product font reaches the landing page).
9. **Owner decision (C10, 2026-10-10): the privacy statement moves.** "No activity tracking, no screenshots, no
   idle timers. Only what people choose to write." sits in the right-hand column of the "Who can do what"
   block from 1024px up, under the permissions table and centred in the height left beside the list; below
   1024px it follows the stacked list. Its type is unchanged.

### 6.1 Job of the page

Convert a **manager/founder buyer** to a self-serve sign-up, while reassuring the
**team-member end user** that the tool respects them. Single-goal page, one
primary action repeated at each fold.

### 6.2 Positioning (the ownable lane)

Every competitor is either a **Slack/chat standup bot** (Geekbot, DailyBot,
Range) or a **heavy HR/performance suite** (15Five, Lattice). Nobody owns:

> **A short update every working day, and one structured weekly report every team
> fills the same way — reviewed, corrected, and rolled up into a single dashboard. A
> standalone web app, no Slack required, no HR-suite bloat.**

Daily updates put WeeklyView next to the standup bots, and the difference has to stay
sharp: a bot collects free text in a chat channel and leaves it there. Here the days
feed a structured week that is reviewed and filed, and the blockers raised on Tuesday
are the same blockers counted on the dashboard and listed in Friday's report. The
structure is still the product; the daily update is the easiest way into it.

That is WeeklyView's position: \*\*structure-first + a real review/correction loop

- one rollup dashboard.\*\*

### 6.3 CTAs

- **Primary (repeated at every fold): "Create your account"** — _when the instance can
  honour it._ It names a concrete, honest self-serve action for a product with no
  pricing. It was previously "Create my workspace", a first-person phrasing that tested
  better but named a thing the product does not have: there is no workspace or tenant
  entity, only one team (`requirments_doc.md` §1). A CTA must not promise an object the
  product cannot create.
- **On a seeded instance the primary becomes "See the live demo."** Registration is
  first-run bootstrap and closes once an account exists, so on every deployed copy of
  this product signup is shut. The page reads one endpoint and swaps: bootstrap
  available → "Create your account"; otherwise the demo is promoted to primary and the
  signup link is not rendered at all. This is §2.3's honesty rule applied to the most
  repeated element on the page — a CTA that leads to "this team is invite-only" is the
  same failure as a fake customer logo, and a louder one for appearing at every fold.
- **Secondary: "See a live demo."** A no-signup, hands-on demo (`requirments_doc.md`
  §14): the visitor picks Team member, Manager or Admin, every control works on sample
  data, and a refresh starts it over. With no customers, letting people _touch_ the
  product is the strongest credibility asset available — which is also why it is the one
  promoted to primary when signup is closed.
- **Microcopy under the primary:** "Set up your first week in minutes — no
  sign-up to explore the demo."
- **Never** "Book a demo" (implies a sales team that doesn't exist) and **never**
  any pricing/payment/credit-card language (there is no pricing yet).

### 6.4 Credibility without customers

No fake logos, no invented testimonials, no "trusted by thousands." Instead:

- An **honesty strip** directly under the hero: _"WeeklyView is new. No customer
  logos yet — so the page is the product itself."_ + a link to the live demo.
- **The product shown at high fidelity** as the proof (real UI, sample data).
- **Permissions as trust content** (see `requirments_doc.md` §4 access rules → the Privacy section).

---

## 7. Landing page — section-by-section spec

> **Superseded visually by the v11 reference (§6.0).** The structure below is the original
> brief; v11 sections are: hero → *Five days in. One report out.* (the week, pinned scene)
> → *Right now the week gets written five times.* → *The other side of the desk* (the
> dashboard) → *Written for the writer, not the watcher.* → *The limits are in the
> product…* → *New, and saying so.* + FAQ → final call to action → footer. Use v11's
> layout, copy and motion; use this section for the intent behind each block and for the
> rules of §6.0 item 6.

Order is fixed. This is the B2B "salesperson" sequence: answer the buyer's
questions in the order they arise.

### 7.1 Sticky nav

- Left: brand glyph + **WeeklyView** wordmark (Chivo 800).
- Center: `How it works · Who it's for · Features · Privacy · FAQ` (Instrument
  Sans, 14px). Max 5 links.
- Right: **Sign in** (text link, subordinate) + the primary CTA (cobalt button,
  small) — "Create your account" or "See the live demo", per §6.3.
- Sticky, `--paper-a` background with blur, 1px `--hair` bottom border, 62–64px
  tall.

### 7.2 Hero (light, with the week motif)

- Five background columns + MON–FRI labels, **auto-sweeping Mon→Fri**.
- **H1:** "The whole team's week, on one page" (Chivo 700, clamp to 84px).
- **Subhead (≤14 words):** "Everyone posts their day and files the same week.
  WeeklyView adds it all up." (It was "…You approve it or send it back." before
  approval became optional; a subhead must not promise a step many teams will skip.)
- Primary + secondary CTA, centered. Microcopy beneath.
- Centered composition, max ~940px, generous top padding (~100px).

### 7.3 Dark product showcase (the wow moment)

- Full-width **dark band**. Caption above the panel: "This is the whole product —
  no mock-ups, real UI with sample data."
- A bordered dark **panel** with:
  - A top bar carrying **two tabs: DASHBOARD / CORRECTION LOOP** and a
    **`SAMPLE DATA · WEEK 38`** pill (dashed border, mono).
  - **Dashboard pane:** 4 metric cells (count-up) = Filed this week `9 / 12`,
    Compliance `75%`, Needs correction `2`, Open blockers `3`; a member table
    (name · projects · status chip · hours) using the dark status colors; a
    sidebar "Hours by task type" with grow-in bars.
  - **Correction-loop pane (tab-swapped):** the manager comment (attached to
    "rev 2") + the version-history list (rev 3 under review / rev 2 sent back /
    rev 1 submitted, with timestamps).
  - A slow horizontal **activity ticker** at the bottom (submitted / approved /
    sent back), mono.
- The tab switch is user-triggered and is the page's single interactive proof.

### 7.4 Honesty strip

- Thin `--tint` band, 1px borders. One sentence of honest "we're new" positioning
  - a "Open the live demo →" link.

### 7.5 Problem (the week motif as narrative)

- Eyebrow `01 / THE PROBLEM`. Lead: "Right now the week lives in six different
  places." One stat block (58% — Asana Anatomy of Work). **One stat, not two** —
  cut the second.
- A **five-cell MON→FRI strip**, one short line per day (status meeting / DM /
  lost doc / every report a different format / can't find week 31). Friday cell
  tinted as the payoff.

### 7.6 How it works (3 captioned steps)

- Eyebrow `02`. Lead: "Post daily. Review weekly. Roll it up." (It was "Write once.
  Review once." before daily updates; a week is now written a day at a time.)
- Three cells, each = a **mini UI glyph** (form / review-arrow / bar chart) +
  `STEP 0N` + a 3–5 word H3 + one line. No paragraphs.

### 7.7 Who it's for (split-screen personas)

- Eyebrow `03`. Lead: "Two people. Opposite wishes. One tool."
- **Split screen:** left = light (manager), right = **dark ink panel** (team). The
  light/dark contrast carries the tension — not a wall of reassurance text.
  - **Manager side:** "Read the week in four minutes." One line of support. Three
    2–4 word chips: _See who hasn't started · Catch blockers early · Compare like
    with like._ Fold line: "The point: the report is the meeting, done before
    Monday."
  - **Team side:** "Be read, not watched." One line. Three chips: _No activity
    tracking · Your words stay yours · Reports reach managers only._ Fold line:
    "Enforced, not promised: your manager can comment, but can't edit a word you
    wrote."
    The third chip has changed twice, and each time because the product did. It was
    "Private to you" until managers began reading daily updates as they are posted; then
    "Hidden from teammates" until pass 4 made daily updates visible to the whole team
    (`requirments_doc.md` §2.1). Either would now overclaim. What stays true is that the
    **weekly report** — task statuses, notes, achievements, overall comments — reaches
    the author's managers and no teammate, and that a teammate may comment on an update
    only when it is opened to them.

### 7.8 Features (bento grid)

- Eyebrow `04`. Lead: "The parts that make the habit survive month two."
- **Bento: explicit 4-column × 3-row grid, fully tiled, no empty cell.**
  - **Anchor (cols 1–2, rows 1–2):** "Every revision kept" + a real
    **version-history UI fragment** (rev 3 current / rev 2 sent back / rev 1).
  - **Statuses** (col 3, row 1): "Four states you can act on" + the four chips.
  - **Visibility** (col 4, row 1): "Not started — the status that actually tells
    you something."
  - **Filters** (cols 3–4, row 2): "Filter by person, project or week."
  - **Projects** (col 1, row 3): "Plans that count down."
  - **People** (col 2, row 3): "A profile each."
  - **Insights** (cols 3–4, row 3): "Trends, workload & hours by task type" +
    recent activity feed.
- **Bento rule:** one cell = one idea (one claim / one number / one UI fragment).
  Never a paragraph in a cell. The anchor gets the real UI; the rest get a
  heading + at most one clause.

### 7.9 Privacy & permissions (trust)

- Eyebrow `05`. Lead: "The limits are in the product, not left to good manners."
- **2×2 guard grid**, each with a line-icon (stroke = accent) + heading + one
  line:
  1. Teammates see daily updates, never each other's reports — checked on every request.
  2. Managers comment, but can't edit — the record stays the author's.
  3. Nothing is overwritten — every version preserved with its timestamp.
  4. Three roles, checked server-side — enforced by the API, not hidden buttons.
- This section doubles as the surveillance rebuttal.
- **Owner decision (C10, 2026-10-10): the "Who can do what" block of the landing page is written in plain language.**
  Heading "Who can do what"; subtitle "WeeklyView checks every action, so people can only do what their role allows."; top
  box "WeeklyView checks / who you are and what you're allowed to do" (no "server", "request" or "refused" on the
  page's visitor-facing copy of this block); five example rows, a bold first name, the role in brackets, the action and a
  verdict pill — Tharindu (teammate) reads Imali's daily updates, *Allowed*; Tharindu tries to open Imali's weekly report,
  *Not allowed: managers only*; Nadia (manager) comments on Imali's weekly report, *Allowed*; Nadia tries to change
  Imali's report, *Not allowed: comments only*; Nadia tries to approve her own report, *Not allowed: no one approves their
  own*. Layout, styles and colours are as built in `landing-reference/index.html`; the permission claims still match
  `requirments_doc.md` §4.

### 7.10 FAQ

- Eyebrow `06`. Lead: "Asked before rolling it out."
- 7 `<details>` items (native accordion, first open). Longer copy is _allowed
  here_ — someone opening a FAQ has chosen to read. Questions: Is this monitoring?
  / What can my teammates see? / How long does a report take? / What happens on
  a correction? / Do we need Slack? / Can we change the fields? / How far along is
  WeeklyView? The teammates answer is the §7.7 line in full: your daily updates, yes;
  your weekly report, no — that goes to managers.

### 7.11 Final CTA (dark band)

- Full dark band. "Start with this week." One line. Primary (inverted/paper
  button) + secondary (ghost).

### 7.12 Footer

- Minimal. One line of positioning + a mono meta line. No sitemap sprawl.

---

## 8. Copy rules for the page

- **No section body element over ~20 words.** The layout carries meaning; copy
  shrinks to labels and single lines. (FAQ answers are the sole exception.)
- **No hard-coded team size.** Never "twelve people" / "12 reports." The product
  has no cap in the spec, so copy must scale: "everyone files the same report,"
  "every report is comparable." A real number only ever appears if a real
  free-tier limit is introduced, and then only in the CTA area, deliberately.
- **Benefit-led headlines**, feature detail in the supporting line. Pattern:
  _[outcome] for [audience] without [pain]_.
- **Statuses always spelled exactly:** Draft / Submitted / Needs correction /
  Approved / Not started.
- **No payment, pricing, or credit-card language anywhere** (no pricing exists).

---

## 9. Imagery policy

**No photography. No stock. No illustration. No icon-in-a-circle stat cards.**

The only imagery on the page is the **product UI itself**, rendered as real
interface (the dark showcase panel, the version-history fragment, the mini-UI
glyphs). This is the deliberate top-tier choice (Linear, Vercel, Stripe all sell
on product, not photos); adding imagery would actively lower perceived quality
and pull the page toward the generic B2B template.

Line-icons are permitted **only** in the Privacy section, as thin stroke glyphs in
the accent color — functional, not decorative.

---

## 10. Demo / sample data policy

The product screenshots show fictional team members. This is correct practice —
**but it must be labeled and diverse.**

- **Use realistic, culturally diverse, obviously-fictional names.** The current
  set (Nadia F., Ruwan P., Imali J., Tharindu S., Ayesha C., Dinesh K., Malith
  W., Sanduni B.) satisfies inclusive-naming guidance (Apple/Google style guides).
  Keep first-name + initial in dense tables.
- **Never real people's data.** Never names of real public figures. Never real
  PII.
- **Always label it.** Every product surface carries a `SAMPLE DATA` marker
  (dashed pill, mono). The live demo uses the same clearly-fictional set,
  hard-coded in the browser — there is no demo database to seed
  (`requirments_doc.md` §14).
- Where a name isn't essential, role labels / initials / avatars are the
  lower-risk alternative.

---

## 11. The "generic / AI-templated" ban list

Carried and sharpened from `development_approach_doc.md`. If the page starts
doing any of these, it has drifted:

- Default framework blue / Tailwind indigo-purple gradient / Chakra teal. (We use
  deliberate cobalt `#1C39BB`.)
- Every card identical: same radius, same `rgba(0,0,0,.1)` soft shadow, same
  padding. (We use **zero radius**, **hairline borders**, no soft shadows.)
- Inter / Roboto / Montserrat / system-ui at default weights. (We use
  Chivo + Instrument Sans + JetBrains Mono with a real scale.)
- A grid of identical icon-in-a-circle stat cards in the charting library's
  default color sequence.
- Fade-and-slide-up entrance animation on every section. (We use a left clip-path
  wipe, fired once.)
- Status badges in the component library's traffic-light defaults. (We use the
  custom semantic status system in §3.4.)
- Accent-one-word headlines (a single word colored/italic as a "design touch").
- ALL-CAPS eyebrow labels used as structural default everywhere. (We use mono
  eyebrows deliberately, numbered `01 / …`, as sequence markers.)
- Template chrome: middle-dot meta strings, arrows appended to every link,
  monospace-as-decoration.
- A pulsing/blinking dot near the wordmark (reads as alarm/recording).
- Fake logos, invented testimonials, "trusted by thousands," "Book a demo" with
  no sales team, any pricing/payment copy.
- Hard-coded team sizes implying a cap.

---

## 12. Build verification checklist

Before shipping any version of the page, confirm:

**Fidelity to spec**

- [ ] All four statuses + "Not started" present and correctly colored.
- [ ] Correction loop shown: comment attached to a specific revision.
- [ ] Version history: rev list with submission timestamps.
- [ ] Dashboard metrics: submitted / compliance / needs-correction / open
      blockers.
- [ ] Filters mentioned: by person and project, one week at a time.
- [ ] RBAC framed correctly: teammates can't read each other; managers comment
      but can't edit; server-side.
- [ ] Compliance shows two states only — filed and not yet filed. No "late"
      anywhere on the page, in any form.

**Brand & design — the product** (app and demo; not the landing page)

- [ ] Cobalt `#1C39BB` is the only action color; statuses are the only other
      chroma.
- [ ] No landing-page token (the greens, the sand accent, Bricolage Grotesque) appears
      anywhere in the app or the demo.
- [ ] Chivo / Instrument Sans / JetBrains Mono loaded; mono never used as body.
- [ ] Zero border radius on structural elements; hairline borders throughout.
- [ ] Brand mark is static (no pulsing dot).

**Landing page — theme** (§6.0)

- [ ] Green surfaces, sand accent and Bricolage Grotesque only; no cobalt chrome, no
      Chivo / Instrument Sans / JetBrains Mono on the page itself.
- [ ] Product mock-ups inside it use the product palette and say `SAMPLE DATA`.
- [ ] Tokens scoped to `.landing`; the light/dark toggle has no effect on it.
- [ ] Bricolage is requested by this page only.

**Copy & content**

- [ ] No section body element over ~20 words (FAQ exempt).
- [ ] No hard-coded team size anywhere.
- [ ] No pricing / payment / credit-card language.
- [ ] Primary CTA "Create your account" on an instance with no accounts, "See the
      live demo" on a seeded one, and the signup link absent in that case. No
      "workspace" anywhere in the copy.
- [ ] Honesty strip present; no fake logos/testimonials.
- [ ] `SAMPLE DATA` labeled on every product surface; names diverse & fictional.
- [ ] The demo link opens `/demo`'s perspective chooser, and the demo works with the API
      asleep.
- [ ] No "section" meaning a project anywhere in the copy; Research & study uses the
      seventh chart color.

**Layout & motion**

- [ ] Bento grid fully tiles (no empty void).
- [ ] Dashboard table rows are dense (~11px padding), chips right-aligned.
- [ ] Hero week-sweep runs Mon→Fri on a loop.
- [ ] Reveals are left-wipe, fired once; no fade-slide-up.
- [ ] The one interactive proof (showcase tab switch) works.
- [ ] Everything no-ops / settles under `prefers-reduced-motion`.
- [ ] Responsive: grids collapse to single column on mobile; nav links hide.

---

## 13. Reference lineage (for the record)

The visual direction descends from the sites named in
`development_approach_doc.md` — **heronaiapp.com** (editorial layout, technical
restraint, single semantic accent), **weaveos.com** (data-forward, tables and
metrics as first-class design), **intercom.com** (confident enterprise clarity) —
filtered through the **Linear / Vercel / Stripe** tier's core lesson: **the
product is the proof; text shrinks, product grows, whitespace increases.** The
landing page is the "Signal" direction: cobalt on cool white, Chivo + Instrument
Sans, the five-day week as the signature device, and one genuine interactive
moment instead of decorative motion.
