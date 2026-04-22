import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, FileSpreadsheet, Zap } from "lucide-react";
import { Dropzone } from "@/components/Dropzone";
import { ProgressSteps, type Step } from "@/components/ProgressSteps";
import { parseExcel } from "@/lib/excel";
import { requestAnalysis, type AnalysisResult } from "@/lib/analysis";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/")({
  head: () => ({
    meta: [
      { title: "IA Dashboard — Convierte tu Excel en insights" },
      {
        name: "description",
        content:
          "Sube un Excel y obtén automáticamente un dashboard interactivo con KPIs, gráficos y resumen ejecutivo generados por IA.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState<Step | null>(null);

  async function handleFile(file: File) {
    try {
      setStep("uploading");
      await new Promise((r) => setTimeout(r, 250));
      setStep("parsing");
      const parsed = await parseExcel(file);
      if (parsed.rowCount === 0) throw new Error("El archivo está vacío.");
      setStep("analyzing");
      const result: AnalysisResult = await requestAnalysis(parsed);
      setStep("rendering");

      if (!user) throw new Error("No hay sesión activa.");

      const { data: inserted, error } = await supabase
        .from("search_history")
        .insert({
          user_id: user.id,
          file_name: parsed.fileName,
          row_count: parsed.rowCount,
          column_count: parsed.columnCount,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          result: result as any,
        })
        .select("id")
        .single();

      if (error || !inserted) throw error ?? new Error("No se pudo guardar el análisis.");

      // Datos crudos solo para esta sesión (no se guardan en BD)
      sessionStorage.setItem(
        `analysis-rows:${inserted.id}`,
        JSON.stringify({ columns: parsed.columns, rows: parsed.rows }),
      );

      await new Promise((r) => setTimeout(r, 200));
      navigate({ to: "/dashboard/$id", params: { id: inserted.id } });
    } catch (e) {
      console.error(e);
      toast.error(e instanceof Error ? e.message : "Error procesando el archivo");
      setStep(null);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-6 py-16 sm:py-24">
      {!step ? (
        <>
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
              <Sparkles className="h-3 w-3 text-primary" />
              Powered by IA
            </div>
            <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
              Convierte tu Excel en un dashboard inteligente
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-balance text-base text-muted-foreground">
              Sube cualquier hoja de cálculo y obtén un análisis automático con KPIs, gráficos
              interactivos y un resumen ejecutivo generado por IA.
            </p>
          </div>

          <div className="mt-12">
            <Dropzone onFile={handleFile} />
          </div>

          <div className="mt-12 grid gap-4 sm:grid-cols-3">
            <Feature
              icon={<FileSpreadsheet className="h-5 w-5" />}
              title="Cualquier Excel"
              desc="Detección automática de columnas numéricas, categóricas y fechas."
            />
            <Feature
              icon={<Sparkles className="h-5 w-5" />}
              title="IA decide los gráficos"
              desc="El modelo elige las visualizaciones más relevantes para tus datos."
            />
            <Feature
              icon={<Zap className="h-5 w-5" />}
              title="Insights al instante"
              desc="Resumen ejecutivo y palabras clave en segundos."
            />
          </div>
        </>
      ) : (
        <div className="flex min-h-[60vh] flex-col items-center justify-center">
          <h2 className="mb-8 text-2xl font-semibold tracking-tight">Analizando tu archivo…</h2>
          <ProgressSteps current={step} />
        </div>
      )}
    </main>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="rounded-xl border bg-card p-5">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-4 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
