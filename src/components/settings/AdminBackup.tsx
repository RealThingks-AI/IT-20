import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SettingsCard } from "./SettingsCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  HardDrive,
  Download,
  RefreshCw,
  Loader2,
  Calendar,
  Trash2,
  Monitor,
  Ticket,
  RotateCcw,
  Database,
  Archive,
  Clock,
  FileArchive,
} from "lucide-react";
import { format } from "date-fns";
import { SettingsLoadingSkeleton } from "./SettingsLoadingSkeleton";

const MODULES = [
  { name: "Assets", tables: ["itam_assets"], icon: Monitor, filterCol: "is_active", filterVal: true },
  { name: "Tickets", tables: ["helpdesk_tickets"], icon: Ticket, filterCol: "is_deleted", filterVal: false },
];

const ALL_TABLES = MODULES.flatMap((m) => m.tables);

const TIME_OPTIONS = Array.from({ length: 24 }, (_, i) => {
  const h = i.toString().padStart(2, "0");
  return { value: `${h}:00:00`, label: `${h}:00` };
});

interface Backup {
  id: string;
  backup_name: string;
  file_path: string;
  file_size: number | null;
  backup_type: string;
  status: string;
  created_at: string;
  completed_at: string | null;
  record_count: number | null;
  tables_included: string[] | null;
}

