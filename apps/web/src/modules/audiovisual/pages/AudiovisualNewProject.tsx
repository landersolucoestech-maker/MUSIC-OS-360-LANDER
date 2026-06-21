import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/shared/components/MainLayout";
import { Button } from "@/shared/ui/button";
import { useAudiovisualProjectMutations } from "../hooks/useAudiovisual";
import { AudiovisualNewProjectModal } from "../modals/AudiovisualNewProjectModal";

export function AudiovisualNewProject() {
  const navigate = useNavigate();
  const mutations = useAudiovisualProjectMutations();
  return <MainLayout><div className="min-h-screen bg-card"><AudiovisualNewProjectModal open onClose={() => navigate(-1)} onCreate={(payload) => mutations.create.mutate(payload)} /><div className="p-6"><Button onClick={() => navigate(-1)} className="bg-primary hover:bg-primary">Voltar</Button></div></div></MainLayout>;
}

export default AudiovisualNewProject;

