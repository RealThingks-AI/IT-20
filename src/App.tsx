import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { OrganisationProvider } from "./contexts/OrganisationContext";
import { SystemSettingsProvider } from "./contexts/SystemSettingsContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RoleProtectedRoute } from "./components/RoleProtectedRoute";
import { PageProtectedRoute } from "./components/PageProtectedRoute";
import NotFound from "./pages/NotFound";
import AccessDenied from "./pages/AccessDenied";

// Main Layout
import HelpdeskLayout from "./pages/helpdesk/layout";
import HelpdeskDashboard from "./pages/helpdesk/dashboard";
import HelpdeskTickets from "./pages/helpdesk/tickets/index";
import CreateTicket from "./pages/helpdesk/tickets/create";
import TicketDetail from "./pages/helpdesk/tickets/[id]";
import HelpdeskAssets from "./pages/helpdesk/assets";
import AssetDetail from "./pages/helpdesk/assets/detail/[assetId]";
import AssetReports from "./pages/helpdesk/assets/reports";
import AllAssets from "./pages/helpdesk/assets/allassets";
import AssetSetup from "./pages/helpdesk/assets/setup";
import AssetDashboard from "./pages/helpdesk/assets/dashboard";
import AssetAlerts from "./pages/helpdesk/assets/alerts/index";
import AssetCheckout from "./pages/helpdesk/assets/checkout";
import AssetCheckin from "./pages/helpdesk/assets/checkin";
import AssetDispose from "./pages/helpdesk/assets/dispose";
import AssetReserve from "./pages/helpdesk/assets/reserve";
import AddAsset from "./pages/helpdesk/assets/add";
import MaintenancesList from "./pages/helpdesk/assets/lists/maintenances";
import WarrantiesList from "./pages/helpdesk/assets/lists/warranties";
import ContractsList from "./pages/helpdesk/assets/lists/contracts";
import DepreciationDashboard from "./pages/helpdesk/assets/depreciation/index";
import VendorsList from "./pages/helpdesk/assets/vendors/index";
import LicensesList from "./pages/helpdesk/assets/licenses/index";
import RepairsList from "./pages/helpdesk/assets/repairs/index";
import CreateRepair from "./pages/helpdesk/assets/repairs/create";
import RepairDetail from "./pages/helpdesk/assets/repairs/detail/[repairId]";
import AssetsBulkActions from "./pages/helpdesk/assets/explore/bulk-actions";
import AssetsReports from "./pages/helpdesk/assets/explore/reports";
import AssetsTools from "./pages/helpdesk/assets/tools";
import AssetsFieldsSetup from "./pages/helpdesk/assets/setup/fields-setup";
import HelpdeskProblemDetail from "./pages/helpdesk/problems/[id]";
import HelpdeskChanges from "./pages/helpdesk/changes";
import HelpdeskSubscriptionLayout from "./pages/helpdesk/subscription/index";
import HelpdeskSubscriptionDashboard from "./pages/helpdesk/subscription/dashboard";
import HelpdeskSubscriptionTools from "./pages/helpdesk/subscription/tools";
import HelpdeskSubscriptionVendors from "./pages/helpdesk/subscription/vendors";
import HelpdeskSubscriptionLicenses from "./pages/helpdesk/subscription/licenses";
import HelpdeskSubscriptionPayments from "./pages/helpdesk/subscription/payments";
import HelpdeskAdmin from "./pages/helpdesk/admin";
import HelpdeskSettings from "./pages/helpdesk/settings";
import AccountSettings from "./pages/helpdesk/account";
import HelpdeskReports from "./pages/helpdesk/reports";
import HelpdeskMonitoring from "./pages/helpdesk/monitoring";
import HelpdeskSystemUpdates from "./pages/helpdesk/system-updates";
import SystemUpdatesSettings from "./pages/helpdesk/system-updates/settings";
import SystemUpdatesDevices from "./pages/helpdesk/system-updates/devices";
import SystemUpdatesUpdates from "./pages/helpdesk/system-updates/updates";
import HelpdeskAudit from "./pages/helpdesk/audit";
import HelpdeskSLA from "./pages/helpdesk/sla";
import HelpdeskQueues from "./pages/helpdesk/queues";
import HelpdeskAutomation from "./pages/helpdesk/automation";
import AssignmentRules from "./pages/helpdesk/tickets/assignment-rules";

