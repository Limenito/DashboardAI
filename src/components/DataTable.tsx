import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DataTableProps {
  columns: string[];
  rows: Record<string, unknown>[];
  pageSize?: number;
}

export function DataTable({ columns, rows, pageSize = 10 }: DataTableProps) {
  const [page, setPage] = useState(0);
  const pages = Math.ceil(rows.length / pageSize);
  const slice = rows.slice(page * pageSize, (page + 1) * pageSize);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((c) => (
                <TableHead key={c} className="whitespace-nowrap">
                  {c}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {slice.map((row, i) => (
              <TableRow key={i}>
                {columns.map((c) => (
                  <TableCell key={c} className="whitespace-nowrap text-sm">
                    {formatCell(row[c])}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {page * pageSize + 1}–{Math.min((page + 1) * pageSize, rows.length)} de {rows.length}
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPage((p) => Math.min(pages - 1, p + 1))}
            disabled={page >= pages - 1}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

function formatCell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "number") return v.toLocaleString();
  return String(v);
}
