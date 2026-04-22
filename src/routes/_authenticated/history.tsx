import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileSpreadsheet, Loader2, Trash2, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppHeader } from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { API_URL, pingBackend, type AnalysisResult } from "@/lib/analysis";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Historial — IA Dashboard" },
      { name: "description", content: "Tus análisis previos guardados." },
    ],
  }),
  component: HistoryPage,
});

interface HistoryRow {
  id: string;
  file_name: string;
  row_count: number;
  column_count: number;
  created_at: string;
  result: AnalysisResult;
}

function formatRelative(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "hace unos segundos";
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`;
  if (diff < 604800) return `hace ${Math.floor(diff / 86400)} d`;
  return new Date(iso).toLocaleDateString();
}

function HistoryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<HistoryRow[] | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [backendOk, setBackendOk] = useState<boolean | null>(null);

  async function load() {
    const { data, error } = await supabase
      .from("search_history")
      .select("id, file_name, row_count, column_count, created_at, result")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      setItems([]);
      return;
    }
    setItems((data ?? []) as unknown as HistoryRow[]);
  }

  useEffect(() => {
    load();
    if (API_URL) pingBackend().then(setBackendOk);
    else setBackendOk(false);
  }, []);

  async function handleDelete(id: string) {
    setDeletingId(id);
    const { error } = await supabase.from("search_history").delete().eq("id", id);
    setDeletingId(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    setItems((prev) => prev?.filter((r) => r.id !== id) ?? null);
    toast.success("Análisis eliminado");
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-6 py-10">
        <div className="mb-6 flex items-baseline justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Historial</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Tus análisis anteriores. Haz clic para reabrirlos.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/">Nuevo análisis</Link>
          </Button>
        </div>

        <BackendStatus ok={backendOk} />


        {items === null ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
              <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Aún no tienes análisis guardados.</p>
              <Button asChild>
                <Link to="/">Crear el primero</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((row) => {
              const kpis = row.result?.kpis?.slice(0, 2) ?? [];
              return (
                <Card key={row.id} className="group transition-colors hover:border-primary/50">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4 shrink-0 text-muted-foreground" />
                          <h3 className="truncate text-sm font-medium">{row.file_name}</h3>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {formatRelative(row.created_at)} · {row.row_count.toLocaleString()} filas
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(row.id)}
                        disabled={deletingId === row.id}
                      >
                        {deletingId === row.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    {kpis.length > 0 && (
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        {kpis.map((k) => (
                          <div key={k.label} className="rounded-md border bg-muted/30 p-2">
                            <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground">
                              {k.label}
                            </p>
                            <p className="truncate text-sm font-semibold tabular-nums">{k.value}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-4 w-full justify-between"
                      onClick={() =>
                        navigate({ to: "/dashboard/$id", params: { id: row.id } })
                      }
                    >
                      Abrir
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}

function BackendStatus({ ok }: { ok: boolean | null }) {
  if (ok === null) return null;
  if (ok) {
    return (
      <div className="mb-6 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-4 py-2 text-xs">
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
        <span className="text-foreground">Backend conectado</span>
        <span className="ml-auto truncate font-mono text-muted-foreground">{API_URL}</span>
      </div>
    );
  }
  return (
    <div className="mb-6 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-xs">
      <AlertCircle className="h-4 w-4 text-amber-500" />
      <span className="text-foreground">
        {API_URL ? "Backend sin conexión" : "Sin backend configurado"} — usando análisis local (modo demo)
      </span>
    </div>
  );
}
