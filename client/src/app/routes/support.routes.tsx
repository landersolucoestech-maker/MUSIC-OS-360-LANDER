import { lazy } from "react";
import { Route } from "react-router-dom";
import type { SuspenseRouteComponent } from "./types";

const SupportDashboard    = lazy(() => import("@/modules/support/pages/SupportDashboard"));
const SupportTickets      = lazy(() => import("@/modules/support/pages/SupportTickets"));
const SupportTicketDetail = lazy(() => import("@/modules/support/pages/SupportTicketDetail"));
const SupportKnowledge    = lazy(() => import("@/modules/support/pages/SupportKnowledge"));
const SupportChat         = lazy(() => import("@/modules/support/pages/SupportChat"));
const SupportStatus       = lazy(() => import("@/modules/support/pages/SupportStatus"));
const SupportRequests     = lazy(() => import("@/modules/support/pages/SupportRequests"));

export function supportRoutes(P: SuspenseRouteComponent) {
  return (
    <>
      <Route path="/support"               element={<P><SupportDashboard /></P>} />
      <Route path="/support/tickets"       element={<P><SupportTickets /></P>} />
      <Route path="/support/tickets/:id"   element={<P><SupportTicketDetail /></P>} />
      <Route path="/support/knowledge"     element={<P><SupportKnowledge /></P>} />
      <Route path="/support/chat"          element={<P><SupportChat /></P>} />
      <Route path="/support/status"        element={<P><SupportStatus /></P>} />
      <Route path="/support/requests"      element={<P><SupportRequests /></P>} />
    </>
  );
}
