# WeeklyView — Frontend Architecture

> Output of the **Frontend Engineer** role. Settled input for the Tech Lead and the coding
> agent. Written against the pass-4 documents: `requirments_doc.md`,
> `product_design_system.md`, `tech_stack.md`, `database_schema.md`,
> `project_structure.md` and `api_specification.md`.
>
> **This document owns** state ownership, the data layer (services, query keys, hooks,
> invalidation), the contracts between components, the data flow of every page, and the
> client side of the demo. **It does not own** what anything looks like
> (`product_design_system.md`), what an endpoint returns (`api_specification.md`), which
> library is used (`tech_stack.md`), or where a file lives (`project_structure.md`).
> Where this document needs one of those to say something it doesn't, the gap is recorded
> in §14, not filled silently.
>
> Stack: React, Vite, react-router-dom 7 in library mode with no loaders,
> TanStack Query 5, axios, react-hook-form + zod, Tailwind 4, Radix, Motion, Recharts,
> date-fns. JavaScript only.

---

## 0. How to read this document

Sections 1–3 are the foundation: layers, state, boot and auth. Sections 4–8 are the
shared machinery: routing, the data layer, forms, the shell, component contracts. Section
9 is the page-by-page data flow and is the one to open when building a screen. Sections
10–13 cover charts, the demo, accessibility and build order.

**Conventions used throughout**

| Notation | Meaning |
| --- | --- |
| `A1`, `R5`, `V1`… | An endpoint id from `api_specification.md` §2 |
| `§3.1` alone | A section of `product_design_system.md` |
| `qk.week(...)` | A query-key factory from `lib/queryKeys.js` (§5.4) |
| **Rule** | Something a reviewer can check mechanically |
| **Call** | A judgement made here because the other documents were silent; every one is listed in §14 |

---

## 1. Architecture at a glance

### 1.1 The layers

```
 page ──► hook (TanStack Query / RHF) ──► service ──► api ──► apiClient (axios) ──► network
  │                                                              │
  │                                                              └─► demo adapter (in the browser, /demo only)
  ├─► composed components ──► ui primitives
  └─► context (auth · unsaved-changes · day drafts · page chrome)
```

| Layer | Owns | May import | Never |
| --- | --- | --- | --- |
| **Pages** | Composition, URL state, which queries run, which mutation fires | hooks, composed components, ui, lib | axios, services directly |
| **Composed components** (`components/<domain>/`) | A piece of a page, props in, events out | ui, other composed components, hooks for mutations they own, lib | services directly |
| **ui primitives** (`components/ui/`) | Rendering from tokens | lib (`cn`), Radix, Motion | a service, a query hook, a domain type |
| **Hooks** (`hooks/`) | Wrapping a service in a query or mutation; cache policy | services, `lib/queryKeys` | components |
| **Services** (`services/`) | One function per endpoint, returning the envelope's `data` | `api` from `apiClient` | React, query client |
| **`apiClient`** | The axios instance, token attachment, 401 handling, error normalisation | `lib/tokenStore`, `lib/authEvents`, `lib/normalizeError` | React |
| **`lib/`** | Framework-free helpers and constants | date-fns, other lib | React, axios |

### 1.2 The rules that make the rest cheap

1. **One path to the network.** Every request goes `service → api → apiClient`. That is
   what lets the demo adapter (§11) answer *every* call by being installed in one place.
2. **Pages never branch on the demo.** No `if (isDemo)` in a page or component, with three
   exceptions that are about presentation, not data: the demo bar, the `SAMPLE DATA` pill,
   and the hidden Sign out item.
3. **The server is the authority; the client only gates UX.** Where the API serves a flag
   (`Day.canComment`, `Thread.editableUntil`, `Report.canSubmit`, `Me.isOwner`) the client
   uses it and does not re-derive it. Where it does not, `lib/permissions.js` derives the
   minimum from role and ownership, and a `403` or `409` from the server wins (§5.7).
4. **TanStack Query owns server data; nothing else caches it.** No copy of a response goes
   into context, a reducer, or `useState` — with one exception: the authenticated `Me`
   lives in `AuthContext`, because every page reads it and it is written by login.
5. **Filters, sort, page, week and selected day live in the URL** (design §11, rule 11). Nothing
   else does.
6. **Forms never reset from a refetch.** A server response updates the cache; it does not
   overwrite what the person is typing (§6.2).
7. **Link tokens and passwords never enter the query cache, a query key's result, the URL
   after boot, or any storage** (§5.7, §9.15).
8. **No success toast, ever** (design §6.12). Success is the screen changing. Toasts are for
   failures the person cannot otherwise see.
9. **Colours are `var(--token)` strings.** No hex in any component, including chart props
   (design §11, rule 1).
10. **Every list has four designed states** (§8.4). A spinner is never the loading state.

---

## 2. State ownership

Every piece of state has exactly one home. If you are unsure where something goes, find it
in this table.

| State | Home | Persisted? | Examples |
| --- | --- | --- | --- |
| **Server data** | TanStack Query cache | No | weeks, reports, projects, users, dashboard figures |
| **The signed-in person (`Me`) and session status** | `AuthContext` (`useReducer`) | The JWT only, `localStorage` `wv_token` | `user`, `status`, `sessionExpired` |
| **Which week / day / filters / sort / page** | URL search params | In the URL | `?week=2026-W38&day=tue`, `?status=draft,submitted&page=2` |
| **Form values and dirtiness** | react-hook-form, local to the form | No | the day composer, the weekly form, every modal form |
| **Unposted day text** ("Save" in the day panel) | `DayDraftsContext`, in memory | **No** — design §3.13: nothing is written to the device | text kept while switching days |
| **Is anything unsaved?** | `UnsavedChangesContext` registry | No | guards navigation, tab close, session-expiry dismiss |
| **Autosave status** | `useAutosave` (local to the weekly form) | No | `idle · pending · saving · failed`, `savedAt` |
| **Top-bar content** | `PageChromeContext` slot targets | No | which page is rendering title and actions |
| **Open / closed UI** | `useState` in the owning component | No | a popover, a modal, an expanded project row |
| **Device preferences** | `localStorage` | Yes, per device | `wv.theme`, `wv.nav.collapsed` |
| **Demo store and perspective** | `client/src/demo/` module, in memory | **No** — a refresh rebuilds it | all demo data |

**Device storage — the complete list.** Anything not here is not stored.

| Key | Written by | Read by | Notes |
| --- | --- | --- | --- |
| `wv_token` | `tokenStore` | the request interceptor, boot | the JWT; absent in the demo |
| `wv.theme` | `useTheme` | the inline script in `index.html`, `useTheme` | `light` \| `dark`; never sent to the server |
| `wv.nav.collapsed` | `Sidebar` | `Sidebar` | `"1"` when collapsed |

Every `localStorage` read and write sits in a `try/catch`; the app must run with storage
blocked, falling back to light theme, expanded sidebar and no token.

**What is deliberately not state.** Derived values — a task's total hours, a project's
days left, the submit checklist — are computed in render from query data. `useMemo` only
when a profile shows it matters. There is no `useEffect` that copies one state into another.

---

## 3. Boot, providers and authentication

### 3.1 Boot sequence

```jsx
// client/src/main.jsx
const demo = /^\/demo(\/|$)/.test(window.location.pathname);

async function start() {
  if (demo) await (await import("./demo/bootDemo.js")).bootDemo();   // installs the adapter, builds the store
  createRoot(root).render(<StrictMode><App demo={demo} /></StrictMode>);
}
start();
```

```jsx
// client/src/App.jsx — provider order is load-bearing
<QueryClientProvider client={queryClient}>
  <MotionConfig reducedMotion="user">
    <AuthProvider demo={demo}>
      <UnsavedChangesProvider>
        <RouterProvider router={createAppRouter({ demo })} />
      </UnsavedChangesProvider>
    </AuthProvider>
  </MotionConfig>
</QueryClientProvider>
```

`RootLayout` — the router's root element — renders what needs both the router and auth:
`<Outlet/>`, `Toaster`, `OfflineStrip` and `ReAuthModal`.

**The demo is a different page load, not a mode switch.** `/demo` is reached from the
landing page by a plain `<a href="/demo">`, so the demo code is a lazy chunk the normal
app never downloads, the adapter is installed once for the life of the page, and *Start
over* is `location.assign('/demo')`. Leaving the demo (`Create your account`, `Sign in`)
is also a plain link. See §11.

### 3.2 Query client defaults

```js
// client/src/lib/queryClient.js
new QueryClient({
  defaultOptions: {
    queries:   { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
    mutations: { retry: 0 },
  },
});
```

`tech_stack.md` §6.3 fixes the query defaults. Two further rules:

- **Mutations never retry.** A write retried after a timeout can double-post a comment.
- **Per-query overrides are explicit.** `['newMarks']` and `['reviewDesk', 'count']` set
  `refetchOnWindowFocus: true` — they are the two things that go stale while the tab is in
  the background. Lists set `placeholderData: keepPreviousData` (§5.5).

### 3.3 `AuthContext`

```js
// shape returned by useAuth()
{
  status: "loading" | "authenticated" | "unauthenticated",
  user: Me | null,
  sessionExpired: boolean,
  isDemo: boolean,
  signInPath: "/signin" | "/",         // where ProtectedRoute sends the signed-out; in the demo "/" is the chooser
  isManager: boolean, isAdmin: boolean, isOwner: boolean,   // derived from user
  signIn(token, user): void,           // after login, signup, accept link, password change
  setUser(user): void,                 // after A5, U9 on yourself
  signOut(): void,
  expireSession(): void,               // called by the authEvents listener only
}
```

**Reducer.** State `{ status, user, sessionExpired }`.

| Action | Effect |
| --- | --- |
| `BOOTED(user)` / `BOOTED_ANONYMOUS` | `loading →` `authenticated` / `unauthenticated` |
| `SIGNED_IN(user)` | `authenticated`, `sessionExpired: false` |
| `USER_UPDATED(user)` | replaces `user` only |
| `SESSION_EXPIRED` | sets `sessionExpired: true` **only if `status` is `authenticated`** — otherwise ignored |
| `SIGNED_OUT` | `unauthenticated`, `user: null` |

**Why the last-but-one guard.** At boot the app calls `A4` with a stored token. If that
token is stale the interceptor emits `session-expired` for it, as designed — but at that
moment there is no page to show a modal over. The guard makes boot's own failure handling
(`BOOTED_ANONYMOUS`) the only path, and keeps the modal for a session that was working.

**Boot (`bootSession`).** No token → `BOOTED_ANONYMOUS`. A token → `A4`:
- success → `BOOTED(user)`;
- `401` → clear the token, `BOOTED_ANONYMOUS`;
- network error or `5xx` (Render waking) → stay `loading`, retry with backoff up to four
  times over about a minute; after the last, show the boot error panel with `Try again`.
  **The token is kept** — an unreachable server is not a reason to sign someone out.

In the demo, boot dispatches `BOOTED_ANONYMOUS` immediately; `/demo`'s chooser calls
`signIn(null, user)` after asking the adapter to switch perspective.

**Side effects of the actions that matter.**

| Call | Does |
| --- | --- |
| `signIn(token, user)` | `tokenStore.set(token)` (not in the demo), `SIGNED_IN` |
| `signOut()` | `tokenStore.clear()`, `queryClient.clear()`, `SIGNED_OUT`. `ProtectedRoute` then redirects — nothing navigates by hand |
| `signIn` as a **different** person than the previous `user` | also `queryClient.clear()`: nothing from the earlier session may render for the new one |

### 3.4 Session expiry — the re-authentication modal

`apiClient` emits `session-expired` on a 401 for a request that carried the *current*
token (`tech_stack.md` §6.2). `AuthProvider` subscribes once and dispatches
`SESSION_EXPIRED`; `ReAuthModal` renders while `sessionExpired` is true.

- The modal is a sign-in form (`A3`) over the untouched page. A wrong password shows the
  `INVALID_CREDENTIALS` strip *inside the modal*; it does not re-emit, because that request
  carries no token.
