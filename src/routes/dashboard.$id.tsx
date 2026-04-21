import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileSpreadsheet, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DynamicChart } from "@/components/DynamicChart";
import { DataTable } from "@/components/DataTable";
import type { AnalysisResult } from "@/lib/analysis";

export const Route = createFileRoute("/dashboard/$id")({
  head: () => ({
    meta: [
      { title: "Dashboard — IA Dashboard" },
      { name: "description", content: "Tu dashboard generado a partir de un Excel." },
    ],
  }),
  component: Dashboard,
});

interface StoredAnalysis {
  fileName: string;
  rowCount: number;
  columns: string[];
  rows: Record<string, unknown>[];
  result: AnalysisResult;
}

function Dashboard() {
  const { id } = useParams({ from: "/dashboard/$id" });
  const [data, setData] = useState<StoredAnalysis | null>(null);
  const [showTable, setShowTable] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(`analysis:${id}`);
    if (raw) setData(JSON.parse(raw) as StoredAnalysis);
  }, [id]);

  const charts = useMemo(() => data?.result.charts ?? [], [data]);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Análisis no encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Los análisis se guardan en la sesión actual del navegador. Sube un Excel para empezar.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <ArrowLeft className="h-4 w-4" />
            Volver al inicio
          </Link>
        </div>
      </div>
    );
  }

  const { result, fileName, rowCount, columns, rows } = data;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Nuevo análisis
          </Link>
          <div className="flex items-center gap-2 truncate">
            <FileSpreadsheet className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="truncate text-sm font-medium">{fileName}</span>
            <span className="hidden text-xs text-muted-foreground sm:inline">
              · {rowCount.toLocaleString()} filas
            </span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        {/* Resumen ejecutivo */}
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-primary" />
              Resumen ejecutivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed text-foreground">{result.summary}</p>
            {result.keywords.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {result.keywords.map((k) => (
                  <span
                    key={k}
                    className="rounded-full border bg-background px-2.5 py-1 text-xs text-muted-foreground"
                  >
                    {k}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* KPIs */}
        {result.kpis.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Indicadores clave
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {result.kpis.map((kpi) => (
                <Card key={kpi.label}>
                  <CardContent className="p-5">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">
                      {kpi.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
                      {kpi.value}
                    </p>
                    {kpi.hint && (
                      <p className="mt-1 text-xs text-muted-foreground">{kpi.hint}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Gráficos */}
        {charts.length > 0 && (
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Visualizaciones
            </h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {charts.map((c, i) => (
                <DynamicChart key={i} spec={c} />
              ))}
            </div>
          </section>
        )}

        {/* Tabla colapsable */}
        <section>
          <Button variant="outline" onClick={() => setShowTable((s) => !s)} className="mb-3">
            {showTable ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {showTable ? "Ocultar datos" : "Ver datos crudos"}
          </Button>
          {showTable && <DataTable columns={columns} rows={rows} />}
        </section>
      </main>
    </div>
  );
}
