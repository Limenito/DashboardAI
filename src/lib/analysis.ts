import type { ParsedExcel, ColumnStat } from "./excel";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type ChartType = "bar" | "line" | "area" | "pie" | "scatter";

/** URL del backend FastAPI. Por defecto usa el backend desplegado en Render.
 *  Puedes sobrescribirlo definiendo `VITE_API_URL` en el entorno antes del build.
 *  Si quedara vacío, la app usa el análisis heurístico local (modo demo). */
const DEFAULT_API_URL = "https://pruebaneoconsulting-iadashboard.onrender.com";
export const API_URL =
  ((import.meta.env.VITE_API_URL as string | undefined) || DEFAULT_API_URL).replace(/\/$/, "");

/** Timeout en ms para las llamadas al backend (cold starts en Render/Railway pueden tardar). */
const REQUEST_TIMEOUT_MS = 120_000;

export async function pingBackend(): Promise<boolean> {
  if (!API_URL) return false;
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch(`${API_URL}/health`, { signal: ctrl.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

export interface KPI {
  label: string;
  value: string;
  hint?: string;
}

export interface ChartSpec {
  type: ChartType;
  title: string;
  description?: string;
  xKey: string;
  yKeys: string[];
  data: Record<string, unknown>[];
}

export interface AnalysisResult {
  summary: string;
  keywords: string[];
  kpis: KPI[];
  charts: ChartSpec[];
}

const fmt = (n: number) => {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return Number.isInteger(n) ? n.toString() : n.toFixed(2);
};

/**
 * Backend contract — POST `${VITE_API_URL}/analyze`
 * Body: { fileName, columns: ColumnStat[], sample: Record<string, unknown>[] }
 * Returns: { id, result: AnalysisResult } (JSON). Ver BACKEND.md.
 */

export interface AnalysisResponse {
  id: string;
  result: AnalysisResult;
}

export async function requestAnalysis(parsed: ParsedExcel): Promise<AnalysisResponse> {
  if (API_URL) {
    try {
      try {
      // ── Pre-warm: avisa al usuario si el backend está durmiendo ──
      const awake = await pingBackend();
      if (!awake) {
        toast.info("El servidor está despertando, esto puede tardar ~30s…", {
          duration: 30_000,
        });
        // Dale 35s para arrancar antes del request real
        await new Promise((r) => setTimeout(r, 35_000));
      }

      const remote = await callBackend(parsed);
      const remote = await callBackend(parsed);
      const { id, ...rest } = remote as { id?: string; result?: AnalysisResult } & AnalysisResult;
      const result: AnalysisResult = (rest as { result?: AnalysisResult }).result ?? (rest as AnalysisResult);
      const enriched = enrichCharts(result, parsed);
      if (id) return { id, result: enriched };
      // Backend respondió sin id: guardamos nosotros mismos
      return await persistLocally(parsed, enriched);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      console.warn("Backend no disponible, usando análisis local:", err);
      toast.warning("Backend no disponible — usando análisis local", { description: msg });
    }
  }

  // Fallback heurístico (modo demo) — guardar en historial si hay sesión
  const local = localAnalysis(parsed);
  return await persistLocally(parsed, local);
}

async function callBackend(parsed: ParsedExcel): Promise<unknown> {
  const doFetch = async (token: string | undefined) => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(`${API_URL}/analyze`, {
        method: "POST",
        headers,
        signal: ctrl.signal,
        body: JSON.stringify({
          fileName: parsed.fileName,
          rowCount: parsed.rowCount,
          columns: parsed.stats,
          sample: parsed.sample,
        }),
      });
    } finally {
      clearTimeout(timer);
    }
  };

  const { data: { session } } = await supabase.auth.getSession();
  let res: Response;
  try {
    res = await doFetch(session?.access_token);
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("Tiempo de espera agotado (60s). El backend puede estar arrancando.");
    }
    throw new Error("No se pudo conectar al backend.");
  }

  // Si el token expiró, refrescar y reintentar una vez
  if (res.status === 401) {
    const { data: refreshed } = await supabase.auth.refreshSession();
    if (refreshed.session?.access_token) {
      res = await doFetch(refreshed.session.access_token);
    }
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 401) throw new Error("No autorizado. Inicia sesión nuevamente.");
    if (res.status >= 500) throw new Error(`Error del backend (${res.status}). ${body.slice(0, 120)}`);
    throw new Error(`Backend respondió ${res.status}. ${body.slice(0, 120)}`);
  }
  return res.json();
}

