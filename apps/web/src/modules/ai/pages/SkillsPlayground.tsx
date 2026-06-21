/**
 * modules/ai/pages/SkillsPlayground.tsx
 *
 * Tela INTERNA de teste das 12 Skills novas — READ-ONLY.
 *
 * Garantias (escopo desta etapa):
 *  — não grava dados, não cria tarefas, não envia notificações, não dispara
 *    automações e não chama módulos reais de negócio;
 *  — não executa skill em mount (somente ao clicar em "Executar");
 *  — consome exclusivamente o hook useSkill (fiação read-only);
 *  — exibe proveniência (model vs heurística local), disclaimer e confidence.
 *
 * Não registra rota global — apenas exportada pelo barrel para uso interno/admin.
 */

import { useState } from "react";
import { useSkill } from "../hooks";
import type { RunSkillInput } from "../hooks";
import type { RunnableSkillName } from "../application/RunSkill.usecase";

// ─── Skills despacháveis ──────────────────────────────────────────────────────

const SKILLS: RunnableSkillName[] = [
  "project-planning",
  "release-checklist",
  "contract-analysis",
  "catalog-metadata-validator",
  "financial-classification",
  "crm-followup",
  "audiovisual-briefing",
  "marketing-calendar-builder",
  "artist-profile-analysis",
  "licensing-opportunity-analysis",
  "rights-monitoring-analysis",
  "support-triage",
];

const SENSITIVE_SKILLS: ReadonlySet<RunnableSkillName> = new Set<RunnableSkillName>([
  "contract-analysis",
  "licensing-opportunity-analysis",
  "rights-monitoring-analysis",
]);

const SENSITIVE_WARNING =
  "Resultado informativo. Requer revisão humana antes de qualquer decisão jurídica, editorial, comercial ou operacional.";

// ─── Exemplos de input por skill ──────────────────────────────────────────────

const EXAMPLE_INPUTS: Record<RunnableSkillName, unknown> = {
  "project-planning": {
    projectName: "Lançamento do single \"Aurora\"",
    projectType: "lancamento",
    artistName: "Artista Exemplo",
    departments: ["Marketing", "Audiovisual", "Distribuição"],
    goals: ["Atingir 10k streams na 1ª semana", "Crescer base de fãs em 15%"],
  },
  "release-checklist": {
    releaseTitle: "Aurora",
    artistName: "Artista Exemplo",
    releaseType: "single",
    hasCover: true,
    hasISRC: false,
    hasUPC: false,
    hasContracts: true,
    hasSplits: true,
    hasMarketingPlan: false,
  },
  "contract-analysis": {
    contractType: "artist",
    parties: ["Gravadora Exemplo Ltda", "Artista Exemplo"],
    contractText:
      "Pelo presente contrato, a Gravadora Exemplo Ltda contrata o Artista Exemplo em regime de exclusividade " +
      "pelo prazo de 24 meses, para a produção e exploração de fonogramas, mediante repasse de 20% sobre a receita líquida.",
  },
  "catalog-metadata-validator": {
    title: "Aurora",
    type: "recording",
    performers: ["Artista Exemplo"],
    producers: ["Produtor Exemplo"],
    isrc: "BR-ABC-25-00001",
    shares: [{ name: "Artista Exemplo", role: "intérprete", percentage: 100 }],
  },
  "financial-classification": {
    description: "Pagamento de tráfego pago Meta Ads para campanha do single",
    amount: 1500,
    direction: "expense",
    relatedArtist: "Artista Exemplo",
  },
  "crm-followup": {
    leadName: "Marca Exemplo",
    leadType: "brand",
    currentStage: "proposal",
    objective: "Fechar parceria de patrocínio para turnê",
  },
  "audiovisual-briefing": {
    projectTitle: "Clipe \"Aurora\"",
    artistName: "Artista Exemplo",
    contentType: "music-video",
    objective: "Apresentar o conceito visual do single",
    budgetLevel: "medium",
  },
  "marketing-calendar-builder": {
    artistName: "Artista Exemplo",
    campaignGoal: "Maximizar streams no lançamento",
    startDate: "2026-07-01",
    endDate: "2026-07-31",
    platforms: ["instagram", "tiktok", "youtube"],
    frequency: "high",
  },
  "artist-profile-analysis": {
    artistName: "Artista Exemplo",
    genre: "pop alternativo",
    audience: "18-30 anos, urbano",
    strengths: ["Identidade visual forte", "Boa presença em Reels"],
    weaknesses: ["Pouca recorrência de lançamentos"],
  },
  "licensing-opportunity-analysis": {
    workTitle: "Aurora",
    artistName: "Artista Exemplo",
    usageType: "sync",
    territory: "Brasil",
    duration: "12 meses",
    budget: 8000,
  },
  "rights-monitoring-analysis": {
    detectedUse: "Vídeo usando trecho da música sem autorização aparente",
    workTitle: "Aurora",
    artistName: "Artista Exemplo",
    platform: "YouTube",
    evidence: ["URL do vídeo", "Trecho de 30s correspondente ao refrão"],
  },
  "support-triage": {
    subject: "Não consigo acessar o módulo financeiro",
    message: "Quando clico em Financeiro aparece um erro e a tela trava. Já tentei novamente e não funcionou.",
  },
};

