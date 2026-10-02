# Development Approach

## Your Setup & Constraints

- **Plan:** Claude Pro ($20/month)
- **Tools:** Claude Desktop — Chat tab for planning, Code tab for development (Claude Code is built into Claude Desktop, no separate terminal needed)
- **Stack:** MERN (MongoDB, Express, React, Node.js)
- **Background:** Full-stack developer, comfortable with UI/UX — not starting from zero

---

## Understanding Pro Plan Limits

- Roughly **45 messages per 5-hour rolling window**. The window starts from the first message sent and resets 5 hours later — not at a fixed clock time.
- A **separate weekly cap** also applies across all models, resetting 7 days from the first message of that week.
- These figures are approximate — longer messages and large file attachments consume more of the budget than short ones.
- **Opus consumes more of the budget per message than Sonnet** — roughly 2–3x per message against the rolling limit.
- **Fable 5 is not included in Pro plan limits.** It runs on separate pay-as-you-go usage credits on top of the subscription. For a project of this size, it will drain fast. Avoid it for this project.

---

## Roles to Be Played

Different decisions in this project call for different expertise. Rather than approaching every question the same way, each area of the project should be approached from the specific vantage point that would actually make those calls well.

| Role                                    | Owns                                                                                                                                                       |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Brand Strategist & Creative Manager** | The product's name, personality, and visual direction — and what separates a deliberately designed interface from a generic, AI-scaffolded one             |
| **Design Systems Engineer**             | Turning that direction into a concrete, implementable design system: color tokens, typography scale, spacing, component states                             |
| **Software Architect**                  | The technology stack, libraries, and overall project/folder structure                                                                                      |
| **Database Engineer**                   | The data model — collections, relationships, indexing strategy                                                                                             |
| **Backend Engineer / API Architect**    | The API surface — endpoints, request/response contracts, authorization logic                                                                               |
| **Frontend Engineer**                   | Page structure, component architecture, and state management                                                                                               |
| **Engineering Manager / Tech Lead**     | Synthesizing every other role's decisions into one coherent, unambiguous specification that implementation can follow without revisiting earlier decisions |

Each role should stay in its lane — a role deciding on the database schema shouldn't also be re-litigating the color palette, and vice versa. Decisions made by one role become fixed input for the roles that come after it.

---

## Design Differentiation Reference

This section exists so that "premium" and "professional" mean something concrete throughout the project — not a vague aspiration, but a checklist the Brand Strategist and Design Systems Engineer can design against and the Frontend Engineer can verify against.

### Reference Sites

These sites represent the visual direction and feel the project should aim toward:

**heronaiapp.com** (primary reference — "I love this")

- Designed by Bearplus, an award-winning agency — this is a portfolio-grade site, not a template
- Editorial layout with large imagery and generous whitespace — content breathes
- Deliberate typographic hierarchy: large display headings mixed with small, restrained body text — not uniform sizing
- Monospaced/technical type used as a design accent (coordinates, loading sequences, numbered labels) — not as body text
- Restrained color palette: near-black and white as the foundation, with a single semantic red accent for violation/alert states
- Scroll-driven storytelling sections — content reveals on scroll rather than loading all at once with fade-in animations
- Numbered section markers used meaningfully (they represent actual sequential steps, not decoration)
- Interactions that respond to user action (click, drag, scroll) rather than decorating page load
- Architectural/technical sketch aesthetic in illustrations — not stock photos or generic 3D renders

**weaveos.com**

- Data-forward SaaS dashboard — tables, metrics, and code blocks are first-class design elements, not afterthoughts
- Clean dark/light section alternation creating visual rhythm
- Confidence in negative space — not every pixel needs content
- Trust indicators (SOC2, client logos) integrated cleanly, not crammed into a footer
- A mascot (Wooly) used with restraint — character without childishness

**intercom.com**

- Classic enterprise SaaS — confident, clean, no wasted motion
- Strong brand colors used consistently, not sprinkled randomly
- Clear information hierarchy in every section — you immediately know what matters
- Product UI screenshots embedded as design elements, not pasted-in screenshots

### What Makes an Interface Read as Generic / AI-Templated

These are the specific default patterns to deliberately avoid:

