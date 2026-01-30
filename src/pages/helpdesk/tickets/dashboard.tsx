import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Plus, Ticket, AlertTriangle, AlertCircle, Clock, CheckCircle2, 
  Package, BarChart3, Archive, UserX
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUnifiedRequestsStats } from "@/hooks/useUnifiedRequests";
import { CreateTicketDialog } from "@/components/helpdesk/CreateTicketDialog";
import { CreateProblemDialog } from "@/components/helpdesk/CreateProblemDialog";

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  onClick?: () => void;
  animationDelay?: number;
  tooltip?: string;
}

function StatCard({ title, value, icon, onClick, animationDelay = 0, tooltip }: StatCardProps) {
  const cardContent = (
    <Card 
      className="cursor-pointer hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 animate-fade-in"
      style={{ animationDelay: `${animationDelay}ms`, animationFillMode: "backwards" }}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          {icon}
        </div>
        <p className="text-3xl font-bold tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{title}</p>
      </CardContent>
    </Card>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{cardContent}</TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return cardContent;
}

function StatCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <Skeleton className="h-4 w-4 mb-2" />
        <Skeleton className="h-8 w-16 mb-1" />
        <Skeleton className="h-3 w-20" />
      </CardContent>
    </Card>
  );
}

export default function TicketsDashboard() {
  const navigate = useNavigate();
  const [createTicketOpen, setCreateTicketOpen] = useState(false);
  const [createProblemOpen, setCreateProblemOpen] = useState(false);

  const { data: stats, isLoading: statsLoading } = useUnifiedRequestsStats();

  const { data: allProblems } = useQuery({
    queryKey: ['helpdesk-problems-count'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('helpdesk_problems')
        .select('id, status')
        .eq('is_deleted', false);
      if (error) throw error;
      return data || [];
    }
  });

  const ticketStats = [
    { 
      id: "total", 
      title: "Total Tickets", 
      value: stats?.tickets?.total || 0, 
      icon: <Ticket className="h-4 w-4 text-blue-500" />,
      onClick: () => navigate("/tickets/list?requestType=ticket"),
      tooltip: "All tickets across all statuses"
    },
    { 
      id: "open", 
      title: "Open", 
      value: stats?.tickets?.open || 0, 
      icon: <AlertCircle className="h-4 w-4 text-blue-500" />,
      onClick: () => navigate("/tickets/list?status=open&requestType=ticket"),
      tooltip: "Tickets awaiting action"
    },
    { 
      id: "in_progress", 
      title: "In Progress", 
      value: stats?.tickets?.inProgress || 0, 
      icon: <Clock className="h-4 w-4 text-purple-500" />,
      onClick: () => navigate("/tickets/list?status=in_progress&requestType=ticket"),
      tooltip: "Tickets currently being worked on"
    },
    { 
      id: "on_hold", 
      title: "On Hold", 
      value: stats?.tickets?.onHold || 0, 
      icon: <Clock className="h-4 w-4 text-yellow-500" />,
      onClick: () => navigate("/tickets/list?status=on_hold&requestType=ticket"),
      tooltip: "Tickets waiting for external input"
    },
    { 
      id: "resolved", 
      title: "Resolved", 
      value: stats?.tickets?.resolved || 0, 
      icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      onClick: () => navigate("/tickets/list?status=resolved&requestType=ticket"),
      tooltip: "Tickets resolved and awaiting closure"
    },
    { 
      id: "urgent", 
      title: "Urgent", 
      value: stats?.tickets?.urgent || 0, 
      icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
      onClick: () => navigate("/tickets/list?priority=urgent&requestType=ticket"),
      tooltip: "High priority tickets requiring immediate attention"
    },
    { 
      id: "unassigned", 
      title: "Unassigned", 
      value: stats?.tickets?.unassigned || 0, 
      icon: <UserX className="h-4 w-4 text-yellow-500" />,
      onClick: () => navigate("/tickets/list?assignee=unassigned&requestType=ticket"),
      tooltip: "Active tickets without an assignee"
    },
    { 
      id: "sla_breached", 
      title: "SLA Breached", 
      value: stats?.tickets?.slaBreached || 0, 
      icon: <AlertTriangle className="h-4 w-4 text-red-500" />,
      onClick: () => navigate("/tickets/list?sla=breached&requestType=ticket"),
      tooltip: "Tickets that have exceeded their SLA target"
    },
  ];

  const serviceRequestStats = [
    { 
      id: "sr_total", 
      title: "Total Requests", 
      value: stats?.serviceRequests?.total || 0, 
      icon: <Package className="h-4 w-4 text-primary" />,
      onClick: () => navigate("/tickets/list?requestType=service_request")
    },
    { 
      id: "sr_pending", 
      title: "Pending", 
      value: stats?.serviceRequests?.pending || 0, 
      icon: <Clock className="h-4 w-4 text-blue-500" />,
      onClick: () => navigate("/tickets/list?requestType=service_request&status=open")
    },
    { 
      id: "sr_in_progress", 
      title: "In Progress", 
      value: stats?.serviceRequests?.inProgress || 0, 
      icon: <Clock className="h-4 w-4 text-orange-500" />,
      onClick: () => navigate("/tickets/list?requestType=service_request&status=in_progress")
    },
    { 
      id: "sr_fulfilled", 
      title: "Fulfilled", 
      value: stats?.serviceRequests?.fulfilled || 0, 
      icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      onClick: () => navigate("/tickets/list?requestType=service_request&status=fulfilled")
    },
  ];

  const problemStats = [
    { 
      id: "prob_total", 
      title: "Total Problems", 
      value: allProblems?.length || 0, 
      icon: <AlertTriangle className="h-4 w-4 text-primary" />,
      onClick: () => navigate("/tickets/problems")
    },
    { 
      id: "prob_open", 
      title: "Open", 
      value: allProblems?.filter(p => p.status === 'open').length || 0, 
      icon: <AlertCircle className="h-4 w-4 text-orange-500" />,
      onClick: () => navigate("/tickets/problems?status=open")
    },
    { 
      id: "prob_in_progress", 
      title: "In Progress", 
      value: allProblems?.filter(p => p.status === 'in_progress').length || 0, 
      icon: <Clock className="h-4 w-4 text-blue-500" />,
      onClick: () => navigate("/tickets/problems?status=in_progress")
    },
    { 
      id: "prob_resolved", 
      title: "Resolved", 
      value: allProblems?.filter(p => p.status === 'resolved').length || 0, 
      icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
      onClick: () => navigate("/tickets/problems?status=resolved")
    },
    { 
      id: "prob_known", 
      title: "Known Errors", 
      value: allProblems?.filter(p => p.status === 'known_error').length || 0, 
      icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
      onClick: () => navigate("/tickets/problems?status=known_error")
    },
  ];

  return (
    <TooltipProvider>
    <div className="h-full flex flex-col bg-background">
      {/* Top bar with actions */}
      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-sm border-b">
        <div className="flex items-center justify-between gap-2 px-4 py-2">
          <h1 className="text-xl font-semibold tracking-tight">Tickets Dashboard</h1>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/tickets/reports")}
              className="gap-1.5 h-7"
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="text-xs">Reports</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/tickets/archive")}
              className="gap-1.5 h-7"
            >
              <Archive className="h-3.5 w-3.5" />
              <span className="text-xs">Archive</span>
            </Button>
            <Button size="sm" onClick={() => setCreateTicketOpen(true)} className="gap-1.5 h-7">
              <Plus className="h-3.5 w-3.5" />
              <span className="text-xs">New Ticket</span>
            </Button>
            <Button size="sm" onClick={() => setCreateProblemOpen(true)} variant="outline" className="gap-1.5 h-7">
              <Plus className="h-3.5 w-3.5" />
              <span className="text-xs">New Problem</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {/* Tickets Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Tickets Overview</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-4">
            {statsLoading ? (
              Array.from({ length: 8 }).map((_, i) => <StatCardSkeleton key={i} />)
            ) : (
              ticketStats.map((stat, index) => (
                <StatCard
                  key={stat.id}
                  title={stat.title}
                  value={stat.value}
                  icon={stat.icon}
                  onClick={stat.onClick}
                  animationDelay={index * 50}
                  tooltip={stat.tooltip}
                />
              ))
            )}
          </div>
        </div>

        {/* Service Requests Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Service Requests</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statsLoading ? (
              Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
            ) : (
              serviceRequestStats.map((stat, index) => (
                <StatCard
                  key={stat.id}
                  title={stat.title}
                  value={stat.value}
                  icon={stat.icon}
                  onClick={stat.onClick}
                  animationDelay={(index + 6) * 50}
                />
              ))
            )}
          </div>
        </div>

        {/* Problems Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">Problems</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {statsLoading ? (
              Array.from({ length: 5 }).map((_, i) => <StatCardSkeleton key={i} />)
            ) : (
              problemStats.map((stat, index) => (
                <StatCard
                  key={stat.id}
                  title={stat.title}
                  value={stat.value}
                  icon={stat.icon}
                  onClick={stat.onClick}
                  animationDelay={(index + 10) * 50}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <CreateTicketDialog 
        open={createTicketOpen} 
        onOpenChange={setCreateTicketOpen} 
      />
      <CreateProblemDialog 
        open={createProblemOpen} 
        onOpenChange={setCreateProblemOpen} 
      />
    </div>
    </TooltipProvider>
  );
}
