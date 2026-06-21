/**
 * Audiovisual / Video Production routes
 *
 * Módulo audiovisual unificado.
 * A rota principal /audiovisual renderiza diretamente a lista de projetos.
 * Rotas antigas permanecem apenas como redirects para evitar quebra de links salvos.
 */
import { lazy } from "react";
import { Route, Navigate } from "react-router-dom";
import type { SuspenseRouteComponent } from "./types";

const ProjectsListPage = lazy(() => import("@/modules/audiovisual/pages/AudiovisualProjectsList"));
const NewProjectPage = lazy(() => import("@/modules/audiovisual/pages/AudiovisualNewProject"));
const ProjectDetails = lazy(() => import("@/modules/audiovisual/pages/AudiovisualProjectDetails"));

export function audiovisualRoutes(P: SuspenseRouteComponent) {
  return (
    <>
      <Route path="/audiovisual" element={<P><ProjectsListPage /></P>} />

      <Route path="/audiovisual/dashboard" element={<Navigate to="/audiovisual" replace />} />
      <Route path="/audiovisual/projects" element={<Navigate to="/audiovisual" replace />} />

      <Route path="/audiovisual/projects/new" element={<P><NewProjectPage /></P>} />
      <Route path="/audiovisual/projects/:id" element={<P><ProjectDetails /></P>} />
    </>
  );
}
