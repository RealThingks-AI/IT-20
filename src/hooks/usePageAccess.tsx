import { useSessionStore } from "@/stores/useSessionStore";
import { useCallback } from "react";

export function usePageAccess(route: string) {
  const permissions = useSessionStore((s) => s.permissions);
  const status = useSessionStore((s) => s.status);
  const role = useSessionStore((s) => s.role);

  // Admins always have access
  const hasAccess = status === "ready"
    ? (role === "admin" ? true : (permissions[route] ?? false))
    : undefined;

  const invalidateAccess = useCallback(() => {
    useSessionStore.getState().clear();
  }, []);

  return {
    hasAccess: hasAccess ?? false,
    isLoading: status !== "ready",
    error: null as Error | null,
    invalidateAccess,
  };
}

// Hook to check multiple routes at once
export function useMultiplePageAccess(routes: string[]) {
  const permissions = useSessionStore((s) => s.permissions);
  const status = useSessionStore((s) => s.status);
  const role = useSessionStore((s) => s.role);

  const accessMap: Record<string, boolean> = {};
  if (status === "ready") {
    routes.forEach(r => {
      accessMap[r] = role === "admin" ? true : (permissions[r] ?? false);
    });
  }

  return {
    accessMap,
    isLoading: status !== "ready",
  };
}
