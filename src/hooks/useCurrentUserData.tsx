import { useAuth } from "@/contexts/AuthContext";
import { useSessionStore } from "@/stores/useSessionStore";

export interface CurrentUserData {
  authUserId: string;
  email: string | undefined;
  organisationId: string;
  tenantId: number;
  role: string | null;
  name: string | null;
}

/**
 * Simplified user data hook — reads from auth context + session store.
 * Zero database calls.
 */
export const useCurrentUserData = () => {
  const { user } = useAuth();
  const storeName = useSessionStore((s) => s.name);
  const storeEmail = useSessionStore((s) => s.email);
  const storeRole = useSessionStore((s) => s.role);
  const status = useSessionStore((s) => s.status);

  const data: CurrentUserData | null = user ? {
    authUserId: user.id,
    email: storeEmail || user.email,
    organisationId: 'single-company',
    tenantId: 1,
    role: storeRole,
    name: storeName || user.user_metadata?.name || null,
  } : null;

  return {
    data,
    isLoading: status !== "ready",
    error: null,
  };
};
