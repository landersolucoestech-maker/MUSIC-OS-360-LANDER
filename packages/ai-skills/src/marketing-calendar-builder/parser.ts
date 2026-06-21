/**
 * skills/marketing-calendar-builder/parsers/marketing-calendar-builder.parser.ts
 *
 * Converte a resposta crua do provider em MarketingCalendarBuilderOutput estruturado.
 * Estratégia:
 *  1. tentar extrair e parsear JSON da resposta (com/sem cercas markdown, com texto à volta);
 *  2. coagir cada campo para o shape esperado, descartando valores inválidos;
 *  3. se nada for aproveitável, devolver fallback estruturado seguro que monta um
 *     calendário mínimo a partir de datas, plataformas e frequência (sinalizado
 *     como heurístico local no texto).
 * NUNCA lança — qualquer resposta malformada resulta num output válido.
 */

import type {
  MarketingCalendarBuilderInput,
  MarketingCalendarBuilderOutput,
  MarketingFrequency,
  MarketingCalendarEntry,
  ContentPillar,
  MarketingDailyAction,
  PlatformStrategy,
  MarketingCampaignPhase,
  MarketingProductionNeed,
} from "./contracts";
import type { SkillPriority } from "../shared/primitives";

const PRIORITIES: SkillPriority[] = ["low", "medium", "high", "critical"];
const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_FALLBACK_ENTRIES = 90;

// ─── Helpers de coerção ───────────────────────────────────────────────────────

function asString(value: unknown, fallback = ""): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => asString(v)).filter((v) => v.length > 0);
}

function asPriority(value: unknown): SkillPriority {
  const v = asString(value).toLowerCase();
  return (PRIORITIES as string[]).includes(v) ? (v as SkillPriority) : "medium";
}

function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is Record<string, unknown> => typeof v === "object" && v !== null);
}

/** Atribui uma string opcional só quando não vazia (preserva campos `?`). */
function setIfPresent<T extends object>(target: T, key: keyof T, value: string): void {
  if (value) (target as unknown as Record<string, unknown>)[key as string] = value;
}

// ─── Mapeadores de blocos ─────────────────────────────────────────────────────

function mapCalendar(value: unknown): MarketingCalendarEntry[] {
  return asRecordArray(value).map((e) => {
    const entry: MarketingCalendarEntry = {
      date:        asString(e.date),
      platform:    asString(e.platform),
      contentType: asString(e.contentType),
      title:       asString(e.title),
      description: asString(e.description),
      status:      "planned",
    };
    setIfPresent(entry, "cta", asString(e.cta));
    return entry;
  });
}

function mapPillars(value: unknown): ContentPillar[] {
  return asRecordArray(value).map((p) => ({
    pillar:      asString(p.pillar),
    description: asString(p.description),
    examples:    asStringArray(p.examples),
  }));
}

function mapDailyActions(value: unknown): MarketingDailyAction[] {
  return asRecordArray(value).map((a) => ({
    date:     asString(a.date),
    action:   asString(a.action),
    priority: asPriority(a.priority),
  }));
}

function mapPlatformStrategy(value: unknown): PlatformStrategy[] {
  return asRecordArray(value).map((s) => ({
    platform:            asString(s.platform),
    strategy:            asString(s.strategy),
    frequencySuggestion: asString(s.frequencySuggestion),
  }));
}

function mapPhases(value: unknown): MarketingCampaignPhase[] {
  return asRecordArray(value).map((p) => ({
    name:      asString(p.name),
    startDate: asString(p.startDate),
    endDate:   asString(p.endDate),
    objective: asString(p.objective),
  }));
}

function mapProductionNeeds(value: unknown): MarketingProductionNeed[] {
  return asRecordArray(value).map((n) => ({
    item:     asString(n.item),
    area:     asString(n.area),
    priority: asPriority(n.priority),
  }));
}

// ─── Datas / frequência (fallback) ────────────────────────────────────────────

function parseDate(value: string): number | null {
  const ts = Date.parse(value);
  return Number.isNaN(ts) ? null : ts;
}

function formatDate(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10);
}

const FREQUENCY_STRIDE_DAYS: Record<MarketingFrequency, number> = {
  low:       4,
  medium:    2,
  high:      1,
  intensive: 1,
};

const FREQUENCY_SUGGESTION: Record<MarketingFrequency, string> = {
  low:       "~2 posts/semana",
  medium:    "~3–4 posts/semana",
  high:      "~1 post/dia",
  intensive: "múltiplos posts/dia",
};

// ─── Fallback estruturado seguro ──────────────────────────────────────────────

const HEURISTIC_NOTE = "Calendário heurístico local: gerado a partir de datas, plataformas e frequência — refine com a estratégia da campanha.";

