import type {
  SupportTicket, SupportMessage, ChatRoom, ChatMessage,
  KnowledgeCategory, KnowledgeArticle, SystemService, Incident, SupportRequest,
} from "../types";

const TENANT_ID = "tenant-001";

export const MOCK_TICKETS: SupportTicket[] = [
  {
    id: "tkt-001", tenant_id: TENANT_ID, ticket_number: "TKT-0042",
    subject: "Erro ao importar planilha de royalties via OFX",
    description: "Ao tentar importar o arquivo OFX gerado pelo banco, o sistema retorna erro 422. O arquivo tem 2.3MB e contém 847 transações.",
    status: "open", priority: "high", category: "financeiro",
    created_by: "Ana Beatriz Santos", assigned_to: "Suporte Técnico",
    sla_deadline: "2026-05-09T18:00:00Z",
    created_at: "2026-05-08T09:15:00Z", updated_at: "2026-05-08T10:30:00Z",
    tags: ["ofx", "importação", "financeiro"],
  },
  {
    id: "tkt-002", tenant_id: TENANT_ID, ticket_number: "TKT-0041",
    subject: "Gráficos de streaming não atualizam após sincronização",
    description: "Após clicar em Sincronizar no painel do artista, os gráficos de Spotify/YouTube permanecem com dados antigos.",
    status: "in_progress", priority: "medium", category: "analytics",
    created_by: "DJ Marcus Flow", assigned_to: "Time de Analytics",
    sla_deadline: "2026-05-10T12:00:00Z",
    created_at: "2026-05-07T14:22:00Z", updated_at: "2026-05-08T08:00:00Z",
    tags: ["streaming", "gráficos", "sync"],
  },
  {
    id: "tkt-003", tenant_id: TENANT_ID, ticket_number: "TKT-0040",
    subject: "Contrato gerado com data de vencimento incorreta",
    description: "O template de contrato exclusivo está gerando a data de vencimento com 12 meses a menos do configurado.",
    status: "waiting_customer", priority: "critical", category: "contratos",
    created_by: "Gravadora Exemplo Ltda", assigned_to: "Time de Contratos",
    sla_deadline: "2026-05-08T17:00:00Z",
    created_at: "2026-05-06T11:00:00Z", updated_at: "2026-05-07T16:45:00Z",
    tags: ["contrato", "template", "bug"],
  },
  {
    id: "tkt-004", tenant_id: TENANT_ID, ticket_number: "TKT-0039",
    subject: "Novo artista não aparece no CRM após cadastro",
    description: "Artistas cadastrados via formulário completo (/artistas/novo) não estão sendo sincronizados com o módulo CRM.",
    status: "resolved", priority: "medium", category: "artistas",
    created_by: "Vitória Lunar", assigned_to: "Suporte Técnico",
    sla_deadline: "2026-05-08T10:00:00Z",
    created_at: "2026-05-05T09:00:00Z", updated_at: "2026-05-06T15:00:00Z",
    closed_at: "2026-05-06T15:00:00Z",
    tags: ["artistas", "crm", "sync"],
  },
  {
    id: "tkt-005", tenant_id: TENANT_ID, ticket_number: "TKT-0038",
    subject: "Solicitar integração com DistroKid para royalties automáticos",
    description: "Preciso que o sistema consiga importar automaticamente os relatórios mensais de royalties do DistroKid sem importação manual.",
    status: "open", priority: "low", category: "integracoes",
    created_by: "Trio Bossa Nova",
    sla_deadline: "2026-05-15T18:00:00Z",
    created_at: "2026-05-08T07:30:00Z", updated_at: "2026-05-08T07:30:00Z",
    tags: ["distrokid", "royalties", "integração"],
  },
  {
    id: "tkt-006", tenant_id: TENANT_ID, ticket_number: "TKT-0037",
    subject: "Permissão de Editor não permite editar lançamentos",
    description: "Usuários com role Editor conseguem visualizar mas não conseguem editar ou criar novos lançamentos musicais.",
    status: "in_progress", priority: "high", category: "permissoes",
    created_by: "Grupo Raiz Nordestina", assigned_to: "Suporte Técnico",
    sla_deadline: "2026-05-09T09:00:00Z",
    created_at: "2026-05-07T17:00:00Z", updated_at: "2026-05-08T08:30:00Z",
    tags: ["permissões", "rbac", "lançamentos"],
  },
  {
    id: "tkt-007", tenant_id: TENANT_ID, ticket_number: "TKT-0036",
    subject: "Distribuição para Apple Music retornando erro 503",
    description: "Ao tentar enviar lançamento para Apple Music, o sistema retorna Service Unavailable. Outros distribuidores funcionam normalmente.",
    status: "closed", priority: "high", category: "distribuicao",
    created_by: "Samba Raiz Coletivo",
    sla_deadline: "2026-05-07T18:00:00Z",
    created_at: "2026-05-04T10:00:00Z", updated_at: "2026-05-07T11:00:00Z",
    closed_at: "2026-05-07T11:00:00Z",
    tags: ["apple-music", "distribuição", "503"],
  },
];

