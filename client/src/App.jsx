import { QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { useState } from "react";
import { RouterProvider } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext.jsx";
import { UnsavedChangesProvider } from "./context/UnsavedChangesContext.jsx";
import { queryClient } from "./lib/queryClient.js";
import { createAppRouter } from "./routes/index.jsx";

// Provider order is load-bearing (frontend_architecture.md §3.1).
export default function App({ demo = false }) {
  const [router] = useState(() => createAppRouter({ demo }));
  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <AuthProvider demo={demo}>
          <UnsavedChangesProvider>
            <RouterProvider router={router} />
          </UnsavedChangesProvider>
        </AuthProvider>
      </MotionConfig>
    </QueryClientProvider>
  );
}
