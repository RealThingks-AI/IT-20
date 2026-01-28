import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { format } from "date-fns";
import { getAssetColumnSettings, AssetColumn } from "./AssetColumnSettings";

interface AssetsListProps {
  filters?: Record<string, any>;
  onSelectionChange?: (selectedIds: string[], actions: any) => void;
}

type SortDirection = "asc" | "desc" | null;
type SortColumn = "asset_tag" | "name" | "category" | "location" | "status" | "purchase_price" | "warranty_expiry" | null;

const PAGE_SIZE_OPTIONS = [25, 50, 100];

export function AssetsList({ filters = {}, onSelectionChange }: AssetsListProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [sortColumn, setSortColumn] = useState<SortColumn>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [visibleColumns, setVisibleColumns] = useState<AssetColumn[]>([]);

  // Load column settings
  useEffect(() => {
    setVisibleColumns(getAssetColumnSettings());
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [filters.search, filters.status, filters.type]);

  // Fetch total count for pagination
  const { data: totalCount = 0 } = useQuery({
    queryKey: ["helpdesk-assets-count", filters],
    queryFn: async () => {
      let query = supabase
        .from("itam_assets")
        .select("id", { count: "exact", head: true })
        .eq("is_active", true);

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,asset_tag.ilike.%${filters.search}%,serial_number.ilike.%${filters.search}%`);
      }
      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.type) {
        // Now filters.type contains the category ID directly
        query = query.eq("category_id", filters.type);
      }

      const { count, error } = await query;
      if (error) throw error;
      return count || 0;
    },
    staleTime: 30000,
  });

  // Fetch paginated assets with related data
  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["helpdesk-assets", filters, page, pageSize, sortColumn, sortDirection],
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("itam_assets")
        .select(`
          *,
          category:itam_categories(id, name),
          location:itam_locations(id, name),
          department:itam_departments(id, name),
          make:itam_makes(id, name)
        `)
        .eq("is_active", true)
        .range(from, to);

      if (filters.search) {
        query = query.or(`name.ilike.%${filters.search}%,asset_tag.ilike.%${filters.search}%,serial_number.ilike.%${filters.search}%`);
      }
      if (filters.status) {
        query = query.eq("status", filters.status);
      }
      if (filters.type) {
        // Now filters.type contains the category ID directly
        query = query.eq("category_id", filters.type);
      }

      // Apply sorting
      if (sortColumn && sortDirection) {
        const ascending = sortDirection === "asc";
        switch (sortColumn) {
          case "asset_tag":
          case "name":
          case "status":
          case "purchase_price":
          case "warranty_expiry":
            query = query.order(sortColumn, { ascending });
            break;
          case "category":
            query = query.order("category_id", { ascending });
            break;
          case "location":
            query = query.order("location_id", { ascending });
            break;
        }
      } else {
        query = query.order("created_at", { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    staleTime: 30000,
  });

  const totalPages = Math.ceil(totalCount / pageSize);

  const updateStatus = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      const { error } = await supabase
        .from("itam_assets")
        .update({ status })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["helpdesk-assets"] });
      queryClient.invalidateQueries({ queryKey: ["helpdesk-assets-count"] });
      toast.success("Assets updated");
      setSelectedIds([]);
    },
  });

  const deleteAssets = useMutation({
    mutationFn: async (ids: string[]) => {
      const { error } = await supabase
        .from("itam_assets")
        .update({ is_active: false })
        .in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["helpdesk-assets"] });
      queryClient.invalidateQueries({ queryKey: ["helpdesk-assets-count"] });
      toast.success("Assets deleted");
      setSelectedIds([]);
    },
  });

  const handleSelectAll = (checked: boolean) => {
    const newSelected = checked ? assets.map((a: any) => a.id) : [];
    setSelectedIds(newSelected);
    onSelectionChange?.(newSelected, bulkActions);
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = checked
      ? [...selectedIds, id]
      : selectedIds.filter((sid) => sid !== id);
    setSelectedIds(newSelected);
    onSelectionChange?.(newSelected, bulkActions);
  };

  const bulkActions = {
    handleCheckOut: () => updateStatus.mutate({ ids: selectedIds, status: "checked_out" }),
    handleCheckIn: () => updateStatus.mutate({ ids: selectedIds, status: "available" }),
    handleMaintenance: () => updateStatus.mutate({ ids: selectedIds, status: "in_repair" }),
    handleDispose: () => updateStatus.mutate({ ids: selectedIds, status: "disposed" }),
    handleDelete: () => deleteAssets.mutate(selectedIds),
  };

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortColumn(null);
        setSortDirection(null);
      }
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const renderSortIcon = (column: SortColumn) => {
    if (sortColumn !== column) {
      return <ArrowUpDown className="h-3 w-3 ml-1 text-muted-foreground" />;
    }
    if (sortDirection === "asc") {
      return <ArrowUp className="h-3 w-3 ml-1 text-primary" />;
    }
    return <ArrowDown className="h-3 w-3 ml-1 text-primary" />;
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      available: "default",
      assigned: "secondary",
      checked_out: "secondary",
      in_repair: "outline",
      disposed: "destructive",
      retired: "destructive",
      lost: "destructive",
    };
    const labels: Record<string, string> = {
      available: "Available",
      assigned: "Assigned",
      checked_out: "Checked Out",
      in_repair: "In Repair",
      disposed: "Disposed",
      retired: "Retired",
      lost: "Lost",
    };
    return (
      <Badge variant={variants[status] || "secondary"}>
        {labels[status] || status?.replace("_", " ") || "Unknown"}
      </Badge>
    );
  };

  const getWarrantyBadge = (warrantyExpiry: string | null) => {
    if (!warrantyExpiry) return <span className="text-muted-foreground text-xs">—</span>;
    
    const expiryDate = new Date(warrantyExpiry);
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    if (expiryDate < now) {
      return <Badge variant="destructive" className="text-xs">Expired</Badge>;
    } else if (expiryDate <= thirtyDaysFromNow) {
      return <Badge variant="outline" className="text-xs border-amber-500 text-amber-600">Expiring Soon</Badge>;
    }
    return <span className="text-xs">{format(expiryDate, "dd MMM yyyy")}</span>;
  };

  const formatCurrency = (amount: number | null) => {
    if (amount === null || amount === undefined) return "—";
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      return format(new Date(dateStr), "dd MMM yyyy");
    } catch {
      return "—";
    }
  };

  // Get visible columns
  const activeColumns = visibleColumns.filter(c => c.visible);

  // Render cell based on column ID
  const renderCell = (asset: any, columnId: string) => {
    switch (columnId) {
      case "asset_tag":
        return <span className="font-medium">{asset.asset_tag || "—"}</span>;
      case "name":
        return asset.name || "—";
      case "category":
        return asset.category?.name || <span className="text-muted-foreground">—</span>;
      case "make":
        return asset.make?.name || <span className="text-muted-foreground">—</span>;
      case "model":
        return asset.model || <span className="text-muted-foreground">—</span>;
      case "serial_number":
        return asset.serial_number || <span className="text-muted-foreground">—</span>;
      case "status":
        return getStatusBadge(asset.status);
      case "location":
        return asset.location?.name || <span className="text-muted-foreground">—</span>;
      case "department":
        return asset.department?.name || <span className="text-muted-foreground">—</span>;
      case "assigned_to":
        return asset.assigned_to || <span className="text-muted-foreground">—</span>;
      case "purchase_price":
        return <span className="font-medium">{formatCurrency(asset.purchase_price)}</span>;
      case "purchase_date":
        return formatDate(asset.purchase_date);
      case "warranty_expiry":
        return getWarrantyBadge(asset.warranty_expiry);
      case "vendor":
        return asset.custom_fields?.vendor || <span className="text-muted-foreground">—</span>;
      case "notes":
        return asset.notes ? (
          <span className="truncate max-w-[200px] block">{asset.notes}</span>
        ) : <span className="text-muted-foreground">—</span>;
      case "created_at":
        return formatDate(asset.created_at);
      case "updated_at":
        return formatDate(asset.updated_at);
      default:
        return "—";
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={selectedIds.length === assets.length && assets.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              {activeColumns.map((column) => (
                <TableHead 
                  key={column.id}
                  className={`cursor-pointer select-none hover:bg-muted/50 ${
                    column.id === "purchase_price" ? "text-right" : ""
                  }`}
                  onClick={() => handleSort(column.id as SortColumn)}
                >
                  <div className={`flex items-center ${column.id === "purchase_price" ? "justify-end" : ""}`}>
                    {column.label}
                    {renderSortIcon(column.id as SortColumn)}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {assets.length === 0 ? (
              <TableRow>
                <TableCell colSpan={activeColumns.length + 1} className="text-center text-muted-foreground py-8">
                  No assets found
                </TableCell>
              </TableRow>
            ) : (
              assets.map((asset: any) => (
                <TableRow
                  key={asset.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/assets/detail/${asset.id}`)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.includes(asset.id)}
                      onCheckedChange={(checked) => handleSelectOne(asset.id, checked as boolean)}
                    />
                  </TableCell>
                  {activeColumns.map((column) => (
                    <TableCell 
                      key={column.id}
                      className={column.id === "purchase_price" ? "text-right" : ""}
                    >
                      {renderCell(asset, column.id)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {assets.length === 0 ? 0 : ((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount} assets
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Per page:</span>
            <Select 
              value={pageSize.toString()} 
              onValueChange={(value) => {
                setPageSize(Number(value));
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[70px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(1)}
              disabled={page === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <span className="text-sm mx-2">
              Page {page} of {totalPages || 1}
            </span>

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => setPage(totalPages)}
              disabled={page >= totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
