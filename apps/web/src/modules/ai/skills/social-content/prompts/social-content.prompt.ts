/**
 * skills/social-content/prompts/social-content.prompt.ts
 *
 * Prompts canónicos derivados do skill social-content (version 1.3.0).
 * NÃO hardcoded em componentes — sempre via SkillEngine.
 *
 * Fonte: SKILL_social-content.md (name: social-content, version: 1.3.0)
 */

import type { SocialContentInput } from "../contracts/social-content.contracts";

// ─── System prompt ────────────────────────────────────────────────────────────

export const SOCIAL_CONTENT_SYSTEM_PROMPT = `Você é um especialista em social media para a indústria musical brasileira.
Seu objetivo é criar conteúdo envolvente que constrói audiência, gera engajamento e suporta objetivos de negócio.

## Princípios base (Social Content v1.3.0):

### Plataformas e formatos:
- LinkedIn: B2B, liderança de pensamento — carrosséis, stories
- Twitter/X: tech, tempo real, comunidade — threads, hot takes
- Instagram: marcas visuais — Reels, carrosséis
- TikTok: awareness — vídeo curto (15-60s)
- Facebook: comunidades, negócios locais

### Fórmulas de Hook (primeira linha é decisiva):
**Curiosidade:** "Eu estava errado sobre [crença comum]."
**História:** "Na semana passada, [algo inesperado] aconteceu."
**Valor:** "Como [resultado desejável] (sem [dor comum]):"
**Contrarian:** "Opinião impopular: [declaração ousada]"

### The 3-Second Rule (vídeo):
[HOOK VISUAL] + [HOOK VERBAL] + [TEXTO OVERLAY] — tudo no primeiro segundo.

### Estrutura de vídeo curto (15-30s):
[0-3s] Hook: Problema
[3-10s] Agite: Por que importa
[10-25s] Solução: Método/produto
[25-30s] CTA: Próximo passo

### Métricas que importam:
- Awareness: Impressões, Alcance, crescimento de seguidores
- Engajamento: Taxa de engajamento, Comentários, Compartilhamentos, Saves
- Conversão: Cliques, Visitas ao perfil, DMs, Leads

### Repurposing:
Blog post → LinkedIn (insight + link) + Twitter thread + Instagram carousel
Podcast → 3-5 clips curtos + 1 thread + 1 carousel + 1 post newsletter

Sempre em português brasileiro, autêntico e adequado ao mercado musical.`;

// ─── User prompt builder ──────────────────────────────────────────────────────

export function buildSocialContentPrompt(input: SocialContentInput): string {
  const lines: string[] = [
    `Crie um "${input.format}" para a plataforma "${input.platform}" para o artista "${input.artistName}".`,
  ];

  if (input.genre)          lines.push(`Gênero musical: ${input.genre}.`);
  if (input.tone)           lines.push(`Tom/estilo: ${input.tone}.`);
  if (input.topic)          lines.push(`Tema/assunto: ${input.topic}.`);
  if (input.targetAudience) lines.push(`Público-alvo: ${input.targetAudience}.`);
  if (input.keywords?.length) lines.push(`Palavras-chave: ${input.keywords.join(", ")}.`);
  if (input.context)        lines.push(`Contexto adicional: ${input.context}.`);

  lines.push("");
  lines.push("Entregue:");
  lines.push(`1. Conteúdo principal (${input.format}) optimizado para ${input.platform}`);
  lines.push("2. 5-10 hashtags relevantes");
  lines.push("3. 1 versão alternativa com ângulo diferente");
  lines.push("4. Estimativa de engajamento (baixo/médio/alto/muito alto)");
  lines.push("");
  lines.push("Formato de resposta:");
  lines.push("CONTEÚDO PRINCIPAL:");
  lines.push("[conteúdo aqui]");
  lines.push("");
  lines.push("HASHTAGS:");
  lines.push("[hashtags aqui]");
  lines.push("");
  lines.push("VERSÃO ALTERNATIVA:");
  lines.push("[versão alternativa aqui]");
  lines.push("");
  lines.push("ENGAJAMENTO ESTIMADO: [baixo|médio|alto|muito alto]");

  return lines.join("\n");
}

// ─── Prompt para geração de calendar (repurposing) ────────────────────────────

export function buildRepurposingPrompt(params: {
  artistName: string;
  pillarContent: string;
  platforms: string[];
}): string {
  return `Com base no seguinte conteúdo pilar do artista "${params.artistName}":

"${params.pillarContent}"

Gere um plano de repurposing para as plataformas: ${params.platforms.join(", ")}.

Para cada plataforma, crie:
1. Post adaptado ao formato nativo da plataforma
2. Hook específico para aquela audiência
3. CTA adequado

Mantenha autenticidade e voz do artista.`;
}
