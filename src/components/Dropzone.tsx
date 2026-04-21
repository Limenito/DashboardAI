import { useDropzone } from "react-dropzone";
import { Upload, FileSpreadsheet } from "lucide-react";
import { cn } from "@/lib/utils";

interface DropzoneProps {
  onFile: (file: File) => void;
  disabled?: boolean;
}

export function Dropzone({ onFile, disabled }: DropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls"],
    },
    multiple: false,
    disabled,
    onDrop: (files) => {
      if (files[0]) onFile(files[0]);
    },
  });

  return (
    <div
      {...getRootProps()}
      className={cn(
        "group relative flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/50 px-8 py-16 transition-all hover:border-primary hover:bg-card",
        isDragActive && "border-primary bg-primary/5 scale-[1.01]",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <input {...getInputProps()} />
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
