import { useNavigate, useParams } from "react-router-dom";
import { MainLayout } from "@/shared/components/MainLayout";
import { useAudiovisualProject } from "../hooks/useAudiovisual";
import { AudiovisualProjectDetailsModal } from "../modals/AudiovisualProjectDetailsModal";

export function AudiovisualProjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: project, isLoading, error } = useAudiovisualProject(id);
  if (isLoading) {
    return <MainLayout><p className="p-6 text-sm text-muted-foreground">Carregando produção audiovisual…</p></MainLayout>;
  }
  if (error || !project) {
    return <MainLayout><p role="alert" className="p-6 text-sm text-destructive">Produção audiovisual não encontrada ou indisponível.</p></MainLayout>;
  }
  return <MainLayout><div className="min-h-screen bg-card"><AudiovisualProjectDetailsModal open project={project} onClose={() => navigate(-1)} /></div></MainLayout>;
}

export default AudiovisualProjectDetails;
