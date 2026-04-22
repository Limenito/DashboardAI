import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileSpreadsheet, Trash2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AppHeader } from "@/components/AppHeader";
import { listHistory, deleteHistoryEntry, type HistoryEntry } from "@/lib/history";
import { toast } from "sonner";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Historial — IA Dashboard" },
      { name: "description", content: "Tus análisis previos guardados en este navegador." },
    ],
  }),
  component: HistoryPage,
});

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
  const [items, setItems] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    setItems(listHistory());
  }, []);

  function handleDelete(id: string) {
    deleteHistoryEntry(id);
    setItems((prev) => prev.filter((r) => r.id !== id));
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
              Tus análisis anteriores en este navegador. Haz clic para reabrirlos.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link to="/">Nuevo análisis</Link>
          </Button>
        </div>

        {items.length === 0 ? (
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
                      >
                        <Trash2 className="h-4 w-4" />
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