async function persistLocally(parsed: ParsedExcel, result: AnalysisResult): Promise<AnalysisResponse> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    // sin usuario: devolver id efímero (no debería pasar con auth guard)
    return { id: crypto.randomUUID(), result };
  }
  const { data, error } = await supabase
    .from("search_history")
    .insert({
      user_id: user.id,
      file_name: parsed.fileName,
      row_count: parsed.rowCount,
      column_count: parsed.columnCount,
      result: result as never,
    })
    .select("id")
    .single();
  if (error || !data) {
    console.warn("No se pudo guardar en historial:", error);
    return { id: crypto.randomUUID(), result };
  }
  return { id: data.id, result };
}

function enrichCharts(result: AnalysisResult, parsed: ParsedExcel): AnalysisResult {
  const charts = result.charts.map((c) => {
    if (c.data && c.data.length > 0) return c;
    return { ...c, data: buildChartData(c, parsed) };
  });
  return { ...result, charts };
}

function buildChartData(spec: ChartSpec, parsed: ParsedExcel): Record<string, unknown>[] {
  if (spec.type === "pie") {
    const stat = parsed.stats.find((s) => s.name === spec.xKey);
    return (stat?.topValues ?? []).map((t) => ({ name: t.value, value: t.count }));
  }
  // group by xKey, aggregate yKeys (sum)
  const groups = new Map<string, Record<string, number>>();
  for (const row of parsed.rows) {
    const key = String(row[spec.xKey] ?? "—");
    const acc = groups.get(key) ?? {};
    for (const yk of spec.yKeys) {
      const v = Number(row[yk]);
      if (!isNaN(v)) acc[yk] = (acc[yk] ?? 0) + v;
    }
    groups.set(key, acc);
  }
  return Array.from(groups.entries())
    .slice(0, 30)
    .map(([k, v]) => ({ [spec.xKey]: k, ...v }));
}

