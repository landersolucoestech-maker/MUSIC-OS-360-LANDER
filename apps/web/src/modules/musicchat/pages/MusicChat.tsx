/**
 * pages/MusicChat.tsx
 *
 * MusicChat — ponto de navegação único (/chat) entre dois domínios
 * arquiteturalmente independentes: Chat Interno (equipe <-> equipe,
 * modules/musicchat-interno) e Central de Atendimento (equipe <-> público
 * externo, modules/musicchat). Cada um tem árvore de componentes, estado,
 * hooks e serviço próprios — este arquivo só decide QUAL montar.
 *
 * Correção da causa raiz do bug original: a implementação anterior usava
 * `<TabsContent forceMount>` na aba de atendimento, o que a mantinha
 * renderizando mesmo com "Chat Interno" ativo (mistura visual/funcional).
 * SEM forceMount, o Radix Tabs só monta o painel ativo — nunca os dois ao
 * mesmo tempo — preservando a experiência de abas que já existia.
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/shared/components/MainLayout";
import { Button } from "@/shared/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Headphones, Plus, Settings, Users } from "lucide-react";
import { useTenant } from "@/app/providers/TenantContext";
import { ChatInternoView } from "@/modules/musicchat-interno/components/ChatInternoView";
import { SupportCenterView, type SupportConversation } from "../components/SupportCenterView";
import { NewConversationDialog } from "../components/NewConversationDialog";

type MusicChatArea = "internal" | "support";

export default function MusicChat() {
  const navigate = useNavigate();
  const { hasPermission } = useTenant();
  const canManageAutomation = hasPermission("musicchat", "write") || hasPermission("settings", "write");
  const [activeArea, setActiveArea] = useState<MusicChatArea>("support");
  const [newConversationOpen, setNewConversationOpen] = useState(false);
  const [pendingNewConversation, setPendingNewConversation] = useState<SupportConversation | null>(null);

  const headerActions = (
    <div className="flex items-center gap-2">
      {canManageAutomation && (
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={() => navigate("/admin/musicchat/automacoes")}
        >
          <Settings className="h-3.5 w-3.5" />
          Configurações
        </Button>
      )}
      {/* "Nova conversa" da Central de Atendimento fica no header (fluxo WhatsApp-only,
          ver NewConversationDialog); Chat Interno tem seu próprio gatilho "Nova" dentro
          do seu próprio Card — domínios diferentes, ações diferentes, sem estado
          compartilhado entre eles. */}
      {activeArea === "support" && (
        <Button
          size="sm"
          className="h-8 gap-1.5 text-xs"
          data-testid="button-nova-mensagem"
          onClick={() => setNewConversationOpen(true)}
        >
          <Plus className="h-3.5 w-3.5" />
          Nova Conversa
        </Button>
      )}
    </div>
  );

  return (
    <MainLayout
      title="MusicChat"
      description="Chat interno e central multicanal de atendimento"
      actions={headerActions}
    >
      <div className="space-y-4 pt-[10px] pb-[10px]">
        <Tabs value={activeArea} onValueChange={(value) => setActiveArea(value as MusicChatArea)}>
          <TabsList>
            <TabsTrigger value="internal" className="gap-2">
              <Users className="h-4 w-4" />
              Chat Interno
            </TabsTrigger>
            <TabsTrigger value="support" className="gap-2">
              <Headphones className="h-4 w-4" />
              Central de Atendimento
            </TabsTrigger>
          </TabsList>

          {/* Sem forceMount: o Radix só monta o painel do tab ativo — o outro domínio
              fica completamente desmontado, não apenas visualmente oculto. */}
          <TabsContent value="internal" className="mt-4">
            <ChatInternoView />
          </TabsContent>

          <TabsContent value="support" className="mt-4">
            <SupportCenterView
              pendingNewConversation={pendingNewConversation}
              onConsumePendingNewConversation={() => setPendingNewConversation(null)}
            />
          </TabsContent>
        </Tabs>
      </div>
      <NewConversationDialog
        open={newConversationOpen}
        onOpenChange={setNewConversationOpen}
        onCreated={setPendingNewConversation}
      />
    </MainLayout>
  );
}
