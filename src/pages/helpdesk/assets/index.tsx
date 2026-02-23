import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  UserCheck, 
  Wrench, 
  AlertTriangle,
  Key,
  Plus,
  FileText,
  TrendingUp,
  LogOut,
  LogIn,
  Calendar
} from "lucide-react";
import { getStatusLabel, getStatusBadgeColor } from "@/lib/assetStatusUtils";

const ITAMDashboard = () => {
  const navigate = useNavigate();

  // Fetch asset statistics
  const { data: assets = [] } = useQuery({
    queryKey: ["itam-assets-dashboard"],
    queryFn: async () => {
      const { data } = await supabase
        .from("itam_assets")
        .select("*")
        .eq("is_active", true);
      return data || [];
    },
  });

  // Fetch repairs
  const { data: repairs = [] } = useQuery({
    queryKey: ["itam-repairs-dashboard"],
    queryFn: async () => {
      const { data } = await supabase
        .from("itam_repairs")
        .select("*")
        .in("status", ["pending", "in_progress"]);
      return data || [];
    },
  });

  // Fetch licenses
  const { data: licenses = [] } = useQuery({
    queryKey: ["itam-licenses-dashboard"],
    queryFn: async () => {
      const { data } = await supabase
        .from("itam_licenses")
        .select("*")
        .eq("is_active", true);
      return data || [];
    },
  });

  // Calculate KPIs - using correct database status values
  const totalAssets = assets.length;
  const availableAssets = assets.filter(a => a.status === "available").length;
  const assignedAssets = assets.filter(a => a.status === "in_use").length;
  const inRepairAssets = assets.filter(a => a.status === "maintenance").length;
  
  const totalLicenses = licenses.reduce((sum, l) => sum + (l.seats_total || 0), 0);
  const allocatedLicenses = licenses.reduce((sum, l) => sum + (l.seats_allocated || 0), 0);
  const licenseUtilization = totalLicenses > 0 ? ((allocatedLicenses / totalLicenses) * 100).toFixed(1) : 0;

  // Warranty expiring soon (30 days)
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  const expiringWarranty = assets.filter(a => {
    if (!a.warranty_expiry) return false;
    const warrantyDate = new Date(a.warranty_expiry);
    return warrantyDate <= thirtyDaysFromNow && warrantyDate >= new Date();
  }).length;

  // Lease expiring soon (30 days)
  const expiringLease = assets.filter(a => {
    const customFields = a.custom_fields as Record<string, any> | null;
    const leaseExpiry = customFields?.lease_expiry;
    if (!leaseExpiry) return false;
    const leaseDate = new Date(leaseExpiry);
    return leaseDate <= thirtyDaysFromNow && leaseDate >= new Date();
  }).length;

  const stats = [
    {
      title: "Total Assets",
      value: totalAssets,
      icon: Package,
      description: `${availableAssets} available`,
      onClick: () => navigate("/assets/allassets"),
    },
    {
      title: "Assigned",
      value: assignedAssets,
      icon: UserCheck,
      description: "Currently in use",
      onClick: () => navigate("/assets/allassets?status=in_use"),
    },
    {
      title: "In Repair",
      value: inRepairAssets,
      icon: Wrench,
      description: `${repairs.length} active tickets`,
      onClick: () => navigate("/assets/repairs"),
    },
    {
      title: "Warranty Expiring",
      value: expiringWarranty,
      icon: AlertTriangle,
      description: "Within 30 days",
      onClick: () => navigate("/assets/allassets?warranty=expiring"),
    },
    {
      title: "Lease Expiring",
      value: expiringLease,
      icon: Calendar,
      description: "Within 30 days",
      onClick: () => navigate("/assets/allassets?lease=expiring"),
    },
    {
      title: "License Utilization",
      value: `${licenseUtilization}%`,
      icon: Key,
      description: `${allocatedLicenses}/${totalLicenses} seats`,
      onClick: () => navigate("/assets/licenses"),
    },
  ];

  const quickActions = [
    { label: "Add Asset", icon: Plus, onClick: () => navigate("/assets/add") },
    { label: "Check Out", icon: LogOut, onClick: () => navigate("/assets/checkout") },
    { label: "Check In", icon: LogIn, onClick: () => navigate("/assets/checkin") },
    { label: "View Inventory", icon: Package, onClick: () => navigate("/assets/allassets") },
    { label: "Create Repair", icon: Wrench, onClick: () => navigate("/assets/repairs/create") },
    { label: "Purchase Orders", icon: FileText, onClick: () => navigate("/assets/purchase-orders") },
    { label: "Reports", icon: TrendingUp, onClick: () => navigate("/assets/reports") },
  ];

  return (
    <div className="bg-background p-4">
      <div className="space-y-4">

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {stats.map((stat) => (
            <Card 
              key={stat.title} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={stat.onClick}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Quick Actions</CardTitle>
            <CardDescription className="text-xs">Common asset management tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  size="sm"
                  className="flex flex-col items-center gap-2 h-auto py-3"
                  onClick={action.onClick}
                >
                  <action.icon className="h-4 w-4" />
                  <span className="text-xs">{action.label}</span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Recent Assets</CardTitle>
              <CardDescription className="text-xs">Latest additions to inventory</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {assets.slice(0, 5).map((asset) => (
                  <div
                    key={asset.id}
                    className="flex items-center justify-between p-2.5 border rounded-md hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => navigate(`/assets/detail/${asset.id}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{asset.name}</p>
                      <p className="text-xs text-muted-foreground">{asset.asset_tag || asset.asset_id}</p>
                    </div>
                    <Badge variant="secondary" className={`text-xs shrink-0 ${getStatusBadgeColor(asset.status)}`}>
                      {getStatusLabel(asset.status)}
                    </Badge>
                  </div>
                ))}
                {assets.length === 0 && (
                  <p className="text-center text-muted-foreground py-8 text-sm">
                    No assets yet. Add your first asset to get started.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Active Repairs</CardTitle>
              <CardDescription className="text-xs">Assets currently being serviced</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {repairs.slice(0, 5).map((repair) => (
                  <div
                    key={repair.id}
                    className="flex items-center justify-between p-2.5 border rounded-md hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => navigate(`/assets/repairs/detail/${repair.id}`)}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">Repair #{repair.repair_number || repair.id}</p>
                      <p className="text-xs text-muted-foreground truncate">{repair.issue_description?.substring(0, 50)}</p>
                    </div>
                    <Badge variant={repair.status === "in_progress" ? "default" : "secondary"} className="text-xs shrink-0">
                      {repair.status === "in_progress" ? "In Progress" : repair.status}
                    </Badge>
                  </div>
                ))}
                {repairs.length === 0 && (
                  <p className="text-center text-muted-foreground py-8 text-sm">
                    No active repairs
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ITAMDashboard;