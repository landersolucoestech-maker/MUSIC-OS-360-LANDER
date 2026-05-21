import { lazy } from 'react';
import { Route, Navigate } from 'react-router-dom';
import type { SuspenseRouteComponent } from './types';

const ArtistWorkspaceLayout = lazy(() => import('@/modules/workspace/layouts/ArtistWorkspaceLayout'));
const ArtistOverview = lazy(() => import('@/modules/workspace/pages/ArtistOverview'));

export function workspaceRoutes(P: SuspenseRouteComponent) {
  return (
    <>
      <Route path="/workspace/artist/:artistId" element={<P><ArtistWorkspaceLayout /></P>}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<P><ArtistOverview /></P>} />
      </Route>
    </>
  );
}
