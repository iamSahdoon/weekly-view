import { lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";
import AuthLayout from "../layouts/AuthLayout.jsx";
import RootLayout from "../layouts/RootLayout.jsx";
import DevOnlyRoute from "./DevOnlyRoute.jsx";
import IndexRoute from "./IndexRoute.jsx";
import PublicOnly from "./PublicOnly.jsx";
import SessionLayout from "./SessionLayout.jsx";

// The route table (frontend_architecture.md §4.1). C1 holds the auth screens,
// "/" and /design; C2 adds the shell, guards by role, and every other path.
// Routes that make no sense in the demo carry handle.realOnly.

const SignInPage = lazy(() => import("../pages/SignInPage.jsx"));
const SignUpPage = lazy(() => import("../pages/SignUpPage.jsx"));
const AcceptInvitePage = lazy(() => import("../pages/AcceptInvitePage.jsx"));
const ResetPasswordPage = lazy(() => import("../pages/ResetPasswordPage.jsx"));
// Defined in development only, so a production build has no /design chunk.
const DesignPage = import.meta.env.DEV
  ? lazy(() => import("../pages/DesignPage.jsx"))
  : null;

const page = (element) => <Suspense fallback={null}>{element}</Suspense>;

export function buildRoutes({ withoutRealOnly = false } = {}) {
  const routes = [
    {
      element: <RootLayout />,
      children: [
        {
          element: <AuthLayout />,
          handle: { realOnly: true },
          children: [
            {
              path: "/signin",
              element: <PublicOnly>{page(<SignInPage />)}</PublicOnly>,
            },
            {
              path: "/signup",
              element: <PublicOnly>{page(<SignUpPage />)}</PublicOnly>,
            },
            { path: "/invite/:token", element: page(<AcceptInvitePage />) },
            { path: "/reset/:token", element: page(<ResetPasswordPage />) },
          ],
        },
        {
          element: <SessionLayout />,
          children: [{ index: true, element: <IndexRoute /> }],
        },
        import.meta.env.DEV && {
          path: "/design",
          element: <DevOnlyRoute>{page(<DesignPage />)}</DevOnlyRoute>,
          handle: { realOnly: true },
        },
      ].filter(Boolean),
    },
  ];
  return withoutRealOnly ? stripRealOnly(routes) : routes;
}

function stripRealOnly(routes) {
  return routes
    .filter((route) => !route.handle?.realOnly)
    .map((route) =>
      route.children
        ? { ...route, children: stripRealOnly(route.children) }
        : route,
    );
}

export const createAppRouter = ({ demo }) =>
  createBrowserRouter(
    demo ? buildRoutes({ withoutRealOnly: true }) : buildRoutes(),
    demo ? { basename: "/demo" } : undefined,
  );