function localAnalysis(parsed: ParsedExcel): AnalysisResult {
  const numericCols = parsed.stats.filter((s) => s.type === "number");
  const categoryCols = parsed.stats.filter((s) => s.type === "category");
  const dateCols = parsed.stats.filter((s) => s.type === "date");

  const kpis: KPI[] = [
    { label: "Filas", value: fmt(parsed.rowCount), hint: "Registros totales" },
    { label: "Columnas", value: fmt(parsed.columnCount), hint: `${numericCols.length} numéricas` },
  ];

  const topNumeric = numericCols.slice(0, 4);
  for (const col of topNumeric) {
    if (col.sum !== undefined) {
      kpis.push({ label: `Σ ${col.name}`, value: fmt(col.sum), hint: `Promedio ${fmt(col.mean ?? 0)}` });
    }
  }

  const charts: ChartSpec[] = [];

  // 1. Barras: una categoría vs primer numérico
  if (categoryCols[0] && topNumeric[0]) {
    const cat = categoryCols[0];
    const num = topNumeric[0];
    const data = aggregate(parsed.rows, cat.name, [num.name]).slice(0, 12);
    charts.push({
      type: "bar",
      title: `${num.name} por ${cat.name}`,
      description: `Suma de ${num.name} agrupada por ${cat.name}`,
      xKey: cat.name,
      yKeys: [num.name],
      data,
    });
  }

  // 2. Línea temporal si hay fecha + numérico
  if (dateCols[0] && topNumeric[0]) {
    const dt = dateCols[0];
    const num = topNumeric[0];
    const data = aggregate(parsed.rows, dt.name, [num.name])
      .sort((a, b) => String(a[dt.name]).localeCompare(String(b[dt.name])))
      .slice(0, 50);
    charts.push({
      type: "line",
      title: `Evolución de ${num.name}`,
      description: `Tendencia temporal por ${dt.name}`,
      xKey: dt.name,
      yKeys: [num.name],
      data,
    });
  }

  // 3. Pie: distribución de la categoría
  if (categoryCols[0]) {
    const cat = categoryCols[0];
    const data = (cat.topValues ?? []).slice(0, 8).map((t) => ({ name: t.value, value: t.count }));
    if (data.length) {
      charts.push({
        type: "pie",
        title: `Distribución de ${cat.name}`,
        description: `Top categorías por frecuencia`,
        xKey: cat.name,
        yKeys: ["value"],
        data,
      });
    }
  }

  // 4. Comparación multi-numérica
  if (categoryCols[0] && topNumeric.length >= 2) {
    const cat = categoryCols[0];
    const yKeys = topNumeric.slice(0, 3).map((n) => n.name);
    const data = aggregate(parsed.rows, cat.name, yKeys).slice(0, 10);
    charts.push({
      type: "bar",
      title: `Comparativa por ${cat.name}`,
      description: `${yKeys.join(", ")} agrupados`,
      xKey: cat.name,
      yKeys,
      data,
    });
  }

  const keywords: string[] = [
    `${parsed.rowCount} registros`,
    `${numericCols.length} variables numéricas`,
    `${categoryCols.length} categóricas`,
    ...(dateCols[0] ? [`serie temporal: ${dateCols[0].name}`] : []),
    ...topNumeric.slice(0, 2).map((c) => `${c.name}: ${fmt(c.sum ?? 0)}`),
  ];

  const summary = buildSummary(parsed, numericCols, categoryCols, dateCols);

  return { summary, keywords, kpis, charts };
}

function aggregate(
  rows: Record<string, unknown>[],
  groupBy: string,
  sumKeys: string[],
): Record<string, unknown>[] {
  const groups = new Map<string, Record<string, number>>();
  for (const row of rows) {
    const raw = row[groupBy];
    const key = raw instanceof Date ? raw.toISOString().slice(0, 10) : String(raw ?? "—");
    const acc = groups.get(key) ?? {};
    for (const k of sumKeys) {
      const v = Number(row[k]);
      if (!isNaN(v)) acc[k] = (acc[k] ?? 0) + v;
    }
    groups.set(key, acc);
  }
  return Array.from(groups.entries())
    .map(([k, v]) => ({ [groupBy]: k, ...v }))
    .sort((a, b) => {
      const ak = sumKeys[0] ? Number(a[sumKeys[0]]) : 0;
      const bk = sumKeys[0] ? Number(b[sumKeys[0]]) : 0;
      return bk - ak;
    });
}

function buildSummary(
  parsed: ParsedExcel,
  numericCols: ColumnStat[],
  categoryCols: ColumnStat[],
  dateCols: ColumnStat[],
): string {
  const parts: string[] = [];
  parts.push(
    `El archivo "${parsed.fileName}" contiene ${parsed.rowCount} registros y ${parsed.columnCount} columnas.`,
  );
  if (numericCols.length) {
    const top = numericCols[0];
    parts.push(
      `La métrica principal "${top.name}" suma ${fmt(top.sum ?? 0)} con un promedio de ${fmt(top.mean ?? 0)} (rango ${fmt(top.min ?? 0)} – ${fmt(top.max ?? 0)}).`,
    );
  }
  if (categoryCols.length) {
    const cat = categoryCols[0];
    const top = cat.topValues?.[0];
    if (top) {
      parts.push(
        `En la dimensión "${cat.name}" predomina "${top.value}" con ${top.count} apariciones (${cat.unique} categorías únicas).`,
      );
    }
  }
  if (dateCols.length) {
    parts.push(`Se detectó la serie temporal "${dateCols[0].name}", apta para análisis de tendencia.`);
  }
  return parts.join(" ");
}