- **Default framework colors used untouched** — the out-of-the-box MUI blue, the default Tailwind indigo/purple gradient, the default Chakra teal
- **Every card given identical styling** — same rounded corners, same soft gray shadow (rgba(0,0,0,0.1)), same padding, regardless of content hierarchy
- **Default sans-serif fonts at default weights** — Inter, Roboto, or system-ui used everywhere without a deliberate type scale or weight contrast
- **A grid of identical stat cards** — each with an icon-in-a-circle, a big number, and a label underneath, using the charting library's default color sequence
- **Decorative fade-and-slide-up animations on every section** — the generic scroll-reveal pattern where content slides up as it enters the viewport, applied uniformly to every element
- **Status badges using whatever colors shipped with the component library** — green/yellow/red traffic-light defaults with no consideration for the product's own palette
- **Accent-one-word headlines** — putting a single word in a different color, italic, or bold weight as a "design touch"
- **ALL-CAPS labels above every section** — tracked-out eyebrow text used as a structural default rather than a deliberate editorial choice
- **Template chrome regardless of subject** — meta strings joined with middle dots (A · B · C), spaced em-dash labels, monospace for small data labels as decoration, arrows appended to every link/button

### What Makes an Interface Read as Premium and Deliberately Designed

- **A restrained neutral palette with one or two deliberate accent colors** — most of the interface is quiet; color is earned, not scattered
- **A considered and limited type scale** — not every size in the range, but a deliberate set of sizes with clear roles (display, heading, body, caption, data label)
- **Generous and consistent spacing** — whitespace is a design tool, not wasted real estate
- **A custom semantic color system for statuses** — Draft/Submitted/Needs Correction/Approved should each have a palette-native color, not the component library's default badge colors
- **Motion that responds to user actions** — hover, click, expand, dismiss — rather than decorating page load with entrance animations
- **Thoughtful empty and loading states** — not just a spinner, but a considered experience for every state the user might see
- **Typography carrying personality** — the typeface choice, weight contrast, and sizing hierarchy communicate the product's identity before a single word is read

### Typography Direction

The typeface is one of the strongest differentiators between a generic and a premium interface. Avoid defaulting to Inter, Roboto, Montserrat, or system-ui — these are fine typefaces that have become invisible through overuse.

**Recommended free typefaces for this project (research these during the Brand Strategy chat — pick one heading + one body, not all of them):**

| Typeface              | Character                                                                                                        | License                             | Best for                                             |
| --------------------- | ---------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ---------------------------------------------------- |
| **Jost**              | Geometric, Futura-inspired, disciplined — feels designed rather than defaulted to. Variable font with 9 weights. | OFL (Google Fonts)                  | Display headings, navigation, brand-forward elements |
| **Space Grotesk**     | Tech-forward proportional monospace heritage — techy without being cold.                                         | OFL (Google Fonts)                  | Headings, data labels, UI with a technical character |
| **Satoshi**           | Modernist, contemporary, premium SaaS feel.                                                                      | Free for commercial use (Fontshare) | Headings or body — versatile enough for both         |
| **General Sans**      | Dense, modern, confident. Good for data-heavy UIs.                                                               | Free for commercial use (Fontshare) | Body text, dense layouts, forms                      |
| **Switzer**           | Neo-grotesk with a high x-height (79%) — premium feel, excellent legibility in data-heavy dashboards.            | Free for commercial use (Fontshare) | Body text, tables, small UI text                     |
| **Plus Jakarta Sans** | Modern SaaS workhorse — friendly but professional.                                                               | OFL (Google Fonts)                  | Body text, general UI                                |
| **Outfit**            | Clean geometric, modern SaaS — confident without being cold.                                                     | OFL (Google Fonts)                  | Headings or body                                     |
| **Geist Sans**        | Designed by Vercel specifically for dashboards and developer tools.                                              | OFL                                 | Data-heavy dashboards, developer tooling             |
| **JetBrains Mono**    | Monospaced, ligatures, excellent for code and data.                                                              | OFL                                 | Code blocks, data tables, timestamps                 |

**Pairing guidance (from typography research):**

| Heading       | Body                    | Feel                                            |
| ------------- | ----------------------- | ----------------------------------------------- |
| Jost          | Switzer or General Sans | Geometric precision meets data readability      |
| Space Grotesk | Plus Jakarta Sans       | Techy and modern                                |
| Satoshi       | Satoshi                 | Single-family, weight contrast drives hierarchy |
| Outfit        | Geist Sans              | Clean and dashboard-native                      |

Add JetBrains Mono as a monospace companion for timestamps, report IDs, or status codes.