function prettyExample(skill: RunnableSkillName): string {
  return JSON.stringify(EXAMPLE_INPUTS[skill], null, 2);
}

// ─── Componente ───────────────────────────────────────────────────────────────

export default function SkillsPlayground() {
  const { run, reset, isLoading, error, result } = useSkill();

  const [skill, setSkill] = useState<RunnableSkillName>(SKILLS[0]);
  const [tenantId, setTenantId] = useState("default");
  const [jsonText, setJsonText] = useState<string>(prettyExample(SKILLS[0]));
  const [jsonError, setJsonError] = useState<string | null>(null);

  const isSensitive = SENSITIVE_SKILLS.has(skill);

  function handleSelectSkill(next: RunnableSkillName) {
    setSkill(next);
    setJsonText(prettyExample(next));
    setJsonError(null);
    reset();
  }

  function handleLoadExample() {
    setJsonText(prettyExample(skill));
    setJsonError(null);
  }

  async function handleExecute() {
    setJsonError(null);

    let parsedInput: unknown;
    try {
      parsedInput = JSON.parse(jsonText);
    } catch {
      setJsonError("JSON inválido — verifique a sintaxe do input.");
      return;
    }

    const request = {
      skill,
      tenantId: tenantId.trim() || "default",
      input: parsedInput,
    } as unknown as RunSkillInput;

    await run(request);
  }

  const provenance = result?.provenance;
  const isHeuristic = provenance?.source === "heuristic-fallback";

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">AI Skills Playground</h1>
        <p className="text-sm text-muted-foreground">
          Tela interna de teste — somente leitura. Não grava dados, não cria tarefas,
          não envia notificações e não dispara automações.
        </p>
      </header>

      {/* Controles */}
      <section className="space-y-4 rounded-lg border border-border bg-card p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">Skill</span>
            <select
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={skill}
              onChange={(e) => handleSelectSkill(e.target.value as RunnableSkillName)}
            >
              {SKILLS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">tenantId</span>
            <input
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="default"
            />
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">Input (JSON)</span>
          <textarea
            className="min-h-[220px] w-full rounded-md border border-input bg-background p-2 font-mono text-xs"
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            spellCheck={false}
          />
        </label>

        {jsonError && (
          <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {jsonError}
          </p>
        )}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExecute}
            disabled={isLoading}
            className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-50"
          >
            {isLoading ? "Executando…" : "Executar"}
          </button>
          <button
            type="button"
            onClick={handleLoadExample}
            className="h-9 rounded-md border border-border bg-background px-4 text-sm"
          >
            Carregar exemplo
          </button>
          <button
            type="button"
            onClick={reset}
            className="h-9 rounded-md border border-border bg-background px-4 text-sm"
          >
            Limpar resultado
          </button>
        </div>
      </section>

      {/* Aviso fixo para skills sensíveis */}
      {isSensitive && (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
          ⚠️ {SENSITIVE_WARNING}
        </p>
      )}

      {/* Erro de execução */}
      {error && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Resultado */}
      {result && provenance && (
        <section className="space-y-3 rounded-lg border border-border bg-card p-4">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={
                "rounded-md px-2 py-1 text-xs font-semibold " +
                (isHeuristic
                  ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                  : "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400")
              }
            >
              {isHeuristic ? "Heurística local" : "Modelo"}
            </span>
            <span className="text-sm text-muted-foreground">{provenance.label}</span>
            {provenance.confidence !== undefined && (
              <span className="text-sm text-muted-foreground">
                · confiança: {provenance.confidence}
              </span>
            )}
          </div>

          {provenance.warning && (
            <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
              {provenance.warning}
            </p>
          )}

          {provenance.disclaimer && (
            <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              {provenance.disclaimer}
            </p>
          )}

          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">
              result.parsed — {result.skill} · provider: {result.provider} · model: {result.model}
            </p>
            <pre className="max-h-[420px] overflow-auto rounded-md border border-border bg-muted/30 p-3 font-mono text-xs">
              {JSON.stringify(result.parsed, null, 2)}
            </pre>
          </div>
        </section>
      )}
    </div>
  );
}
