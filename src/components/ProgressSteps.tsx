import { Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type Step = "uploading" | "parsing" | "analyzing" | "rendering" | "done";

const STEPS: { id: Step; label: string }[] = [
  { id: "uploading", label: "Cargando archivo" },
  { id: "parsing", label: "Procesando datos" },
  { id: "analyzing", label: "Generando insights con IA" },
  { id: "rendering", label: "Construyendo dashboard" },
];

export function ProgressSteps({ current }: { current: Step }) {
  const order: Step[] = ["uploading", "parsing", "analyzing", "rendering", "done"];
  const idx = order.indexOf(current);
  return (
    <div className="mx-auto w-full max-w-md space-y-3">
      {STEPS.map((s, i) => {
        const isDone = i < idx;
        const isActive = i === idx;
        return (
          <div
            key={s.id}
            className={cn(
              "flex items-center gap-3 rounded-lg border bg-card px-4 py-3 transition-all",
              isActive && "border-primary shadow-sm",
              isDone && "opacity-60",
            )}
          >
            <div
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full",
                isDone && "bg-primary text-primary-foreground",
                isActive && "bg-primary/10 text-primary",
                !isDone && !isActive && "bg-muted text-muted-foreground",
              )}
            >
              {isDone ? (
                <Check className="h-4 w-4" />
              ) : isActive ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="text-xs">{i + 1}</span>
              )}
            </div>
            <span
              className={cn(
                "text-sm",
                isActive ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {s.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
