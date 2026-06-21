import { useState } from "react";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import {
  Bot,
  ChevronRight,
  Clock,
  FolderKanban,
  GitBranch,
  Headphones,
  ListChecks,
  type LucideIcon,
  SlidersHorizontal,
} from "lucide-react";
import { toast } from "sonner";

type OperationalOption = {
  title: string;
  description: string;
  status: "Em revisão" | "Planejado";
};

type OperationalModule = {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  options: OperationalOption[];
};

const OPERATIONAL_MODULES: OperationalModule[] = [
  {
    id: "atendimento",
    title: "Atendimento",
    description: "Fluxos operacionais de abertura, acompanhamento e encerramento.",
    icon: Headphones,
    options: [
      {
        title: "Triagem de atendimento",
        description: "Regras de entrada, classificação inicial e dados obrigatórios.",
        status: "Em revisão",
      },
      {
        title: "Finalização de atendimento",
        description: "Motivos de encerramento, validações e registro operacional.",
        status: "Em revisão",
      },
      {
        title: "Protocolos",
        description: "Padrão de numeração e exibição de protocolos internos.",
        status: "Planejado",
      },
    ],
  },
  {
    id: "automacoes",
    title: "Automações",
    description: "Regras automáticas internas, sem duplicar configurações de canais externos.",
    icon: SlidersHorizontal,
    options: [
      {
        title: "Mensagens automáticas internas",
        description: "Modelos acionados por status, fila ou evento operacional.",
        status: "Em revisão",
      },
      {
        title: "Gatilhos operacionais",
        description: "Condições para criar tarefas, alertas e encaminhamentos.",
        status: "Em revisão",
      },
    ],
  },
  {
    id: "filas",
    title: "Filas",
    description: "Organização de filas e distribuição sem duplicar usuários, equipes ou permissões.",
    icon: FolderKanban,
    options: [
      {
        title: "Filas operacionais",
        description: "Cadastro e critérios de uso das filas por processo.",
        status: "Em revisão",
      },
      {
        title: "Distribuição automática",
        description: "Regras de round-robin, menor carga e priorização.",
        status: "Planejado",
      },
    ],
  },
  {
    id: "prazos",
    title: "Prazos",
    description: "Prazos de atendimento e indicadores operacionais de tempo.",
    icon: Clock,
    options: [
      {
        title: "SLA/Prazos",
        description: "Políticas de prazo por tipo de atendimento ou prioridade.",
        status: "Em revisão",
      },
      {
        title: "Alertas de vencimento",
        description: "Regras de aviso antes do prazo expirar.",
        status: "Planejado",
      },
    ],
  },
  {
    id: "classificacoes",
    title: "Classificações",
    description: "Status, categorias e tipos usados por processos operacionais.",
    icon: ListChecks,
    options: [
      {
        title: "Status operacionais",
        description: "Etapas configuráveis para processos internos.",
        status: "Em revisão",
      },
      {
        title: "Categorias",
        description: "Categorias operacionais transversais e não financeiras.",
        status: "Em revisão",
      },
      {
        title: "Tipos de chamado",
        description: "Classificação de solicitações e demandas internas.",
        status: "Em revisão",
      },
      {
        title: "Tags operacionais",
        description: "Marcadores reutilizáveis por atendimento e tarefas.",
        status: "Planejado",
      },
    ],
  },
  {
    id: "regras",
    title: "Regras de Negócio",
    description: "Políticas transversais aplicadas aos fluxos internos.",
    icon: GitBranch,
    options: [
      {
        title: "Regras de negócio",
        description: "Condições e validações que afetam mais de um módulo.",
        status: "Em revisão",
      },
      {
        title: "Categorias de regra",
        description: "Agrupamento das regras por contexto operacional.",
        status: "Planejado",
      },
    ],
  },
  {
    id: "ia",
    title: "IA e Assistentes",
    description: "Parâmetros operacionais de assistentes internos.",
    icon: Bot,
    options: [
      {
        title: "Assistentes internos",
        description: "Configuração de comportamento e escopo de assistentes.",
        status: "Em revisão",
      },
      {
        title: "Regras de uso de IA",
        description: "Limites e condições para uso operacional de IA.",
        status: "Planejado",
      },
    ],
  },
];

export function OperationalSettingsPanel() {
  const [selectedModuleId, setSelectedModuleId] = useState(OPERATIONAL_MODULES[0].id);
  const selectedModule =
    OPERATIONAL_MODULES.find((module) => module.id === selectedModuleId) ?? OPERATIONAL_MODULES[0];

  const handleOpenConfig = (title: string) => {
    toast.info(`${title} está em revisão operacional. A página de gerenciamento será definida na próxima etapa.`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações Operacionais</CardTitle>
          <CardDescription>
            Escolha um módulo operacional para visualizar apenas as configurações daquele contexto. Integrações ficam
            em Integrações; usuários, setores, equipes e permissões ficam em Usuários.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(280px,360px)_1fr]">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Módulos Operacionais</CardTitle>
            <CardDescription>Selecione um módulo para ver suas opções.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-hidden rounded-md border">
              {OPERATIONAL_MODULES.map((module) => {
                const Icon = module.icon;
                const isSelected = selectedModule.id === module.id;

                return (
                  <button
                    key={module.id}
                    type="button"
                    className={`flex w-full items-center gap-3 border-b px-4 py-3 text-left last:border-b-0 transition-colors ${
                      isSelected ? "bg-primary/10 text-foreground" : "hover:bg-muted/50"
                    }`}
                    onClick={() => setSelectedModuleId(module.id)}
                  >
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-background text-primary ring-1 ring-border">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium">{module.title}</span>
                      <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                        {module.description}
                      </span>
                    </span>
                    <ChevronRight className={`h-4 w-4 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle className="text-sm">{selectedModule.title}</CardTitle>
                <CardDescription>{selectedModule.description}</CardDescription>
              </div>
              <Badge variant="outline" className="text-[11px]">
                {selectedModule.options.length} opções
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-hidden rounded-md border">
              <div className="grid grid-cols-[1fr_120px_150px] items-center gap-4 border-b bg-muted/40 px-4 py-2 text-xs font-medium text-muted-foreground">
                <span>Opção</span>
                <span>Status</span>
                <span className="text-right">Ação</span>
              </div>
              <div className="divide-y">
                {selectedModule.options.map((option) => (
                  <div
                    key={option.title}
                    className="grid grid-cols-1 gap-3 px-4 py-4 md:grid-cols-[1fr_120px_150px] md:items-center"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{option.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{option.description}</p>
                    </div>
                    <Badge variant="outline" className="w-fit text-[11px]">
                      {option.status}
                    </Badge>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 justify-self-start text-xs md:justify-self-end"
                      onClick={() => handleOpenConfig(option.title)}
                    >
                      Revisar configuração
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
