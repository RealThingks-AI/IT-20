import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, Eye, UserPlus, MoreHorizontal, Link as LinkIcon, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { getUserDisplayName } from "@/lib/userUtils";
import { getStatusColor, getPriorityColor, formatStatus } from "@/lib/ticketUtils";
import { FormattedDate } from "@/components/FormattedDate";

interface ProblemTableViewProps {
  problems: any[];
  selectedIds: number[];
  onSelectProblem: (id: number) => void;
  onSelectAll: (checked: boolean) => void;
  onEditProblem?: (problem: any) => void;
  onAssignProblem?: (problem: any) => void;
  onQuickStatusChange?: (problemId: number, status: string) => void;
}

// ITIL-aligned problem status options
const statusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'investigating', label: 'Investigating' },
  { value: 'known_error', label: 'Known Error' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];

export const ProblemTableView = ({ 
  problems, 
  selectedIds, 
  onSelectProblem, 
  onSelectAll,
  onEditProblem,
  onAssignProblem,
  onQuickStatusChange
}: ProblemTableViewProps) => {
  const navigate = useNavigate();

  const getRowClassName = (problem: any) => {
    const classes = ["cursor-pointer hover:bg-muted/50 h-11"];
    
    // Known error - amber background for visibility
    if (problem.status === 'known_error') {
      classes.push("bg-amber-50/50 dark:bg-amber-950/10");
    }
    // Unassigned active problem
    else if (!problem.assigned_to && ['open', 'investigating'].includes(problem.status)) {
      classes.push("bg-yellow-50/50 dark:bg-yellow-950/10");
    }
    
    // Priority border indicators
    if (problem.priority === 'urgent') {
      classes.push("border-l-4 border-l-red-500");
    } else if (problem.priority === 'high') {
      classes.push("border-l-4 border-l-orange-500");
    }
    
    return cn(...classes);
  };

  const getRCAStatus = (problem: any) => {
    if (problem.root_cause) {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 text-xs px-1.5 py-0.5">
          Documented
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 text-xs px-1.5 py-0.5">
        Pending
      </Badge>
    );
  };

  if (problems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="text-muted-foreground mb-2">No problems found</div>
        <p className="text-sm text-muted-foreground">Try adjusting your filters or create a new problem.</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="border rounded-lg overflow-hidden text-sm">
        <Table>
          <TableHeader>
            <TableRow className="h-9 bg-muted/30">
              <TableHead className="w-10 py-2">
                <Checkbox
                  checked={selectedIds.length === problems.length && problems.length > 0}
                  onCheckedChange={onSelectAll}
                  aria-label="Select all problems"
                />
              </TableHead>
              <TableHead className="py-2 font-medium">Problem #</TableHead>
              <TableHead className="py-2 font-medium">Title</TableHead>
              <TableHead className="py-2 font-medium">Status</TableHead>
              <TableHead className="py-2 font-medium">Priority</TableHead>
              <TableHead className="py-2 font-medium">Assignee</TableHead>
              <TableHead className="py-2 font-medium">Created By</TableHead>
              <TableHead className="py-2 font-medium">Category</TableHead>
              <TableHead className="py-2 font-medium">Linked Tickets</TableHead>
              <TableHead className="py-2 font-medium">RCA Status</TableHead>
              <TableHead className="py-2 font-medium">Created</TableHead>
              <TableHead className="text-right py-2 font-medium">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {problems.map((problem) => (
              <TableRow key={problem.id} className={getRowClassName(problem)}>
                <TableCell onClick={(e) => e.stopPropagation()} className="py-1.5">
                  <Checkbox
                    checked={selectedIds.includes(problem.id)}
                    onCheckedChange={() => onSelectProblem(problem.id)}
                    aria-label={`Select problem ${problem.problem_number}`}
                  />
                </TableCell>
                <TableCell onClick={() => navigate(`/helpdesk/problems/${problem.id}`)} className="py-1.5">
                  <span className="font-mono text-xs">
                    {problem.problem_number}
                  </span>
                </TableCell>
                <TableCell onClick={() => navigate(`/helpdesk/problems/${problem.id}`)} className="py-1.5">
                  <div className="max-w-sm">
                    <div className="font-medium truncate text-sm" title={problem.title}>{problem.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {problem.description}
                    </div>
                  </div>
                </TableCell>
                <TableCell onClick={(e) => e.stopPropagation()} className="py-1.5">
                  {onQuickStatusChange ? (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-auto p-0 hover:bg-transparent">
                          <Badge variant="outline" className={`${getStatusColor(problem.status)} text-xs px-1.5 py-0.5 cursor-pointer`}>
                            {formatStatus(problem.status)}
                          </Badge>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start" className="w-40">
                        <DropdownMenuLabel className="text-xs">Change Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {statusOptions.map((option) => (
                          <DropdownMenuItem
                            key={option.value}
                            onClick={() => onQuickStatusChange(problem.id, option.value)}
                            className={`text-xs ${problem.status === option.value ? 'bg-accent' : ''}`}
                          >
                            {option.label}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  ) : (
                    <Badge variant="outline" className={`${getStatusColor(problem.status)} text-xs px-1.5 py-0.5`}>
                      {formatStatus(problem.status)}
                    </Badge>
                  )}
                </TableCell>
                <TableCell onClick={() => navigate(`/helpdesk/problems/${problem.id}`)} className="py-1.5">
                  <Badge className={`${getPriorityColor(problem.priority)} text-xs px-1.5 py-0.5`}>
                    {problem.priority}
                  </Badge>
                </TableCell>
                <TableCell onClick={() => navigate(`/helpdesk/problems/${problem.id}`)} className="py-1.5">
                  {getUserDisplayName(problem.assigned_to_user) || (
                    <span className="text-muted-foreground italic text-xs">Unassigned</span>
                  )}
                </TableCell>
                <TableCell onClick={() => navigate(`/helpdesk/problems/${problem.id}`)} className="py-1.5">
                  {getUserDisplayName(problem.created_by_user) || (
                    <span className="text-muted-foreground italic text-xs">System</span>
                  )}
                </TableCell>
                <TableCell onClick={() => navigate(`/helpdesk/problems/${problem.id}`)} className="py-1.5">
                  {problem.category?.name || '-'}
                </TableCell>
                <TableCell onClick={() => navigate(`/helpdesk/problems/${problem.id}`)} className="py-1.5">
                  <Tooltip>
                    <TooltipTrigger>
                      <div className="flex items-center gap-1.5">
                        <LinkIcon className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs font-medium">{problem.linked_tickets?.length || 0}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{problem.linked_tickets?.length || 0} linked tickets</p>
                    </TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell onClick={() => navigate(`/helpdesk/problems/${problem.id}`)} className="py-1.5">
                  {getRCAStatus(problem)}
                </TableCell>
                <TableCell onClick={() => navigate(`/helpdesk/problems/${problem.id}`)} className="py-1.5">
                  <div className="text-xs">
                    <FormattedDate date={problem.created_at} format="short" />
                  </div>
                </TableCell>
                <TableCell className="text-right py-1.5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => navigate(`/helpdesk/problems/${problem.id}`)}
                      aria-label="View problem"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="More actions">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem 
                          onClick={() => onEditProblem?.(problem)}
                          className="text-xs gap-2"
                        >
                          <Edit className="h-3.5 w-3.5" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onAssignProblem?.(problem)}
                          className="text-xs gap-2"
                        >
                          <UserPlus className="h-3.5 w-3.5" />
                          Assign
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </TooltipProvider>
  );
};
