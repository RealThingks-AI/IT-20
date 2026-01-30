import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CurrentUser {
  id: string;
  authUserId: string;
  email: string;
  name: string | null;
  role: string | null;
  tenantId: number;
  organisationId: string;
  organisation: {
    id: string;
    name: string;
  };
}

// Static defaults for single-company internal use
const DEFAULT_ORG_ID = 'single-company';
const DEFAULT_ORG_NAME = 'RT-IT-Hub';

/**
 * Simplified user data hook for single-company internal use.
 * Returns static organisation data for backward compatibility.
 */
export function useCurrentUser() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['current-user', user?.id],
    queryFn: async (): Promise<CurrentUser | null> => {
      if (!user?.id) return null;

      // Single query for user data
      const { data, error } = await supabase
        .from('users')
        .select('id, auth_user_id, email, name, role')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      // Get tenant_id from profiles
      const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .maybeSingle();

      return {
        id: data.id,
        authUserId: data.auth_user_id,
        email: data.email,
        name: data.name,
        role: data.role,
        tenantId: profile?.tenant_id || 1,
        // Static organisation data for single-company use
        organisationId: DEFAULT_ORG_ID,
        organisation: {
          id: DEFAULT_ORG_ID,
          name: DEFAULT_ORG_NAME,
        },
      };
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,  // 10 min - user data rarely changes
    gcTime: 30 * 60 * 1000,     // 30 min cache retention
  });
}
