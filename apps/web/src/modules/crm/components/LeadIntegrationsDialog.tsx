import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Card, CardContent } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import {
  Copy,
  Check,
  Globe,
  ExternalLink,
  CheckCircle2,
  Unplug,
  Plug,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  SiLinkedin,
} from "react-icons/si";
import { toast } from "sonner";
import { OAuthConnectDialog, OAUTH_PLATFORM_CONFIGS } from "./OAuthConnectDialog";
import { useLeadOAuth, type LeadOAuthPlatform } from "../hooks/useLeadOAuth";

interface LeadIntegrationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EDGE_FUNCTION_BASE =
  "https://configure-seu-backend.example.com/functions/v1/lead-capture";

const WEBHOOK_URLS: Record<string, string> = {
  linkedin: `${EDGE_FUNCTION_BASE}?source=linkedin_ads`,
  website: `${EDGE_FUNCTION_BASE}?source=website`,
};

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    toast.success("Copiado!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-1">
      <label className="text-xs font-medium text-muted-foreground">{label}</label>
      <div className="flex gap-2">
        <Input
          readOnly
          value={value}
          className="font-mono text-xs"
          data-testid={`input-webhook-${label.toLowerCase().replace(/\s/g, "-")}`}
        />
        <Button
          variant="outline"
          size="icon"
          onClick={handleCopy}
          data-testid={`button-copy-${label.toLowerCase().replace(/\s/g, "-")}`}
        >
          {copied ? (
            <Check className="h-4 w-4 text-success" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-2 text-sm text-muted-foreground">
      {steps.map((step, i) => (
        <li key={i} className="flex gap-2">
          <Badge
            variant="secondary"
            className="h-5 w-5 flex-shrink-0 flex items-center justify-center text-[10px] rounded-full p-0"
          >
            {i + 1}
          </Badge>
          <span>{step}</span>
        </li>
      ))}
    </ol>
  );
}

interface OAuthConnectionCardProps {
  platform: LeadOAuthPlatform;
  onConnectClick: () => void;
  onDisconnect: () => void;
  accountName?: string;
  accountId?: string;
  connectedAt?: string;
  isConnected: boolean;
  Icon: React.ComponentType<{ className?: string }>;
}

function OAuthConnectionCard({
  platform,
  onConnectClick,
  onDisconnect,
  accountName,
  accountId,
  connectedAt,
  isConnected,
  Icon,
}: OAuthConnectionCardProps) {
  const config = OAUTH_PLATFORM_CONFIGS[platform];

  if (isConnected) {
    return (
      <div
        className={`rounded-lg border p-4 ${config.bgColor} ${config.borderColor} space-y-3`}
        data-testid={`card-oauth-connected-${platform}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <span className="text-sm font-semibold text-success">Conta conectada</span>
          </div>
          <Badge variant="secondary" className="text-[10px] gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-success" />
            Ativo
          </Badge>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Icon className={`h-3.5 w-3.5 ${config.textColor}`} />
            <span className="text-sm font-medium">{accountName}</span>
          </div>
          {accountId && (
            <p className="text-[11px] text-muted-foreground font-mono ml-5">
              ID: {accountId}
            </p>
          )}
          {connectedAt && (
            <p className="text-[11px] text-muted-foreground ml-5">
              Conectado em:{" "}
              {new Date(connectedAt).toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs"
            onClick={onConnectClick}
            data-testid={`button-oauth-reconnect-${platform}`}
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Reconectar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
            onClick={onDisconnect}
            data-testid={`button-oauth-disconnect-${platform}`}
          >
            <Unplug className="h-3.5 w-3.5" />
            Desconectar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg border border-dashed border-muted-foreground/30 p-4 space-y-3 bg-muted/20"
      data-testid={`card-oauth-disconnected-${platform}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${config.bgColor} ${config.borderColor} border`}>
            <Icon className={`h-3.5 w-3.5 ${config.textColor}`} />
          </div>
          <div>
            <p className="text-sm font-medium">{config.label}</p>
            <p className="text-[11px] text-muted-foreground">Não conectado</p>
          </div>
        </div>
        <Button
          size="sm"
          className="gap-2 text-xs"
          style={{ backgroundColor: config.color }}
          onClick={onConnectClick}
          data-testid={`button-oauth-connect-${platform}`}
        >
          <Plug className="h-3.5 w-3.5" />
          Conectar via OAuth
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{config.description}</p>
    </div>
  );
}

interface WebhookSectionProps {
  platform: string;
  children?: React.ReactNode;
}

function WebhookSection({ platform, children }: WebhookSectionProps) {
  const [expanded, setExpanded] = useState(false);
  const url = WEBHOOK_URLS[platform];

  return (
    <div className="space-y-3">
      <button
        type="button"
        className="flex w-full items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setExpanded((v) => !v)}
        data-testid={`button-toggle-webhook-${platform}`}
      >
        <span>Configuração alternativa via Webhook</span>
        {expanded ? (
          <ChevronUp className="h-3.5 w-3.5" />
        ) : (
          <ChevronDown className="h-3.5 w-3.5" />
        )}
      </button>

      {expanded && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
          <p className="text-xs text-muted-foreground">
            Se preferir não usar OAuth, pode configurar manualmente um webhook no painel da plataforma para enviar leads ao endpoint abaixo.
          </p>
          <CopyField label="Webhook URL" value={url} />
          {children}
        </div>
      )}
    </div>
  );
}

export function LeadIntegrationsDialog({
  open,
  onOpenChange,
}: LeadIntegrationsDialogProps) {
  const publicFormUrl = `${window.location.origin}/captar`;
  const embeddableSnippet = `<iframe src="${publicFormUrl}" width="100%" height="600" frameborder="0" style="border:none;border-radius:8px;"></iframe>`;

  const { connect, disconnect, getConnection, isConnected } = useLeadOAuth();
  const [oauthDialog, setOauthDialog] = useState<LeadOAuthPlatform | null>(null);

  const handleConnectSuccess = async (
    platform: LeadOAuthPlatform,
    scopes: string[]
  ) => {
    await connect(platform, scopes);
    toast.success(`${OAUTH_PLATFORM_CONFIGS[platform].label} conectado com sucesso!`);
  };

  const handleDisconnect = (platform: LeadOAuthPlatform) => {
    disconnect(platform);
    toast.info(`${OAUTH_PLATFORM_CONFIGS[platform].label} desconectado.`);
  };

  // Apenas LinkedIn — Facebook/Instagram/Google/TikTok pertencem à secção
  // "Tráfego Pago / Campanhas" nas Integrações, não aqui.
  const adPlatforms: {
    key: LeadOAuthPlatform;
    label: string;
    Icon: React.ComponentType<{ className?: string }>;
    webhookSteps: string[];
    payloadExample?: string;
  }[] = [
    {
      key: "linkedin",
      label: "LinkedIn",
      Icon: SiLinkedin,
      webhookSteps: [
        "Acesse o LinkedIn Campaign Manager e selecione sua conta.",
        "Vá em Recursos da Conta > Integrações de Geração de Leads.",
        "Clique em \"Adicionar integração\" e selecione \"Webhook genérico\".",
        "Cole a Webhook URL e adicione o header de autenticação x-api-key.",
        "Associe formulários de Lead Gen Forms à integração criada.",
        "Publique e teste com o formulário de preview do Campaign Manager.",
      ],
      payloadExample: `{\n  "leadGenFormResponse": {\n    "leadGenFormUrn": "urn:li:leadGenForm:...",\n    "submittedAt": 1700000000000,\n    "fieldValues": [\n      { "questionUrn": "...", "answer": { "values": ["João Silva"] } },\n      { "questionUrn": "...", "answer": { "values": ["joao@email.com"] } }\n    ]\n  }\n}`,
    },
  ];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="max-w-2xl max-h-[88vh] overflow-y-auto"
          data-testid="dialog-lead-integrations"
        >
          <DialogHeader>
            <DialogTitle data-testid="text-dialog-title">
              Integrações de Captação de Leads
            </DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="linkedin" className="w-full">
            <TabsList
              className="grid w-full grid-cols-2"
              data-testid="tabs-integrations"
            >
              {adPlatforms.map(({ key, label, Icon }) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="gap-1 text-xs relative"
                  data-testid={`tab-${key}`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{label}</span>
                  {isConnected(key) && (
                    <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-success border border-background" />
                  )}
                </TabsTrigger>
              ))}
              <TabsTrigger
                value="website"
                className="gap-1 text-xs"
                data-testid="tab-website"
              >
                <Globe className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Site</span>
              </TabsTrigger>
            </TabsList>

            {adPlatforms.map(
              ({ key, Icon, webhookSteps, payloadExample }) => {
                const conn = getConnection(key);
                return (
                  <TabsContent
                    key={key}
                    value={key}
                    className="space-y-4 mt-4"
                    data-testid={`content-${key}`}
                  >
                    <OAuthConnectionCard
                      platform={key}
                      Icon={Icon}
                      isConnected={isConnected(key)}
                      accountName={conn?.accountName}
                      accountId={conn?.accountId}
                      connectedAt={conn?.connectedAt}
                      onConnectClick={() => setOauthDialog(key)}
                      onDisconnect={() => handleDisconnect(key)}
                    />

                    {isConnected(key) && (
                      <Card className="border-success/20 bg-success/5">
                        <CardContent className="p-3">
                          <p className="text-xs text-success">
                            <strong>Sincronização ativa.</strong> Os leads desta plataforma estão a ser importados automaticamente via API OAuth — não é necessário configurar webhooks manualmente.
                          </p>
                        </CardContent>
                      </Card>
                    )}

                    <Separator />

                    <WebhookSection platform={key}>
                      <div className="space-y-2">
                        <h4 className="text-xs font-semibold">
                          Passos de configuração
                        </h4>
                        <StepList steps={webhookSteps} />
                      </div>
                      {payloadExample && (
                        <div className="space-y-1">
                          <h4 className="text-xs font-semibold text-muted-foreground">
                            Formato esperado do payload
                          </h4>
                          <pre className="bg-muted p-3 rounded-md text-[11px] overflow-x-auto whitespace-pre-wrap">
                            {payloadExample}
                          </pre>
                        </div>
                      )}
                    </WebhookSection>
                  </TabsContent>
                );
              }
            )}

            <TabsContent
              value="website"
              className="space-y-4 mt-4"
              data-testid="content-website"
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Formulário Público</h4>
                  <p className="text-xs text-muted-foreground">
                    Um formulário pronto para captar leads directamente pelo seu site ou landing page.
                  </p>
                  <CopyField label="URL do Formulário" value={publicFormUrl} />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => window.open(publicFormUrl, "_blank")}
                    data-testid="button-open-form"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Abrir Formulário
                  </Button>
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">Código Embed (iframe)</h4>
                  <p className="text-xs text-muted-foreground">
                    Cole este código HTML no seu site para incorporar o formulário de captação.
                  </p>
                  <CopyField label="Snippet HTML" value={embeddableSnippet} />
                </div>

                <div className="space-y-2">
                  <h4 className="text-sm font-semibold">API Directa</h4>
                  <p className="text-xs text-muted-foreground">
                    Envie leads directamente via API usando o endpoint abaixo.
                  </p>
                  <CopyField label="Webhook URL (Website)" value={WEBHOOK_URLS.website} />
                  <div className="space-y-1">
                    <h4 className="text-xs font-semibold text-muted-foreground">
                      Exemplo de requisição
                    </h4>
                    <pre className="bg-muted p-3 rounded-md text-[11px] overflow-x-auto">
                      {`curl -X POST "${WEBHOOK_URLS.website}" \\\n  -H "Content-Type: application/json" \\\n  -H "x-api-key: SUA_CHAVE_API" \\\n  -d '{\n    "nome": "João Silva",\n    "email": "joao@email.com",\n    "telefone": "+5511999999999",\n    "servico": "show_booking",\n    "mensagem": "Tenho interesse em contratar um show"\n  }'`}
                    </pre>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {oauthDialog && (
        <OAuthConnectDialog
          open={oauthDialog !== null}
          onOpenChange={(v) => {
            if (!v) setOauthDialog(null);
          }}
          platform={oauthDialog}
          onSuccess={handleConnectSuccess}
        />
      )}
    </>
  );
}
