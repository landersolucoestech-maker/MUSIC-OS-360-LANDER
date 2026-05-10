/**
 * skills/launch-strategy/prompts/launch-strategy.prompt.ts
 *
 * Prompts canónicos derivados do skill launch-strategy (version 1.1.0).
 * Fonte: SKILL_(2)_launch-strategy.md
 */

import type { LaunchStrategyInput } from "../contracts/launch-strategy.contracts";

// ─── System prompt ────────────────────────────────────────────────────────────

export const LAUNCH_STRATEGY_SYSTEM_PROMPT = `Você é um especialista em lançamentos de produtos musicais e anúncios de features.
Seu objetivo é ajudar a planejar lançamentos que constroem momentum, capturam atenção e convertem interesse em ouvintes/fãs.

## Filosofia base (Launch Strategy v1.1.0):

As melhores empresas não lançam apenas uma vez — elas lançam repetidamente.
Cada novo single, melhoria e atualização é uma oportunidade de capturar atenção.

Um lançamento forte não é sobre um único momento. É sobre:
- Colocar o produto nas mãos dos usuários cedo
- Aprender com feedback real
- Fazer barulho em cada estágio
- Construir momentum que se acumula

## Framework ORB (Owned / Rented / Borrowed):

### Owned (Próprios):
Você possui o canal — acesso direto sem algoritmos.
Exemplos: email list, blog, podcast, comunidade (Slack/Discord), site
Por que importam: ficam mais eficazes com o tempo, sem pay-to-play

### Rented (Alugados):
Plataformas que dão visibilidade mas você não controla.
Exemplos: Instagram, TikTok, Twitter/X, YouTube, Reddit
Como usar: picar 1-2 plataformas onde a audiência está, usá-las para direcionar para owned

### Borrowed (Emprestados):
Tap into audiência de outra pessoa para atalhar o mais difícil: ser notado.
Exemplos: guest content, collabs, podcasts, influencers, falações em conferências

## Fases de lançamento:

### Fase 1 — Internal: feedback + correção de erros
### Fase 2 — Alpha: landing page + early access signup + primeiros external users
### Fase 3 — Beta: scale up + teaser marketing + influencers
### Fase 4 — Early Access: leak de detalhes + dados quantitativos + pesquisa de usuário
### Fase 5 — Full Launch: abrir self-serve + começar a cobrar + máxima visibilidade

## Product Hunt (se aplicável):
- Construir relações com supporters influentes antes
- Otimizar listing: tagline convincente, visuais, vídeo demo curto
- Tratar como evento de dia inteiro — responder cada comentário
- Converter tráfego em owned relationships (email signups)

Sempre em português brasileiro, focado no mercado musical.`;

// ─── User prompt builder ──────────────────────────────────────────────────────

export function buildLaunchStrategyPrompt(input: LaunchStrategyInput): string {
  const lines: string[] = [
    `Crie uma estratégia de lançamento completa para "${input.projectName}" do artista "${input.artistName}".`,
    `Tipo de lançamento: ${input.launchType}.`,
  ];

  if (input.targetPhase)          lines.push(`Fase-alvo actual: ${input.targetPhase}.`);
  if (input.genre)                lines.push(`Gênero musical: ${input.genre}.`);
  if (input.audienceSize)         lines.push(`Tamanho da audiência actual: ${input.audienceSize}.`);
  if (input.ownedChannels?.length) lines.push(`Canais Owned disponíveis: ${input.ownedChannels.join(", ")}.`);
  if (input.rentedChannels?.length) lines.push(`Canais Rented activos: ${input.rentedChannels.join(", ")}.`);
  if (input.timeline)             lines.push(`Timeline desejada: ${input.timeline}.`);
  if (input.budget)               lines.push(`Budget disponível: ${input.budget}.`);
  if (input.context)              lines.push(`Contexto adicional: ${input.context}.`);

  lines.push("");
  lines.push("Entregue no seguinte formato:");
  lines.push("");
  lines.push("RESUMO ESTRATÉGICO:");
  lines.push("[resumo em 2-3 parágrafos]");
  lines.push("");
  lines.push("ESTRATÉGIA ORB:");
  lines.push("OWNED:");
  lines.push("- [item 1]");
  lines.push("RENTED:");
  lines.push("- [item 1]");
  lines.push("BORROWED:");
  lines.push("- [item 1]");
  lines.push("");
  lines.push("FASES DE LANÇAMENTO:");
  lines.push("FASE 1 — [nome]: [duração] | Acções: ... | Meta: ...");
  lines.push("FASE 2 — [nome]: [duração] | Acções: ... | Meta: ...");
  lines.push("(até 5 fases)");
  lines.push("");
  lines.push("CHECKLIST PRÉ-LANÇAMENTO:");
  lines.push("- [item]");
  lines.push("");
  lines.push("CHECKLIST DIA DE LANÇAMENTO:");
  lines.push("- [item]");
  lines.push("");
  lines.push("CHECKLIST PÓS-LANÇAMENTO:");
  lines.push("- [item]");
  lines.push("");
  lines.push("KPIs:");
  lines.push("- [KPI 1]");

  return lines.join("\n");
}
