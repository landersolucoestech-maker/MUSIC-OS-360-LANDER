function parseDateParts(value: string | Date): { day: number; month: number; year: number } | null {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    return {
      day: value.getDate(),
      month: value.getMonth() + 1,
      year: value.getFullYear(),
    };
  }

  const trimmed = value.trim();
  if (!trimmed) return null;

  const isoDate = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) {
    return {
      day: Number(isoDate[3]),
      month: Number(isoDate[2]),
      year: Number(isoDate[1]),
    };
  }

  const slashDate = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (slashDate) {
    return {
      day: Number(slashDate[1]),
      month: Number(slashDate[2]),
      year: Number(slashDate[3]),
    };
  }

  const date = new Date(trimmed);
  if (Number.isNaN(date.getTime())) return null;
  return {
    day: date.getDate(),
    month: date.getMonth() + 1,
    year: date.getFullYear(),
  };
}

export function formatReleaseDate(value?: string | Date | null): string | null {
  if (!value) return null;
  const parts = parseDateParts(value);
  if (!parts) return String(value);

  const day = String(parts.day).padStart(2, "0");
  const month = String(parts.month).padStart(2, "0");
  return `${day}-${month}-${parts.year}`;
}