export const MOCK_MESSAGES: Record<string, SupportMessage[]> = {
  "tkt-001": [
    {
      id: "msg-001", tenant_id: TENANT_ID, ticket_id: "tkt-001", sender_id: "user-001",
      sender_name: "Ana Beatriz Santos", sender_role: "user",
      message: "Olá! Estou tentando importar meu arquivo OFX e recebo o erro 422. Já tentei 3 vezes. O arquivo está no formato correto pois funcionou no mês passado.",
      internal_note: false, created_at: "2026-05-08T09:15:00Z",
    },
    {
      id: "msg-002", tenant_id: TENANT_ID, ticket_id: "tkt-001", sender_id: "support-001",
      sender_name: "Suporte MUSIC OS 360", sender_role: "support",
      message: "Olá Ana! Recebi seu ticket. Pode nos enviar o arquivo OFX para análise? Enquanto isso, vou verificar se houve alguma mudança na validação do parser.",
      internal_note: false, created_at: "2026-05-08T10:30:00Z",
    },
    {
      id: "msg-003", tenant_id: TENANT_ID, ticket_id: "tkt-001", sender_id: "support-001",
      sender_name: "Suporte MUSIC OS 360", sender_role: "support",
      message: "Nota interna: verificar se o limite de 2MB está causando o erro. Testar com arquivo menor.",
      internal_note: true, created_at: "2026-05-08T10:35:00Z",
    },
  ],
  "tkt-002": [
    {
      id: "msg-004", tenant_id: TENANT_ID, ticket_id: "tkt-002", sender_id: "user-002",
      sender_name: "DJ Marcus Flow", sender_role: "user",
      message: "Os gráficos do Spotify mostram dados de 3 dias atrás mesmo após sincronizar. YouTube também não atualiza.",
      internal_note: false, created_at: "2026-05-07T14:22:00Z",
    },
    {
      id: "msg-005", tenant_id: TENANT_ID, ticket_id: "tkt-002", sender_id: "support-002",
      sender_name: "Time de Analytics", sender_role: "support",
      message: "Identificamos o problema! Há um delay de cache de 24h no pipeline de dados. Estamos ajustando o TTL. Deve normalizar nas próximas 2 horas.",
      internal_note: false, created_at: "2026-05-08T08:00:00Z",
    },
  ],
};

export const MOCK_CHAT_ROOMS: ChatRoom[] = [
  {
    id: "room-001", tenant_id: TENANT_ID,
    participant_name: "Carlos Eduardo", participant_email: "carlos@seuartista.com",
    last_message: "Preciso de ajuda com a importação de royalties",
    last_message_at: "2026-05-08T10:45:00Z", unread_count: 2,
    status: "active", online: true,
  },
  {
    id: "room-002", tenant_id: TENANT_ID,
    participant_name: "Marina Silva", participant_email: "marina@gravadora.com.br",
    last_message: "Obrigada pelo suporte rápido!",
    last_message_at: "2026-05-08T09:00:00Z", unread_count: 0,
    status: "resolved", online: false,
  },
  {
    id: "room-003", tenant_id: TENANT_ID,
    participant_name: "Rodrigo Alves", participant_email: "rodrigo@musica.io",
    last_message: "Quando vai ser resolvido o bug dos contratos?",
    last_message_at: "2026-05-07T18:30:00Z", unread_count: 1,
    status: "active", online: true,
  },
  {
    id: "room-004", tenant_id: TENANT_ID,
    participant_name: "Beatriz Costa", participant_email: "beatriz@indie.com.br",
    last_message: "Consegui resolver, valeu!",
    last_message_at: "2026-05-07T14:00:00Z", unread_count: 0,
    status: "resolved", online: false,
  },
];

