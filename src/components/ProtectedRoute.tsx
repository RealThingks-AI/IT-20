import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useSessionStore } from "@/stores/useSessionStore";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  const storeStatus = useSessionStore((s) => s.status);
  const bootstrap = useSessionStore((s) => s.bootstrap);

  // Trigger bootstrap when user exists but store isn't ready
  useEffect(() => {
    if (user && storeStatus === "idle") {
      bootstrap();
    }
  }, [user, storeStatus, bootstrap]);

  // If auth is still loading, show spinner
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If store was hydrated from cache, render immediately (no spinner)
  // If store is bootstrapping from network, show spinner only briefly
  if (storeStatus !== "ready") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
};
