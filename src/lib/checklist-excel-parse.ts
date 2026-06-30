import ExcelJS from "exceljs";

export const MAX_SPREADSHEET_BYTES = 2 * 1024 * 1024;

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }

  cells.push(current.trim());
  return cells;
}

function parseCsvRows(text: string): unknown[][] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseCsvLine);
}

/** .xlsx / .csv 시트 → 2차원 배열 (최대 2MB) */
export async function readSpreadsheetRows(
  buffer: ArrayBuffer,
  ext: "xlsx" | "csv",
): Promise<unknown[][]> {
  if (buffer.byteLength > MAX_SPREADSHEET_BYTES) {
    throw new Error("파일 크기는 2MB 이하여야 합니다.");
  }

  if (ext === "csv") {
    const text = new TextDecoder("utf-8").decode(buffer);
    return parseCsvRows(text);
  }

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.worksheets[0];
  if (!sheet) return [];

  const rows: unknown[][] = [];
  sheet.eachRow((row) => {
    const values = row.values;
    if (!values || !Array.isArray(values)) {
      rows.push([]);
      return;
    }
    rows.push(
      values.slice(1).map((cell) => {
        if (cell == null) return "";
        if (typeof cell === "object" && "text" in cell) {
          return String((cell as { text: string }).text).trim();
        }
        return String(cell).trim();
      }),
    );
  });

  return rows;
}
