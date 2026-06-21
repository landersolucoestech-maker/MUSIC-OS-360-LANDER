/**
 * skills/audiovisual-briefing/templates/audiovisual-briefing.template.ts
 *
 * Templates de referência por tipo de conteúdo audiovisual: proporção, duração
 * típica, equipe-base e entregáveis. Guia para enriquecer o briefing — não
 * substitui a saída do modelo.
 */

import type { AudiovisualContentType } from "@music-os-360/ai-skills";

export interface AudiovisualBriefingTemplate {
  contentType: AudiovisualContentType;
  label: string;
  aspectRatio: string;
  typicalDuration: string;
  baseTeam: string[];
  defaultPlatforms: string[];
}

export const AUDIOVISUAL_BRIEFING_TEMPLATES: AudiovisualBriefingTemplate[] = [
  {
    contentType: "music-video",
    label: "Videoclipe",
    aspectRatio: "16:9",
    typicalDuration: "3–5 min",
    baseTeam: ["Direção", "Direção de fotografia", "Produção", "Direção de arte", "Edição"],
    defaultPlatforms: ["YouTube"],
  },
  {
    contentType: "lyric-video",
    label: "Lyric Video",
    aspectRatio: "16:9",
    typicalDuration: "3–4 min",
    baseTeam: ["Motion designer", "Edição", "Revisão de letra"],
    defaultPlatforms: ["YouTube"],
  },
  {
    contentType: "visualizer",
    label: "Visualizer",
    aspectRatio: "16:9",
    typicalDuration: "3–4 min (loop)",
    baseTeam: ["Motion designer", "Edição"],
    defaultPlatforms: ["YouTube", "Spotify Canvas"],
  },
  {
    contentType: "teaser",
    label: "Teaser",
    aspectRatio: "9:16 / 1:1",
    typicalDuration: "5–20 s",
    baseTeam: ["Edição", "Social media"],
    defaultPlatforms: ["Instagram", "TikTok"],
  },
  {
    contentType: "reels",
    label: "Reels",
    aspectRatio: "9:16",
    typicalDuration: "15–60 s",
    baseTeam: ["Captação", "Edição", "Social media"],
    defaultPlatforms: ["Instagram Reels"],
  },
  {
    contentType: "shorts",
    label: "Shorts",
    aspectRatio: "9:16",
    typicalDuration: "15–60 s",
    baseTeam: ["Captação", "Edição", "Social media"],
    defaultPlatforms: ["YouTube Shorts"],
  },
  {
    contentType: "stories",
    label: "Stories",
    aspectRatio: "9:16",
    typicalDuration: "5–15 s por card",
    baseTeam: ["Social media", "Edição leve"],
    defaultPlatforms: ["Instagram Stories"],
  },
  {
    contentType: "institutional",
    label: "Institucional / EPK",
    aspectRatio: "16:9",
    typicalDuration: "1–3 min",
    baseTeam: ["Direção", "Produção", "Edição", "Roteiro"],
    defaultPlatforms: ["Site", "YouTube"],
  },
  {
    contentType: "other",
    label: "Outro",
    aspectRatio: "A definir",
    typicalDuration: "A definir",
    baseTeam: ["Direção", "Edição"],
    defaultPlatforms: ["A definir"],
  },
];

export function getAudiovisualBriefingTemplate(
  contentType: AudiovisualContentType,
): AudiovisualBriefingTemplate | undefined {
  return AUDIOVISUAL_BRIEFING_TEMPLATES.find((t) => t.contentType === contentType);
}
