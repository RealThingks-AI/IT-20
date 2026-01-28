import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, UserCheck, Wrench, Settings, Package, ChevronDown, X } from "lucide-react";
import { AssetsList } from "@/components/helpdesk/assets/AssetsList";
import { AssetModuleTopBar } from "@/components/helpdesk/assets/AssetModuleTopBar";
import { useAssetSetupConfig } from "@/hooks/useAssetSetupConfig";
import { Badge } from "@/components/ui/badge";

export default function AllAssets() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState<Record<string, any>>({
    search: searchParams.get("search") || "",
    status: searchParams.get("status") || null,
    type: null,
  });
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [bulkActions, setBulkActions] = useState<any>(null);
  const [columnsVersion, setColumnsVersion] = useState(0);
  const { categories } = useAssetSetupConfig();

  // Sync URL params to filters
  useEffect(() => {
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || null;
    setFilters(prev => ({ ...prev, search, status }));
  }, [searchParams]);

  const handleSearchChange = (value: string) => {
    setFilters(prev => ({ ...prev, search: value }));
    if (value) {
      searchParams.set("search", value);
    } else {
      searchParams.delete("search");
    }
    setSearchParams(searchParams, { replace: true });
  };

  const handleStatusChange = (value: string) => {
    const status = value === "all" ? null : value;
    setFilters(prev => ({ ...prev, status }));
    if (status) {
      searchParams.set("status", status);
    } else {
      searchParams.delete("status");
    }
    setSearchParams(searchParams, { replace: true });
  };

  const handleTypeChange = (value: string) => {
    // Store category ID instead of name for proper DB filtering
    const selectedCategory = value === "all" ? null : categories.find(c => c.name === value);
    setFilters(prev => ({ 
      ...prev, 
      type: selectedCategory?.id || null,
      typeName: value === "all" ? null : value 
    }));
  };

  const clearFilters = () => {
    setFilters({ search: "", status: null, type: null, typeName: null });
    setSearchParams({}, { replace: true });
  };

  const hasActiveFilters = filters.search || filters.status || filters.type;

  return (
    <div className="min-h-screen bg-background">
      <AssetModuleTopBar
        onSearch={handleSearchChange}
        searchValue={filters.search}
        onColumnsChange={() => setColumnsVersion(v => v + 1)}
      />

      <div className="px-4 py-3 space-y-3">
        {/* Filters Row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Inline Search */}
          <div className="relative w-full sm:w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={filters.search || ""}
              onChange={e => handleSearchChange(e.target.value)}
              className="pl-9 h-9"
            />
            {filters.search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                onClick={() => handleSearchChange("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 ml-auto flex-wrap">
            {/* Bulk Actions */}
            {selectedAssetIds.length > 0 && bulkActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="h-9">
                    Bulk Actions ({selectedAssetIds.length})
                    <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={bulkActions.handleCheckOut}>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Check Out
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={bulkActions.handleCheckIn}>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Check In
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={bulkActions.handleMaintenance}>
                    <Wrench className="mr-2 h-4 w-4" />
                    Maintenance
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={bulkActions.handleDispose}>
                    <Settings className="mr-2 h-4 w-4" />
                    Dispose
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={bulkActions.handleDelete} className="text-destructive">
                    <Package className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Status Filter */}
            <Select
              value={filters.status || "all"}
              onValueChange={handleStatusChange}
            >
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="assigned">Assigned</SelectItem>
                <SelectItem value="in_repair">In Repair</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
                <SelectItem value="disposed">Disposed</SelectItem>
              </SelectContent>
            </Select>

            {/* Type Filter - Now uses category ID for filtering */}
            <Select
              value={filters.typeName || "all"}
              onValueChange={handleTypeChange}
            >
              <SelectTrigger className="w-[130px] h-9">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {categories.map((category) => (
                  <SelectItem key={category.id} value={category.name}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-9 gap-1">
                <X className="h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Active Filters Display */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Filters:</span>
            {filters.search && (
              <Badge variant="secondary" className="gap-1 text-xs">
                Search: {filters.search}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleSearchChange("")}
                />
              </Badge>
            )}
            {filters.status && (
              <Badge variant="secondary" className="gap-1 text-xs capitalize">
                Status: {filters.status.replace("_", " ")}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleStatusChange("all")}
                />
              </Badge>
            )}
            {filters.typeName && (
              <Badge variant="secondary" className="gap-1 text-xs">
                Type: {filters.typeName}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() => handleTypeChange("all")}
                />
              </Badge>
            )}
          </div>
        )}

        {/* Assets List */}
        <AssetsList
          key={columnsVersion}
          filters={filters}
          onSelectionChange={(selectedIds, actions) => {
            setSelectedAssetIds(selectedIds);
            setBulkActions(actions);
          }}
        />
      </div>
    </div>
  );
}