- **Success as the same person:** `signIn(token, user)` — query cache and every form stay.
  Then **one** `invalidateQueries({ refetchType: 'active' })`. This is not a retry: failed
  writes are not replayed, and forms keep their own values (rule 6). It lets panels that
  errored with the 401 recover without waiting for a refocus.
- **Success as someone else:** the cache is cleared and the page navigates to `/`.
- **`Sign out` or dismissing:** if `UnsavedChangesContext` reports anything dirty, a
  confirm comes first (design §3.12). Then `signOut()`.

### 3.5 The cold start

The first thing the API does after idling is slow (`tech_stack.md` §7.3). Two places can
sit pending for up to a minute: boot (`A4`) and the landing page's `A1`.

- **Boot:** `AppBootSplash` shows the glyph alone. After **3 seconds** pending it adds the
  *starting up* line. The design system has no spec for this state; §14 **FA13** proposes
  one.
- **Everything after boot** uses ordinary skeletons. The "starting up" treatment is for
  boot only: by the time a page's own queries run, boot has already woken the server.

---

## 4. Routing

### 4.1 The route table

`routes/index.jsx` exports `buildRoutes()`. Routes that make no sense in the demo carry
`handle: { realOnly: true }` and are filtered out when building the demo router (§11.1).

```jsx
[
  { element: <RootLayout />, children: [
    // Signed-out screens, no shell. Signed-in visitors are sent home, except invite and reset.
    { element: <AuthLayout />, handle: { realOnly: true }, children: [
      { path: "/signin",       element: <PublicOnly><SignInPage /></PublicOnly> },
      { path: "/signup",       element: <PublicOnly><SignUpPage /></PublicOnly> },
      { path: "/invite/:token", element: <AcceptInvitePage /> },
      { path: "/reset/:token",  element: <ResetPasswordPage /> },
    ]},

    // The session layout: AppShell when signed in, a bare outlet when not.
    { element: <SessionLayout />, children: [
      { index: true, element: <IndexRoute /> },   // signed in → ThisWeekPage · signed out → landing, or the demo chooser

      { element: <ProtectedRoute />, children: [                       // any role
        { path: "/reports",                        element: <ReportHistoryPage /> },
        { path: "/reports/:week",                  element: <ReportDetailPage /> },
        { path: "/reports/:week/edit",             element: <ReportEditPage /> },
        { path: "/updates",                        element: <TeamUpdatesPage /> },
        { path: "/people/:userId/reports/:week",   element: <ReportDetailPage /> },
        { path: "/account",                        element: <AccountPage /> },
      ]},
      { element: <ProtectedRoute allow={["manager", "admin"]} />, children: [
        { path: "/review",             element: <ReviewDeskPage /> },
        { path: "/review/:reportId",   element: <ReviewPage /> },
        { path: "/team",               element: <TeamDashboardPage /> },
        { path: "/people",             element: <PeoplePage /> },
        { path: "/people/:userId",     element: <PersonProfilePage /> },
        { path: "/projects",           element: <ProjectsPage /> },
      ]},
      { element: <ProtectedRoute allow={["admin"]} />, children: [
        { path: "/users",     element: <UsersPage /> },
        { path: "/holidays",  element: <HolidaysPage /> },
      ]},
      { path: "*", element: <NotFoundPage /> },                        // inside the shell if signed in, standalone if not
    ]},

    { path: "/design", element: <DevOnlyRoute><DesignPage /></DevOnlyRoute>, handle: { realOnly: true } },
  ]},
]
```

**Why `SessionLayout` exists.** `/` must be the landing page *without* a shell for a
visitor and "This week" *with* one for a member (`requirments_doc.md` §13). A layout that
renders `AppShell` only when there is a session — and a bare outlet otherwise — lets one
index route branch on the session without remounting the shell when a signed-in person
moves from `/` to `/reports`.

**`IndexRoute`** renders `ThisWeekPage` when signed in; otherwise `MarketingLayout` +
`LandingPage`, or — in the demo — `DemoEntryPage`.

**`ProtectedRoute`** (supersedes the redirect in `tech_stack.md` §6.4 — §14 **FA2**):

```jsx
export default function ProtectedRoute({ allow }) {
  const { user, status, signInPath } = useAuth();
  const location = useLocation();
  if (status === "loading") return <AppBootSplash />;
  if (!user) return <Navigate to={signInPath} replace state={{ from: location }} />;
  if (allow && !allow.includes(user.role)) return <ForbiddenPage allow={allow} />;
  return <Outlet />;
}
```

A member typing `/review` gets the 403 state *inside the shell* (design §3.13, checklist
§13). `ForbiddenPage` words the line from `allow`: "This area is for managers." /
"This area is for admins." It never says what is behind the wall.

**Route parameters are validated before they are used.** `:week` must match
`^\d{4}-W(0[1-9]|[1-4]\d|5[0-3])$`; `:userId`, `:reportId` and `:token` must be non-empty,
and the two ids 24 hex characters. A bad value renders `NotFoundPage` without a request —
the server would have answered `422`, which is not what a mistyped URL should show.

**Normalising.** `/people/:userId/reports/:week` with `userId === me._id` replaces to
`/reports/:week`. `/reports/:week/edit` for a report that is not editable replaces to
`/reports/:week` (§9.3).

**Code splitting.** Each page is a route-level `lazy()` import. `TeamDashboardPage`
(Recharts), `LandingPage` + `components/marketing` and the whole of `demo/` are the
chunks that matter; Vite `manualChunks` puts `recharts` and `motion` in their own vendor
chunks so a change to page code doesn't invalidate them. The suspense fallback is the
shell with a page-level skeleton — never a blank screen.

### 4.2 URL state

All of design §11 rule 11 — filter, sort, pagination, week, day — through two hooks.

**`useUrlFilters(spec)`** — a declarative spec per page, no schema library:

```js
// pages/ReviewDeskPage.jsx
const spec = {
  approval: enumParam(["requested", "all"], "requested"),
  person:   listParam(),                 // ?person=id1,id2
  project:  listParam(),
  role:     listParam(["member", "manager", "admin"]),
  weekFrom: weekParam(), weekTo: weekParam(),
  sort:     enumParam(["submittedAt", "weekKey"], "submittedAt"),
  dir:      enumParam(["asc", "desc"], "asc"),
  page:     pageParam(),
  limit:    limitParam(),                // 20 | 50 | 100, default 20 — anything else is dropped
};
const { filters, setFilter, setFilters, clear, activeCount, apiParams } = useUrlFilters(spec);
```

