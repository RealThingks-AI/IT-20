import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Settings, FileSpreadsheet } from "lucide-react";
import { AssetColumnSettings } from "./AssetColumnSettings";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AssetModuleTopBarProps {
  onColumnsChange?: () => void;
}

export function AssetModuleTopBar({ onColumnsChange }: AssetModuleTopBarProps) {
  const navigate = useNavigate();
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);

  const handleExportToExcel = () => {
    toast.info("Export feature coming soon");
  };

  return (
    <>
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center gap-1 px-3 py-1.5">
          <TooltipProvider delayDuration={300}>
            {/* Add Asset Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/assets/add")}
                  className="gap-1 h-7 px-2"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span className="text-xs">Add</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Add new asset</TooltipContent>
            </Tooltip>

            {/* Setup Columns Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setColumnSettingsOpen(true)}
                  className="h-7 w-7"
                >
                  <Settings className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Setup columns</TooltipContent>
            </Tooltip>

            {/* Export to Excel Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleExportToExcel}
                  className="h-7 w-7"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Export to Excel</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <AssetColumnSettings
        open={columnSettingsOpen}
        onOpenChange={setColumnSettingsOpen}
        onColumnsChange={() => onColumnsChange?.()}
      />
    </>
  );
}
