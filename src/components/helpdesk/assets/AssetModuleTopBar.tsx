import { useState, useRef, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { List, Plus, Search, X, Settings, FileSpreadsheet } from "lucide-react";
import { AssetColumnSettings } from "./AssetColumnSettings";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AssetModuleTopBarProps {
  onSearch?: (query: string, filter?: string) => void;
  searchValue?: string;
  onColumnsChange?: () => void;
}

const SEARCH_FILTERS = [
  { value: "all", label: "All Fields" },
  { value: "asset_tag", label: "Asset Tag" },
  { value: "name", label: "Name" },
  { value: "serial_number", label: "Serial No." },
  { value: "assigned_to", label: "Assigned To" },
  { value: "location", label: "Location" },
  { value: "category", label: "Category" },
];

export function AssetModuleTopBar({ onSearch, searchValue = "", onColumnsChange }: AssetModuleTopBarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useIsMobile();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchValue);
  const [searchFilter, setSearchFilter] = useState("all");
  const [columnSettingsOpen, setColumnSettingsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isOnAllAssets = location.pathname.includes("/assets/allassets");

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [searchOpen]);

  const handleSearch = () => {
    if (onSearch) {
      onSearch(searchQuery, searchFilter);
    } else {
      // Navigate to allassets with search params
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (searchFilter !== "all") params.set("filter", searchFilter);
      navigate(`/assets/allassets?${params.toString()}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSearch();
    }
    if (e.key === "Escape") {
      setSearchOpen(false);
      setSearchQuery("");
    }
  };

  const handleExportToExcel = () => {
    toast.info("Export feature coming soon");
  };

  return (
    <>
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center gap-1 px-4 py-2">
          {/* List of Assets Button */}
          <Button
            variant={isOnAllAssets ? "secondary" : "ghost"}
            size="sm"
            onClick={() => navigate("/assets/allassets")}
            className="gap-1.5 h-8 transition-all duration-200"
          >
            <List className="h-4 w-4" />
            {!isMobile && <span className="text-sm">List of Assets</span>}
          </Button>

          {/* Add Asset Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/assets/add")}
            className="gap-1.5 h-8 transition-all duration-200"
          >
            <Plus className="h-4 w-4" />
            {!isMobile && <span className="text-sm">Add an Asset</span>}
          </Button>

          {/* Setup Columns Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setColumnSettingsOpen(true)}
            className="gap-1.5 h-8 transition-all duration-200"
          >
            <Settings className="h-4 w-4" />
            {!isMobile && <span className="text-sm">Setup Columns</span>}
          </Button>

          {/* Export to Excel Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportToExcel}
            className="gap-1.5 h-8 transition-all duration-200"
          >
            <FileSpreadsheet className="h-4 w-4" />
            {!isMobile && <span className="text-sm">Export to Excel</span>}
          </Button>

          {/* Search Toggle Button */}
          <Button
            variant={searchOpen ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setSearchOpen(!searchOpen)}
            className="gap-1.5 h-8 transition-all duration-200 ml-auto"
          >
            <Search className="h-4 w-4" />
            {!isMobile && <span className="text-sm">Search</span>}
          </Button>

          {/* Inline Search Bar */}
          <div
            className={cn(
              "flex items-center gap-2 overflow-hidden transition-all duration-300 ease-in-out",
              searchOpen ? "max-w-[400px] opacity-100 ml-2" : "max-w-0 opacity-0"
            )}
          >
            <div className="flex items-center gap-1 bg-background border rounded-md shadow-sm">
              <Input
                ref={inputRef}
                placeholder="Search Keyword ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="h-8 w-[140px] sm:w-[180px] border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
              />
              {searchQuery && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 mr-1"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Filter Dropdown */}
            <Select value={searchFilter} onValueChange={setSearchFilter}>
              <SelectTrigger className="h-8 w-[110px] text-xs">
                <SelectValue placeholder="All Fields" />
              </SelectTrigger>
              <SelectContent>
                {SEARCH_FILTERS.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Search Submit Button */}
            <Button
              size="sm"
              onClick={handleSearch}
              className="h-8 px-3"
            >
              <Search className="h-4 w-4" />
            </Button>
          </div>
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
