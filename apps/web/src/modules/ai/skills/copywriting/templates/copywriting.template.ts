/**
 * skills/copywriting/templates/copywriting.template.ts
 * Templates de estrutura de página por tipo.
 */

import type { CopyPageType } from "../contracts/copywriting.contracts";

export interface CopyTemplate {
  pageType: CopyPageType;
  sections: string[];
  headlineFormulas: string[];
  ctaExamples: string[];
}

export const COPY_TEMPLATES: CopyTemplate[] = [
  {
    pageType: "homepage",
    sections: [
      "Above the fold: Headline + Subheadline + CTA primário",
      "Prova social: logos, números, depoimentos",
      "Problema/Dor: mostrar compreensão",
      "Solução/Benefícios: 3-5 benefícios principais",
      "Como funciona: 3-4 passos",
      "Objeções: FAQ e garantias",
      "CTA final: recapitular valor + repetir CTA",
    ],
    headlineFormulas: [
      "{Alcance resultado} sem {ponto de dor}",
      "O {categoria} para {audiência}",
      "Nunca mais {evento desagradável}",
    ],
    ctaExamples: ["Começar Gratuitamente", "Ver Como Funciona", "Ouvir Agora"],
  },
  {
    pageType: "landing-page",
    sections: [
      "Mensagem única + CTA único",
      "Headline alinhada à fonte de tráfego",
      "Argumento completo em uma página",
    ],
    headlineFormulas: [
      "{Audiência}: finalmente uma solução para {dor}",
      "Como {artista} conseguiu {resultado} em {tempo}",
    ],
    ctaExamples: ["Quero Começar Agora", "Acessar Conteúdo Gratuito"],
  },
  {
    pageType: "press-release",
    sections: [
      "Headline: notícia principal em uma frase",
      "Lead: quem, o quê, quando, onde, porquê",
      "Corpo: contexto e detalhes",
      "Quote: declaração do artista/label",
      "Boilerplate: sobre o artista",
      "Contato de imprensa",
    ],
    headlineFormulas: [
      "{Artista} lança {projeto} e {resultado/impacto}",
      "{Artista} anuncia {novidade} para {data}",
    ],
    ctaExamples: ["Para entrevistas, contactar:", "Ouça em:"],
  },
  {
    pageType: "email-marketing",
    sections: [
      "Subject line: abertura (curiosidade/urgência/personalização)",
      "Preview text: complementa o subject",
      "Saudação personalizada",
      "Corpo: uma mensagem principal",
      "CTA único e claro",
      "Assinatura",
      "Footer legal",
    ],
    headlineFormulas: [
      "[Nome], {mensagem personalizada}",
      "Novidade: {artista} {anúncio}",
    ],
    ctaExamples: ["Ouvir Agora", "Ver Mais", "Garantir Meu Lugar"],
  },
  {
    pageType: "bio",
    sections: [
      "Quem é: nome, gênero, origem",
      "Por que importa: proposta única",
      "Conquistas: números e destaques",
      "Humanização: história pessoal",
      "CTA suave: onde encontrar",
    ],
    headlineFormulas: [
      "{Artista} é {descrição única que o diferencia}",
    ],
    ctaExamples: ["Ouça em todas as plataformas", "Siga nas redes"],
  },
];

export function getCopyTemplate(pageType: CopyPageType): CopyTemplate | undefined {
  return COPY_TEMPLATES.find((t) => t.pageType === pageType);
}

