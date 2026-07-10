import type { AudiovisualProject } from "../types/audiovisual.types";

export const audiovisualMusicCatalog: Array<{
  id: string;
  title: string;
  primaryArtist: string;
  isrc: string;
  version: string;
}> = [];

export const audiovisualMockProjects: AudiovisualProject[] = [];
export const defaultScenes: Array<Record<string, unknown>> = [];
export const defaultShots: Array<Record<string, unknown>> = [];
export const recordingChecklistLabels: string[] = [];
export const defaultChecklist: Array<Record<string, unknown>> = [];
export const storyboardRows = defaultScenes;
export const shotRows = defaultShots;
export const checklistItems = recordingChecklistLabels;
