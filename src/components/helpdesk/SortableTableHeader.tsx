import { TableHead } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export type SortDirection = "asc" | "desc" | null;

export interface SortConfig {
  column: string;
  direction: SortDirection;
}

interface SortableTableHeaderProps {
  column: string;
  label: string;
  sortConfig: SortConfig;
  onSort: (column: string) => void;
  className?: string;
}

export const SortableTableHeader = ({
  column,
  label,
  sortConfig,
  onSort,
  className,
}: SortableTableHeaderProps) => {
  return (
    <TableHead
      className={cn(
        "cursor-pointer select-none py-2 font-semibold text-xs uppercase tracking-wide text-foreground/70 hover:text-foreground transition-colors",
        className
      )}
      onClick={() => onSort(column)}
    >
      <span>{label}</span>
    </TableHead>
  );
};