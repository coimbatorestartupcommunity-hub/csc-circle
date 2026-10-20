"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { SubmissionFeedbackHost } from "@/components/layout/submission-feedback-host";

/**
 * The public site is intentionally light-dominant (per brand guidelines), so we
 * force the light theme. This also gives sonner a stable theme without a toggle.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme="light"
      enableSystem={false}
      disableTransitionOnChange
    >
      {children}
      <Toaster position="top-center" richColors />
      <SubmissionFeedbackHost />
    </ThemeProvider>
  );
}
