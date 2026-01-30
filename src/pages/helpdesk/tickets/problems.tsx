import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { TicketModuleTopBar } from "@/components/helpdesk/tickets/TicketModuleTopBar";
import { ProblemTableView } from "@/components/helpdesk/ProblemTableView";
import { TicketPagination } from "@/components/helpdesk/TicketPagination";
import { BulkActionsProblemButton } from "@/components/helpdesk/BulkActionsProblemButton";
import { CreateProblemDialog } from "@/components/helpdesk/CreateProblemDialog";
import { EditProblemDialog } from "@/components/helpdesk/EditProblemDialog";
import { AssignProblemDialog } from "@/components/helpdesk/AssignProblemDialog";

export default function ProblemsPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  // URL-based initial filters
  const initialFilters: Record<string, any> = {};
  if (searchParams.get("status")) initialFilters.status = searchParams.get("status");
  if (searchParams.get("priority")) initialFilters.priority = searchParams.get("priority");

  // State
  const [filters, setFilters] = useState<Record<string, any>>(initialFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [createProblemOpen, setCreateProblemOpen] = useState(false);
  const [editProblem, setEditProblem] = useState<any>(null);
  const [assignProblem, setAssignProblem] = useState<any>(null);

  // Reset pagination when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filters]);

  // Data fetching
  const { data: allProblems, isLoading } = useQuery({
    queryKey: ['helpdesk-problems'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('helpdesk_problems')
        .select(`
          *, 
          category:helpdesk_categories(name),
          linked_tickets:helpdesk_problem_tickets(id, ticket_id)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });
      if (error) throw error;

      if (data && data.length > 0) {
        const userAuthIds = [...new Set(
          data.flatMap((p: any) => [p.created_by, p.assigned_to]).filter(Boolean)
        )];

        if (userAuthIds.length > 0) {
          const { data: users } = await supabase
            .from('users')
            .select('id, auth_user_id, name, email')
            .in('auth_user_id', userAuthIds as string[]);

          if (users) {
            const userMap: Record<string, any> = Object.fromEntries(
              users.map((u: any) => [u.auth_user_id, u])
            );

            return data.map((problem: any) => ({
              ...problem,
              created_by_user: problem.created_by ? userMap[problem.created_by] || null : null,
              assigned_to_user: problem.assigned_to ? userMap[problem.assigned_to] || null : null
            }));
          }
        }
      }

      return data || [];
    }
  });

  // Client-side filtering
  const problems = (allProblems || []).filter((problem: any) => {
    if (filters.status && problem.status !== filters.status) return false;
    if (filters.priority && problem.priority !== filters.priority) return false;
    if (filters.search) {
      const search = filters.search.toLowerCase();
      const matchesSearch = problem.title?.toLowerCase().includes(search) || 
        problem.description?.toLowerCase().includes(search) || 
        problem.problem_number?.toLowerCase().includes(search);
      if (!matchesSearch) return false;
    }
    return true;
  });

  // Quick status change mutation
  const quickStatusChange = useMutation({
    mutationFn: async ({ problemId, status }: { problemId: number; status: string }) => {
      const { error } = await supabase
        .from("helpdesk_problems")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", problemId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["helpdesk-problems"] });
      queryClient.invalidateQueries({ queryKey: ["helpdesk-dashboard-stats"] });
      toast.success("Problem status updated");
    },
    onError: () => {
      toast.error("Failed to update problem status");
    },
  });

  const handleQuickStatusChange = (problemId: number, status: string) => {
    quickStatusChange.mutate({ problemId, status });
  };

  const handleSelectProblem = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSelectAll = (checked: boolean) => {
    const pageProblems = problems.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    setSelectedIds(checked ? pageProblems.map((p: any) => p.id) : []);
  };

  const handleSearch = (query: string, filter: string) => {
    setFilters({ ...filters, search: query });
  };

  // Paginated data
  const paginatedProblems = problems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="h-full flex flex-col bg-background">
      <TicketModuleTopBar 
        onSearch={handleSearch}
        exportData={problems}
        exportFilename="problems-export"
        showArchiveLink={false}
      >
        {/* Filter controls in middle */}
        <div className="flex items-center gap-2 flex-1">
          <div className="relative w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input 
              placeholder="Search problems..." 
              value={filters.search || ''} 
              onChange={e => setFilters({ ...filters, search: e.target.value })} 
              className="pl-9 h-7 text-xs" 
            />
          </div>

          <Select 
            value={filters.status || 'all'} 
            onValueChange={value => setFilters({ ...filters, status: value === 'all' ? null : value })}
          >
            <SelectTrigger className="w-[120px] h-7 text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="investigating">Investigating</SelectItem>
              <SelectItem value="known_error">Known Error</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
            </SelectContent>
          </Select>

          <Select 
            value={filters.priority || 'all'} 
            onValueChange={value => setFilters({ ...filters, priority: value === 'all' ? null : value })}
          >
            <SelectTrigger className="w-[100px] h-7 text-xs">
              <SelectValue placeholder="Priority" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Priority</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>

          <BulkActionsProblemButton 
            selectedIds={selectedIds} 
            onClearSelection={() => setSelectedIds([])} 
          />

          <Button size="sm" onClick={() => setCreateProblemOpen(true)} className="gap-1 h-7 px-3 ml-auto">
            <Plus className="h-3.5 w-3.5" />
            <span className="text-xs">New Problem</span>
          </Button>
        </div>
      </TicketModuleTopBar>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : (
          <ProblemTableView
            problems={paginatedProblems}
            selectedIds={selectedIds}
            onSelectProblem={handleSelectProblem}
            onSelectAll={handleSelectAll}
            onEditProblem={setEditProblem}
            onAssignProblem={setAssignProblem}
            onQuickStatusChange={handleQuickStatusChange}
          />
        )}
      </div>

      {/* Pagination */}
      <TicketPagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalItems={problems.length}
        totalPages={Math.ceil(problems.length / pageSize)}
        onPageChange={setCurrentPage}
        onPageSizeChange={setPageSize}
        className="border-t-0"
      />

      {/* Dialogs */}
      <CreateProblemDialog 
        open={createProblemOpen} 
        onOpenChange={setCreateProblemOpen} 
      />
      
      {editProblem && (
        <EditProblemDialog
          problem={editProblem}
          open={!!editProblem}
          onOpenChange={(open) => !open && setEditProblem(null)}
        />
      )}
      
      {assignProblem && (
        <AssignProblemDialog
          problem={assignProblem}
          open={!!assignProblem}
          onOpenChange={(open) => !open && setAssignProblem(null)}
        />
      )}
    </div>
  );
}
