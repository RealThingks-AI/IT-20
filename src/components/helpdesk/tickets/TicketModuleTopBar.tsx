import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, FileSpreadsheet, Search, X, Archive, BarChart3, Settings } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TicketModuleTopBarProps {
  onSearch?: (query: string, filter: string) => void;
  onColumnsChange?: () => void;
  showColumnSettings?: boolean;
  showExport?: boolean;
  showReportsLink?: boolean;
  showArchiveLink?: boolean;
  children?: React.ReactNode;
  exportData?: any[];
  exportFilename?: string;
}

// CSV export utility
const exportToCSV = (data: any[], filename: string) => {
  if (!data || data.length === 0) {
    toast.error("No data to export");
    return;
  }

  const headers = ["Ticket #", "Title", "Status", "Priority", "Category", "Requester", "Assignee", "Created At"];
  
  const rows = data.map(item => {
    return [
      item.ticket_number || "",
      item.title || "",
      item.status || "",
      item.priority || "",
      item.category?.name || "",
      item.requester?.name || "",
      item.assignee?.name || "",
      item.created_at || ""
    ].map(value => {
      const strVal = String(value);
      if (strVal.includes(",") || strVal.includes('"') || strVal.includes("\n")) {
        return `"${strVal.replace(/"/g, '""')}"`;
      }
      return strVal;
    }).join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\n");
  
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  toast.success(`Exported ${data.length} records to ${filename}.csv`);
};

export function TicketModuleTopBar({ 
  onSearch, 
  onColumnsChange, 
  showColumnSettings = false, 
  showExport = true, 
  showReportsLink = true,
  showArchiveLink = true,
  children,
  exportData,
  exportFilename = "tickets-export"
}: TicketModuleTopBarProps) {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFilter, setSearchFilter] = useState("all");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [searchOpen]);

  const handleExportToExcel = () => {
    if (exportData && exportData.length > 0) {
      exportToCSV(exportData, exportFilename);
    } else {
      toast.info("No data available to export.");
    }
  };

  const handleSearch = () => {
    if (searchQuery.trim()) {
      if (onSearch) {
        onSearch(searchQuery.trim(), searchFilter);
      } else {
        navigate(`/tickets/list?search=${encodeURIComponent(searchQuery.trim())}&filter=${searchFilter}`);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    } else if (e.key === "Escape") {
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  const handleClearSearch = () => {
    setSearchQuery("");
    setSearchOpen(false);
  };

  return (
    <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
      <div className="flex items-center gap-2 px-4 py-2">
        {/* Left side - Search and New Ticket */}
        <div className="flex items-center gap-2">
          {/* Search Toggle Button */}
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={searchOpen ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setSearchOpen(!searchOpen)}
                  className="h-7 w-7"
                >
                  <Search className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Search tickets</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Inline Expandable Search */}
          <div className={cn(
            "flex items-center gap-2 overflow-hidden transition-all duration-300",
            searchOpen ? "max-w-[400px] opacity-100" : "max-w-0 opacity-0"
          )}>
            <Input
              ref={inputRef}
              placeholder="Search tickets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-7 w-[160px] text-xs"
            />
            <Select value={searchFilter} onValueChange={setSearchFilter}>
              <SelectTrigger className="h-7 w-[110px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Fields</SelectItem>
                <SelectItem value="ticket_number">Ticket #</SelectItem>
                <SelectItem value="title">Title</SelectItem>
                <SelectItem value="description">Description</SelectItem>
                <SelectItem value="requester">Requester</SelectItem>
                <SelectItem value="assignee">Assignee</SelectItem>
              </SelectContent>
            </Select>
            <Button size="sm" className="h-7 px-2" onClick={handleSearch}>
              <Search className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClearSearch}
              className="h-7 w-7"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* New Ticket Button */}
          <Button
            size="sm"
            onClick={() => navigate("/tickets/create")}
            className="gap-1 h-7 px-3"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="text-xs">New Ticket</span>
          </Button>
        </div>

        {/* Middle - Children (filters from parent pages) */}
        {children}

        {/* Right side - Action buttons */}
        <div className="flex items-center gap-1 ml-auto">
          <TooltipProvider delayDuration={300}>
            {/* Reports Link */}
            {showReportsLink && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/tickets/reports")}
                    className="h-7 w-7"
                  >
                    <BarChart3 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">View Reports</TooltipContent>
              </Tooltip>
            )}

            {/* Archive Link */}
            {showArchiveLink && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/tickets/archive")}
                    className="h-7 w-7"
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">View Archive</TooltipContent>
              </Tooltip>
            )}

            {/* Column Settings */}
            {showColumnSettings && onColumnsChange && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onColumnsChange}
                    className="h-7 w-7"
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom">Column settings</TooltipContent>
              </Tooltip>
            )}

            {/* Export to Excel */}
            {showExport && (
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
            )}
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}