### Layout Direction

This is a reporting and dashboard tool — not a marketing site. But that doesn't mean every page has to be a flat form.

- **The landing page and the sign-in screen** can lean editorial — large type, generous spacing, a single clear call-to-action (like the reference sites above)
- **Dashboard pages** should be data-forward but with clear visual hierarchy — not a flat grid of identical cards
- **Report forms** should feel structured and calm — clear field grouping, visible progress through sections, not a single endless scrolling form
- **Report detail/review pages** should treat the report as a readable document, not a dump of fields

### Interactions & Micro Interactions

Use motion sparingly and purposefully. A dashboard app with entrance animations on every element feels distracting rather than premium. Motion should respond to what the user did, not decorate what the page loaded.

**Recommended library: Motion (formerly Framer Motion)**

Motion is the strongest fit for this React project because it's declarative and React-native — component-level micro-interactions (hover states, expand/collapse, page transitions, toast entrances) are its core strength, and that's exactly what a dashboard app needs. It handles layout animations and AnimatePresence (exit animations) out of the box, which GSAP requires manual wiring for in React.

GSAP is more powerful for scroll-driven storytelling and complex choreographed timelines, but that's marketing-site territory — not relevant here. Anime.js is lightweight but framework-agnostic and requires more manual DOM management in React.

**Where to use motion in this project:**

- Page/route transitions (subtle crossfade, not dramatic slide)
- Sidebar expand/collapse
- Modal and toast entrance/exit
- Status badge transitions when a report status changes
- Table row hover feedback
- Chart data transitions when filters change
- Dropdown/select open/close
- Button press feedback (subtle scale)

**Where NOT to use motion:**

- Fade-and-slide entrance on every section as the page loads
- Decorative animations that play regardless of user action
- Parallax scrolling on dashboard pages
- Loading spinners that feel like a show rather than an indicator

---

## Coding Quality & Standards

### General Principles

- Straightforward approaches first. Reach for a design pattern only when the problem actually calls for it — don't use a factory or strategy pattern to solve what a plain function handles.
- Every file should do one clear thing. If a file's purpose can't be stated in one sentence, it's probably doing too much.
- Naming should describe what something is or does — not how it's implemented or where it came from.

### Comments

- Comment **why**, not **what** — the code itself shows what it does; comments explain the reasoning, the constraint, or the non-obvious consequence.
- Short and direct. A comment should be one line in most cases. If it needs a paragraph, the code might need restructuring instead.
- Comment at critical decision points: authorization checks, status transitions, business rules, non-obvious data transformations, and any workaround with a reason.
- No commented-out code left in the codebase. Delete it — version control preserves history.

### Backend Standards

- **Consistent API response shape** — every endpoint returns the same structure: `{ success, data, message, error }`. No endpoint invents its own format.
- **Error handling pattern** — one centralized error-handling middleware formats every error response. Controllers **throw** and let Express 5 forward the rejection to it; they do not wrap themselves in try/catch just to call `next(err)`, because v5 auto-awaits async handlers and does that already. Keep try/catch only where something is genuinely being recovered from. No raw `res.status(500).send(err)` scattered across controllers.
- **Validation at every layer** — request validation middleware (Joi/Zod) on the route, Mongoose schema validation on the model, authorization middleware on the route. Not just one of these.
- **No business logic in controllers** — controllers parse the request and call a service; services contain the business logic; models define the data shape. Controllers should be thin.
- **Environment variables for every config value** — no hardcoded URLs, ports, secrets, or database names anywhere in the codebase.

### Frontend Standards

- **Components are either smart (page-level, owns state and API calls) or dumb (presentational, receives props).** Don't mix.
- **One component per file.** If a component is only used inside one parent, it still gets its own file.
- **API calls live in a service layer** — never `fetch` or `axios` directly inside a component. One service file per resource (authService, reportService, projectService).
- **No inline styles.** Use Tailwind utility classes or a consistent CSS approach decided in the tech stack phase.
- **Form validation errors shown inline next to the field**, not as a single alert banner at the top.

### Design Pattern Usage

Use design patterns only where the complexity justifies them. For this project's scale:

