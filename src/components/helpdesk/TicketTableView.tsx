import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Edit, Eye, UserPlus, Clock, AlertTriangle, MoreHorizontal } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { getStatusColor, getPriorityColor, isSLABreached, getSLAStatusBadge, formatStatus } from "@/lib/ticketUtils";
import { FormattedDate } from "@/components/FormattedDate";

interface TicketTableViewProps {
  tickets: any[];
  selectedIds: number[];
  onSelectTicket: (id: number) => void;
  onSelectAll: (checked: boolean) => void;
  onEditTicket?: (ticket: any) => void;
  onAssignTicket?: (ticket: any) => void;
  onQuickStatusChange?: (ticketId: number, status: string) => void;
}

export const TicketTableView = ({ 
  tickets, 
  selectedIds, 
  onSelectTicket, 
  onSelectAll,
  onEditTicket,
  onAssignTicket,
  onQuickStatusChange
}: TicketTableViewProps) => {
  const navigate = useNavigate();

  const getSLAIndicator = (ticket: any) => {
    if (!ticket.sla_due_date) return null;
    
    const dueDate = new Date(ticket.sla_due_date);
    const now = new Date();
    const isBreached = isSLABreached(ticket);
    
    if (['resolved', 'closed'].includes(ticket.status)) {
      return null;
    }
    
    if (isBreached) {
      return (
        <Tooltip>
          <TooltipTrigger>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </TooltipTrigger>
          <TooltipContent>
            <p>SLA Breached - was due {formatDistanceToNow(dueDate, { addSuffix: true })}</p>
          </TooltipContent>
        </Tooltip>
      );
    }
    
    const hoursUntilDue = (dueDate.getTime() - now.getTime()) / (1000 * 60 * 60);
    if (hoursUntilDue < 2) {
      return (
        <Tooltip>
          <TooltipTrigger>
            <Clock className="h-4 w-4 text-orange-500" />
          </TooltipTrigger>
          <TooltipContent>
            <p>SLA due {formatDistanceToNow(dueDate, { addSuffix: true })}</p>
          </TooltipContent>
        </Tooltip>
      );
    }
    
    return null;
  };

  const getRowClassName = (ticket: any) => {
    const classes = ["cursor-pointer hover:bg-muted/50 h-11"];
    
    // SLA breached - red background
    if (isSLABreached(ticket)) {
      classes.push("bg-red-50 dark:bg-red-950/20");
    }
    // Unassigned active ticket - yellow background
    else if (!ticket.assignee_id && ['open', 'in_progress'].includes(ticket.status)) {
      classes.push("bg-yellow-50/50 dark:bg-yellow-950/10");
    }
    
    // Priority border indicators
    if (ticket.priority === 'urgent') {
      classes.push("border-l-4 border-l-red-500");
    } else if (ticket.priority === 'high') {
      classes.push("border-l-4 border-l-orange-500");
    }
    
    return cn(...classes);
  };

  const renderSLAStatusBadge = (ticket: any) => {
    if (['resolved', 'closed', 'fulfilled'].includes(ticket.status)) {
      return <span className="text-xs text-muted-foreground">-</span>;
    }
    
    const slaStatus = getSLAStatusBadge(ticket);
    return (
      <Badge variant="outline" className={cn("text-xs px-1.5 py-0.5", slaStatus.bgClass)}>
        {slaStatus.label}
      </Badge>
    );
  };

  if (tickets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <div className="text-muted-foreground mb-2">No tickets found</div>
        <p className="text-sm text-muted-foreground">Try adjusting your filters or create a new ticket.</p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="border rounded-lg overflow-hidden text-sm">
        <Table>
          <TableHeader>
            <TableRow className="h-9 bg-muted/30">
              <TableHead className="w-10 py-2 sticky left-0 bg-muted/30 z-10">
                <Checkbox
                  checked={selectedIds.length === tickets.length && tickets.length > 0}
                  onCheckedChange={onSelectAll}
                  aria-label="Select all tickets"
                />
              </TableHead>
              <TableHead className="py-2 font-medium sticky left-10 bg-muted/30 z-10">Request #</TableHead>
              <TableHead className="py-2 font-medium">Type</TableHead>
              <TableHead className="py-2 font-medium">Title</TableHead>
              <TableHead className="py-2 font-medium sticky left-[140px] bg-muted/30 z-10">Status</TableHead>
              <TableHead className="py-2 font-medium">Priority</TableHead>
              <TableHead className="py-2 font-medium">Assignee</TableHead>
              <TableHead className="py-2 font-medium">Created By</TableHead>
              <TableHead className="py-2 font-medium">Category</TableHead>
              <TableHead className="py-2 font-medium">SLA Due</TableHead>
              <TableHead className="py-2 font-medium">SLA Status</TableHead>
              <TableHead className="py-2 font-medium">Created</TableHead>
              <TableHead className="text-right py-2 font-medium">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tickets.map((ticket) => (
              <TableRow 
                key={ticket.id} 
                className={getRowClassName(ticket)}
              >
                <TableCell onClick={(e) => e.stopPropagation()} className="py-1.5 sticky left-0 bg-background z-10">
                  <Checkbox
                    checked={selectedIds.includes(ticket.id)}
                    onCheckedChange={() => onSelectTicket(ticket.id)}
                    aria-label={`Select ticket ${ticket.ticket_number}`}
                  />
                </TableCell>
                <TableCell onClick={() => navigate(`/tickets/${ticket.id}`)} className="py-1.5 sticky left-10 bg-background z-10">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs">
                      {ticket.ticket_number}
                    </span>
                    {getSLAIndicator(ticket)}
                  </div>
                </TableCell>
                <TableCell onClick={() => navigate(`/tickets/${ticket.id}`)} className="py-1.5">
                  <Badge variant="outline" className="text-xs px-1.5 py-0.5">
                    {ticket.request_type === 'service_request' ? 'Service Request' : 'Ticket'}
                  </Badge>
                </TableCell>
                <TableCell onClick={() => navigate(`/tickets/${ticket.id}`)} className="py-1.5">
                  <div className="w-64 min-w-[16rem] max-w-[16rem]">
                    <div className="font-medium truncate text-sm" title={ticket.title}>{ticket.title}</div>
                  </div>
                </TableCell>
                <TableCell onClick={() => navigate(`/tickets/${ticket.id}`)} className="py-1.5 sticky left-[140px] bg-background z-10">
                  <Badge variant="outline" className={`${getStatusColor(ticket.status)} text-xs px-1.5 py-0.5`}>
                    {formatStatus(ticket.status)}
                  </Badge>
                </TableCell>
                <TableCell onClick={() => navigate(`/tickets/${ticket.id}`)} className="py-1.5">
                  <Badge className={`${getPriorityColor(ticket.priority)} text-xs px-1.5 py-0.5`}>
                    {ticket.priority}
                  </Badge>
                </TableCell>
                <TableCell onClick={() => navigate(`/tickets/${ticket.id}`)} className="py-1.5">
                  {getUserDisplayName(ticket.assignee) || (
                    <span className="text-muted-foreground italic text-xs">Unassigned</span>
                  )}
                </TableCell>
                <TableCell onClick={() => navigate(`/tickets/${ticket.id}`)} className="py-1.5">
                  {getUserDisplayName(ticket.created_by_user) || (
                    <span className="text-muted-foreground italic text-xs">System</span>
                  )}
                </TableCell>
                <TableCell onClick={() => navigate(`/tickets/${ticket.id}`)} className="py-1.5">
                  {ticket.category?.name || '-'}
                </TableCell>
                <TableCell onClick={() => navigate(`/tickets/${ticket.id}`)} className="py-1.5">
                  <div className="text-xs">
                    {ticket.sla_due_date ? (
                      <FormattedDate date={ticket.sla_due_date} format="short" />
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </div>
                </TableCell>
                <TableCell onClick={() => navigate(`/tickets/${ticket.id}`)} className="py-1.5">
                  {renderSLAStatusBadge(ticket)}
                </TableCell>
                <TableCell onClick={() => navigate(`/tickets/${ticket.id}`)} className="py-1.5">
                  <div className="text-xs">
                    <FormattedDate date={ticket.created_at} format="short" />
                  </div>
                </TableCell>
                <TableCell className="text-right py-1.5" onClick={(e) => e.stopPropagation()}>
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => navigate(`/tickets/${ticket.id}`)}
                      aria-label="View ticket"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditTicket?.(ticket);
                      }}
                      aria-label="Edit ticket"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="More actions">
                          <MoreHorizontal className="h-3.5 w-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onAssignTicket?.(ticket)}>
                          <UserPlus className="h-3.5 w-3.5 mr-2" />
                          Assign
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => onQuickStatusChange?.(ticket.id, 'in_progress')}
                          disabled={ticket.status === 'in_progress'}
                        >
                          Set In Progress
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onQuickStatusChange?.(ticket.id, 'on_hold')}
                          disabled={ticket.status === 'on_hold'}
                        >
                          Set On Hold
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onQuickStatusChange?.(ticket.id, 'resolved')}
                          disabled={ticket.status === 'resolved'}
                        >
                          Set Resolved
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => onQuickStatusChange?.(ticket.id, 'closed')}
                          disabled={ticket.status === 'closed'}
                        >
                          Set Closed
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
