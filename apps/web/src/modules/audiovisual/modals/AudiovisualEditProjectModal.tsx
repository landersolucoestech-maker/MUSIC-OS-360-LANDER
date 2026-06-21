import type { AudiovisualProject } from "../types/audiovisual.types";
import { AudiovisualProjectFormModal, type AudiovisualMusicCatalogOption } from "./AudiovisualProjectFormModal";

interface AudiovisualEditProjectModalProps {
  open: boolean;
  project: AudiovisualProject | null;
  onClose: () => void;
  onUpdate?: (data: Partial<AudiovisualProject>) => void;
  musicCatalog?: AudiovisualMusicCatalogOption[];
}

export function AudiovisualEditProjectModal({ open, project, onClose, onUpdate, musicCatalog }: AudiovisualEditProjectModalProps) {
  return <AudiovisualProjectFormModal open={open} mode="edit" project={project} onClose={onClose} onSubmit={onUpdate} musicCatalog={musicCatalog} />;
}