export const MOCK_CHAT_MESSAGES: Record<string, ChatMessage[]> = {
  "room-001": [
    {
      id: "cm-001", tenant_id: TENANT_ID, room_id: "room-001", sender: "user",
      sender_name: "Carlos Eduardo",
      message: "Olá, boa tarde! Preciso de ajuda com a importação de royalties do DistroKid.",
      created_at: "2026-05-08T10:30:00Z", type: "text",
    },
    {
      id: "cm-002", tenant_id: TENANT_ID, room_id: "room-001", sender: "support",
      sender_name: "Suporte MUSIC OS 360",
      message: "Olá Carlos! Fico feliz em ajudar. Qual formato de arquivo você está tentando importar?",
      created_at: "2026-05-08T10:32:00Z", type: "text",
    },
    {
      id: "cm-003", tenant_id: TENANT_ID, room_id: "room-001", sender: "user",
      sender_name: "Carlos Eduardo",
      message: "Estou tentando importar um CSV do DistroKid mas o sistema não reconhece o formato.",
      created_at: "2026-05-08T10:40:00Z", type: "text",
    },
    {
      id: "cm-004", tenant_id: TENANT_ID, room_id: "room-001", sender: "user",
      sender_name: "Carlos Eduardo",
      message: "Preciso de ajuda com a importação de royalties",
      created_at: "2026-05-08T10:45:00Z", type: "text",
    },
  ],
};

export const MOCK_KNOWLEDGE_CATEGORIES: KnowledgeCategory[] = [
  { id: "cat-fin", name: "Financeiro", description: "Transações, OFX, fluxo de caixa, conciliação e nota fiscal", icon: "DollarSign", article_count: 12, color: "emerald" },
  { id: "cat-ana", name: "Analytics", description: "Streaming, redes sociais, métricas e relatórios", icon: "BarChart", article_count: 8, color: "blue" },
  { id: "cat-dis", name: "Distribuição", description: "Lançamentos musicais, distribuidoras e plataformas", icon: "Radio", article_count: 10, color: "purple" },
  { id: "cat-con", name: "Contratos", description: "Templates, assinaturas digitais e gestão de contratos", icon: "FileText", article_count: 7, color: "orange" },
  { id: "cat-art", name: "Artistas", description: "Cadastro, perfis, métricas e visão 360", icon: "Users", article_count: 9, color: "pink" },
  { id: "cat-pro", name: "Projetos", description: "Gestão de projetos e equipes", icon: "FolderKanban", article_count: 5, color: "cyan" },
  { id: "cat-usu", name: "Usuários", description: "Contas, convites e gestão de acesso", icon: "User", article_count: 6, color: "indigo" },
  { id: "cat-per", name: "Permissões", description: "RBAC, roles e configurações de acesso", icon: "Shield", article_count: 4, color: "red" },
  { id: "cat-int", name: "Integrações", description: "APIs, webhooks e conectores externos", icon: "Plug", article_count: 11, color: "yellow" },
];