function buildFallbackCalendar(input: MarketingCalendarBuilderInput): MarketingCalendarEntry[] {
  const start = parseDate(input.startDate);
  const end = parseDate(input.endDate);
  const platforms = input.platforms.length > 0 ? input.platforms : ["instagram"];

  // Sem datas parseáveis: uma única entrada na startDate informada.
  if (start === null || end === null || end < start) {
    return [
      {
        date:        input.startDate,
        platform:    String(platforms[0]),
        contentType: "post",
        title:       `Conteúdo — ${input.artistName}`,
        description: HEURISTIC_NOTE,
        status:      "planned",
      },
    ];
  }

  const stride = FREQUENCY_STRIDE_DAYS[input.frequency] ?? 2;
  const postsPerDate = input.frequency === "intensive" ? 2 : 1;

  const entries: MarketingCalendarEntry[] = [];
  let cursor = start;
  let i = 0;

  while (cursor <= end && entries.length < MAX_FALLBACK_ENTRIES) {
    for (let p = 0; p < postsPerDate && entries.length < MAX_FALLBACK_ENTRIES; p++) {
      const platform = String(platforms[i % platforms.length]);
      entries.push({
        date:        formatDate(cursor),
        platform,
        contentType: "post",
        title:       `Conteúdo ${entries.length + 1} — ${input.artistName}`,
        description: HEURISTIC_NOTE,
        status:      "planned",
      });
      i++;
    }
    cursor += stride * DAY_MS;
  }

  return entries;
}

function buildFallbackPhases(input: MarketingCalendarBuilderInput): MarketingCampaignPhase[] {
  const start = parseDate(input.startDate);
  const end = parseDate(input.endDate);

  if (start === null || end === null || end < start) {
    return [
      { name: "Campanha", startDate: input.startDate, endDate: input.endDate, objective: input.campaignGoal },
    ];
  }

  const third = Math.floor((end - start) / 3);
  const p1End = start + third;
  const p2End = start + third * 2;

  return [
    { name: "Pré-lançamento", startDate: formatDate(start),         endDate: formatDate(p1End), objective: "Gerar expectativa e antecipação." },
    { name: "Lançamento",     startDate: formatDate(p1End + DAY_MS), endDate: formatDate(p2End), objective: input.campaignGoal },
    { name: "Pós-lançamento", startDate: formatDate(p2End + DAY_MS), endDate: formatDate(end),   objective: "Sustentar o alcance e converter." },
  ];
}

function buildFallback(input: MarketingCalendarBuilderInput): MarketingCalendarBuilderOutput {
  const platforms = input.platforms.length > 0 ? input.platforms : ["instagram"];
  const freqSuggestion = FREQUENCY_SUGGESTION[input.frequency] ?? "~3 posts/semana";

  return {
    calendar: buildFallbackCalendar(input),
    contentPillars: [
      { pillar: "Bastidores", description: "Mostrar o processo e a rotina do artista.", examples: ["Making of", "Ensaios"] },
      { pillar: "Conexão",    description: "Engajar a audiência com história e propósito.", examples: ["Storytelling", "Q&A"] },
      { pillar: "Lançamento", description: "Destacar a música/produto e o CTA.", examples: ["Teaser", "Snippet", "Pre-save"] },
    ],
    dailyActions: [],
    platformStrategy: platforms.map((platform) => ({
      platform:            String(platform),
      strategy:            `${HEURISTIC_NOTE} Ajustar abordagem ao canal ${platform}.`,
      frequencySuggestion: freqSuggestion,
    })),
    CTAs: ["Ouça agora", "Salve nas suas playlists", "Compartilhe", "Ative o pre-save"],
    campaignPhases: buildFallbackPhases(input),
    productionNeeds: [
      { item: "Definir identidade visual da campanha", area: "Design", priority: "high" },
      { item: "Produzir cortes/clips para social", area: "Audiovisual", priority: "medium" },
    ],
  };
}

// ─── Extração de JSON da resposta ─────────────────────────────────────────────

function extractJson(raw: string): Record<string, unknown> | null {
  if (!raw) return null;

  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;

  const direct = tryParse(candidate);
  if (direct) return direct;

  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start !== -1 && end !== -1 && end > start) {
    return tryParse(candidate.slice(start, end + 1));
  }

  return null;
}

function tryParse(text: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(text.trim());
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    // ignora — resposta não era JSON válido
  }
  return null;
}

// ─── Parser principal ─────────────────────────────────────────────────────────

export function parseMarketingCalendarBuilderResponse(
  raw: string,
  input: MarketingCalendarBuilderInput,
): MarketingCalendarBuilderOutput {
  const json = extractJson(raw);

  const fallback = buildFallback(input);

  if (!json) {
    return fallback;
  }

  const calendar = mapCalendar(json.calendar);

  return {
    calendar:         calendar.length > 0 ? calendar : fallback.calendar,
    contentPillars:   mapPillars(json.contentPillars),
    dailyActions:     mapDailyActions(json.dailyActions),
    platformStrategy: mapPlatformStrategy(json.platformStrategy),
    CTAs:             asStringArray(json.CTAs),
    campaignPhases:   json.campaignPhases !== undefined ? mapPhases(json.campaignPhases) : fallback.campaignPhases,
    productionNeeds:  mapProductionNeeds(json.productionNeeds),
  };
}
