import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileSpreadsheet, Loader2, Trash2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({
    meta: [
      { title: "Historial — IA Dashboard" },
      { name: "description", content: "Tus análisis previos." },
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
}

function HistoryPage() {
  const [rows, setRows] = useState<HistoryRow[] | null>(null);

  async function load() {
    const { data, error } = await supabase
      .from("search_history")
      .select("id, file_name, row_count, column_count, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error("Error cargando historial");
      setRows([]);
      return;
    }
    setRows(data ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleDelete(id: string) {
    const { error } = await supabase.from("search_history").delete().eq("id", id);
    if (error) {
      toast.error("No se pudo eliminar");
      return;
    }
    setRows((r) => r?.filter((x) => x.id !== id) ?? null);
    toast.success("Análisis eliminado");
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Tu historial</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Análisis que has generado anteriormente.
        </p>
      </div>

      {rows === null ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <FileSpreadsheet className="h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Aún no has generado ningún análisis.</p>
            <Button asChild size="sm">
              <Link to="/">Subir un Excel</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <Card key={row.id} className="transition-colors hover:border-primary/40">
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <Link
                  to="/dashboard/$id"
                  params={{ id: row.id }}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileSpreadsheet className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{row.file_name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {row.row_count.toLocaleString()} filas · {row.column_count} columnas ·{" "}
                      {new Date(row.created_at).toLocaleString()}
                    </p>
                  </div>
                </Link>
                <div className="flex items-center gap-1">
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/dashboard/$id" params={{ id: row.id }}>
                      Abrir
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(row.id)}
                    aria-label="Eliminar"
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