export const MOCK_KNOWLEDGE_ARTICLES: KnowledgeArticle[] = [
  {
    id: "art-001", tenant_id: TENANT_ID, category_id: "cat-fin", category_name: "Financeiro",
    title: "Como importar arquivo OFX do seu banco",
    summary: "Passo a passo completo para importar extratos bancários no formato OFX e conciliar com suas transações.",
    content: `## Como importar arquivo OFX do seu banco

O MUSIC OS 360 suporta importação de extratos bancários no formato OFX (Open Financial Exchange).

### Pré-requisitos
- Arquivo OFX exportado do seu banco (máximo 5MB)
- Acesso ao módulo Financeiro

### Passo a passo

1. **Acesse o módulo Financeiro** → Conciliação
2. **Clique em "Importar OFX"** no canto superior direito
3. **Selecione o arquivo** OFX do seu computador
4. **Aguarde o processamento** — pode levar até 30 segundos para arquivos grandes
5. **Revise as transações** identificadas automaticamente
6. **Confirme a importação**

### Formatos suportados
- OFX 1.x e 2.x
- QFX (Quicken)
- OFXSG (Open Financial Exchange Signed)

### Bancos compatíveis
Itaú, Bradesco, Santander, Nubank, Inter, C6 Bank, Banco do Brasil, Caixa.

### Solução de erros comuns

**Erro 422:** O arquivo pode estar corrompido ou exceder o limite de tamanho (5MB).
**Erro de encoding:** Salve o arquivo em UTF-8 antes de importar.`,
    views: 1247, helpful_count: 89, featured: true,
    created_at: "2026-01-15T00:00:00Z", updated_at: "2026-04-20T00:00:00Z", read_time: 4,
  },
  {
    id: "art-002", tenant_id: TENANT_ID, category_id: "cat-ana", category_name: "Analytics",
    title: "Entendendo os gráficos de streaming do artista",
    summary: "Aprenda a interpretar os dados de Spotify, YouTube e outras plataformas no painel do artista.",
    content: `## Entendendo os gráficos de streaming

O painel de streaming do artista centraliza dados de múltiplas plataformas em tempo real.

### Métricas disponíveis

**Spotify**
- Ouvintes mensais
- Streams totais
- Saves por faixa
- Playlists editoriais

**YouTube**
- Views totais e por período
- Inscritos ativos
- Watch time
- Receita estimada

### Sincronização de dados
Os dados são sincronizados automaticamente 1x por dia (meia-noite UTC).
Para forçar sincronização manual, acesse o perfil do artista → Plataformas → Atualizar.

### Interpretando tendências
Uma queda súbita pode indicar:
- Mudança no algoritmo da plataforma
- Período entre lançamentos
- Problema técnico de sincronização`,
    views: 892, helpful_count: 67, featured: true,
    created_at: "2026-02-01T00:00:00Z", updated_at: "2026-05-01T00:00:00Z", read_time: 5,
  },
  {
    id: "art-003", tenant_id: TENANT_ID, category_id: "cat-dis", category_name: "Distribuição",
    title: "Como distribuir um novo lançamento musical",
    summary: "Guia completo para criar e enviar um álbum, single ou EP para as principais plataformas de streaming.",
    content: `## Distribuindo um novo lançamento

Veja como enviar seu próximo lançamento para Spotify, Apple Music, Deezer e mais de 40 plataformas.

### Tipos de lançamento suportados
- **Single** — 1 faixa
- **EP** — 2 a 6 faixas  
- **Álbum** — 7 ou mais faixas

### Processo de distribuição

1. Acesse **Lançamentos → Distribuição**
2. Clique em **"Novo Lançamento"**
3. Preencha os metadados (título, artistas, UPC/ISRC)
4. Faça upload das faixas em WAV ou FLAC (44.1kHz, 16-bit mínimo)
5. Adicione a arte do álbum (3000x3000px, JPG)
6. Selecione as plataformas de destino
7. Defina a data de lançamento
8. Revise e confirme

### Prazos de entrega
- Spotify: 2-5 dias úteis
- Apple Music: 3-7 dias úteis
- Amazon Music: 2-4 dias úteis`,
    views: 2104, helpful_count: 156, featured: true,
    created_at: "2026-01-10T00:00:00Z", updated_at: "2026-04-15T00:00:00Z", read_time: 6,
  },
  {
    id: "art-004", tenant_id: TENANT_ID, category_id: "cat-con", category_name: "Contratos",
    title: "Criando templates de contrato personalizados",
    summary: "Configure templates reutilizáveis para contratos de artistas, produtores e parceiros.",
    content: `## Templates de Contrato

Automatize a criação de contratos com templates configuráveis.

### Variáveis disponíveis
Use {{variavel}} para inserir dados dinâmicos:
- {{nome_artista}} — nome artístico
- {{data_inicio}} — início da vigência
- {{data_fim}} — fim da vigência
- {{percentual_royalties}} — percentual acordado
- {{nome_empresa}} — razão social da gravadora

### Criando um novo template
1. Acesse Contratos → Templates
2. Clique em "Novo Template"
3. Defina o tipo (exclusivo, não-exclusivo, produção, etc.)
4. Insira o texto com as variáveis
5. Configure alertas de vencimento
6. Salve e ative o template`,
    views: 634, helpful_count: 45, featured: false,
    created_at: "2026-02-20T00:00:00Z", updated_at: "2026-03-10T00:00:00Z", read_time: 4,
  },
  {
    id: "art-005", tenant_id: TENANT_ID, category_id: "cat-per", category_name: "Permissões",
    title: "Guia de roles e permissões do sistema",
    summary: "Entenda os níveis de acesso disponíveis e como configurar permissões para cada membro da equipe.",
    content: `## Roles e Permissões

O MUSIC OS 360 utiliza RBAC (Role-Based Access Control) com os seguintes níveis:

### Hierarquia de roles

**Super Admin (tenant_owner)**
- Acesso total a todos os módulos
- Gerenciamento de usuários e billing
- Configurações de organização

**Administrador**
- Acesso total exceto configurações de billing
- Pode convidar e remover usuários

**Gerente**
- Leitura e escrita em todos os módulos de negócio
- Não pode gerenciar usuários

**Editor**
- Pode criar e editar conteúdo
- Não pode excluir ou aprovar contratos

**Visualizador**
- Somente leitura em todos os módulos`,
    views: 445, helpful_count: 38, featured: false,
    created_at: "2026-03-01T00:00:00Z", updated_at: "2026-04-28T00:00:00Z", read_time: 3,
  },
  {
    id: "art-006", tenant_id: TENANT_ID, category_id: "cat-int", category_name: "Integrações",
    title: "Configurando webhooks para eventos do sistema",
    summary: "Receba notificações automáticas quando contratos são assinados, leads chegam ou transações são criadas.",
    content: `## Configurando Webhooks

Webhooks permitem que sistemas externos recebam notificações em tempo real de eventos do MUSIC OS 360.

### Eventos disponíveis
- **lead.created** — Novo lead capturado
- **contract.signed** — Contrato assinado digitalmente
- **transaction.created** — Nova transação financeira
- **artist.registered** — Novo artista cadastrado
- **release.published** — Lançamento publicado

### Configuração
1. Acesse Configurações → Webhooks
2. Clique em "Novo Endpoint"
3. Informe a URL do seu servidor
4. Selecione os eventos que deseja receber
5. Adicione o secret para validação HMAC
6. Ative o endpoint

### Validação HMAC
Cada request inclui o header X-Musicos360-Signature com HMAC-SHA256 do payload.`,
    views: 312, helpful_count: 28, featured: false,
    created_at: "2026-03-15T00:00:00Z", updated_at: "2026-05-01T00:00:00Z", read_time: 5,
  },
];

