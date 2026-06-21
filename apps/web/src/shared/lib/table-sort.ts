export type TableSortDirection = "asc" | "desc";

export type TableSortState = {
  key: string;
  direction: TableSortDirection;
} | null;

const collator = new Intl.Collator("pt-BR", {
  sensitivity: "base",
  numeric: true,
});

const emptyValues = new Set(["", "-", "—", "não informado", "não informado"]);

export function isActionsColumn(labelOrKey: string): boolean {
  const normalized = labelOrKey
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  return ["acao", "acoes", "actions"].includes(normalized);
}

export function nextTableSortState(current: TableSortState, key: string): TableSortState {
  if (current?.key === key) {
    return { key, direction: current.direction === "asc" ? "desc" : "asc" };
  }

  return { key, direction: "asc" };
}

function isEmptyTableValue(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  const normalized = String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  return emptyValues.has(normalized);
}

function toComparableTableValue(value: unknown): number | string {
  if (value instanceof Date) return value.getTime();
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;

  const raw = String(value).trim();
  const isoDate = Date.parse(raw);
  if (/^\d{4}-\d{2}-\d{2}/.test(raw) && Number.isFinite(isoDate)) {
    return isoDate;
  }

  const dateMatch = raw.match(/^(\d{2})[-/](\d{2})[-/](\d{4})(?:\s+(\d{2}):(\d{2}))?/);
  if (dateMatch) {
    const [, day, month, year, hour = "00", minute = "00"] = dateMatch;
    return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)).getTime();
  }

  const numeric = raw
    .replace(/\s/g, "")
    .replace(/^R\$/i, "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".");
  if (/^-?\d+(\.\d+)?$/.test(numeric)) {
    return Number(numeric);
  }

  return raw;
}

export function compareTableValues(a: unknown, b: unknown): number {
  const aEmpty = isEmptyTableValue(a);
  const bEmpty = isEmptyTableValue(b);

  if (aEmpty && bEmpty) return 0;
  if (aEmpty) return 1;
  if (bEmpty) return -1;

  const aValue = toComparableTableValue(a);
  const bValue = toComparableTableValue(b);

  if (typeof aValue === "number" && typeof bValue === "number") {
    return aValue - bValue;
  }

  return collator.compare(String(aValue), String(bValue));
}

export function sortTableRows<T>(
  rows: T[],
  sortState: TableSortState,
  getValue: (row: T, key: string) => unknown,
): T[] {
  if (!sortState) return rows;

  const direction = sortState.direction === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    const aValue = getValue(a, sortState.key);
    const bValue = getValue(b, sortState.key);
    const aEmpty = isEmptyTableValue(aValue);
    const bEmpty = isEmptyTableValue(bValue);

    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return 1;
    if (bEmpty) return -1;

    const comparison = compareTableValues(aValue, bValue);
    return comparison * direction;
  });
}