| Behaviour | Rule |
| --- | --- |
| Defaults | Not written to the URL; a link to the default view is the bare path |
| Invalid values | Silently replaced by the default — a hand-edited URL never errors |
| Changing any filter or `sort` / `dir` / `limit` | Resets `page` to 1 |
| History | Discrete choices (a select, a sort, a page) **push**; search typing **replaces**, debounced 250 ms |
| `apiParams` | Lists become comma strings (the API's form, §1.7); empty values are dropped; `limit` and `page` always sent |
| `activeCount` | Number of non-default filters, excluding `page`, `sort`, `dir`, `limit` — drives the FilterBar's `Clear (n)` and the empty-because-filtered state |

Helpers live in `lib/urlParams.js`; the hook in `hooks/useUrlFilters.js`.

**`useWeekParam()`** reads `?week=` and returns `{ weekKey, isCurrent, setWeek }`.
Missing → the current week; malformed, before the person's `joinedAt` week, or later than
the current week → replaced by the current week. The current week comes from
`lib/dates.currentWeekKey(now)` using the **browser's clock** (`api_specification.md` I2).

**`useWeekdayParam(weekKey)`** reads `?day=`: default is today when `weekKey` is the
current week, else the earliest missing day (when the page has week data), else Monday.

**Navigation state, not URL state.** One thing travels in `location.state`: the review
desk's search string, so the review page's "Next in review desk" uses the same filters
(§9.7). It is an optimisation; without it the link falls back to the default queue.

---

## 5. The data layer

### 5.1 `apiClient` and `api`

`tech_stack.md` §6.2 specifies the axios instance and its two interceptors; this section
adds the thin layer services actually call.

```js
// client/src/services/apiClient.js
export const apiClient = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL });
// request interceptor: Authorization from tokenStore · response interceptor: unwrap + 401 (tech_stack §6.2)

// What services use. Each returns the envelope's `data`, nothing else.
export const api = {
  get:    (url, config)       => apiClient.get(url, config).then((env) => env.data),
  post:   (url, body, config) => apiClient.post(url, body, config).then((env) => env.data),
  put:    (url, body, config) => apiClient.put(url, body, config).then((env) => env.data),
  patch:  (url, body, config) => apiClient.patch(url, body, config).then((env) => env.data),
  delete: (url, config)       => apiClient.delete(url, config).then((env) => env.data),
};
```

The response interceptor returns the whole envelope (`{ success, data, message, error }`);
`api` takes `.data`. A list endpoint therefore resolves to `{ items, meta }` and a single
resource to the resource. **Services never see the envelope**, and neither do components.

**`normalizeError` returns an `ApiError`** (§14 **FA3** — extends the `{ message, code }`
in `tech_stack.md` §6.2):

```js
{
  name: "ApiError",
  httpStatus: 422 | 404 | … | 0,        // 0 when no response arrived
  code: "VALIDATION_FAILED" | … | "NETWORK_ERROR" | "TIMEOUT",
  message: "…",                          // safe to show, from the envelope
  fields: { "lines.0.hours": "Enter more than zero." } | null,   // VALIDATION_FAILED only; dot paths
  details: { status: "approved" } | { reason: "holiday" } | null, // the API's extra keys (§1.9 there)
  isNetwork: boolean,
}
```

`status` in the API's `REPORT_STATE_CHANGED` and `USER_STATE_CHANGED` is an *extra key*,
not the HTTP status — hence `details.status` versus `httpStatus`.

### 5.2 Services — one function per endpoint

One file per resource, named `<resource>Service.js`. A service function takes plain
arguments, calls `api`, returns the data. No React, no query client, no caching, no error
handling beyond what `api` already does. **The table is the contract the demo coverage
test (§11.5) iterates.**

| File | Functions → endpoint |
| --- | --- |
| `authService` | `getBootstrap` A1 · `signUp` A2 · `login` A3 · `getMe` A4 · `updateMe` A5 · `changePassword` A6 · `previewLink` A7 · `acceptLink` A8 |
| `userService` | `listUsers` U1 · `getUser` U2 · `inviteUser` U3 · `reissueInvite` U4 · `changeRole` U5 · `removeUser` U6 · `listUserReports` U7 · `getUserWeek` U8 · `setLeave` U9 · `listOnLeave` U10 · `transferOwnership` U11 · `changeEmail` U12 · `createResetLink` U13 |
| `projectService` | `listProjects` P1 · `createProject` P2 · `updateProject` P3 · `setPlan` P4 · `deactivateProject` P5 |
| `taskService` | `listTasks` T1 |
| `reportService` | `listMyReports` R1 · `getSummary` R2 · `getMyWeek` R3 · `getReport` R4 · `putDay` R5 · `saveContent` R6 · `submit` R7 · `listRevisions` R8 · `getRevision` R9 · `setResolution` / `clearResolution` R10 · `setTeamComments` R11 · `listTeamUpdates` R12 · `markSeen` R13 |
| `reviewService` | `approve` V1 · `sendBack` V2 · `listReviewDesk` V3 · `getReviewDeskCount` V4 · `commentOnDay` C1 · `commentOnWeek` C2 · `reply` C3 · `editComment` / `editReply` C4 · `deleteComment` / `deleteReply` C5 |
| `holidayService` | `listHolidays` HD1 · `createHoliday` HD2 · `updateHoliday` HD3 · `deleteHoliday` HD4 |
| `dashboardService` | `getSummary` D1 · `getTeam` D2 · `getTrend` D3 · `getHours` D4 · `getWorkload` D5 · `getActivity` D6 · `getPersonMetrics` D7 · `getProjects` D8 |
| `markerService` | `getNewMarks` N1 |

`H1` (health) is called by Render, not by the client, and has no service.

**Rule — credentials never in a URL.** `previewLink`, `acceptLink`, `login`, `signUp`,
`changePassword` send secrets in the body only (`api_specification.md` §1.4).

### 5.3 Dates in and out

The API sends calendar dates as `YYYY-MM-DD` and instants as UTC ISO strings
(`api_specification.md` §1.8). On the client:

- Parse calendar dates with `parseISO` (a date-only string parses as **local** midnight in
  date-fns), format with `lib/format.js`. Never `new Date("2026-09-14")`, which is UTC and
  shows the previous day west of Greenwich.
- Instants display in the viewer's local time.
- A `weekKey` is converted to dates only through `lib/dates.js` (`weekStartOf`,
  `weekDays`, `addWeeks`, `currentWeekKey`) — never by string arithmetic.

### 5.4 Query keys

One factory, `lib/queryKeys.js`; **no component or hook writes a key literal** (§14 **FA4**).

```js
export const qk = {
  bootstrap:       () => ["auth", "bootstrap"],
  linkPreview:     () => ["auth", "link-preview"],

  week:            (userId, weekKey) => ["week", userId, weekKey],            // R3 for yourself, U8 for anyone else
  report:          (id)              => ["report", id],                       // R4
  revisions:       (id)              => ["report", id, "revisions"],          // R8
  revision:        (id, n)           => ["report", id, "revisions", n],       // R9
  reports:         (filters)         => ["reports", filters],                 // R1
  reportsOf:       (userId, filters) => ["reports", "of", userId, filters],   // U7
  summary:         (weekKey, month)  => ["reports", "summary", { weekKey, month }], // R2

  teamUpdates:     (weekKey, weekday, f) => ["teamUpdates", weekKey, weekday, f],    // R12
  reviewDesk:      (filters)         => ["reviewDesk", filters],              // V3
  reviewDeskCount: ()                => ["reviewDesk", "count"],              // V4

  tasks:           (opts)            => ["tasks", opts],                      // T1
  projects:        (opts)            => ["projects", opts],                   // P1
  holidays:        (year)            => ["holidays", year],                   // HD1
  onLeave:         ()                => ["onLeave"],                          // U10
  users:           (filters)         => ["users", filters],                   // U1
  user:            (id)              => ["users", "detail", id],              // U2
  newMarks:        ()                => ["newMarks"],                         // N1

  dashboard: {
    summary:  (weekKey, f) => ["dashboard", weekKey, "summary",  f],         // D1
    team:     (weekKey, f) => ["dashboard", weekKey, "team",     f],         // D2
    trend:    (endWeek, f) => ["dashboard", endWeek, "trend",    f],         // D3
    hours:    (weekKey, f) => ["dashboard", weekKey, "hours",    f],         // D4
    workload: (weekKey, f) => ["dashboard", weekKey, "workload", f],         // D5
    projects: (weekKey, f) => ["dashboard", weekKey, "projects", f],         // D8
    activity: ()           => ["dashboard", "activity"],                      // D6 — not week-scoped
    person:   (userId)     => ["dashboard", "person", userId],              // D7
  },
};
```

These extend the list in `tech_stack.md` §6.3 and keep every prefix it names, so its
invalidation rules work unchanged: `['reports']` reaches history, someone's history and the
personal strip; `['report', id]` reaches the report, its revisions and each revision;
`['reviewDesk']` reaches the desk *and* its count; `['dashboard']` reaches every block;
`['users']` reaches the list and a detail.

**Filter objects in keys are the output of `apiParams`**, so two equal views share a cache
entry and an unrelated URL parameter (`unit`, `day`) does not split it.

### 5.5 Query defaults per kind of query

| Kind | Options |
| --- | --- |
| A paginated list (R1, U1, U7, V3, D2) | `placeholderData: keepPreviousData` — paging and filtering never flash the skeleton; the table dims (`aria-busy`) while `isPlaceholderData`. The skeleton is for `isPending` only |
| A single week / report | defaults |
| `['newMarks']`, `['reviewDesk','count']` | `refetchOnWindowFocus: true`; never polled |
| `qk.linkPreview` | `retry: false`, `staleTime: Infinity`, `gcTime: 0` |
| Anything the page enables later | `enabled` carries the condition; the key still includes every input |

### 5.6 Hooks

Hooks are thin: key + service + options. File per resource, as in
`project_structure.md` §3.1.

| File | Query hooks | Mutation hooks |
| --- | --- | --- |
| `useReportQueries` | `useWeek(userId, weekKey)` · `useReport(id)` · `useRevisions(id)` · `useRevision(id, n)` · `useMyReports(filters)` · `useUserReports(userId, filters)` · `useReportSummary(weekKey, month)` · `useTeamUpdates(weekKey, weekday, filters)` | `usePutDay` · `useSaveContent` · `useSubmitReport` · `useResolveBlocker` · `useTeamComments` · `useMarkSeen` |
| `useReviewQueries` | `useReviewDesk(filters)` · `useReviewDeskCount()` | `useApprove` · `useSendBack` · `useCommentOnDay` · `useCommentOnWeek` · `useReply` · `useEditComment` · `useDeleteComment` |
| `useDashboardQueries` | one per block (`useDashboardSummary` … `useDashboardProjects`, `useRecentActivity`, `usePersonMetrics`) | — |
| `useProjectQueries` | `useProjects(opts)` | `useCreateProject` · `useUpdateProject` · `useSetPlan` · `useDeactivateProject` |
| `useTaskQueries` | `useMyTasks(opts)` | — (tasks are created by `putDay`) |
| `useUserQueries` | `useUsers(filters)` · `useUser(id)` · `useOnLeave()` | `useInviteUser` · `useReissueInvite` · `useChangeRole` · `useRemoveUser` · `useSetLeave` · `useTransferOwnership` · `useChangeEmail` · `useCreateResetLink` · `useUpdateMe` · `useChangePassword` |
| `useHolidayQueries` | `useHolidays(year)` · `useHolidaysForWeek(weekKey)` | `useCreateHoliday` · `useUpdateHoliday` · `useDeleteHoliday` |
| `useNewMarks` | `useNewMarks()` | — |
| `useAuthQueries` | `useBootstrapStatus()` · `useLinkPreview(token)` | `useLogin` · `useSignUp` · `useAcceptLink` |

**`useWeek(userId, weekKey)`** picks the endpoint: `userId === me._id` → `R3`, otherwise
`U8`. Both return a `WeekView`; both share `qk.week`. Callers never choose.

**`useHolidaysForWeek(weekKey)`** fetches `qk.holidays(year)` for the year of the week's
Monday *and*, if different, of its Friday (week 1 can start in December), then filters to
the week. It exists because `dayStates` says `holiday` but not *which* holiday.

### 5.7 Mutations — invalidation, optimism, and where a failure shows

`tech_stack.md` §6.3 states the invalidation rules in prose; this is the same set as a
table. `W` is the `WeekView` the mutation acted on, so `{userId, weekKey, reportId}` are
always at hand, and every mutation hook invalidates through one helper,
`invalidateWeek(queryClient, W)`, which targets `qk.week(W.user._id, W.weekKey)` and
`qk.report(W.report._id)`.

| Mutation (endpoint) | On success | Optimistic | Failure shows |
| --- | --- | --- | --- |
| `usePutDay` (R5) | `setQueryData(week)` from the response; invalidate `report(id)`, `teamUpdates`, `dashboard`, `reports`, `projects`, `tasks` | no | inline under the composer; `fields` onto lines |
| `useSaveContent` (R6) | `setQueryData(week)` only. **Nothing else** — autosave is quiet and touches no shared view | no | the autosave indicator (`Not saved` + `Retry`) |
| `useSubmitReport` (R7) | `setQueryData(week)`; invalidate `report(id)`, `reports`, `reviewDesk`, `dashboard`, `newMarks`, `tasks` | no | inline above the action bar; `fields` onto days and tasks |
| `useResolveBlocker` (R10) | invalidate `week`, `report`, `teamUpdates`, `dashboard` | **yes** — flip `resolvedAt` in the week cache, restore on error | error toast with `Retry` |
| `useTeamComments` (R11) | invalidate `week`, `report`, `teamUpdates` | **yes** — flip `openToTeam` | error toast with `Retry` |
| `useCommentOnDay` / `useReply` / `useEditComment` / `useDeleteComment` (C1, C3–C5) | invalidate `week`, `report`, `teamUpdates` | no | inline under the thread's composer |
| `useCommentOnWeek` (C2) | invalidate `week`, `report` | no | inline in the action panel / composer |
| `useApprove` / `useSendBack` (V1, V2) | `setQueryData(report)`; invalidate `report(id)`, `week`, `reports`, `reviewDesk`, `newMarks`, `dashboard` | no | inline above the buttons; **never a toast alone** (design §3.6) |
| `useCreateProject` / `useUpdateProject` / `useSetPlan` / `useDeactivateProject` (P2–P5) | invalidate `projects`, `week`, `teamUpdates`, `dashboard` | no | in the modal; `fields` onto form fields |
| `useChangeRole` (U5) | invalidate `users`, `dashboard` | **yes** — the Select shows the new value, `Saved` for 900 ms; on error revert | error toast with `Retry` |
| `useInviteUser` / `useRemoveUser` / `useTransferOwnership` / `useChangeEmail` / `useCreateResetLink` / `useReissueInvite` (U3, U6, U11–U13, U4) | invalidate `users`, `dashboard`; after U11 also `getMe()` → `setUser`, because the actor has just stopped being the owner | no | in the modal or confirm |
| `useSetLeave` (U9) | invalidate `users`, `onLeave`, `week`, `teamUpdates`, `dashboard`; if the actor is the target, `setUser(Me)` from the response | no | inline by the switch |
| `useCreateHoliday` / `useUpdateHoliday` / `useDeleteHoliday` (HD2–HD4) | invalidate `holidays`, `projects`, `week`, `teamUpdates`, `dashboard` | no | in the modal; `fields.date` |
| `useUpdateMe` (A5) / `useChangePassword` (A6) | `setUser(Me)`; A6 also `signIn(token, user)` — the new token replaces the old, nobody is signed out | no | inline in the panel; A6 `fields.currentPassword` |
| `useMarkSeen` (R13) | invalidate `newMarks`, `reports`, `reviewDesk` — **not `week` or `report`** (§9.4) | no | none — silent |

**Optimism is for single-field toggles only** (three of them). Everything else waits for
the server: a lost comment or a half-posted day that appears to have worked is worse than
a 200 ms wait.

**Link responses are not cached.** `useInviteUser`, `useReissueInvite` and
`useCreateResetLink` return a raw link. Their mutation `data` is read by the modal that
fired them and by nothing else; `gcTime: 0`, the modal calls `reset()` on close, and the
`users` list they invalidate never contains a token (`api_specification.md` U1).

### 5.8 Error handling by code

`lib/errorCopy.js` holds the plain-language message for each code, so the wording exists
once. This table is what each code *does* in the UI; "refetch" means invalidating the
affected key, because the cached view is now known to be wrong.

| Code | The UI does |
| --- | --- |
| `VALIDATION_FAILED` | `applyServerErrors(form, fields)`; anything unmatched goes in a form-level inline error under the buttons |
| `UNAUTHENTICATED` | The interceptor and re-auth modal (§3.4). Components never handle it |
| `INVALID_CREDENTIALS` | The `--st-corr-bg` strip on sign-in and in the modal |
| `FORBIDDEN` | On a route: `ForbiddenPage`. On a write: a toast — the UI should not have offered it |
| `SIGNUP_CLOSED` | Switch `/signup` to its closed state (design §3.12) |
| `CANNOT_MODIFY_SELF`, `PROTECTED_ACCOUNT`, `OWNER_ONLY` | Inline in the modal or menu. The row's controls are already disabled with tooltips; this is the backstop |
| `REPORT_FORBIDDEN` | On a read: the 403 state of §3.4. On a write: inline, then refetch |
| `SELF_REVIEW_FORBIDDEN` | Refetch; the self-review strip replaces the action panel |
| `COMMENT_NOT_ALLOWED` | Inline under the composer ("Comments on this update are limited to …"), then refetch the day so `canComment` is current |
| `EDIT_WINDOW_CLOSED` | Inline "The 10 minutes to change this have passed.", then refetch so the buttons disappear |
| `COMMENT_HAS_REPLIES` | Inline "A comment with replies can't be deleted.", refetch |
| `LINK_INVALID` | The one expired-link state (design §3.12) |
| `USER_NOT_FOUND`, `PROJECT_NOT_FOUND`, `TASK_NOT_FOUND`, `REPORT_NOT_FOUND`, `REVISION_NOT_FOUND`, `THREAD_NOT_FOUND`, `BLOCKER_NOT_FOUND`, `HOLIDAY_NOT_FOUND` | A page: `NotFoundPage`. A control: inline "That no longer exists." and refetch the list |
| `USER_EXISTS` | Field error on `email` |
| `USER_STATE_CHANGED` | Inline in the modal ("Nadia's account has changed — reload the list."), refetch `users` |
| `PROJECT_NAME_TAKEN` | Field error on `name` |
| `PROJECT_INACTIVE` | Field error on the new-task project; refetch `projects` |
| `HOLIDAY_EXISTS` | Field error on `date` |
| `REPORT_STATE_CHANGED` | Refetch the week and report; inline in the action area: "This report changed while you were working — it is now {details.status}." For review, see §9.7 |
| `WEEK_OUT_OF_RANGE` | Inline in the composer; refetch the week |
| `DAY_NOT_EXPECTED` | Inline in the composer worded from `details.reason` (`future` · `holiday` · `leave`); refetch the week so `dayStates` is current |
| `CURRENT_PASSWORD_INCORRECT` | Field error on `currentPassword` |
| `NETWORK_ERROR`, `TIMEOUT`, `INTERNAL_ERROR` | A query: `InlineError` with `Try again`. A write: the inline area says "Couldn't reach the server." and the person's input is kept |

---

## 6. Forms

### 6.1 Conventions

- **react-hook-form + `zodResolver`**, schemas in `client/src/schemas/`. They mirror the
  server's limits (`api_specification.md` §2) and are written for the form's benefit —
  messages are plain sentences, not Zod defaults.
- **Validation timing** (design §4.10): `mode: "onBlur"`, `reValidateMode: "onChange"`.
  Never on the first keystroke.
- **`Field`** (`ui/Field.jsx`) wraps every control: label above, `Optional` marker right,
  helper text, error below with `aria-invalid` and `aria-describedby` wired. No asterisks.
- **Server errors:** `applyServerErrors(form, apiError)` in `lib/formErrors.js` calls
  `setError` for every `fields` path that exists in the form and returns the ones that do
  not. Those go to a form-level `InlineError` above the action buttons.
- **Buttons.** The submit button shows `loading` while the mutation runs; fields stay
  enabled but the values are preserved on failure. `Esc` does not close a modal with a write
  in flight (design §6.11).
- **Modal forms** each have their own schema and component; they share nothing but `Field`
  and `applyServerErrors`.

### 6.2 The rule that protects what people type

**A refetch never calls `reset()` on a form.** Initial values come from the query data
*once* — when the form mounts, or when the document's identity changes (a different
report, or the report's status moves, e.g. after a resubmit). Between those moments the
form's values are the person's and the cache is the server's.

For the weekly form (§6.4) this is made structural: the task rows are not form fields at
all but a list rendered from the server, with their `status` and `note` held in a record
keyed by task id, so a refetch that adds a task adds a row and changes nothing else.

### 6.3 The day panel form (design §4.11)

**Form values**

```js
{
  lines: [{
    _id?: string,                       // an existing line — round-tripped
    task: { kind: "existing", id } | { kind: "new", name, project },
    taskType: "development" | …,        // seven values
    text: string,                       // 1–500
    hours: number,                      // > 0, step 0.25, no maximum
  }],                                   // 1–20
  blockers: [{ _id?: string, text: string }],   // 0–10
  openToTeam: boolean,
}
```

**To the API (R5).** `lines[i].task` becomes `task: id` or `newTask: { name, project }`;
empty blocker rows are dropped before validation, never an error; **every existing line
and blocker keeps its `_id`** — that is what preserves a blocker's resolution when the day
is edited (`database_schema.md` §1.7).

**Behaviour**

| Concern | Decision |
| --- | --- |
| `Save` | Writes the current values into `DayDraftsContext` keyed `weekKey:weekday` and marks the composer clean. Nothing is sent, nothing is persisted to the device |
| `Post update` | Validates, then `usePutDay`. On success the draft is deleted and the panel flips to its posted state |
| Opening a day | Values come from, in order: the draft, the posted day, a blank composer with one empty line |
| Switching days | The composer's values are written to the draft store first — switching never loses text |
| Unposted text on tab close | `useUnsavedGuard` registers the composer as dirty while it has edits that are neither posted nor saved; the browser's `beforeunload` prompt covers it |
| The task combobox | Options are `T1` (open tasks, grouped by project) **plus any task already on a line in this form** — a line on a task since marked Done must still show its task. The last option is "Start a new task…", which reveals a name field and a project Select (the person's assigned projects, else every active project) |
| Live total | `sum(lines.hours)` in the header, formatted by `fmtHours` |
| Day not writable | `DayPanel` renders the reason (holiday, leave, future, frozen week) and no composer — decided from `dayStates` and the report status, not from a failed request |

The panel never autosaves (design §4.8): posting is the act that shares.

### 6.4 The weekly form (design §4)

**Form values**

```js
{
  taskStates: { [taskId]: { status: "not_started" | "in_progress" | "done" | "carried_over" | "", note: string } },
  nextWeek:     [{ text }],                              // optional
  achievements: [{ _id?, text, isKey }],                 // optional; at most one isKey
  notes:        string,                                  // 0–5000
  links:        [{ label, url }],                        // optional; http(s) url
  keyBlockerId: string | null,
}
```

The **task list is rendered from `week.report.tasks`** (server order), not from a field
array. `taskStates` is looked up by task id; a task with no entry gets `{ status: "" }`
until the person chooses one — **no default status**, because a status is a statement the
person must make (design §4.3). `nextWeek` is wrapped in `{ text }` objects only because
`useFieldArray` needs objects; it is sent as plain strings.

**Autosave — `useAutosave`.**

| Concern | Decision |
| --- | --- |
| Trigger | 1200 ms after the last change; on blur of any field (flush); on route change and unmount (flush); only while status is `draft` or `needs_correction` |
| Concurrency | One request in flight. Edits made during it set a flag; when it returns, **one** trailing save sends the latest values. Last write wins; two tabs are the accepted case (`api_specification.md` O2) |
| Payload | The whole content body, run through `toContentPayload`: empty rows dropped, and **rows that fail client validation are held back** (an invalid link is not sent, and keeps its inline error) — so a half-typed URL never turns an autosave into a `422` |
| On success | `setQueryData(qk.week(...))`; **the form is not reset**; `savedAt` comes from the response's `updatedAt` |
| States | `idle · pending · saving · failed` → "Saved 14:32" · "Unsaved changes" · "Saving…" · "Not saved" + `Retry` (design §4.8). The indicator is `aria-live="polite"` |
| Failure | State `failed`; edits stay in memory; `beforeunload` is armed; coming back online (`online` event) retries once automatically |
| Never | A toast on success; a toast on failure (the indicator is the signal) |

**Submit.** `StickyActionBar` → `flush()`; if the flush failed, stop with the `Not saved`
state. Otherwise `useSubmitReport({ requestApproval })`.

- **The checklist is computed on the client** (`lib/submitChecklist.js`) from
  `week.dayStates` (every expected day posted) and the current form values (every task has
  a status). It must not wait for the autosave round trip, or `Submit` would stay disabled
  for 1.2 s after the last status is chosen. The server's `Report.canSubmit` and
  `submitBlockers` are the fallback when the form first opens, and `422` is the authority.
- **On `422`**, `fields` of the form `days.thu` mark the rail and the week summary;
  `tasks.<id>.status` goes on that task's Select. The first problem is scrolled to
  `top: 140px` and focused; its section is marked in the rail (design §4.10).
- **On `409 REPORT_STATE_CHANGED`**, refetch and tell the person what the report is now.
- **On success**, navigate to `/reports/:week` — the filed document. *(Call, FA9.)*

**The rail.** `SectionRail` observes each `FormSection` with one `IntersectionObserver`
(`useActiveSection(ids)`) for the *current* state. A section is **complete** when: 01 —
every task has a status; 02, 04, 06 — it has content; 03 — a key blocker is chosen, or
there are no blockers; 05 — always. Optional sections are never *errors*. *(Call, FA10.)*

**Key toggles** (design §4.5) are `role="radiogroup"` with buttons that behave as radios
but **may be clicked again to clear**, since flagging is optional. Selecting a second
unflags the first with the 160 ms crossfade.

**Guards.** The form registers with `UnsavedChangesContext` while status is `pending` or
`failed`. A `useBlocker` from react-router prompts on in-app navigation; `beforeunload`
covers the tab.

---

## 7. The shell

### 7.1 Composition

```
RootLayout
 ├─ SkipLink · OfflineStrip · Toaster · ReAuthModal
 └─ SessionLayout
     ├─ (signed in)  AppShell
     │     ├─ DemoBar            ← only in the demo, 36px, above everything
     │     ├─ Sidebar            ← navItems.js filtered by role; N1 dots; V4 count
     │     └─ <main>
     │          ├─ TopBar        ← slots filled by <PageHeader/> (portal)
     │          └─ <motion.div key={pathname}> <Outlet/> </motion.div>   ← 140ms opacity, content column only
     └─ (signed out) <Outlet/>
```

### 7.2 Navigation as data

`components/shell/navItems.js` is the one place the sidebar is defined:

```js
{ group: "My work", roles: ["member","manager","admin"], items: [
    { to: "/",        label: "This week",    icon: Calendar,  match: ["/", "/reports/:week/edit"], dot: "thisWeek" },
    { to: "/reports", label: "My reports",   icon: FileText,  match: ["/reports", "/reports/:week"], dot: "myReports" },
    { to: "/updates", label: "Team updates", icon: Users },
]},
{ group: "Review", roles: ["manager","admin"], items: [
    { to: "/review", label: "Review desk",    icon: Inbox, match: ["/review", "/review/:reportId"], count: "reviewDesk" },
    { to: "/team",   label: "Team dashboard", icon: BarChart },
]},
{ group: "Team",  roles: ["manager","admin"], items: [
    { to: "/people",   label: "People",   icon: …, match: ["/people", "/people/:userId", "/people/:userId/reports/:week"] },
    { to: "/projects", label: "Projects", icon: … },
]},
{ group: "Admin", roles: ["admin"], items: [
    { to: "/users", … }, { to: "/holidays", … },
]},
```

- **Group order** is role-dependent (design §1.4): *My work* first for members and last
  for managers and admins — `Sidebar` reorders from `user.role`.
- A forbidden item is **not rendered**, not hidden by CSS (design §13: "never in the DOM").
- **`match`** lists the route patterns that keep an item active, so a profile's week
  highlights *People* and a review page highlights *Review desk*.
- **`dot`** reads `N1.nav[key]`; **`count`** reads `V4.count`, shown only above zero.
- Collapse state: `wv.nav.collapsed`. Mode by width via `useShellMode()` — `full` (≥1280),
  `rail` (1024–1279, or collapsed by choice), `drawer` (<1024, off-canvas, opened by the
  hamburger, closing on backdrop, `Esc` and route change). A manual choice wins over the
  automatic rail (design §10).

### 7.3 The top bar and `PageHeader`

Pages describe their top bar; they do not render it:

```jsx
<PageHeader
  title="Team dashboard"
  back={{ label: "People", to: "/people" }}      // or breadcrumb={[…]} on the one three-level route
  weekPicker={<WeekPicker … />}
  secondary={<Button variant="secondary">…</Button>}
  primary={<Button>…</Button>}                   // one per page — design §11 rule 3
/>
```

`PageHeader` renders nothing in place; it `createPortal`s its parts into slots that
`TopBar` registers through `PageChromeContext`, and sets `document.title` to
`"{title} · WeeklyView"`. A portal rather than a context-held config object means the
actions' closures stay with the page that owns the state, and changing the page's state
never re-renders the shell.

**Page containers.** `PageContainer` takes a `size` — `doc` 860, `page` 1240, `wide` 1560
— so a page names its width (design §3) rather than writing a number.

### 7.4 Responsive behaviour is decided in JS where it changes the DOM

`useMediaQuery(query)` (one `matchMedia` subscription per distinct query) drives the
changes that cannot be done with CSS alone:

| Breakpoint | Change |
| --- | --- |
| `<768px` | `Table` renders stacked cards instead of a `<table>` — **one or the other, never both in the DOM**; the editable weekly tasks render `TaskCard`s; `FilterBar` collapses to search + `Filters` sheet (below 900px) |
| `<1024px` | Sidebar becomes a drawer; the form's section rail is removed (<1280px) |
| `<640px` | `Modal` becomes a full-screen sheet; toasts full-width; week strip shows single letters |

Everything else — spacing, type size, grid splits — is Tailwind breakpoint utilities.
Touch targets under 1024px reach 44×44 through padding or a pseudo-element, not by
enlarging the visual.

### 7.5 Cross-cutting UI

- **`OfflineStrip`** — the `--tint2` line under the top bar, shown from `useOnlineStatus`
  (`navigator.onLine` + `online`/`offline` events): "You're offline. Unsaved changes are
  kept until you reconnect." The edits survive in memory; nothing is written to the device
  (design §3.13).
- **Motion** — only entries in design §8.2. `MotionConfig reducedMotion="user"` at the
  root; the route transition and `AnimatePresence` popovers and modals use Motion, hover
  and focus states are CSS.
- **Theme** — `useTheme` reads and writes `wv.theme` and sets `data-theme` on `<html>`;
  the first paint is handled by the inline script in `index.html` (design §9.2).
- **Demo bar offset** — `AppShell` sets `--demo-h: 36px` on `:root` in the demo and `0px`
  otherwise; every sticky `top` in the system is `calc(<value> + var(--demo-h, 0px))`.

---

## 8. Component contracts

### 8.1 `ui/` conventions

All primitives: **PascalCase, one per file, `forwardRef` to the DOM node, `className`
merged through `cn()` last, no domain knowledge, no data fetching.** Variants are props
(`variant`, `size`), never separate components. Form primitives are controlled-or-
uncontrolled in the standard React way and work with RHF `Controller` or `register`.

Additions to the §6 inventory that the pages need (§14 **FA5**):

| Component | Why it is needed |
| --- | --- |
| `Field` | Label / optional marker / helper / error, used by every form |
| `Combobox` | The task picker. Hand-built on Radix `Popover` with the ARIA combobox pattern — the one primitive with real keyboard work |
| `MultiSelect` | The custom listbox of design §6.4 for FilterBar multi-filters, with search above 8 options and `Apply` / `Clear` |
| `Switch` | "I'm on leave", "Open to team comments" |
| `DatePicker` | Project start date, holiday date; weekends not selectable |
| `Popover` | The shared Radix wrapper under WeekPicker, Combobox, MultiSelect and DropdownMenu |
| `ConfirmDialog` | The destructive confirm used seven times (remove, make owner, delete project, delete holiday, send back, re-issue, reset link): consequence text, `Cancel` / action |
| `SegmentedControl` | `Days \| Hours`, `Asked for approval \| All submitted`, Light / Dark |
| `NewMarker` | The 6×6 square of design §6.24 |
| `QueryView` | The four-state wrapper of §8.4 |

### 8.2 `ui/` components whose props are not obvious

```
Table      columns: [{ id, header, cell(row), align: "left"|"right", width?, sortable?, mobile?: "primary"|"status"|"pair"|"hidden", label? }]
           rows, rowKey, getRowHref?(row), onRowClick?(row), sort?: { id, dir }, onSortChange?, dense?, selectable? (unused in v1 — FA6)
           isLoading, skeletonRows = 8, isFetching (dims, aria-busy), emptyState (ReactNode)
Pagination meta: { page, limit, total, totalPages }, onPage(n), onLimit(n)        // "1–20 of 84", rows-per-page Select 20/50/100
FilterBar  children = controls in the §6.21 order; activeCount; onClear; the search input is a controlled <input> with 250ms debounce → onSearch
WeekPicker value (weekKey), onChange, min (weekKey), max (weekKey), holidays?: { [date]: name }, reportedWeeks?: { [weekKey]: status }, disabled
StatusChip kind: "report"|"week"|"task"|"user", value, size: "md"|"sm"      // maps value → label + tokens through lib/statusMaps; text is exactly the spec's
           // "week" values: not_started · on_leave · holiday_week ("Holiday week", design §6.8) — the three derived states, never stored
Panel      title?, actions?, footer?, padding: "default"|"dense"|"none", sample?: boolean   // renders the SAMPLE DATA pill when useIsDemo() and the panel holds data
Modal      open, onOpenChange, size: "sm"|"md"|"lg", title, footer, dismissible = true     // Esc blocked when dismissible=false (write in flight)
Tabs       value, onChange, items: [{ value, label, disabled?, title? }]                   // roving tabindex; Motion layoutId for the indicator
Avatar     name, size: 22|28|32|44                                                        // initials only
AvatarStack people: [{ name }], max = 4
MetricCell label, value, unit?, sub?, tone?: "default"|"corr"
InlineError title, children, onRetry?, code?                                              // code shown in mono only when actionable
EmptyState title, children, action?                                                       // exactly one action or none
```

### 8.3 Composed components — props and who owns what

"Owns" means the component fires the mutation itself. Components that do not own a
mutation take callbacks, so the same component serves the real page and any future page.

**`components/report/`**

| Component | Props | Notes |
| --- | --- | --- |
| `WeekStrip` | `weekKey`, `dayStates`, `days`, `holidays`, `selected`, `onSelect`, `size: "full"\|"summary"` | `role="tablist"`; disabled cells are skipped by arrow keys. `full` = the 52px device on This week; `summary` = the 36px strip above the form. **Never animates** (design §8.4) |
| `DayPanel` | `week: WeekView`, `weekday`, `isOwn` | Owns `usePutDay`. Chooses composer vs posted vs blocked from `dayStates` and status; owns the draft-store interaction |
| `WorkLineRow` | `index`, `form` control, `taskOptions`, `projects`, `onRemove`, `canRemove` | The four fields (design §4.11); a field array row, so siblings don't re-render |
| `TaskPicker` | `value`, `onChange`, `options` (grouped), `allowNew`, `projects` | Wraps `Combobox`; the "start a new task" expansion lives here |
| `DailyUpdatesBlock` | `week`, `canToggle`, `onResolve`, `onToggleTeam` | Read-only five-day block for §3.4 and §3.6. Owns the resolve and team-comment mutations via hooks |
| `CurrentWeekPanel` | `week`, `me` | The "This week's report" panel with its definition grid |
| `MyProjectsPanel` | `projects`, `unit`, `onUnitChange` | `ProjectProgress` per row |
| `CorrectionPanel` | `week` | `latestComment` plus `Reply`, which opens the thread composer |
| `ReportForm` | `week` | Owns RHF, autosave and the submit mutation (§6.4) |
| `FormSection` | `id`, `number`, `title`, `children` | Anchors the rail |
| `SectionRail` | `sections`, `checklist`, `activeId` | Visible ≥1280px |
| `TasksTable` | `tasks`, `form`, `weekKey` | Rows from the server, states from `taskStates`; `TaskRow` ≥768px, `TaskCard` below |
| `StickyActionBar` | `status`, `autosave`, `checklist`, `isResubmit`, `onSave`, `onSubmit` | The "Ask for approval" checkbox's state lives here and goes into `onSubmit({ requestApproval })` |
| `ReportDocument` | `week`, `revision?`, `viewer` | The §3.4 document, shared by detail and review. Pure rendering from props — fetches nothing |
| `RevisionsRail` | `reportId`, `revisions`, `selected`, `onSelect` | Selecting swaps `ReportDocument`'s `revision` and shows the "Viewing rev 2" banner |
| `OnLeaveStrip` | `names`, `holidays`, `isCurrentWeek`, `meOnLeave`, `onEndLeave` | See §9.1 for why `names` is only given for the current week |

**`components/comment/`**

| Component | Props | Notes |
| --- | --- | --- |
| `CommentThread` | `thread`, `target`, `canReply` | `target` is `{ kind: "day", reportId, weekday }` or `{ kind: "week", reportId }`. Owns edit / delete / reply mutations through `useCommentActions(target)`, which picks C1–C5 |
| `Comment` | `comment`, `isWriter`, `showKind?` | Shows the countdown while `editableUntil` is in the future; `Delete` absent when the thread has replies or `kind === "send_back"` |
| `CommentComposer` | `placeholder`, `submitLabel`, `minLength?`, `onSubmit(text)`, `error?`, `pending` | Plain controlled textarea + button |

`useNow(intervalMs)` is **one shared ticker** (a module-level `setInterval` that runs only
while something subscribes, 15 s): the "9 min left" countdowns of every visible comment
read the same clock. The countdown is informative; the server enforces the window, and a
client clock that disagrees is corrected by `EDIT_WINDOW_CLOSED` plus a refetch.

**`components/updates/`** — `DayTabs` (`weekKey`, `selected`, `onSelect`, `holidays`),
`PersonUpdate` (`entry: R12 item`, `canToggle`, owns thread mutations via `CommentThread`).

**`components/review/`**

| Component | Props | Notes |
| --- | --- | --- |
| `ReviewDeskTable` | `query`, `filters`, `onFilters` | A `Table` configuration |
| `ReviewStatusBlock` | `week`, `outcome?` | Chip, "Approval asked / not asked", submitted time, version count |
| `WeekComments` | `threads`, `canStart`, `canReply`, `reportId` | The rail's thread list with version and kind labels |
| `ReviewActionPanel` | `week`, `readRevision`, `onDone(outcome)` | Owns `useApprove`, `useSendBack`, `useCommentOnWeek`; the single textarea serves all three (§9.7) |
| `ReadOnlyStrip` | `kind: "read-only"\|"self"` | The `--tint` strips |

**`components/dashboard/`** — `MetricStrip`/`MetricCell`, `TeamTable` (owns the status
filter control), `UpdatesCell` (`dayStates`), `ProjectsTable` (`items`, `unit`,
`onUnitChange`, `onExtend`), `ActivityFeed` (`items`), and the four charts (§10). Each
block takes **its own query result** as a prop and renders its own four states, so a
failure in one never blanks the page (design §3.7).

**`components/project/`** — `ProjectProgress` (`progress: ProjectProgress`, `unit`);
`PlanModal` (`project`, `mode: "create"\|"extend"`, `open`, `onOpenChange`), which shows
the computed finish line from `lib/dates.addWorkingDays` (the one place the client does
working-day arithmetic; it is a preview, the server's `daysLeft` is the figure).

**`components/user/`**, **`holiday/`**, **`auth/`** — modal forms and table configs as in
§9; each owns its mutation and takes `open` / `onOpenChange`.

### 8.4 The four states — `QueryView`

Every list, table, panel and chart wraps its body in `QueryView` so the four designed
states (design §11 rule 10) are not re-invented per page:

```jsx
<QueryView
  query={reviewDeskQuery}              // a TanStack result — passed in, never imported
  skeleton={<TableSkeleton rows={6} />}
  isEmpty={(data) => data.items.length === 0}
  empty={filters.activeCount ? emptyFiltered : emptyNew}   // the page decides which empty it is
  error={<InlineError … onRetry={reviewDeskQuery.refetch} />}
>
  {(data) => <ReviewDeskTable … />}
</QueryView>
```

| State | When |
| --- | --- |
| Skeleton | `query.isPending` — first load only; layout-matched, never a spinner |
| Empty | `isEmpty(data)`; the caller chooses *new* vs *filtered* by `activeCount` |
| Error | `query.isError`; the filter bar and headers stay live around it |
| Content | otherwise; dimmed with `aria-busy` while `isFetching` over placeholder data |

---

## 9. Pages — data flow

Each entry gives: **route · guard**, **URL state**, **queries**, **mutations**, **local
state**, and the decisions that are not in the design system. Component names are from
`project_structure.md` §3.1.

### 9.1 This week — `/` · signed in

**URL:** `week` (default current), `day`, `unit` (the My projects toggle).

**Queries**

| Hook | Enabled | Used for |
| --- | --- | --- |
| `useWeek(me, weekKey)` | always | the strip, day panel, correction panel, report panel |
| `useMyTasks()` | the composer is open | task picker |
| `useProjects({ mine: true })` | always | My projects panel; the new-task project list falls back to `useProjects({ status: "active" })` |
| `useHolidaysForWeek(weekKey)` | always | holiday names in the strip and the leave/holiday line |
| `useOnLeave()` | `isCurrentWeek` | the "On leave: …" names |
| `useMyReports({ limit: 20, sort: "weekKey", dir: "desc" })` | always | recent weeks — **show the first five** (`limit` allows only 20/50/100; **FA7**) |
| `useReportSummary(weekKey, month)` | always | the personal strip |
| `useMarkSeen(report?._id)` | `report` exists | §9.4 |

**Mutations:** `usePutDay` (inside `DayPanel`), comment actions (inside `CommentThread`),
`useSetLeave` (the "You're on leave — Turn off" button).

**Decisions**

- **The top-bar primary action is derived**, not stored: `lib/weekActions.js`
  `deriveWeekAction(week, me, today)`, in this priority order — status `needs_correction`
  → *Fix and resubmit*; status `submitted` or `approved` → none; the earliest `missing`
  expected day → *Fill in {Weekday}*; today expected and not posted → *Post today's
  update*; every expected day posted → *Review and submit*. The first two navigate to
  `/reports/:week/edit`; the middle two select that day in the strip.
- **"On leave: …" is shown only for the current week.** `U10` returns who is on leave
  *now*; showing it under a past week would state something false. Holidays are shown for
  any week. *(Call, FA8.)*
- **Initial selected day:** today if the week is current, else the earliest missing, else
  Monday (`useWeekdayParam`).
- **Empty (nothing ever):** `week.report === null` and `useMyReports` total 0 → the
  design's single panel; the other panels are not rendered.
- **Frozen weeks:** a `submitted`/`approved` report renders posted days read-only; comments
  and resolutions still work.
- `DayDraftsProvider` wraps this page's content so drafts survive day switches.

### 9.2 Team updates — `/updates`

**URL:** `week`, `day`, `project`, `blockers` (`1`).
**Queries:** `useTeamUpdates(weekKey, weekday, { project, blockersOnly })`,
`useHolidaysForWeek`, `useProjects({ status: "active" })` for the filter.
**Mutations:** comment actions, `useResolveBlocker`, `useTeamComments` — all inside
`PersonUpdate`.

- `DayTabs` disables holidays (name in a tooltip) and **future days** — a future day would
  list everyone as "Not posted yet", which is noise. Default day: today, or Friday on a
  weekend.
- Entries arrive sorted by name with the viewer first (R12); the page does not re-sort.
- A name links to `/people/:userId/reports/:week` (to `/reports/:week` for yourself).
- Each `PersonUpdate` shows its thread through `Day.canComment`; the closed-to-teammates
  line appears when `canComment` is false and the day is posted.

### 9.3 The weekly form — `/reports/:week/edit`

**Queries:** `useWeek(me, weekKey)`. **Mutations:** `useSaveContent` (via `useAutosave`),
`useSubmitReport`. The design of the form is §6.4; the page contributes the routing rules:

- `week.report === null` → replace to `/?week=…` (there is nothing to write yet; days
  create the report).
- Status `submitted` or `approved` → replace to `/reports/:week`.
- Status `needs_correction` → the form, with `Resubmit` and the `CorrectionPanel` above
  section 01.
- The week never changes inside the form; the top bar has no week picker (design §6.5,
  "disabled once a report has been submitted").

### 9.4 A week in full — `/reports/:week` and `/people/:userId/reports/:week`

**Queries:** `useWeek(userId, weekKey)`; `useRevisions(report._id)` and
`useRevision(report._id, n)` only when `report.contentSource !== "withheld"`;
`useMarkSeen(report._id)`. **Mutations:** resolve, team-comments, comment actions.

**What renders is decided by the response, not by the role alone:**

| `report` / `contentSource` | Viewer | Renders |
| --- | --- | --- |
| `null` | any | "No report for week 31." with `Back` (not an error) |
| any, `content === null`, viewer is a teammate | a member who isn't the author | days + the `--tint` note "Weekly reports are shared with managers only." |
| any, `content === null`, `status === "draft"` | manager or admin | days + "Weekly report not submitted yet." |
| `"revision"` | manager or admin on a `needs_correction` report | the document from the sent-back revision + the `--tint2` banner |
| `"live"` | the author, or a manager on a submitted week | the document |

Errors: `REPORT_FORBIDDEN` → the page's 403 line; `USER_NOT_FOUND` → `NotFoundPage`.

- **`useMarkSeen` fires once per mount** after the week has loaded. It invalidates
  `newMarks`, `reports` and `reviewDesk` — **not `week` or `report`**. That is the point:
  the page keeps showing the "new" markers it loaded with, so the person can see *what* is
  new; they are gone next time. (`tech_stack.md` §6.3 says opening a week invalidates
  `newMarks` — this is what that means for the open page. *FA11.*)
- **Revision view:** selecting a version sets local state; the document renders
  `RevisionsRail`'s `useRevision` result with a "Viewing rev 2 — sent back" banner and a
  `Back to current` button.
- **Edit report** appears in the top bar for the author when status is `draft` or
  `needs_correction`.
- **Print:** a `@media print` stylesheet only — no component logic (design §3.4).

### 9.5 My reports — `/reports`

**URL:** `status` (list), `project`, `weekFrom`, `weekTo`, `sort`, `dir`, `page`, `limit`.
**Queries:** `useMyReports(apiParams)`; `useProjects({ status: "all" })` for the filter.
Row click: Draft and Needs-correction rows open `/reports/:week/edit`, others
`/reports/:week`; a "new" dot from `row.isNew`. `Tasks` is `tasksDone / taskCount`.

### 9.6 Review desk — `/review`

**URL:** `approval` (`requested` default · `all`), `person`, `project`, `role`, `weekFrom`,
`weekTo`, `sort`, `dir`, `page`, `limit`.
**Queries:** `useReviewDesk(apiParams)`; the person filter's options from
`useUsers({ limit: 100 })` (U1 is open to managers); the project filter's from
`useProjects({ status: "all" })`. See **G3** on the person list.

Row click → `/review/:reportId` with `state: { deskSearch: location.search }`. The
self-review guard is the server's (V3 never returns your own); the page does nothing to
filter. **Empty — nothing asked** vs **empty — filtered** is `activeCount > 0`, and
`approval` counts as a filter only when it is `all`.

### 9.7 Review page — `/review/:reportId`

**Queries:** `useReport(reportId)` (`R4`), `useRevisions(report._id)`,
`useMarkSeen`. **Mutations:** `useApprove`, `useSendBack`, `useCommentOnWeek`, plus
thread replies.

- **Self-review.** `week.user._id === me._id` → render `ReportDocument` read-only with the
  `--tint` strip; **no action panel in the tree**.
- **Not reviewable.** Status other than `submitted` → the action panel is replaced by the
  outcome block ("Approved by Ruwan P. at 10:22", from the current revision's
  `reviewedBy` / `reviewedAt`), and comments stay possible.
- **The revision the reviewer read is pinned.** `readRevision` is `useState(report.revisionNumber)`
  on first render and changes only when the person chooses `Reload`. Both `Approve` and
  `Send back` send it. If a later refetch shows `report.revisionNumber !== readRevision`
  the panel shows a `--tint2` banner — "{Name} submitted a new version. Reload to review
  it." — and disables both buttons, **keeping the textarea**. `409 REPORT_STATE_CHANGED`
  produces the same banner.
- **One textarea, three actions** (design §3.6): `Approve` (comment optional) →
  `useApprove({ revisionNumber, comment? })`; `Send back` (≥10 characters, confirm modal
  showing the comment back) → `useSendBack`; `Comment only` (required) →
  `useCommentOnWeek({ text })`, which clears the textarea and leaves the panel in place.
- **After approve or send back:** the panel becomes the outcome block with
  `Next in review desk`. The link is built by `useNextInQueue(currentId)`, which
  `fetchQuery`s the review desk list (page 1, oldest first, with the filters from
  `location.state.deskSearch` if present) and takes the first item that is not the current
  report. None → the link goes to `/review`, which renders its empty state.
- The action failure is **inline above the buttons** with the text preserved — never a
  toast alone.

### 9.8 Team dashboard — `/team`

**URL:** `week`, `person` (list), `project`, `status` (list, **team table only**),
`page`, `limit`, `sort`, `dir`, `trendWeeks` (4·8·12), `trendPerson`, `unit`.

| Block | Hook (endpoint) | Filters sent |
| --- | --- | --- |
| Metric strip | `useDashboardSummary` (D1) | `weekKey`, `person`, `project` |
| Team table | `useDashboardTeam` (D2) | the above **+ `status`, `page`, `limit`, `sort`, `dir`** |
| Projects table | `useDashboardProjects` (D8) | `weekKey` |
| Tasks completed trend | `useDashboardTrend` (D3) | `endWeek = weekKey`, `weeks = trendWeeks`, `trendPerson`, `person`, `project` |
| Hours by task type | `useDashboardHours` (D4) | `weekKey`, `person`, `project` |
| Workload by project | `useDashboardWorkload` (D5) | the same |
| Recent activity | `useRecentActivity` (D6) | none — **not week-scoped** |

- **`status` is deliberately absent from every block but D2**: it must not reach the
  metric strip (`requirments_doc.md` §6).
- **Each block is its own query and its own `QueryView`.** One failing leaves the rest.
- Project filter options come from `useProjects({ usedInWeek: weekKey })` (P1), so an
  inactive project that was used that week is still filterable. Person options come from
  `useUsers({ limit: 100 })` — see **G3**.
- Row click: a `submitted` row by someone else → `/review/:reportId`; otherwise
  `/people/:userId/reports/:week`.
- Extend plan (row menu) opens `PlanModal` in `extend` mode.

### 9.9 Person profile — `/people/:userId`

**Queries:** `useUser(userId)` (U2), `usePersonMetrics(userId)` (D7),
`useUserReports(userId, apiParams)` (U7; URL: `status`, `weekFrom`, `weekTo`, `sort`,
`dir`, `page`, `limit`). **Mutations:** `useSetLeave`.
Rows come back as `ReportRow` or `WeekRow` (`_id: null`, status `not_started` · `on_leave` ·
`holiday_week`); a `WeekRow` renders its chip and `—`, and is **not** a link. A report row
opens `/people/:userId/reports/:week`; a Draft row opens with days and the "not submitted
yet" note (§9.4). The status filter offers the three derived states too. Admin-only `Manage` → `/users?q={email}`.

### 9.10 People — `/people`

**URL:** `q`, `role`, `project`, `status` (default `active`), `sort`, `dir`, `page`, `limit`.
**Query:** `useUsers(apiParams)`.
**The search override:** while `q` is non-empty the client **omits `status`** from the
request (`api_specification.md` U1), and if the response contains a status the filter
would have hidden, a `--tint` note reads "Showing matches in all statuses." The `status`
control still shows its value so clearing the search restores the filter.

### 9.11 Projects — `/projects`

**URL:** `unit`. **Queries:** `useProjects({ status: "active" })` (manager fields),
`useUsers({ status: "active", limit: 100 })` for the people multi-select.
**Mutations:** `useCreateProject`, `useUpdateProject`, `useSetPlan`, `useDeactivateProject`.
`PlanModal` previews the finish with `lib/dates.addWorkingDays(start, plannedDays,
holidays)` using `useHolidays` for the years the span crosses; `Earlier plans` come from
`project.progress.planHistory`. Delete is a `ConfirmDialog` stating the real task count
(from `taskCount`) and calls `deactivateProject`.

### 9.12 Users — `/users`

**URL:** `role`, `status`, `q`, `page`, `limit`, `sort`, `dir`.
**Query:** `useUsers(apiParams)`; `useProjects({ status: "active" })` for the invite form.
**Mutations:** every U-mutation in §5.7.

- **Row menu items and their gates** come from one function,
  `lib/permissions.userActions(me, target)` → `{ canChangeRole, canEditEmail,
  canResetPassword, canRemove, canMakeOwner, canToggleLeave, canReissue }` plus the tooltip
  text for each disabled item. It encodes `requirments_doc.md` §11.2–§11.3 (admins act on
  members and managers; only the owner on admins; nobody on the owner; no one on
  themselves) and is the only place that rule exists on the client.
- **The link state** (invite, re-issue, reset): the modal does not close on success; it
  swaps its body for the URL block, `Copy link` (`navigator.clipboard`, reading `Copied`
  for 900 ms, no toast) and `Done`. The URL is **component state only**.
- **Inline role change** uses the optimistic path of §5.7; the disabled self-row carries
  "You can't change your own role."
- `Invited` rows show `Invited · expires {date}` from `linkExpiresAt`, and `Invite
  expired` once past.
- **Not built:** the selection column and toolbar of design §5.4 — no bulk endpoint
  exists (**FA6**).

### 9.13 Holidays — `/holidays`

**URL:** `year`. **Query:** `useHolidays(year)`. **Mutations:** create, update, delete.
The delete confirm names the effect: "Everyone will be expected to post an update on {date},
and project plans will count it as a working day." `HOLIDAY_EXISTS` → field error on date.

### 9.14 Account — `/account`

**Queries:** none beyond `Me`. **Mutations:** `useUpdateMe`, `useChangePassword`,
`useSetLeave` (on yourself). **Local:** theme via `useTheme`.
The email line is chosen by `lib/permissions.emailChangeHint(me)` — owner / admin /
member-or-manager — using `Me.owner.name` and `Me.owner.email` for the `mailto:` and the
selectable address. A password change calls `signIn(token, user)` with the response so the
current session survives while every other one ends.

### 9.15 Sign in, sign up, accept invite, reset password

Under `AuthLayout`, no shell. *(Owner decisions, auth pages 2026-10-17: the brand panel on the
left and the form on the right from 1024px, the form first in the DOM; the panel's sample week
loops on one timer, paused while the tab is hidden or the panel is out of view, and not at all
under reduced motion — `product_design_system.md` §3.12, §8.5 entry 32. Round four: each screen
names the panel's line through `AuthIntroContext` (`components/auth/authIntro.js`, provided by
`AuthLayout`): `AuthScreen`'s `intro` sets it, and `LinkExpired` / `ResponseLost` override it while
they show — which also lays the screen out as a short one.)*

| Screen | Data |
| --- | --- |
| `/signin` | `useLogin` → `signIn`, then `navigate(location.state?.from ?? "/")`. "Forgot your password?" opens a static panel. `useBootstrapStatus()` (cached A1): only when `available: true` does "No team here yet? Create the owner account" link to `/signup`; pending or failed, nothing is offered. It is the same bootstrap check the landing page uses (§9.16), asked here only for that link *(owner decision, auth pages 2026-10-17; accepted in the PR #27 review)* |
| `/signup` | `useBootstrapStatus()`: `available` → the form (`useSignUp`); otherwise the closed state with `Open the demo` — a plain `<a href="/demo">` |
| `/invite/:token` | `useLinkPreview(token)` on mount → role and email read-only, name + password form → `useAcceptLink`; `LINK_INVALID` → the single expired-link block — unless an earlier try in this visit got no response (`error.isNetwork`), then the "may already have been created" block (`ResponseLost`; `lib/authRecovery.js`) *(owner report, 2026-10-17)* |
| `/reset/:token` | the same, without the name field ("Your new password may already have been saved.") |

**A lost answer (owner report, 2026-10-17).** `/signup`: when `useSignUp` fails with no
response, the page keeps the email, re-fetches A1, and if sign-up is now closed — by that
re-check, or by `SIGNUP_CLOSED` on the next press — shows `ResponseLost` instead of the
invite-only state; a failed re-check keeps the form. `ResponseLost`'s `Sign in` passes the
email in router state; `/signin` uses it as the email field's default. The choice of screen
is `lib/authRecovery.js`, pure and tested.

**Link tokens (rule 7).** The token is read from `useParams`, sent in a body (A7, then A8),
and kept in component state — not in a query key's returned data, a form default, or any
storage. `useLinkPreview` has `gcTime: 0`. The `Referrer-Policy: no-referrer` header on
the client (§14 **FA12**) keeps the URL from leaking to the one third party the page loads
(Google Fonts). Accepting a link as a different person than any current session clears the
query cache first.

### 9.16 The landing page — `/` signed out

`useBootstrapStatus()` chooses the primary call to action (`requirments_doc.md` §13).
**While it is pending, and if it errors, the page shows the demo as primary and renders no
signup link** — the common deployed case — and swaps to "Create your account" only if
`available: true` arrives. A visitor never waits on a sleeping API to see a button, and
never sees a button that leads to a closed door. *(Call, FA14.)* Only when `available: false`
arrives does the hero add "Already on a team? Sign in" (`brand_design_strategy.md` §6.0 rule 13;
owner decision, auth pages 2026-10-17). "See the live demo" is
`<a href="/demo">`. All marketing content is static.

**The landing page is a different look from the app** (`brand_design_strategy.md` §6.0), and
the code keeps it that way:

- **Source:** `landing-reference/index.html` is built and is the reference.
  Port it to `LandingPage` + `components/marketing/`, its CSS to `styles/landing.css`, and
  its inline script to `hooks/useLandingMotion.js` (reveals, split headings, counters,
  scroll scenes; a no-op under `prefers-reduced-motion`). Keep its copy — except where the
  owner has since changed it: the section order, the copy and the two guided scroll stories
  are `brand_design_strategy.md` §6.0 rule 10; the centred layout, the GSAP motion and the
  footer are rule 11. GSAP is imported by `useLandingMotion.js` only (`tech_stack.md` §10),
  inside one `gsap.matchMedia()` that is reverted on unmount.
- **Scoped, never global:** every landing rule sits under a `.landing` root and every
  landing token is prefixed (`--l-*`), so none can reach the app. `landing.css` is imported
  by `LandingPage` alone, so it ships in the landing chunk and is never loaded when a
  signed-in person opens the app.
- **Own typeface:** on mount `LandingPage` adds the Bricolage Grotesque stylesheet link and
  removes it on unmount. The product's three families stay in `index.html`.
- **Ignores the theme toggle:** `data-theme` has no effect on `.landing`. While it is
  mounted `<html>` gets a `landing-active` class so the overscroll and the area behind
  the page are green, not `--paper`.
- **Mock-ups use the product palette** (v11's `--u-*` values are the product tokens
  restated); they may keep v11's markup, but if the product tokens change they change with
  them.
- **The demo is not the landing page.** `/demo`'s chooser, bar and every page behind it use
  the product theme.
- **To add:** v11 only has "See the live demo". Add the `useBootstrapStatus` swap to
  "Create your account" described above.

### 9.17 System states

`NotFoundPage` and `ForbiddenPage` render in the shell when signed in (they are children of
`SessionLayout`) and standalone otherwise. A page-level React error boundary in
`RootLayout` renders the 500 state — an `InlineError` with `Try again` that resets the
boundary — so one broken page leaves the shell usable (design §3.13).

### 9.18 The demo chooser — `/demo`

`DemoEntryPage` (inside `IndexRoute` when `isDemo` and signed out). Three choices; picking
one calls `demo.setPerspective("member" | "manager" | "admin")`, then `signIn(null, me)`
with the `Me` the adapter returns for that person, then navigates to `/`.

---

## 10. Charts

Recharts, configured to design §7.3 and §7.5. The configuration lives in one place so the
four charts cannot drift.

`lib/chartTheme.js` (strings only, no React):

```js
export const typeColor = {           // the seven task types → tokens, never hex
  development: "var(--c1)", testing: "var(--c2)", meetings: "var(--c3)",
  documentation: "var(--c4)", review: "var(--c5)", research_study: "var(--c7)", other: "var(--c6)",
};
export const gridProps = { vertical: false, stroke: "var(--hair)" };
export const tickProps = { fontFamily: "var(--font-mono)", fontSize: 11, fill: "var(--mut)" };
export const axisLineProps = { stroke: "var(--hair2)" };   // X baseline only; no Y axis line
```

SVG presentation attributes accept `var(--token)`, so the theme switch needs no chart
re-render.

| Concern | Rule |
| --- | --- |
| Heights | Fixed (`260` trend, `240` bars) on `ChartContainer`; charts never size themselves |
| Legend | Recharts' default is **off**; `ChartContainer` renders the legend in its header from the series list |
| Tooltip | `content={<ChartTooltip/>}` — a component of ours, never the library's |
| Animation | `isAnimationActive={hasMounted}` (`useHasMounted`), so data changes ease over 320 ms and the mount does not animate (design §8.2 #17, §7.5) |
| Empty | Axes render, "No data for week 38." centred |
| Text equivalent | `ChartContainer` takes a `summary` prop and renders it visually hidden — the data as a short table. *(Call, FA15.)* |
| Ticks | Y at most 4; X as in design §7.3 |

| Chart | Data | Notes |
| --- | --- | --- |
| `TasksTrendChart` | D3 `{ weeks, team, person }` | Line; one team series, optional person series; the window Select (4/8/12) writes `trendWeeks`; the person Select writes `trendPerson` |
| `HoursByTypeChart` | D4 `{ items, total }` | Horizontal bars, seven rows in fixed order, value in mono at each end |
| `WorkloadByProjectChart` | D5 `{ items }` | Horizontal stacked bar, one row per project, segments by task type |
| `ActivityFeed` | D6 `{ items }` | Not a chart — `44px` rows; verbs `submitted` / `approved` / `sent back`; **no "All activity"** |

No pie or donut anywhere.

---

## 11. The demo, from the client's side

`tech_stack.md` §6.9 specifies the mechanism; `requirments_doc.md` §14 specifies the
experience. This section is what the *client* must do so that the adapter can stand in for
the API without a single page knowing.

### 11.1 Routing

`/demo` and everything under it is a second router built from the same `buildRoutes()`
with `basename: "/demo"` and the `realOnly` routes removed:

```js
export const createAppRouter = ({ demo }) =>
  createBrowserRouter(demo ? buildRoutes({ withoutRealOnly: true }) : buildRoutes(),
                      demo ? { basename: "/demo" } : undefined);
```

Inside it, `Link to="/team"` renders `/demo/team` and `navigate("/")` goes to `/demo`
without any page knowing — the pages are the real ones. `IndexRoute` renders
`DemoEntryPage` for a signed-out demo visitor; `useAuth().signInPath` is `"/"` (the
chooser), so `ProtectedRoute` sends the signed-out there.

**A refresh anywhere under `/demo` returns to the chooser**: the store and the chosen
perspective are in memory, so the page boots signed out. That is the literal reading of
"refreshing the page returns everything to its starting state" (§14 **FA1**).

### 11.2 Behaviour

| Concern | Decision |
| --- | --- |
| Install | `bootDemo()` builds the store from `fixtures.js` and sets `apiClient.defaults.adapter = createDemoAdapter(store)` |
| Perspective | `store.session.userId`. Switching sets it and then `queryClient.clear()` and navigates to `/`; a comment posted as the manager is already in the store when the member's queries run |
| Start over | `window.location.assign("/demo")` — a fresh load, a fresh store |
| Latency | Each handler resolves after about 150 ms so the designed loading states are seen |
| Errors | Rule violations return the real envelope and code (self-review `403`, an expired 10-minute window `403 EDIT_WINDOW_CLOSED`, a duplicate holiday `409`). The adapter **must reject** for status ≥ 400 (`tech_stack.md` §6.9 — FA16), or the pages' error paths are never exercised |
| What is not demonstrated | Sign in, sign out and email-based flows: the link state shows a sample URL and "In the real product, you'd send this link to the person." |

### 11.3 What the pages may and may not do

- **No page checks `isDemo` for data.** The three presentation exceptions are the demo
  bar, the `SAMPLE DATA` pill (`Panel` adds it from `useIsDemo()`), and the hidden Sign out
  item.
- **The adapter computes every derived field the API computes** — `WeekView.expectedDays`,
  `dayStates`, `state`, `tasks`, `hoursByType`, `contentSource`, `canSubmit`,
  `Day.hours`/`canComment`, `Thread.editableUntil`/`isNew`, the `N1` counts, the `R12` feed
  and `D1`–`D8` — because the pages read them. A page that works against the real API and
  breaks in the demo is a **demo bug**, not a reason for the page to special-case.
- **Dates are relative** to when the demo starts, so the current week always contains
  every state — the same rule `database_schema.md` §8 sets for the development seed.

### 11.4 What must react to a demo action

Everything on the list in `requirments_doc.md` §14 acts on the store: post and edit a
day, comment, reply, edit and delete within the window, submit, approve, send back, open an
update to team comments, resolve a blocker, add a project, extend a plan, add a holiday,
mark leave, make someone owner. Aggregates that read from those — the team table's day
strip, hours by type and workload, the review desk and its count, comment counts, project
days used — are **recomputed from the store**, not hard-coded.

### 11.5 The one client test it needs

`demo/__tests__/demoCoverage.test.js` imports every service module, calls every exported
function against the demo adapter with fixture arguments, and asserts the result matches
the shape its hook reads (the keys the pages use, not a full schema). It fails when a
service gains an endpoint the demo doesn't answer — which is what keeps the demo honest
(`project_structure.md` §3.4).

---

## 12. Accessibility and performance

**Accessibility** (beyond the component specs):

- Landmarks: `<header>` (top bar), `<nav>` (sidebar), `<main>`; the skip link is the first
  focusable element (design §1.7).
- **Route changes:** after navigation, focus moves to the page's `<h1>` (or `<main>` when
  there is none) with `tabIndex={-1}`, and `document.title` updates — a screen-reader user
  hears that the page changed.
- The week strip is a `tablist`; posted/missing/leave/holiday states each have a text
  equivalent, not just colour (design §13). The team table's updates cell has the visually
  hidden "Posted Mon, Tue; missing Wed" string.
- Live regions: the autosave indicator (`polite`), toasts (`status` / `alert` per design
  §6.12), and the inline error areas under composers (`role="alert"` when they appear).
- Dialogs trap focus and return it to the trigger (Radix does this; do not override it).
- Colour is never the only signal: statuses carry their word, key items the `Key` label.
- `prefers-reduced-motion` is honoured through `MotionConfig` and the CSS `@media` block
  (design §8.3).

**Performance:**

- Route-level `lazy()`; `recharts` and `motion` in vendor chunks (§4.1).
- Paginated lists keep their previous page while the next loads.
- The weekly form is the hardest screen: `useFieldArray` rows are memoised components and
  the task rows read `taskStates.<id>.*` through `Controller`, so typing in one note never
  re-renders another row. Autosave is debounced; a flush on blur sends at most one request.
- Query data is not copied into state; derived values are computed in render, memoised only
  where a profile shows a cost.
- The app polls nothing: `newMarks` and the review-desk count refetch on window focus,
  never on a timer (`api_specification.md` N1).

---

## 13. Build order and verification

### 13.1 Build order

`product_design_system.md` §12 orders the *visual* build. This adds the data layer and
puts the demo handlers beside the features instead of last, so the coverage test never
becomes a cliff.

1. Tokens, `@theme`, fonts, the `/design` route (design §12 step 1).
2. `lib/`: `cn`, `constants`, `statusMaps`, `dates`, `format`, `urlParams`, `queryKeys`,
   `tokenStore`, `authEvents`, `normalizeError`, `errorCopy`; the constants parity test.
3. `apiClient` + `api`; `authService`; `AuthProvider`, boot, `ProtectedRoute`; the auth
   screens (design §12 step 3). **Demo handlers for auth, `Me` and the chooser.**
4. Base `ui/`: Button, Input, Field, Select, Textarea, Checkbox, Switch, StatusChip,
   Panel, Modal, ConfirmDialog, Toaster, Tooltip, InlineError, Skeleton, EmptyState,
   Avatar.
5. The shell: `AppShell`, `Sidebar` + `navItems`, `TopBar` + `PageHeader`, theme, drawer.
6. `Table`, `Pagination`, `FilterBar`, `MultiSelect`, `QueryView`, `useUrlFilters`.
7. **Weeks:** `reportService`, `useWeek`, `ReportDocument`, the read-only detail page,
   comment components. *Demo handlers for weeks and comments.*
8. **Writing:** `WeekStrip`, `DayPanel`, `Combobox`, `TaskPicker`, `projectService` /
   `taskService`, the This week page. *Demo handlers for days, tasks, projects.*
9. **The weekly form:** `ReportForm`, `useAutosave`, the rail, the action bar, submit.
10. Report history, team updates, review desk, review page.
11. Dashboard blocks, then charts. *Demo aggregates.*
12. Projects, Users, Holidays, People, Profile, Account, leave. *Demo handlers.*
13. `N1` markers and `R13`; system states; print stylesheet.
14. The demo chooser, `DemoBar`, the `SAMPLE DATA` pill; run the coverage test; the
    landing page.

### 13.2 Verification — architecture

In addition to design §13 and `development_approach_doc.md`'s end-to-end walkthroughs:

- [ ] `grep -rn "axios" client/src` matches only `services/apiClient.js` and `demo/`.
- [ ] No file in `components/ui/` imports from `services/`, `hooks/` or `context/`.
- [ ] No query-key array literal appears outside `lib/queryKeys.js`.
- [ ] No `isDemo` in a page or composed component other than the three presentation
      cases of §1.2.
- [ ] Typing in the weekly form while a refetch lands (invalidate the week from the
      devtools) changes nothing in the form.
- [ ] Switching between two days of the day panel keeps unposted text; a hard reload loses
      it and prompts before closing the tab.
- [ ] Opening a week that has new activity shows the markers once; reopening it shows none.
- [ ] A comment edit attempted after 10 minutes shows the inline message and the buttons
      disappear — with the client clock moved either way.
- [ ] A `409` on approve (resubmit the report from another session) shows the banner and
      keeps the textarea.
- [ ] A reset or invite link appears in one response only: not in React Query devtools'
      cache after closing the modal, not in `localStorage`, not in the URL.
- [ ] Expire the token mid-edit: the modal opens, the weekly form keeps every value, and
      after sign-in the next autosave succeeds.
- [ ] Boot with a stale token goes to `/signin` with no modal flash; boot with the API
      down keeps the token and shows the retry state.
- [ ] `/demo` works with the network disconnected; a refresh returns to the chooser;
      every service function passes the coverage test.
- [ ] A member typing `/review`, `/team`, `/users` sees the 403 state in the shell; the
      forbidden nav items are absent from the DOM.
- [ ] The `status` URL parameter on `/team` changes the team table and nothing else.

---

## 14. Decisions, flags and amendments

### 14.1 Calls made here — please confirm

| # | Call | Where |
| --- | --- | --- |
| **FA1** | **A refresh under `/demo` lands on the chooser**, because the perspective is in memory. Remembering it across a refresh would be friendlier but would make "refresh resets everything" untrue | §11.1 |
| **FA2** | `ProtectedRoute` renders `ForbiddenPage` rather than redirecting home. `tech_stack.md` §6.4 said redirect; design §3.13 and its checklist say a 403 state. **Applied to `tech_stack.md`** | §4.1 |
| **FA3** | `normalizeError` returns an `ApiError` with `httpStatus`, `fields`, `details` — richer than `{ message, code }`. **Applied to `tech_stack.md`** | §5.1 |
| **FA4** | A `lib/queryKeys.js` factory, extending the keys in `tech_stack.md` §6.3 and keeping their prefixes | §5.4 |
| **FA5** | Ten additions to `components/ui/` (§8.1) and the extra files in `project_structure.md` §3.1. **Applied to `project_structure.md`** | §8.1 |
| **FA6** | Design §5.4's selection column and toolbar are **not built** — no bulk endpoint exists for Users. The `Table` prop is reserved | §9.12 |
| **FA7** | "Recent weeks" shows five rows but must request `limit=20`, the smallest value the API allows. An API change (`limit=5`) would save 15 rows per page load — not needed now | §9.1 |
| **FA8** | "On leave: …" appears only for the current week, because `U10` is "who is on leave now". Past or future weeks show the holiday part only | §9.1 |
| **FA9** | After a successful submit, navigate to `/reports/:week` (the filed document) | §6.4 |
| **FA10** | The rail's "complete" rule for optional sections is "has content" | §6.4 |
| **FA11** | `useMarkSeen` does **not** invalidate the open week, so the person can see what was new | §9.4 |
| **FA12** | `client/vercel.json` gains `Referrer-Policy: no-referrer`, so `/invite/:token` and `/reset/:token` don't leak to Google Fonts. **Applied to `tech_stack.md` §7.2** | §9.15 |
| **FA13** | The "starting up" state has no design spec despite `tech_stack.md` §6.3 calling it designed. Proposed: the glyph alone, then after 3 s one `--mut` line — "Starting up. The server sleeps when idle; this can take up to a minute." Needs design sign-off | §3.5 |
| **FA14** | Landing CTA while `A1` is pending or failed: **demo primary, no signup link** | §9.16 |
| **FA15** | `ChartContainer` renders a visually hidden text summary of each chart's data | §10 |
| **FA16** | `tech_stack.md` §6.9's adapter snippet returned a response object for any status, so a 4xx would resolve as success and the error paths would never run. It must throw an `AxiosError` for status ≥ 400. **Applied to `tech_stack.md`** | §11.2 |

### 14.2 Gaps in other documents — not fixed here

| # | Gap | Suggested owner |
| --- | --- | --- |
| **G1** | **Week-thread permissions have no server flag.** `Day.canComment` exists, but week comments don't expose "may start" or "may reply". The client derives them (`manager/admin, not the author, not a Draft` to start; the author or a manager or admin to reply). An API field `Report.canCommentOnWeek` would remove the duplicate rule | `api_specification.md` |
| **G2** | `U10` returns people on leave *now*, so the leave strip can't be shown for another week (FA8). A `weekKey` parameter would fix it | `api_specification.md` |
| **G3** | The dashboard and review-desk person filters should list people on the team **during the week shown** (`database_schema.md` §10, decision 3), but `U1` filters by current status only. Interim: `useUsers({ limit: 100 })`, which includes people who have since left and offers some who weren't on the team that week. A `weekKey` filter on `U1` — or a lightweight "people in week" endpoint — would close it | `api_specification.md` |

### 14.3 Amendments applied alongside this document

| Document | Change |
| --- | --- |
| `tech_stack.md` | §6.2 `normalizeError` shape (FA3); §6.4 `ProtectedRoute` renders the 403 state (FA2); §6.9 adapter throws for status ≥ 400 (FA16); §7.2 `vercel.json` `Referrer-Policy` header (FA12) |
| `project_structure.md` | §3.1 tree gains the files in §8.1, `lib/` (`queryKeys`, `tokenStore`, `authEvents`, `permissions`, `submitChecklist`, `weekActions`, `format`, `errorCopy`, `formErrors`, `urlParams`, `chartTheme`, `queryClient`), `hooks/` (`useWeekParam`, `useAutosave`, `useNow`, `useMediaQuery`, `useOnlineStatus`, `useUnsavedGuard`, `useDocumentTitle`, `useActiveSection`, `useHasMounted`, `usePermissions`), `context/` (`UnsavedChangesContext`, `DayDraftsContext`, `PageChromeContext`), `components/shell/` (`PageHeader`, `AppBootSplash`, `OfflineStrip`, `ReAuthModal`, `navItems.js`), `routes/` (`SessionLayout`, `IndexRoute`, `PublicOnly`), `layouts/RootLayout`, `demo/bootDemo.js`; `apiClient.js` exports `api`; §10's provisional row for this document is closed |
| `product_design_system.md` | §12 step 12 and the §13 demo bullet described a read-only demo with server-side refusal; both rewritten for the client-side demo |
