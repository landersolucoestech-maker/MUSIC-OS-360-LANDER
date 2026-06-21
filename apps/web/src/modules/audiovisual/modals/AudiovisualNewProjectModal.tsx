import type { AudiovisualProject } from "../types/audiovisual.types";
import { AudiovisualProjectFormModal, type AudiovisualMusicCatalogOption } from "./AudiovisualProjectFormModal";

interface AudiovisualNewProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreate?: (data: Partial<AudiovisualProject>) => void;
  musicCatalog?: AudiovisualMusicCatalogOption[];
}

export function AudiovisualNewProjectModal({ open, onClose, onCreate, musicCatalog }: AudiovisualNewProjectModalProps) {
  return <AudiovisualProjectFormModal open={open} mode="create" onClose={onClose} onSubmit={onCreate} musicCatalog={musicCatalog} />;
}
