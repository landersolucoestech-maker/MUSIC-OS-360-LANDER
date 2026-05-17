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
- Máximo de 40 variáveis por documento
- NUNCA retorne placeholders genéricos como VARIABLE.FIELD_1 — se não conseguir determinar o namespace correto, omita a variável`;

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

const ALLOWED_NAMESPACES = new Set([
  "CONTRATANTE", "CONTRATADO", "ARTISTA", "PRODUTOR", "EMPRESA", "LABEL",
  "PAYMENT", "FINANCIAL", "CONTRACT", "PHONOGRAM", "BEAT", "VIDEO",
  "WORK", "DISTRIBUTION", "CONTRATADA",
]);

function validatePlaceholder(placeholder: string): boolean {
  if (!/^\{\{[A-Z_]+\.[A-Z_]+\}\}$/.test(placeholder)) return false;
  const namespace = placeholder.slice(2, placeholder.indexOf("."));
  return ALLOWED_NAMESPACES.has(namespace);
}

function tryNormalizeVariable(raw: RawAIVariable): SemanticVariable | null {
  if (typeof raw.placeholder !== "string" || !validatePlaceholder(raw.placeholder)) {
    return null;
  }
  if (typeof raw.originalText !== "string" || !raw.originalText.trim()) {
    return null;
  }

  return {
    id: typeof raw.id === "string" && raw.id.trim() ? raw.id : generateId(),
    originalText: raw.originalText.trim(),
    context: typeof raw.context === "string" ? raw.context.trim() : "Contexto não identificado",
    inferredEntity: typeof raw.inferredEntity === "string" ? raw.inferredEntity.trim() : "Dado dinâmico",
    placeholder: raw.placeholder,
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

export async function parseContractText(text: string): Promise<SemanticParseResult> {
  const trimmed = text.trim();
  if (!trimmed) {
    return { variables: [], clauseTypes: [], rawText: "" };
  }

  const userPrompt = `Analise semanticamente o seguinte contrato e retorne o JSON conforme as instruções do sistema:\n\n${trimmed.slice(0, 12000)}`;

  const response = await fetch("/api/v1/ai/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: userPrompt,
      systemPrompt: SYSTEM_PROMPT,
      type: "contract_parse",
      jsonMode: true,
      maxTokens: 3000,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => "");
    throw new Error(
      `Erro na análise semântica (HTTP ${response.status})${errBody ? `: ${errBody.slice(0, 200)}` : ""}`,
    );
  }

  const data = await response.json() as { content?: string; error?: string };

  if (!data.content) {
    throw new Error("O servidor de IA retornou uma resposta vazia. Tente novamente.");
  }

  let jsonStr = data.content.trim();
  const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenceMatch) jsonStr = fenceMatch[1].trim();

  let parsed: RawAIResponse;
  try {
    parsed = JSON.parse(jsonStr) as RawAIResponse;
  } catch {
    throw new Error(
      "A IA retornou um formato inválido. Verifique se o documento é um contrato válido e tente novamente.",
    );
  }

  const variables = Array.isArray(parsed.variables)
    ? parsed.variables
        .slice(0, 40)
        .map((v) => tryNormalizeVariable(v))
        .filter((v): v is SemanticVariable => v !== null)
    : [];

  const clauseTypes = normalizeClauseTypes(parsed.clauseTypes ?? []);

  return { variables, clauseTypes, rawText: trimmed };
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
