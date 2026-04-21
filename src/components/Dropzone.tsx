import { useCallback, useRef, useState } from "react";
import { Upload, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

const ACCEPT = ".xlsx,.xls";

export function Dropzone({ onFile, disabled }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setDragActive] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || !files[0]) return;
      const f = files[0];
      const ok = /\.(xlsx|xls)$/i.test(f.name);
      if (ok) onFile(f);
    },
    [onFile],
  );

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragActive(false);
        if (!disabled) handleFiles(e.dataTransfer.files);
      }}
      className={cn(
        "group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/50 px-8 py-16 transition-all hover:border-primary hover:bg-card",
        isDragActive && "border-primary bg-primary/5 scale-[1.01]",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
        {isDragActive ? <FileSpreadsheet className="h-8 w-8" /> : <Upload className="h-8 w-8" />}
      </div>
      <p className="mt-6 text-lg font-medium text-foreground">
        {isDragActive ? "Suelta el archivo aquí" : "Arrastra tu Excel o haz clic"}
      </p>
      <p className="mt-2 text-sm text-muted-foreground">Formatos soportados: .xlsx, .xls</p>
    </div>
  );
}
