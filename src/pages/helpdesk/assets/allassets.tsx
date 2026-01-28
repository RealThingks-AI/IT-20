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
        onColumnsChange={() => setColumnsVersion(v => v + 1)}
      />

      <div className="px-3 py-2 space-y-2">
        {/* Unified Filter Row */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Input */}
          <div className="relative w-full sm:w-[220px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search assets..."
              value={filters.search || ""}
              onChange={e => handleSearchChange(e.target.value)}
              className="pl-8 h-8 text-sm"
            />
            {filters.search && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0.5 top-1/2 -translate-y-1/2 h-6 w-6"
                onClick={() => handleSearchChange("")}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* Status Filter */}
          <Select
            value={filters.status || "all"}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger className="w-[100px] h-8 text-xs">
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

          {/* Type Filter */}
          <Select
            value={filters.typeName || "all"}
            onValueChange={handleTypeChange}
          >
            <SelectTrigger className="w-[100px] h-8 text-xs">
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

          <div className="flex items-center gap-1.5 ml-auto">
            {/* Bulk Actions */}
            {selectedAssetIds.length > 0 && bulkActions && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="h-8 text-xs">
                    Bulk ({selectedAssetIds.length})
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={bulkActions.handleCheckOut}>
                    <UserCheck className="mr-2 h-3.5 w-3.5" />
                    Check Out
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={bulkActions.handleCheckIn}>
                    <UserCheck className="mr-2 h-3.5 w-3.5" />
                    Check In
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={bulkActions.handleMaintenance}>
                    <Wrench className="mr-2 h-3.5 w-3.5" />
                    Maintenance
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={bulkActions.handleDispose}>
                    <Settings className="mr-2 h-3.5 w-3.5" />
                    Dispose
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={bulkActions.handleDelete} className="text-destructive">
                    <Package className="mr-2 h-3.5 w-3.5" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Clear Filters */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1 text-xs px-2">
                <X className="h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Active Filters Display - Compact */}
        {hasActiveFilters && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Filters:</span>
            {filters.search && (
              <Badge variant="secondary" className="gap-1 text-[10px] h-5 px-1.5">
                {filters.search}
                <X
                  className="h-2.5 w-2.5 cursor-pointer"
                  onClick={() => handleSearchChange("")}
                />
              </Badge>
            )}
            {filters.status && (
              <Badge variant="secondary" className="gap-1 text-[10px] h-5 px-1.5 capitalize">
                {filters.status.replace("_", " ")}
                <X
                  className="h-2.5 w-2.5 cursor-pointer"
                  onClick={() => handleStatusChange("all")}
                />
              </Badge>
            )}
            {filters.typeName && (
              <Badge variant="secondary" className="gap-1 text-[10px] h-5 px-1.5">
                {filters.typeName}
                <X
                  className="h-2.5 w-2.5 cursor-pointer"
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
