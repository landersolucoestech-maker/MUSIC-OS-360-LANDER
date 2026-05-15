import { createRoot } from "react-dom/client";
import * as Sentry from "@sentry/react";
import posthog from "posthog-js";
import App from "./App.tsx";
import "./index.css";
import { MOCK_MODE } from "@/shared/lib/env";

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