export const MOCK_SYSTEM_SERVICES: SystemService[] = [
  { id: "svc-api", name: "API Principal", description: "REST API e endpoints de negócio", status: "operational", uptime: 99.98, latency: 42 },
  { id: "svc-auth", name: "Autenticação", description: "Login, sessões e tokens JWT", status: "operational", uptime: 99.99, latency: 18 },
  { id: "svc-upload", name: "Upload de Arquivos", description: "Upload de áudio, imagens e documentos", status: "operational", uptime: 99.95, latency: 120 },
  { id: "svc-realtime", name: "Realtime / Websocket", description: "Notificações e sincronização em tempo real", status: "degraded", uptime: 98.2, latency: 380, last_incident: "2026-05-08T06:00:00Z" },
  { id: "svc-analytics", name: "Analytics & Streaming", description: "Sincronização de métricas Spotify, YouTube, TikTok", status: "operational", uptime: 99.7, latency: 85 },
  { id: "svc-finance", name: "Módulo Financeiro", description: "Transações, OFX, nota fiscal e conciliação", status: "operational", uptime: 99.92, latency: 55 },
  { id: "svc-processing", name: "Processamento de Áudio", description: "Encoding, validação e entrega de faixas", status: "operational", uptime: 99.88, latency: 2400 },
  { id: "svc-db", name: "Banco de Dados", description: "PostgreSQL principal e réplicas de leitura", status: "operational", uptime: 100, latency: 8 },
];

