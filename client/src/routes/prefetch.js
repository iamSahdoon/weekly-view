import {
  AccountPage,
  SignInPage,
  SignUpPage,
  HolidaysPage,
  PeoplePage,
  PersonProfilePage,
  ProjectsPage,
  ReportDetailPage,
  ReportEditPage,
  ReportHistoryPage,
  ReviewDeskPage,
  ReviewPage,
  TeamDashboardPage,
  TeamUpdatesPage,
  ThisWeekPage,
  UsersPage,
} from "./pages.js";

// Load the route chunks a signed-in person is likely to open next, once the shell has
// painted and the browser is idle, so moving between pages neither waits on a chunk nor
// (in development) on Vite compiling its module graph. A page that has loaded renders
// without suspending (lazyPage). Failures are ignored: the route's own load tries again
// and shows its fallback meanwhile.

const everyone = [
  ThisWeekPage,
  ReportHistoryPage,
  ReportDetailPage,
  ReportEditPage,
  TeamUpdatesPage,
  AccountPage,
];
const managers = [
  ReviewDeskPage,
  ReviewPage,
  TeamDashboardPage,
  PeoplePage,
  PersonProfilePage,
  ProjectsPage,
];
const admins = [UsersPage, HolidaysPage];

const idle = (callback) =>
  typeof requestIdleCallback === "function"
    ? requestIdleCallback(callback, { timeout: 2000 })
    : setTimeout(callback, 300);

/** Starts the prefetch for `role`; returns a function that stops it. */
export function prefetchRoutes(role) {
  const pages = [
    ...everyone,
    ...(role === "manager" || role === "admin" ? managers : []),
    ...(role === "admin" ? admins : []),
  ];
  let stopped = false;
  const next = (i) => {
    if (stopped || i >= pages.length) return;
    idle(() => {
      if (stopped) return;
      pages[i]
        .preload()
        .catch(() => {})
        .finally(() => next(i + 1));
    });
  };
  next(0);
  return () => {
    stopped = true;
  };
}

/**
 * Signed out on the landing page: load the sign-in and sign-up screens while the browser is
 * idle, so its links open them inside the view transition with no wait (owner decision,
 * auth pages round six). Returns a function that stops it.
 */
export function prefetchAuthPages() {
  let stopped = false;
  idle(() => {
    if (stopped) return;
    SignInPage.preload()
      .then(() => SignUpPage.preload())
      .catch(() => {});
  });
  return () => {
    stopped = true;
  };
}
