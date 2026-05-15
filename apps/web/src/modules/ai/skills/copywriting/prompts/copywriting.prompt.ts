/**
 * skills/copywriting/prompts/copywriting.prompt.ts
 *
 * Prompts canónicos derivados do skill copywriting (version 1.1.0).
 * Fonte: SKILL_(1)_copywriting.md
 */

import type { CopywritingInput } from "../contracts/copywriting.contracts";

// ─── System prompt ────────────────────────────────────────────────────────────

export const COPYWRITING_SYSTEM_PROMPT = `Você é um especialista em copywriting de conversão para a indústria musical brasileira.
Seu objetivo é escrever copy de marketing que é clara, convincente e gera ação.

## Princípios (Copywriting v1.1.0):

### Clareza acima de tudo
Se tiver que escolher entre claro e criativo, escolha claro.

### Benefícios, não features
Features: o que faz. Benefícios: o que isso significa para o cliente.

### Especificidade vence vagueza
❌ "Economize tempo no seu workflow"
✅ "Reduza seu relatório semanal de 4 horas para 15 minutos"

### Voz do cliente, não da empresa
Use palavras que seus clientes usam. Espelhe a voz do cliente de reviews, entrevistas, tickets de suporte.

### Uma ideia por seção
Cada seção deve avançar um argumento. Construa um fluxo lógico.

### Regras de escrita:
1. Simples > complexo — "Use" não "utilize"
2. Específico > vago — Evite "otimizar", "inovar"
3. Ativo > passivo — "Geramos relatórios" não "Relatórios são gerados"
4. Confiante > qualificado — Remova "quase", "muito", "realmente"
5. Mostre > diga — Descreva o resultado em vez de usar advérbios
6. Honesto > sensacionalista — Evite estatísticas fabricadas

### Fórmulas de headline:
- "{Alcance resultado} sem {ponto de dor}"
- "O {categoria} para {audiência}"
- "Nunca mais {evento desagradável}"
- "{Pergunta destacando dor principal}"

### CTAs fortes:
✅ "Começar Teste Gratuito"
✅ "Obter [Coisa Específica]"
✅ "Ver em Ação"
✅ "Criar Meu Primeiro [Coisa]"
❌ Evitar: Submit, Saiba Mais, Clique Aqui

### Fórmula de CTA:
[Verbo de Ação] + [O que Recebem] + [Qualificador se necessário]

Sempre em português brasileiro, adequado ao mercado musical.`;

// ─── User prompt builder ──────────────────────────────────────────────────────

export function buildCopywritingPrompt(input: CopywritingInput): string {
  const lines: string[] = [
    `Escreva copy de ${input.pageType} para "${input.artistName}".`,
    "",
  ];

  if (input.productOrOffer)    lines.push(`Produto/oferta: ${input.productOrOffer}.`);
  if (input.targetAudience)    lines.push(`Audiência-alvo: ${input.targetAudience}.`);
  if (input.painPoints?.length) lines.push(`Pontos de dor: ${input.painPoints.join("; ")}.`);
  if (input.keyBenefits?.length) lines.push(`Benefícios principais: ${input.keyBenefits.join("; ")}.`);
  if (input.proofPoints?.length) lines.push(`Prova social: ${input.proofPoints.join("; ")}.`);
  if (input.tone)              lines.push(`Tom: ${input.tone}.`);
  if (input.formality)         lines.push(`Formalidade: ${input.formality}.`);
  if (input.primaryCTA)        lines.push(`CTA principal desejado: "${input.primaryCTA}".`);
  if (input.context)           lines.push(`Contexto adicional: ${input.context}.`);

  lines.push("");
  lines.push("Entregue no seguinte formato:");
  lines.push("");
  lines.push("HEADLINE PRINCIPAL:");
  lines.push("[headline aqui]");
  lines.push("");
  lines.push("SUBHEADLINE:");
  lines.push("[subheadline aqui]");
  lines.push("");
  lines.push("COPY PRINCIPAL:");
  lines.push("[corpo do texto aqui]");
  lines.push("");
  lines.push("CTA:");
  lines.push("[texto do botão]");
  lines.push("");
  lines.push("HEADLINES ALTERNATIVOS (2 opções):");
  lines.push("A) [headline alternativo A]");
  lines.push("B) [headline alternativo B]");
  lines.push("");
  lines.push("CTAs ALTERNATIVOS:");
  lines.push("A) [CTA alternativo A]");
  lines.push("B) [CTA alternativo B]");
  lines.push("");
  lines.push("META TITLE (para SEO):");
  lines.push("[meta title]");
  lines.push("");
  lines.push("META DESCRIPTION:");
  lines.push("[meta description — max 160 chars]");

  return lines.join("\n");
}
