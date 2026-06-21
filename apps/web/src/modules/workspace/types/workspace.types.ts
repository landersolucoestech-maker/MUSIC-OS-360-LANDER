export type WorkspaceEntityType = 'artist' | 'release' | 'campaign' | 'project' | 'contract';

export type WorkspaceTab =
  | 'overview'
  | 'releases'
  | 'campaigns'
  | 'financial'
  | 'team'
  | 'activity';

export interface WorkspaceEntity {
  id: string;
  type: WorkspaceEntityType;
  name: string;
  description?: string;
}

export interface ActivityLogItem {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  action: string;
  description: string;
  metadata: Record<string, unknown>;
  user_id: string;
  user_name?: string | null;
  user_avatar_url?: string | null;
  created_at: string;
}

export interface WorkspaceContextValue {
  workspaceType: WorkspaceEntityType;
  workspaceId: string;
  entity: WorkspaceEntity | null;
  isLoadingEntity: boolean;
  errorEntity: Error | null;
  currentTab: WorkspaceTab;
  setCurrentTab: (tab: WorkspaceTab) => void;
  selectedItems: string[];
  setSelectedItems: (ids: string[]) => void;
  activities: ActivityLogItem[];
  isLoadingActivities: boolean;
}


