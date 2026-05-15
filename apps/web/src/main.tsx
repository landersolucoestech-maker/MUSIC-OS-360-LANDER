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

// ── Clerk (autenticação real — apenas quando a chave estiver configurada) ──
// Em MOCK_MODE=true a key pode não estar presente — o app funciona em modo
// standalone sem Clerk. Em produção, VITE_CLERK_PUBLISHABLE_KEY é obrigatória.

const CLERK_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
const useClerk  = !MOCK_MODE && Boolean(CLERK_KEY);

async function mount() {
  const root = document.getElementById("root")!;

  if (useClerk && CLERK_KEY) {
    const { ClerkProvider } = await import("@clerk/clerk-react");
    createRoot(root).render(
      <ClerkProvider publishableKey={CLERK_KEY}>
        <App />
      </ClerkProvider>
    );
  } else {
    createRoot(root).render(<App />);
  }
}

mount().catch((err: unknown) => {
  console.error("Falha ao montar a aplicação:", err);
});
