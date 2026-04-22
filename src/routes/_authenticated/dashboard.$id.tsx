import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, FileSpreadsheet, Sparkles, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DynamicChart } from "@/components/DynamicChart";
import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import type { AnalysisResult } from "@/lib/analysis";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/$id")({
  head: () => ({
    meta: [
      { title: "Dashboard — IA Dashboard" },
      { name: "description", content: "Tu dashboard generado a partir de un Excel." },
    ],
  }),
  component: Dashboard,
});

interface LoadedAnalysis {
  fileName: string;
  rowCount: number;
  result: AnalysisResult;
}

function Dashboard() {
  const { id } = useParams({ from: "/_authenticated/dashboard/$id" });
  const [data, setData] = useState<LoadedAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: row, error } = await supabase
        .from("search_history")
        .select("file_name, row_count, result")
        .eq("id", id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        toast.error(error.message);
        setNotFound(true);
      } else if (!row) {
        setNotFound(true);
      } else {
        setData({
          fileName: row.file_name,
          rowCount: row.row_count,
          result: row.result as unknown as AnalysisResult,
        });
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const charts = useMemo(() => data?.result.charts ?? [], [data]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Análisis no encontrado</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Este análisis no existe o no tienes acceso a él.
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

  const { result, fileName, rowCount } = data;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="border-b bg-muted/30">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-6 py-3">
          <FileSpreadsheet className="h-4 w-4 shrink-0 text-muted-foreground" />
          <span className="truncate text-sm font-medium">{fileName}</span>
          <span className="text-xs text-muted-foreground">
            · {rowCount.toLocaleString()} filas
          </span>
        </div>
      </div>

      <main className="mx-auto max-w-6xl space-y-8 px-6 py-8">
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
      </main>
    </div>
  );
}
