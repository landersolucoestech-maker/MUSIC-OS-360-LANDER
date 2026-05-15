// XLSX Import/Export utilities (replaces the former CSV implementation)
// Uses the `xlsx` (SheetJS) library already bundled in the project.
import * as XLSX from "xlsx";
import { toast } from "sonner";

export interface CSVColumn {
  key: string;
  label: string;
  transform?: (row: Record<string, any>) => string;
}

// Export data to XLSX
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  columns: CSVColumn[],
  filename: string
): void {
  if (data.length === 0) {
    toast.error("Nenhum dado para exportar");
    return;
  }

  // Build a 2-D array: first row = labels, subsequent rows = values
  const header = columns.map(col => col.label);

  const rows = data.map(item =>
    columns.map(col => {
      const value = col.transform ? col.transform(item) : item[col.key];
      if (value === null || value === undefined) return "";
      return Array.isArray(value) ? value.join(", ") : String(value);
    })
  );

  const worksheet = XLSX.utils.aoa_to_sheet([header, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Dados");

  const dateStr = new Date().toISOString().split("T")[0];
  XLSX.writeFile(workbook, `${filename}_${dateStr}.xlsx`);

  toast.success(`${data.length} registro(s) exportado(s) com sucesso!`);
}

// Parse an XLSX (or XLS) file into an array of row objects keyed by header label
export function parseCSV(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const workbook = XLSX.read(buffer, { type: "array" });

        const sheetName = workbook.SheetNames[0];
        if (!sheetName) {
          reject(new Error("Arquivo sem planilhas"));
          return;
        }

        const worksheet = workbook.Sheets[sheetName];
        // Use SheetJS native object mode: first row becomes property keys automatically.
        // raw:false converts every cell to a string; defval:"" fills empty cells.
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
          defval: "",
          raw: false,
        });

        if (rawRows.length === 0) {
          reject(new Error("O arquivo deve ter pelo menos um cabeçalho e uma linha de dados"));
          return;
        }

        // Normalise keys and values to trimmed strings
        const data: Record<string, string>[] = rawRows
          .map(row => {
            const obj: Record<string, string> = {};
            for (const [k, v] of Object.entries(row)) {
              obj[k.trim()] = String(v).trim();
            }
            return obj;
          })
          .filter(row => Object.values(row).some(v => v !== ""));

        resolve(data);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => reject(new Error("Erro ao ler o arquivo"));
    reader.readAsArrayBuffer(file);
  });
}

// Import XLSX with file picker
export function importCSV(
  onImport: (data: Record<string, string>[]) => void | Promise<void>,
  acceptedHeaders?: string[]
): void {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".xlsx,.xls";

  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;

    try {
      const data = await parseCSV(file);

      if (data.length === 0) {
        toast.error("Arquivo está vazio");
        return;
      }

      if (acceptedHeaders && acceptedHeaders.length > 0) {
        const fileHeaders = Object.keys(data[0]);
        const missingHeaders = acceptedHeaders.filter(h => !fileHeaders.includes(h));
        if (missingHeaders.length > 0) {
          toast.warning(`Colunas faltando: ${missingHeaders.join(", ")}`);
        }
      }

      await onImport(data);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Erro ao importar arquivo");
    }
  };

  input.click();
}