// Auth imports
import Login from "./pages/Login";
import AuthConfirm from "./pages/AuthConfirm";
import Profile from "./pages/Profile";
import PasswordReset from "./pages/PasswordReset";
import ResetPasswordConfirm from "./pages/ResetPasswordConfirm";
import Notifications from "./pages/Notifications";
import Status from "./pages/Status";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AuthProvider>
            <OrganisationProvider>
              <SystemSettingsProvider>
                <Routes>
                  {/* Auth routes */}
                  <Route path="/login" element={<Login />} />
                  <Route path="/auth" element={<Navigate to="/login" replace />} />
                  <Route path="/auth/confirm" element={<AuthConfirm />} />
                  <Route path="/password-reset" element={<PasswordReset />} />
                  <Route path="/reset-password-confirm" element={<ResetPasswordConfirm />} />
                  <Route path="/access-denied" element={<AccessDenied />} />
                  <Route path="/status" element={<Status />} />

                  {/* Profile */}
                  <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                  <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />

                  {/* Main App Routes - All under root */}
                  <Route path="/" element={<ProtectedRoute><HelpdeskLayout /></ProtectedRoute>}>
                    <Route index element={<HelpdeskDashboard />} />
                    
                    {/* Tickets - All roles */}
                    <Route path="tickets" element={<HelpdeskTickets />} />
                    <Route path="tickets/create" element={<CreateTicket />} />
                    <Route path="tickets/my" element={<HelpdeskTickets />} />
                    <Route path="tickets/unassigned" element={<HelpdeskTickets />} />
                    <Route path="tickets/all" element={<HelpdeskTickets />} />
                    <Route path="tickets/:id" element={<TicketDetail />} />
                    <Route path="problems" element={<HelpdeskTickets />} />
                    <Route path="problems/:id" element={<HelpdeskProblemDetail />} />
                    
                    {/* Assets - All roles for basic, admin/manager for advanced */}
                    <Route path="assets" element={<HelpdeskAssets />} />
                    <Route path="assets/dashboard" element={<AssetDashboard />} />
                    <Route path="assets/alerts" element={<AssetAlerts />} />
                    <Route path="assets/allassets" element={<AllAssets />} />
                    <Route path="assets/add" element={<AddAsset />} />
                    <Route path="assets/checkout" element={<AssetCheckout />} />
                    <Route path="assets/checkin" element={<AssetCheckin />} />
                    <Route path="assets/dispose" element={<AssetDispose />} />
                    <Route path="assets/reserve" element={<AssetReserve />} />
                    <Route path="assets/lists/maintenances" element={<MaintenancesList />} />
                    <Route path="assets/lists/warranties" element={<WarrantiesList />} />
                    <Route path="assets/lists/contracts" element={<ContractsList />} />
                    <Route path="assets/detail/:assetId" element={<AssetDetail />} />
                    <Route path="assets/reports" element={<RoleProtectedRoute allowedRoles={["admin", "manager"]}><AssetReports /></RoleProtectedRoute>} />
                    <Route path="assets/tools" element={<AssetsTools />} />
                    <Route path="assets/setup" element={<RoleProtectedRoute allowedRoles={["admin"]}><AssetSetup /></RoleProtectedRoute>} />
                    <Route path="assets/depreciation" element={<RoleProtectedRoute allowedRoles={["admin", "manager"]}><DepreciationDashboard /></RoleProtectedRoute>} />
                    <Route path="assets/vendors" element={<VendorsList />} />
                    <Route path="assets/licenses" element={<LicensesList />} />
                    <Route path="assets/repairs" element={<RepairsList />} />
                    <Route path="assets/repairs/create" element={<CreateRepair />} />
                    <Route path="assets/repairs/detail/:repairId" element={<RepairDetail />} />
                    <Route path="assets/setup/fields-setup" element={<RoleProtectedRoute allowedRoles={["admin"]}><AssetsFieldsSetup /></RoleProtectedRoute>} />
                    <Route path="assets/explore/bulk-actions" element={<AssetsBulkActions />} />
                    <Route path="assets/explore/reports" element={<RoleProtectedRoute allowedRoles={["admin", "manager"]}><AssetsReports /></RoleProtectedRoute>} />
                    
                    {/* Subscription - Database-driven access control */}
                    <Route path="subscription" element={<PageProtectedRoute route="/subscription"><HelpdeskSubscriptionLayout /></PageProtectedRoute>}>
                      <Route index element={<HelpdeskSubscriptionDashboard />} />
                      <Route path="tools" element={<HelpdeskSubscriptionTools />} />
                      <Route path="vendors" element={<HelpdeskSubscriptionVendors />} />
                      <Route path="licenses" element={<HelpdeskSubscriptionLicenses />} />
                      <Route path="payments" element={<HelpdeskSubscriptionPayments />} />
                    </Route>
                    
                    {/* System Updates - Database-driven access control */}
                    <Route path="system-updates" element={<PageProtectedRoute route="/system-updates"><HelpdeskSystemUpdates /></PageProtectedRoute>} />
                    <Route path="system-updates/settings" element={<RoleProtectedRoute allowedRoles={["admin"]}><SystemUpdatesSettings /></RoleProtectedRoute>} />
                    <Route path="system-updates/devices" element={<PageProtectedRoute route="/system-updates"><SystemUpdatesDevices /></PageProtectedRoute>} />
                    <Route path="system-updates/updates" element={<PageProtectedRoute route="/system-updates"><SystemUpdatesUpdates /></PageProtectedRoute>} />
                    
                    {/* Other Modules - Database-driven access control */}
                    <Route path="monitoring" element={<PageProtectedRoute route="/monitoring"><HelpdeskMonitoring /></PageProtectedRoute>} />
                    <Route path="reports" element={<PageProtectedRoute route="/reports"><HelpdeskReports /></PageProtectedRoute>} />
                    <Route path="audit" element={<PageProtectedRoute route="/audit"><HelpdeskAudit /></PageProtectedRoute>} />
                    <Route path="changes" element={<HelpdeskChanges />} />
                    
                    {/* Admin-only routes (keep hardcoded for security) */}
                    <Route path="sla" element={<RoleProtectedRoute allowedRoles={["admin"]}><HelpdeskSLA /></RoleProtectedRoute>} />
                    <Route path="queues" element={<RoleProtectedRoute allowedRoles={["admin"]}><HelpdeskQueues /></RoleProtectedRoute>} />
                    <Route path="automation" element={<RoleProtectedRoute allowedRoles={["admin"]}><HelpdeskAutomation /></RoleProtectedRoute>} />
                    <Route path="tickets/assignment-rules" element={<RoleProtectedRoute allowedRoles={["admin"]}><AssignmentRules /></RoleProtectedRoute>} />
                    <Route path="admin" element={<RoleProtectedRoute allowedRoles={["admin"]}><HelpdeskAdmin /></RoleProtectedRoute>} />
                    <Route path="settings" element={<PageProtectedRoute route="/settings"><HelpdeskSettings /></PageProtectedRoute>} />
                    
                    {/* Account - All authenticated users */}
                    <Route path="account" element={<AccountSettings />} />
                  </Route>

                  {/* Catch-all */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </SystemSettingsProvider>
            </OrganisationProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
