export function formatRightsDate(value?: string | Date | null) {
  if (!value) return "—";

  if (typeof value === "string") {
    const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[3]}-${match[2]}-${match[1]}`;
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

export function formatRightsDateTime(value?: string | Date | null) {
  if (!value) return { date: "—", time: "—", full: "—" };

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return { date: "—", time: "—", full: "—" };

  const formattedDate = formatRightsDate(value);
  const time = date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return {
    date: formattedDate,
    time,
    full: `${formattedDate} ${time}`,
  };
}
