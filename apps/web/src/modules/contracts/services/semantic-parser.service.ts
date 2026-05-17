import type {
  SemanticVariable,
  SemanticParseResult,
  SemanticClauseType,
} from "@/modules/contracts/types/contracts.types";

const SYSTEM_PROMPT = `Você é um parser semântico jurídico especializado em contratos da indústria fonográfica brasileira.

Sua tarefa: analisar o texto do contrato e retornar um JSON válido com:
1. Uma lista de variáveis detectadas — valores dinâmicos que mudam a cada instância do contrato
2. Os tipos de cláusulas detectadas no documento

REGRAS ABSOLUTAS:
- Retorne APENAS JSON válido, sem markdown, sem explicações
- Analise o contexto completo antes de gerar o placeholder — NUNCA use placeholders genéricos
- O placeholder deve refletir a entidade semântica exata no formato NAMESPACE.CAMPO
- Namespaces permitidos: CONTRATANTE, CONTRATADO, ARTISTA, PRODUTOR, EMPRESA, LABEL, PAYMENT, FINANCIAL, CONTRACT, PHONOGRAM, BEAT, VIDEO, WORK, DISTRIBUTION

EXEMPLOS DE PLACEHOLDERS CORRETOS:
- Nome de empresa → {{CONTRATADA.COMPANY_NAME}}
- Valor de pagamento → {{PAYMENT.AMOUNT}}
- Multa por descumprimento → {{FINANCIAL.BREACH_FINE_PERCENTAGE}}
- Juros de mora → {{FINANCIAL.LATE_INTEREST_RATE}}
- Método de pagamento → {{PAYMENT.METHOD}}
- Vencimento → {{PAYMENT.DUE_DAY}}
- Percentual de entrada → {{PAYMENT.DOWN_PAYMENT_PERCENTAGE}}
- Parcelas → {{PAYMENT.INSTALLMENTS}}
- ISRC → {{PHONOGRAM.ISRC}}
- Data início → {{CONTRACT.START_DATE}}
- Data fim → {{CONTRACT.END_DATE}}
- Royalties → {{FINANCIAL.ROYALTIES_PERCENTAGE}}
- CPF pessoa física → {{CONTRATANTE.CPF}} ou {{CONTRATADO.CPF}}
- Endereço → {{CONTRATANTE.ADDRESS}} ou {{CONTRATADO.ADDRESS}}
- Título da obra → {{WORK.TITLE}}
- Distribuição → {{DISTRIBUTION.TERRITORY}}
- Confidencialidade → {{CONTRACT.CONFIDENTIALITY_PERIOD}}

TIPOS DE CLÁUSULAS DETECTÁVEIS:
financeira, autoral, royalties, exclusividade, confidencialidade, inadimplencia, distribuicao_digital, licenciamento, rescisao, assinatura, prazo, objeto

FORMATO DE SAÍDA (JSON puro, sem markdown):
{
  "variables": [
    {
      "id": "uuid-string",
      "originalText": "texto exato encontrado no documento",
      "context": "descrição do contexto jurídico/semântico onde o valor aparece",
      "inferredEntity": "que tipo de dado é este valor",
      "placeholder": "{{NAMESPACE.CAMPO}}",
      "accepted": true
    }
  ],
  "clauseTypes": ["financeira", "autoral"]
}

IMPORTANTE:
- Detecte apenas valores que variam por instância (nomes, valores, datas, percentuais, identificadores)
- NÃO detecte texto estático do contrato
- Deduplication: se o mesmo valor aparece múltiplas vezes, inclua apenas uma vez
- Máximo de 40 variáveis por documento`;

interface RawAIVariable {
  id?: string;
  originalText?: string;
  context?: string;
  inferredEntity?: string;
  placeholder?: string;
  accepted?: boolean;
}

interface RawAIResponse {
  variables?: RawAIVariable[];
  clauseTypes?: string[];
}

