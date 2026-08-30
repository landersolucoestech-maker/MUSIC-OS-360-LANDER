import { lazy } from "react";
import { Route } from "react-router-dom";
import type { SuspenseRouteComponent } from "./types";

// MusicChat: um único ponto de navegação (/chat) com dois tabs — Chat
// Interno (equipe <-> equipe) e Central de Atendimento (equipe <-> público
// externo). Cada domínio tem árvore de componentes/serviço/entidade
// próprios (ver modules/musicchat-interno e modules/musicchat/components);
// a página pai nunca monta os dois simultaneamente (sem Tabs forceMount).
const MusicChat = lazy(() => import("@/modules/musicchat/pages/MusicChat"));

export function chatRoutes(P: SuspenseRouteComponent) {
  return (
    <>
      <Route path="/chat" element={<P><MusicChat /></P>} />
    </>
  );
}
