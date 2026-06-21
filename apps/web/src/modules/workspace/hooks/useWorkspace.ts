import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/shared/lib/api-client';
import type { ActivityLogItem, WorkspaceContextValue, WorkspaceEntity, WorkspaceEntityType, WorkspaceTab } from '../types/workspace.types';

const ENTITY_ROUTE_MAP: Record<WorkspaceEntityType, string> = {
  artist: '/artists',
  release: '/releases',
  campaign: '/campaigns',
  project: '/projects',
  contract: '/contracts',
};

export function useWorkspace(workspaceType: WorkspaceEntityType, workspaceId: string) {
  const [currentTab, setCurrentTab] = useState<WorkspaceTab>('overview');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  const entityQuery = useQuery({
    queryKey: ['workspace', workspaceType, workspaceId],
    queryFn: async () => {
      const result = await api.get<WorkspaceEntity>(`${ENTITY_ROUTE_MAP[workspaceType]}/${workspaceId}`);
      return result;
    },
    enabled: Boolean(workspaceId),
  });

  const activitiesQuery = useQuery({
    queryKey: ['workspace', workspaceType, workspaceId, 'activities'],
    queryFn: async () => {
      return api.get<ActivityLogItem[]>(
        `/activity-logs?entityType=${encodeURIComponent(workspaceType)}&entityId=${encodeURIComponent(workspaceId)}`,
      );
    },
    enabled: Boolean(workspaceId),
    refetchInterval: 30000,
  });

  return {
    workspaceType,
    workspaceId,
    entity: entityQuery.data ?? null,
    isLoadingEntity: entityQuery.isLoading,
    errorEntity: entityQuery.error as Error | null,
    currentTab,
    setCurrentTab,
    selectedItems,
    setSelectedItems,
    activities: activitiesQuery.data ?? [],
    isLoadingActivities: activitiesQuery.isLoading,
  } satisfies WorkspaceContextValue;
}


