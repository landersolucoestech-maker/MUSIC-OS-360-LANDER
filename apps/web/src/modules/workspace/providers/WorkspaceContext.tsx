import { createContext, ReactNode, useContext } from 'react';
import type { WorkspaceContextValue } from '../types/workspace.types';

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children, value }: { children: ReactNode; value: WorkspaceContextValue }) {
  return <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>;
}

export function useWorkspaceContext() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspaceContext must be used inside WorkspaceProvider');
  }
  return context;
}

export { WorkspaceContext };
