/**
 * Tipos compartilhados pelo sistema de rotas modular.
 */
import type { ReactNode } from "react";

/** Componente wrapper de Suspense/ErrorBoundary usado nas route configs. */
export type SuspenseRouteComponent = React.ComponentType<{ children: ReactNode }>;