- **Service pattern** — yes, for separating business logic from controllers (backend) and API calls from components (frontend)
- **Middleware pattern** — yes, for auth, role guards, validation, and error handling (Express middleware chain)
- **Repository pattern** — probably not needed; Mongoose models with service functions is sufficient for this scale
- **State management pattern** — Context API with useReducer for auth state; local component state (useState) for everything else, plus three small purpose-built contexts for cross-component UI concerns that are not server data — unsaved-changes tracking, unposted day drafts, and the top-bar slots (`frontend_architecture.md` §2). **Settled, not an open evaluation:** server data belongs to TanStack Query, which leaves the authenticated user as the only genuinely global client state, so no third-party store is added (`tech_stack.md` §1.2)

---

## Verifying What Gets Built

Every development step should be verified before moving to the next. Compounding unverified work is the fastest way to waste tokens on debugging later.

### After each backend step

- Test every new endpoint with a REST client (Postman, Thunder Client, or curl) — not just the happy path
- Test with the wrong role (team member hitting a manager endpoint) — confirm it's blocked
- Test with missing/invalid fields — confirm validation rejects them with a clear message
- Check that the database reflects what the API returned — no silent failures

### After each frontend step

- Open the page in the browser and use it as a real user would — don't just check that it renders
- Test every form: submit empty, submit with invalid data, submit with valid data
- Check responsive behavior — resize the browser to mobile width
- Verify that unauthorized users can't navigate to pages they shouldn't see (not just hidden nav links — actually type the URL)
- Check loading and empty states — what does the page look like before data loads, and when there's no data?

### After the design system step specifically

- Render every component on a style-guide page and visually inspect it against the design tokens before building any feature page
- Check that the type scale looks right at every size — not just that it renders
- Verify status badge colors against the palette — Draft, Submitted, Needs Correction, Approved should each be visually distinct and palette-native

### End-to-end verification (after all steps)

- Walk through the full workflow as a team member: accept an invite link → post Monday's update with work lines on two projects, starting a new task (the update starts the week's report) → post an update with a blocker on another day → read a teammate's update on Team updates and comment on it once it is open to the team → see a manager's comment on your own update and reply → edit a comment within 10 minutes, and find the Edit button gone after → fill the weekly report: a status for every task, a note on one → submit without asking for approval and see it stay Submitted → next week, submit asking for approval → see the overall comment when sent back → edit → resubmit → see approved
- Walk through the full workflow as a manager: log in → view the dashboard for this week → see who has posted today → open a teammate's Draft week and comment on a daily update → open an update to team comments → filter the team table by status → check the projects table, extend an overdue plan → approve a report that asked for approval, and one that did not → send one back with an overall comment → see the resubmission → approve
- Walk through the admin extras: add a holiday in the current week and see that day stop being expected → invite a person and copy the link → change a member's email and issue a reset link → remove a person, re-invite them, and see their history on one profile with the weeks between not counted
- Walk through the demo from the landing page with the API stopped: every perspective works, a comment posted as the manager is waiting for the member, and a refresh starts it over
- Verify a team member can read a teammate's daily updates but never their weekly report content or overall comments (try the URL directly)
- Verify a manager cannot edit report content (only status and comments), and cannot read a Draft's report content even though its daily updates are visible
- Verify a person marked on leave for a whole week shows On leave, not Not started, and a team member can see who is on leave; and a week that is all holidays is not expected of anyone
- Verify version history shows previous versions after a correction cycle
- Verify "new" markers appear for a reply on your update, a change to your report's status, and — for a manager — an approval request, and clear when the week is opened
- Verify dashboard charts render with real seeded data and filters affect them; the status filter changes the team table and nothing else

---

## Environment & Secrets Handling

- **Never commit `.env` files.** Add `.env` to `.gitignore` before the first commit — not after realizing it was pushed.
- **Create `.env.example` files** for both `/client` and `/server` with every required variable listed (with placeholder values, not real ones). This is the only documentation needed for environment setup.
- **Secrets that must be in `.env`:** MongoDB connection URI, JWT secret key, JWT expiration time, server port, client URL (for CORS).
- **No hardcoded fallbacks for secrets in code** — if `process.env.JWT_SECRET` is undefined, the app should fail to start with a clear error, not silently fall back to a default string that ends up in production.
- **Different `.env` values for development and production** — at minimum, the database URI and the client URL will differ.

---

## When in Doubt, Ask

Do not assume or guess. If anything is unclear — a requirement, a design decision, a technical choice, a user flow, expected behavior, edge case handling — ask questions to clarify before proceeding. A wrong assumption costs more to fix later than a question costs to ask now.
