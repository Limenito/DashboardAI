import * as XLSX from "xlsx";

export type ColumnType = "number" | "date" | "category" | "text";

export interface ColumnStat {
  name: string;
  type: ColumnType;
  count: number;
  nulls: number;
  unique: number;
  min?: number;
  max?: number;
  mean?: number;
  sum?: number;
  topValues?: { value: string; count: number }[];
}

export interface ParsedExcel {
  fileName: string;
  sheetName: string;
  rowCount: number;
  columnCount: number;
  columns: string[];
  rows: Record<string, unknown>[];
  stats: ColumnStat[];
  sample: Record<string, unknown>[];
}

const DATE_REGEX = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}/;

function detectType(values: unknown[]): ColumnType {
  const nonNull = values.filter((v) => v !== null && v !== undefined && v !== "");
  if (nonNull.length === 0) return "text";

  const numbers = nonNull.filter((v) => typeof v === "number" || (!isNaN(Number(v)) && v !== ""));
  if (numbers.length / nonNull.length > 0.85) return "number";

  const dates = nonNull.filter(
    (v) => v instanceof Date || (typeof v === "string" && DATE_REGEX.test(v)),
  );
  if (dates.length / nonNull.length > 0.7) return "date";

  const unique = new Set(nonNull.map((v) => String(v))).size;
  if (unique <= Math.max(20, nonNull.length * 0.4)) return "category";

  return "text";
}

function computeStats(name: string, values: unknown[]): ColumnStat {
  const total = values.length;
  const nonNull = values.filter((v) => v !== null && v !== undefined && v !== "");
  const nulls = total - nonNull.length;
  const type = detectType(values);
  const uniqueSet = new Set(nonNull.map((v) => String(v)));

  const stat: ColumnStat = {
    name,
    type,
    count: nonNull.length,
    nulls,
    unique: uniqueSet.size,
  };

  if (type === "number") {
    const nums = nonNull.map((v) => Number(v)).filter((n) => !isNaN(n));
    if (nums.length) {
      stat.min = Math.min(...nums);
      stat.max = Math.max(...nums);
      stat.sum = nums.reduce((a, b) => a + b, 0);
      stat.mean = stat.sum / nums.length;
    }
  }

  if (type === "category" || type === "text") {
    const counts = new Map<string, number>();
    for (const v of nonNull) {
      const k = String(v);
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    stat.topValues = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([value, count]) => ({ value, count }));
  }

  return stat;
}

export async function parseExcel(file: File): Promise<ParsedExcel> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });

  const columns = rows.length > 0 ? Object.keys(rows[0]) : [];
  const stats: ColumnStat[] = columns.map((col) =>
    computeStats(
      col,
      rows.map((r) => r[col]),
    ),
  );

  return {
    fileName: file.name,
    sheetName,
    rowCount: rows.length,
    columnCount: columns.length,
    columns,
    rows,
    stats,
    sample: rows.slice(0, 20),
  };
}
