import type { AnalysisResult } from "./analysis";

const STORAGE_KEY = "ia_dashboard_history_v1";

export interface HistoryEntry {
  id: string;
  file_name: string;
  row_count: number;
  column_count: number;
  created_at: string;
  result: AnalysisResult;
}

function read(): HistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(items: HistoryEntry[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn("No se pudo guardar el historial:", e);
  }
}

export function listHistory(): HistoryEntry[] {
  return read().sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );
}

export function getHistoryEntry(id: string): HistoryEntry | undefined {
  return read().find((e) => e.id === id);
}

export function saveHistoryEntry(entry: Omit<HistoryEntry, "id" | "created_at"> & { id?: string }): HistoryEntry {
  const items = read();
  const full: HistoryEntry = {
    id: entry.id ?? crypto.randomUUID(),
    created_at: new Date().toISOString(),
    file_name: entry.file_name,
    row_count: entry.row_count,
    column_count: entry.column_count,
    result: entry.result,
  };
  // Mantener máximo 50 entradas para no saturar localStorage
  const next = [full, ...items.filter((e) => e.id !== full.id)].slice(0, 50);
  write(next);
  return full;
}

export function deleteHistoryEntry(id: string) {
  write(read().filter((e) => e.id !== id));
}
