/**
 * events.data/end_date são timestamps completos (data + hora) — não existem
 * colunas separadas de horário. Para export/import em planilha (mais legível
 * como duas colunas), separa data (YYYY-MM-DD) e hora (HH:mm) de um
 * Date/ISO-string; e o inverso, recombina as duas colunas de volta num
 * único ISO datetime para enviar ao backend.
 */
export const splitDateTime = (value: unknown): { date: string; time: string } => {
  if (!value) return { date: "", time: "" };
  const d = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(d.getTime())) return { date: "", time: "" };
  return {
    date: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`,
    time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
  };
};

export const combineDateTime = (date: unknown, time: unknown): string | undefined => {
  if (!date) return undefined;
  const timeStr = typeof time === "string" && time.trim() ? time.trim() : "00:00";
  const parsed = new Date(`${String(date).trim()}T${timeStr}:00`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};
