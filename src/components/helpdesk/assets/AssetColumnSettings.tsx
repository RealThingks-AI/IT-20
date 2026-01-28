import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GripVertical, RotateCcw } from "lucide-react";

export interface AssetColumn {
  id: string;
  label: string;
  visible: boolean;
  locked?: boolean; // Some columns cannot be hidden
}

const DEFAULT_ASSET_COLUMNS: AssetColumn[] = [
  { id: "asset_tag", label: "Asset Tag", visible: true, locked: true },
  { id: "name", label: "Name", visible: true },
  { id: "category", label: "Category", visible: true },
  { id: "make", label: "Brand/Make", visible: true },
  { id: "model", label: "Model", visible: true },
  { id: "serial_number", label: "Serial Number", visible: true },
  { id: "status", label: "Status", visible: true },
  { id: "location", label: "Location", visible: true },
  { id: "department", label: "Department", visible: false },
  { id: "assigned_to", label: "Assigned To", visible: true },
  { id: "purchase_price", label: "Purchase Price", visible: true },
  { id: "purchase_date", label: "Purchase Date", visible: false },
  { id: "warranty_expiry", label: "Warranty Expiry", visible: true },
  { id: "vendor", label: "Vendor", visible: false },
  { id: "notes", label: "Notes", visible: false },
  { id: "created_at", label: "Created Date", visible: false },
  { id: "updated_at", label: "Last Updated", visible: false },
];

const STORAGE_KEY = "asset-column-settings";

interface AssetColumnSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onColumnsChange?: (columns: AssetColumn[]) => void;
}

export function AssetColumnSettings({ open, onOpenChange, onColumnsChange }: AssetColumnSettingsProps) {
  const [columns, setColumns] = useState<AssetColumn[]>([]);

  // Load saved columns on mount
  useEffect(() => {
    const savedColumns = localStorage.getItem(STORAGE_KEY);
    if (savedColumns) {
      try {
        const parsed = JSON.parse(savedColumns);
        // Merge with defaults to handle new columns added after user saved
        const merged = DEFAULT_ASSET_COLUMNS.map(defaultCol => {
          const saved = parsed.find((c: AssetColumn) => c.id === defaultCol.id);
          return saved ? { ...defaultCol, visible: saved.visible } : defaultCol;
        });
        setColumns(merged);
      } catch {
        setColumns([...DEFAULT_ASSET_COLUMNS]);
      }
    } else {
      setColumns([...DEFAULT_ASSET_COLUMNS]);
    }
  }, [open]);

  const handleToggle = (columnId: string, checked: boolean) => {
    setColumns(prev =>
      prev.map(col =>
        col.id === columnId && !col.locked
          ? { ...col, visible: checked }
          : col
      )
    );
  };

  const handleReset = () => {
    setColumns([...DEFAULT_ASSET_COLUMNS]);
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
    onColumnsChange?.(columns);
    onOpenChange(false);
  };

  const handleShowAll = () => {
    setColumns(prev => prev.map(col => ({ ...col, visible: true })));
  };

  const handleHideAll = () => {
    setColumns(prev =>
      prev.map(col => (col.locked ? col : { ...col, visible: false }))
    );
  };

  const visibleCount = columns.filter(c => c.visible).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Setup Columns</span>
            <span className="text-sm font-normal text-muted-foreground">
              {visibleCount} of {columns.length} visible
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 mb-2">
          <Button variant="outline" size="sm" onClick={handleShowAll}>
            Show All
          </Button>
          <Button variant="outline" size="sm" onClick={handleHideAll}>
            Hide All
          </Button>
          <Button variant="ghost" size="sm" onClick={handleReset} className="ml-auto gap-1">
            <RotateCcw className="h-3 w-3" />
            Reset
          </Button>
        </div>

        <ScrollArea className="h-[350px] pr-4">
          <div className="space-y-2">
            {columns.map((column) => (
              <div
                key={column.id}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground/50 cursor-grab" />
                <Checkbox
                  id={`col-${column.id}`}
                  checked={column.visible}
                  onCheckedChange={(checked) => handleToggle(column.id, !!checked)}
                  disabled={column.locked}
                />
                <Label
                  htmlFor={`col-${column.id}`}
                  className={`flex-1 cursor-pointer ${column.locked ? "text-muted-foreground" : ""}`}
                >
                  {column.label}
                  {column.locked && (
                    <span className="ml-2 text-xs text-muted-foreground">(required)</span>
                  )}
                </Label>
              </div>
            ))}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Export helper to get current column settings
export function getAssetColumnSettings(): AssetColumn[] {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      return DEFAULT_ASSET_COLUMNS.map(defaultCol => {
        const savedCol = parsed.find((c: AssetColumn) => c.id === defaultCol.id);
        return savedCol ? { ...defaultCol, visible: savedCol.visible } : defaultCol;
      });
    } catch {
      return [...DEFAULT_ASSET_COLUMNS];
    }
  }
  return [...DEFAULT_ASSET_COLUMNS];
}

export { DEFAULT_ASSET_COLUMNS };