export const MOCK_INCIDENTS: Incident[] = [
  {
    id: "inc-001", title: "Latência elevada no serviço de Realtime/Websocket",
    status: "monitoring", severity: "minor", services: ["svc-realtime"],
    created_at: "2026-05-08T06:00:00Z",
    updates: [
      { message: "Investigando relatórios de latência elevada nas conexões WebSocket.", created_at: "2026-05-08T06:00:00Z" },
      { message: "Identificado aumento de conexões simultâneas. Escalando instâncias.", created_at: "2026-05-08T06:45:00Z" },
      { message: "Instâncias adicionadas. Monitorando estabilização.", created_at: "2026-05-08T07:30:00Z" },
    ],
  },
  {
    id: "inc-002", title: "Indisponibilidade do serviço Apple Music Distribution",
    status: "resolved", severity: "major", services: ["svc-upload"],
    created_at: "2026-05-04T10:00:00Z", resolved_at: "2026-05-04T14:30:00Z",
    updates: [
      { message: "Apple Music retornando erro 503 para novos envios.", created_at: "2026-05-04T10:00:00Z" },
      { message: "Identificado problema no certificado de autenticação com a API da Apple.", created_at: "2026-05-04T11:15:00Z" },
      { message: "Certificado renovado. Serviço restaurado.", created_at: "2026-05-04T14:30:00Z" },
    ],
  },
];

export const MOCK_REQUESTS: SupportRequest[] = [
  {
    id: "req-001", tenant_id: TENANT_ID, type: "feature",
    title: "Integração nativa com DistroKid para importação automática de royalties",
    description: "Seria muito útil ter a importação automática dos relatórios mensais do DistroKid sem precisar baixar e importar manualmente o CSV.",
    status: "in_review", priority: "high",
    created_at: "2026-05-08T07:30:00Z", updated_at: "2026-05-08T09:00:00Z", votes: 23,
  },
  {
    id: "req-002", tenant_id: TENANT_ID, type: "feature",
    title: "Assinatura digital de contratos via WhatsApp",
    description: "Permitir que artistas assinem contratos diretamente pelo WhatsApp, sem precisar acessar o sistema.",
    status: "pending", priority: "medium",
    created_at: "2026-05-07T14:00:00Z", updated_at: "2026-05-07T14:00:00Z", votes: 17,
  },
  {
    id: "req-003", tenant_id: TENANT_ID, type: "bug",
    title: "Campo de busca no CRM não retorna resultados com acentos",
    description: "Ao buscar 'João' no CRM, não aparece nenhum resultado. Mas 'Joao' funciona corretamente.",
    status: "approved", priority: "medium",
    created_at: "2026-05-06T10:00:00Z", updated_at: "2026-05-07T16:00:00Z", votes: 12,
  },
  {
    id: "req-004", tenant_id: TENANT_ID, type: "feature",
    title: "Relatório de royalties por artista em PDF",
    description: "Exportar relatório mensal de royalties por artista em formato PDF com gráficos.",
    status: "pending", priority: "low",
    created_at: "2026-05-05T08:00:00Z", updated_at: "2026-05-05T08:00:00Z", votes: 8,
  },
  {
    id: "req-005", tenant_id: TENANT_ID, type: "question",
    title: "Como configurar alertas automáticos de vencimento de contratos?",
    description: "Quero receber email automaticamente 30 e 7 dias antes do vencimento de cada contrato.",
    status: "done", priority: "low",
    created_at: "2026-05-03T11:00:00Z", updated_at: "2026-05-04T09:00:00Z", votes: 5,
  },
];
