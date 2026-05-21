import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import posthog from "posthog-js";
import App from "./App";
import "./index.css";
import { MOCK_MODE, validateFrontendEnv } from "@/shared/lib/env";

// Validate required env vars before mounting anything.
// Returns false and renders an error page in production if vars are missing.
if (!validateFrontendEnv()) {
  // Halt — error page already injected into #root.
  throw new Error("Missing required environment variables — see console for details.");
}

// ── Sentry (error monitoring) ─────────────────────────────────────────────
if (!MOCK_MODE && import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn:         import.meta.env.VITE_SENTRY_DSN as string,
    environment: import.meta.env.MODE as string,
    release:     import.meta.env.VITE_APP_VERSION as string | undefined,
    tracesSampleRate:   0.1,
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate:  1.0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
  });
}

// ── PostHog (product analytics) ───────────────────────────────────────────
if (!MOCK_MODE && import.meta.env.VITE_POSTHOG_KEY) {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY as string, {
    api_host:        "https://app.posthog.com",
    capture_pageview: true,
    capture_pageleave: true,
    autocapture:      false,
    session_recording: { maskAllInputs: true },
  });
}

const root = document.getElementById("root")!;
createRoot(root).render(<App />);