export function AdminBackup() {
  const queryClient = useQueryClient();
  const [backingUpModule, setBackingUpModule] = useState<string | null>(null);
  const [isFullBackup, setIsFullBackup] = useState(false);
  const [confirmRestore, setConfirmRestore] = useState<Backup | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Backup | null>(null);

  // Fetch backups
  const { data: backups = [], isLoading: backupsLoading } = useQuery({
    queryKey: ["system-backups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_backups")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data as Backup[];
    },
  });

  // Fetch schedule
  const { data: schedule, isLoading: scheduleLoading } = useQuery({
    queryKey: ["backup-schedule"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backup_schedules")
        .select("*")
        .limit(1)
        .maybeSingle();
      if (error && error.code !== "PGRST116") throw error;
      return data;
    },
  });

  // Fetch module record counts (active only)
  const { data: moduleCounts = {}, refetch: refetchCounts } = useQuery({
    queryKey: ["backup-module-counts"],
    queryFn: async () => {
      const counts: Record<string, number> = {};
      for (const mod of MODULES) {
        let total = 0;
        for (const table of mod.tables) {
          let query = (supabase as any).from(table).select("*", { count: "exact", head: true });
          if (mod.filterCol) {
            query = query.eq(mod.filterCol, mod.filterVal);
          }
          const { count, error } = await query;
          if (!error && count !== null) total += count;
        }
        counts[mod.name] = total;
      }
      return counts;
    },
  });

  // Update schedule
  const updateSchedule = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const { data: existing } = await supabase
        .from("backup_schedules")
        .select("id")
        .limit(1)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("backup_schedules")
          .update({ ...updates, updated_at: new Date().toISOString() } as any)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("backup_schedules")
          .insert({
            ...updates,
            next_backup_at: (updates as any).enabled
              ? new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()
              : null,
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["backup-schedule"] });
      toast.success("Schedule updated");
    },
  });

  // Create backup
  const triggerBackup = async (type: "full" | "module", moduleName?: string, tables?: string[]) => {
    if (type === "full") setIsFullBackup(true);
    else setBackingUpModule(moduleName || null);

    try {
      const { data, error } = await supabase.functions.invoke("create-backup", {
        body: {
          type,
          module_name: moduleName,
          tables: type === "full" ? ALL_TABLES : tables,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Backup completed — ${data.record_count} records`);
      queryClient.invalidateQueries({ queryKey: ["system-backups"] });
    } catch (err: any) {
      toast.error("Backup failed: " + err.message);
    } finally {
      setIsFullBackup(false);
      setBackingUpModule(null);
    }
  };

  // Download
  const handleDownload = async (backup: Backup) => {
    try {
      const { data, error } = await supabase.storage
        .from("system-backups")
        .createSignedUrl(backup.file_path, 60);
      if (error || !data?.signedUrl) throw error || new Error("No URL");
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = `${backup.backup_name}.json`;
      a.click();
    } catch {
      toast.error("Download failed");
    }
  };

  // Delete
  const handleDelete = async (backup: Backup) => {
    try {
      await supabase.storage.from("system-backups").remove([backup.file_path]);
      await supabase.from("system_backups").delete().eq("id", backup.id);
      queryClient.invalidateQueries({ queryKey: ["system-backups"] });
      toast.success("Backup deleted");
    } catch {
      toast.error("Delete failed");
    }
    setConfirmDelete(null);
  };

  // Restore
  const handleRestore = async (backup: Backup) => {
    try {
      toast.info("Restoring backup…");
      const { data, error } = await supabase.functions.invoke("restore-backup", {
        body: { backup_id: backup.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const totalRestored = Object.values(data.records_restored as Record<string, number>).reduce(
        (a, b) => a + b,
        0
      );
      toast.success(`Restore complete — ${totalRestored} records`);
    } catch (err: any) {
      toast.error("Restore failed: " + err.message);
    }
    setConfirmRestore(null);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">In Progress</Badge>;
      case "failed":
        return <Badge variant="destructive">Failed</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  // Summary stats
  const totalBackups = backups.length;
  const totalStorageBytes = backups.reduce((sum, b) => sum + (b.file_size || 0), 0);
  const lastBackup = backups.find((b) => b.status === "completed");
  const totalActiveRecords = Object.values(moduleCounts).reduce((a, b) => a + b, 0);

  // Last module backup helper
  const getLastModuleBackup = (moduleName: string) => {
    return backups.find(
      (b) => b.status === "completed" && b.backup_name?.toLowerCase().startsWith(moduleName.toLowerCase())
    );
  };

  if (backupsLoading || scheduleLoading) {
    return <SettingsLoadingSkeleton cards={3} rows={4} />;
  }

  return (
    <div className="space-y-6">
      {/* Section 1: Full Backup + Schedule */}
      <div className="grid gap-4 md:grid-cols-2">
        <SettingsCard title="Full System Backup" description="Back up all core modules at once" icon={Database}>
          <div className="space-y-3">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Archive className="h-3.5 w-3.5" />
                {totalActiveRecords} active records
              </span>
              <span className="flex items-center gap-1.5">
                <HardDrive className="h-3.5 w-3.5" />
                {MODULES.length} modules
              </span>
            </div>
            {lastBackup && (
              <p className="text-xs text-muted-foreground">
                Last backup: {format(new Date(lastBackup.created_at), "MMM d, yyyy HH:mm")}
              </p>
            )}
            <Button onClick={() => triggerBackup("full")} disabled={isFullBackup || !!backingUpModule} className="w-full">
              {isFullBackup ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <HardDrive className="h-4 w-4 mr-2" />}
              Backup Now
            </Button>
          </div>
        </SettingsCard>

        <SettingsCard title="Scheduled Backups" description="Automatic periodic backups" icon={Calendar}>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Enable</Label>
              <Switch
                checked={schedule?.enabled || false}
                onCheckedChange={(checked) => updateSchedule.mutate({ enabled: checked })}
              />
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-sm whitespace-nowrap">Time</Label>
              <Select
                value={schedule?.backup_time || "02:00:00"}
                onValueChange={(val) => updateSchedule.mutate({ backup_time: val })}
                disabled={!schedule?.enabled}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Label className="text-sm whitespace-nowrap">Every</Label>
              <Select
                value={String(schedule?.frequency_days || 3)}
                onValueChange={(val) => updateSchedule.mutate({ frequency_days: parseInt(val) })}
                disabled={!schedule?.enabled}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 5, 7, 14, 30].map((d) => (
                    <SelectItem key={d} value={String(d)}>{d} day{d > 1 ? "s" : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {schedule?.next_backup_at && schedule?.enabled && (
              <p className="text-xs text-muted-foreground">
                Next: {format(new Date(schedule.next_backup_at), "MMM d, yyyy HH:mm")}
              </p>
            )}
          </div>
        </SettingsCard>
      </div>

      {/* Section 2: Module Backup — 2-column rich cards */}
      <SettingsCard
        title="Module Backup"
        description="Back up individual modules"
        icon={HardDrive}
        headerAction={
          <Button variant="outline" size="sm" onClick={() => refetchCounts()}>
            <RefreshCw className="h-3 w-3 mr-1" /> Refresh
          </Button>
        }
      >
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
          {MODULES.map((mod) => {
            const Icon = mod.icon;
            const isLoading = backingUpModule === mod.name;
            const lastModBackup = getLastModuleBackup(mod.name);
            return (
              <div
                key={mod.name}
                className="flex items-center gap-4 p-4 rounded-lg border bg-card"
              >
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{mod.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {moduleCounts[mod.name] ?? "—"} active records
                  </p>
                  {lastModBackup && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                      <Clock className="h-3 w-3" />
                      {format(new Date(lastModBackup.created_at), "MMM d, HH:mm")}
                    </p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => triggerBackup("module", mod.name, mod.tables)}
                  disabled={isLoading || isFullBackup || (!!backingUpModule && backingUpModule !== mod.name)}
                >
                  {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <HardDrive className="h-3.5 w-3.5" />}
                  <span className="ml-1.5">Backup</span>
                </Button>
              </div>
            );
          })}
        </div>
      </SettingsCard>

      {/* Section 3: Summary Stats */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
          <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
            <FileArchive className="h-4.5 w-4.5 text-blue-500" />
          </div>
          <div>
            <p className="text-xl font-bold">{totalBackups}</p>
            <p className="text-xs text-muted-foreground">Total Backups</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
          <div className="h-9 w-9 rounded-lg bg-green-500/10 flex items-center justify-center">
            <HardDrive className="h-4.5 w-4.5 text-green-500" />
          </div>
          <div>
            <p className="text-xl font-bold">{formatFileSize(totalStorageBytes)}</p>
            <p className="text-xs text-muted-foreground">Storage Used</p>
          </div>
        </div>
        <div className="flex items-center gap-3 p-4 rounded-lg border bg-card">
          <div className="h-9 w-9 rounded-lg bg-orange-500/10 flex items-center justify-center">
            <Clock className="h-4.5 w-4.5 text-orange-500" />
          </div>
          <div>
            <p className="text-xl font-bold">
              {lastBackup ? format(new Date(lastBackup.created_at), "MMM d") : "—"}
            </p>
            <p className="text-xs text-muted-foreground">Last Backup</p>
          </div>
        </div>
      </div>

      {/* Section 4: Backup History */}
      <SettingsCard
        title="Backup History"
        description="Manage your backup files"
        icon={HardDrive}
        headerAction={
          <Badge variant="outline" className="text-xs">
            {backups.length} / 30
          </Badge>
        }
      >
        {backups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <FileArchive className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">No backups yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              Create your first backup using the options above
            </p>
          </div>
        ) : (
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Records</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((b) => (
                  <TableRow key={b.id}>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-xs">
                        {b.backup_name?.startsWith("full-") ? "Full" : b.backup_name?.split("-backup-")[0] || b.backup_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(b.created_at), "MMM d, yyyy HH:mm")}
                    </TableCell>
                    <TableCell className="text-sm">{b.record_count ?? "—"}</TableCell>
                    <TableCell className="text-sm">{formatFileSize(b.file_size)}</TableCell>
                    <TableCell>{getStatusBadge(b.status)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleDownload(b)}
                          disabled={b.status !== "completed"}
                          title="Download"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => setConfirmRestore(b)}
                          disabled={b.status !== "completed"}
                          title="Restore"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setConfirmDelete(b)}
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </SettingsCard>

      {/* Restore Confirm */}
      <AlertDialog open={!!confirmRestore} onOpenChange={() => setConfirmRestore(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Backup</AlertDialogTitle>
            <AlertDialogDescription>
              This will overwrite existing data with the backup contents. This action cannot be undone. Continue?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmRestore && handleRestore(confirmRestore)}>
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirm */}
      <AlertDialog open={!!confirmDelete} onOpenChange={() => setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Backup</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this backup file. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmDelete && handleDelete(confirmDelete)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
