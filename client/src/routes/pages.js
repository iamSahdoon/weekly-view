import { lazyPage } from "./lazyPage.jsx";

// Every routed page, each its own chunk (see lazyPage). The route table renders them and
// prefetch.js preloads them, so both name each page once.

export const SignInPage = lazyPage(() => import("../pages/SignInPage.jsx"));
export const SignUpPage = lazyPage(() => import("../pages/SignUpPage.jsx"));
export const AcceptInvitePage = lazyPage(
  () => import("../pages/AcceptInvitePage.jsx"),
);
export const ResetPasswordPage = lazyPage(
  () => import("../pages/ResetPasswordPage.jsx"),
);
export const ThisWeekPage = lazyPage(() => import("../pages/ThisWeekPage.jsx"));
export const ReportHistoryPage = lazyPage(
  () => import("../pages/ReportHistoryPage.jsx"),
);
export const ReportDetailPage = lazyPage(
  () => import("../pages/ReportDetailPage.jsx"),
);
export const ReportEditPage = lazyPage(
  () => import("../pages/ReportEditPage.jsx"),
);
export const TeamUpdatesPage = lazyPage(
  () => import("../pages/TeamUpdatesPage.jsx"),
);
export const AccountPage = lazyPage(() => import("../pages/AccountPage.jsx"));
export const ReviewDeskPage = lazyPage(
  () => import("../pages/ReviewDeskPage.jsx"),
);
export const ReviewPage = lazyPage(() => import("../pages/ReviewPage.jsx"));
export const TeamDashboardPage = lazyPage(
  () => import("../pages/TeamDashboardPage.jsx"),
);
export const PeoplePage = lazyPage(() => import("../pages/PeoplePage.jsx"));
export const PersonProfilePage = lazyPage(
  () => import("../pages/PersonProfilePage.jsx"),
);
export const ProjectsPage = lazyPage(() => import("../pages/ProjectsPage.jsx"));
export const UsersPage = lazyPage(() => import("../pages/UsersPage.jsx"));
export const HolidaysPage = lazyPage(() => import("../pages/HolidaysPage.jsx"));
// Defined in development only, so a production build has no /design chunk.
export const DesignPage = import.meta.env.DEV
  ? lazyPage(() => import("../pages/DesignPage.jsx"))
  : null;