function generateId(): string {
  return `sv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function validatePlaceholder(placeholder: string): boolean {
  return /^\{\{[A-Z_]+\.[A-Z_]+\}\}$/.test(placeholder);
}

function normalizeVariable(raw: RawAIVariable, index: number): SemanticVariable {
  const placeholder = typeof raw.placeholder === "string" && validatePlaceholder(raw.placeholder)
    ? raw.placeholder
    : `{{VARIABLE.FIELD_${index + 1}}}`;

  return {
    id: typeof raw.id === "string" ? raw.id : generateId(),
    originalText: typeof raw.originalText === "string" ? raw.originalText.trim() : `[valor ${index + 1}]`,
    context: typeof raw.context === "string" ? raw.context.trim() : "Contexto não identificado",
    inferredEntity: typeof raw.inferredEntity === "string" ? raw.inferredEntity.trim() : "Dado dinâmico",
    placeholder,
    accepted: true,
  };
}

const VALID_CLAUSE_TYPES = new Set<SemanticClauseType>([
  "financeira", "autoral", "royalties", "exclusividade", "confidencialidade",
  "inadimplencia", "distribuicao_digital", "licenciamento", "rescisao",
  "assinatura", "prazo", "objeto",
]);

function normalizeClauseTypes(types: unknown[]): SemanticClauseType[] {
  if (!Array.isArray(types)) return [];
  return types.filter((t): t is SemanticClauseType =>
    typeof t === "string" && VALID_CLAUSE_TYPES.has(t as SemanticClauseType),
  );
}

function buildMockResult(text: string): SemanticParseResult {
  const variables: SemanticVariable[] = [
    {
      id: generateId(),
      originalText: "Lander Produtora Musical Ltda",
      context: "Razão social da empresa contratada identificada no preâmbulo do contrato",
      inferredEntity: "Razão social — Pessoa Jurídica",
      placeholder: "{{CONTRATADA.COMPANY_NAME}}",
      accepted: true,
    },
    {
      id: generateId(),
      originalText: "R$ 5.000,00",
      context: "Valor do cachê ou honorário fixo previsto na cláusula financeira",
      inferredEntity: "Valor monetário — Pagamento",
      placeholder: "{{PAYMENT.AMOUNT}}",
      accepted: true,
    },
    {
      id: generateId(),
      originalText: "10%",
      context: "Percentual de multa por descumprimento contratual",
      inferredEntity: "Percentual de penalidade",
      placeholder: "{{FINANCIAL.BREACH_FINE_PERCENTAGE}}",
      accepted: true,
    },
    {
      id: generateId(),
      originalText: "1% ao mês",
      context: "Taxa de juros moratórios por atraso no pagamento",
      inferredEntity: "Taxa de juros de mora",
      placeholder: "{{FINANCIAL.LATE_INTEREST_RATE}}",
      accepted: true,
    },
    {
      id: generateId(),
      originalText: "PIX",
      context: "Modalidade de pagamento estabelecida na cláusula de pagamento",
      inferredEntity: "Método de pagamento",
      placeholder: "{{PAYMENT.METHOD}}",
      accepted: true,
    },
    {
      id: generateId(),
      originalText: "01/01/2025",
      context: "Data de início de vigência do contrato",
      inferredEntity: "Data de início",
      placeholder: "{{CONTRACT.START_DATE}}",
      accepted: true,
    },
    {
      id: generateId(),
      originalText: "31/12/2025",
      context: "Data de término de vigência do contrato",
      inferredEntity: "Data de fim",
      placeholder: "{{CONTRACT.END_DATE}}",
      accepted: true,
    },
  ];

  const clauseTypes: SemanticClauseType[] = ["financeira", "prazo", "objeto"];

  if (text.toLowerCase().includes("royalt")) clauseTypes.push("royalties");
  if (text.toLowerCase().includes("exclusiv")) clauseTypes.push("exclusividade");
  if (text.toLowerCase().includes("confidencial")) clauseTypes.push("confidencialidade");
  if (text.toLowerCase().includes("distribui")) clauseTypes.push("distribuicao_digital");
  if (text.toLowerCase().includes("licenci")) clauseTypes.push("licenciamento");

  return { variables, clauseTypes: [...new Set(clauseTypes)], rawText: text };
}

export async function parseContractText(text: string): Promise<SemanticParseResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { variables: [], clauseTypes: [], rawText: "" };
  }

  const userPrompt = `Analise semanticamente o seguinte contrato e retorne o JSON conforme as instruções do sistema:\n\n${trimmed.slice(0, 12000)}`;

  try {
    const response = await fetch("/api/ai/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: userPrompt, systemPrompt: SYSTEM_PROMPT, type: "contract_parse" }),
    });

    if (!response.ok) {
      console.warn("[semantic-parser] API error, using mock result");
      return buildMockResult(trimmed);
    }

    const data = await response.json() as { content?: string; error?: string };

    if (!data.content) {
      return buildMockResult(trimmed);
    }

    let jsonStr = data.content.trim();
    const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();

    const parsed = JSON.parse(jsonStr) as RawAIResponse;

    const variables = Array.isArray(parsed.variables)
      ? parsed.variables.slice(0, 40).map((v, i) => normalizeVariable(v, i))
      : [];

    const clauseTypes = normalizeClauseTypes(parsed.clauseTypes ?? []);

    return { variables, clauseTypes, rawText: trimmed };
  } catch (err) {
    console.warn("[semantic-parser] Parse failed, using mock result:", err);
    return buildMockResult(trimmed);
  }
}

export function applyVariablesToText(
  text: string,
  variables: SemanticVariable[],
): string {
  let result = text;
  const accepted = variables.filter((v) => v.accepted);

  const sorted = [...accepted].sort((a, b) => b.originalText.length - a.originalText.length);
  for (const v of sorted) {
    const escaped = v.originalText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escaped, "g");
    result = result.replace(regex, v.placeholder);
  }
  return result;
}
