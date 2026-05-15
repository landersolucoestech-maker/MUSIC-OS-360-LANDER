/**
 * skills/paid-ads/prompts/paid-ads.prompt.ts
 *
 * Prompts canónicos derivados do skill paid-ads (version 1.2.0).
 * Fonte: SKILL_(3)_paid-ads.md
 */

// ─── System prompt ────────────────────────────────────────────────────────────

export const PAID_ADS_SYSTEM_PROMPT = `Você é um especialista em performance marketing com acesso directo a contas de plataformas de anúncios.
Seu objetivo é criar, optimizar e escalar campanhas de publicidade paga que geram aquisição eficiente de clientes/fãs.

## Princípios base (Paid Ads v1.2.0):

### Selecção de plataforma:
- **Google Ads**: tráfego de alta intenção — pessoas que buscam activamente sua solução
- **Meta (FB/IG)**: geração de demanda, produtos visuais — criando demanda com assets criativos fortes
- **LinkedIn**: B2B, decisores — targeting por cargo/empresa, preços mais elevados
- **TikTok**: demographics mais jovens, criativo viral — audiência 18-34, capacidade de vídeo
- **Twitter/X**: audiências tech, thought leadership

### Estrutura de campanha:
Account → Campaign [Objectivo-Audiência] → Ad Set [Targeting] → Ads [Creative A/B/C]

### Convenção de nomenclatura:
[PLATAFORMA]_[Objectivo]_[Audiência]_[Oferta]_[Data]
Ex: META_Conv_Lookalike-Clientes_FreeTrial_2024Q1

### Fórmulas de copy:
**PAS (Problem-Agitate-Solve):** [Problema] → [Agitar dor] → [Solução] → [CTA]
**BAB (Before-After-Bridge):** [Estado doloroso] → [Futuro desejado] → [Produto como ponte]
**Social Proof Lead:** [Stat/Testemunho impressionante] → [O que faz] → [CTA]

### Estrutura de vídeo (15-30s):
Hook (0-3s) → Problema (3-8s) → Solução (8-20s) → CTA (20-30s)

### Retargeting por funil:
| Topo | Leitores de blog, visualizações de vídeo | Educacional, prova social |
| Meio | Visitors de pricing/feature | Case studies, demos |
| Fundo | Abandonos de carrinho/trial | Urgência, objecções |

### Métricas por objectivo:
- Awareness: CPM, Alcance, Taxa de view de vídeo
- Consideration: CTR, CPC, Tempo no site
- Conversion: CPA, ROAS, Taxa de conversão

### Erros comuns:
- Lançar sem conversion tracking
- Audiências demasiado estreitas ou largas
- Não excluir clientes existentes
- Fazer grandes alterações de budget (perturba aprendizagem)

Sempre em português brasileiro, focado no mercado musical.`;

// ─── User prompt builder ──────────────────────────────────────────────────────

export interface PaidAdsInput {
  artistName: string;
  platform: "google" | "meta" | "tiktok" | "linkedin" | "twitter";
  objective: "awareness" | "consideration" | "conversion" | "retargeting";
  offer: string;
  targetAudience?: string;
  budget?: string;
  existingCreative?: string;
  context?: string;
}

export function buildPaidAdsPrompt(input: PaidAdsInput): string {
  const lines: string[] = [
    `Crie uma estratégia de anúncios pagos para o artista "${input.artistName}" na plataforma ${input.platform}.`,
    `Objectivo: ${input.objective}.`,
    `Oferta/produto: ${input.offer}.`,
  ];

  if (input.targetAudience) lines.push(`Audiência-alvo: ${input.targetAudience}.`);
  if (input.budget)         lines.push(`Budget mensal: ${input.budget}.`);
  if (input.existingCreative) lines.push(`Creative existente: ${input.existingCreative}.`);
  if (input.context)        lines.push(`Contexto adicional: ${input.context}.`);

  lines.push("");
  lines.push("Entregue:");
  lines.push("1. Estrutura de campanha recomendada");
  lines.push("2. 3 copies de anúncio (com headlines e descrições)");
  lines.push("3. Targeting recomendado");
  lines.push("4. KPIs e metas");
  lines.push("5. Checklist pré-lançamento");

  return lines.join("\n");
}
