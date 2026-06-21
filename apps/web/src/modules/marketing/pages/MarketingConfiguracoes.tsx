import { MainLayout } from "@/shared/components/MainLayout";
import {
  ModuleOperationalListsPanel,
  type ModuleListSection,
} from "@/modules/settings/components/ModuleOperationalListsPanel";

const MARKETING_SECTIONS: ModuleListSection[] = [
  {
    kind: "marketing_context",
    title: "Contextos",
    description: "Opções do campo Contexto no modal Nova Tarefa.",
  },
  {
    kind: "marketing_sector",
    title: "Setores",
    description: "Opções do campo Setor no modal Nova Tarefa.",
  },
  {
    kind: "marketing_task_type",
    title: "Tipos de tarefa",
    description: "Opções do campo Tipo no modal Nova Tarefa.",
  },
  {
    kind: "briefing_service_type",
    title: "Tipos de briefing",
    description: "Tipos de serviço usados no modal Criar Briefing.",
  },
  {
    kind: "creative_ai_setting",
    title: "IA Criativa",
    description: "Parâmetros operacionais da IA Criativa, conforme integrações disponíveis.",
  },
];

export default function MarketingConfiguracoes() {
  return (
    <MainLayout title="Configurações de Marketing" description="Listas e parametros de campanhas, briefings e IA Criativa">
      <ModuleOperationalListsPanel
        sections={MARKETING_SECTIONS}
        note="O campo Responsável das tarefas continua vindo de Configurações → Usuários e integrantes do time de Marketing. Esta área não cria responsáveis paralelos."
      />
    </MainLayout>
  );
}
