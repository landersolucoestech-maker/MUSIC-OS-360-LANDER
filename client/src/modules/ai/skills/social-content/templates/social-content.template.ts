/**
 * skills/social-content/templates/social-content.template.ts
 *
 * Templates reutilizáveis de conteúdo social por formato e plataforma.
 * Usados pelo SkillEngine para pré-preencher prompts com estrutura adequada.
 */

import type { SocialPlatform, SocialContentFormat } from "../contracts/social-content.contracts";

export interface SocialTemplate {
  platform: SocialPlatform;
  format: SocialContentFormat;
  structure: string;
  maxCharacters?: number;
  hookExamples: string[];
}

export const SOCIAL_TEMPLATES: SocialTemplate[] = [
  {
    platform: "instagram",
    format: "post",
    maxCharacters: 2200,
    structure: `[HOOK — primeira linha para parar o scroll]

[DESENVOLVIMENTO — 2-4 parágrafos curtos]

[CALL TO ACTION — o que fazer agora]

[HASHTAGS — 5-15 relevantes]`,
    hookExamples: [
      "Você sabia que [fato surpreendente sobre o artista/música]?",
      "Tem algo que preciso te contar sobre [artista]...",
      "[Resultado impressionante] — e começou há apenas [tempo].",
    ],
  },
  {
    platform: "instagram",
    format: "caption",
    maxCharacters: 300,
    structure: `[Frase de impacto — máximo 125 chars]
[Emoji relevante] [Complemento curto]
[CTA + hashtags]`,
    hookExamples: [
      "Quando a música fala mais alto que as palavras 🎵",
      "Este momento mudou tudo ✨",
    ],
  },
  {
    platform: "tiktok",
    format: "short-video-script",
    maxCharacters: 2200,
    structure: `[0-3s] HOOK: [pergunta ou afirmação impactante]
[3-10s] PROBLEMA: [dor ou situação relacionável]
[10-25s] SOLUÇÃO: [como artista/música resolve isso]
[25-30s] CTA: [seguir, ouvir, comentar]

LEGENDA: [max 150 chars]
HASHTAGS: [5-8 trending]`,
    hookExamples: [
      "POV: você descobre [artista] pela primeira vez",
      "Ninguém fala sobre isso mas [artista] está...",
    ],
  },
  {
    platform: "twitter",
    format: "thread",
    maxCharacters: 280,
    structure: `Tweet 1/N: [Hook forte — prender atenção]

Tweet 2: [Contexto — por que isso importa]

Tweet 3-8: [Desenvolvimento — um ponto por tweet]

Tweet N: [Conclusão + CTA]`,
    hookExamples: [
      "Thread: [N] coisas que aprendi gerenciando [artista] 🧵",
      "Vou explicar por que [artista] vai dominar [mercado/plataforma]:",
    ],
  },
  {
    platform: "youtube",
    format: "caption",
    maxCharacters: 5000,
    structure: `[Título com keyword principal]

[Parágrafo 1: O que o vídeo cobre]
[Parágrafo 2: Por que assistir]
[Parágrafo 3: Links e recursos]

🎵 Ouça também: [link]
📱 Redes: [links]

TAGS: [keywords relevantes]`,
    hookExamples: [
      "Tudo que você precisa saber sobre [artista/álbum]",
    ],
  },
  {
    platform: "linkedin",
    format: "post",
    maxCharacters: 3000,
    structure: `[Hook — primeira linha sem "mais" button]

[Contexto — 1-2 parágrafos]

[Insight principal com bullet points:]
→ Ponto 1
→ Ponto 2
→ Ponto 3

[Conclusão + pergunta para engajamento]

[3-5 hashtags profissionais]`,
    hookExamples: [
      "A indústria musical mudou. Veja como [artista] se adaptou:",
      "[Número]% dos artistas cometem este erro no lançamento:",
    ],
  },
  {
    platform: "spotify",
    format: "bio",
    maxCharacters: 1500,
    structure: `[Nome artístico] é [gênero] de [cidade/região].

[Parágrafo 1: origem e influências]
[Parágrafo 2: álbuns/singles principais]
[Parágrafo 3: conquistas e colaborações]

[Frase de fechamento impactante]`,
    hookExamples: [
      "Nascido no coração do [gênero] brasileiro,",
    ],
  },
];

export function getTemplateForPlatformFormat(
  platform: SocialPlatform,
  format: SocialContentFormat,
): SocialTemplate | undefined {
  return SOCIAL_TEMPLATES.find((t) => t.platform === platform && t.format === format);
}
