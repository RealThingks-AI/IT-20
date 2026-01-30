import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface CurrentUserData {
  authUserId: string;
  email: string | undefined;
  organisationId: string;
  tenantId: number;
  role: string | null;
  name: string | null;
}

export const useCurrentUserData = () => {
  return useQuery({
    queryKey: ["current-user-data"],
    staleTime: 10 * 60 * 1000,  // 10 minutes - user data rarely changes
    gcTime: 30 * 60 * 1000,     // 30 minutes cache retention
    queryFn: async (): Promise<CurrentUserData | null> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      // Get user data from users table
      const { data: userData } = await supabase
        .from("users")
        .select("id, email, name, role")
        .eq("auth_user_id", user.id)
        .maybeSingle();

      // Return static org values for single-company mode
      return {
        authUserId: user.id,
        email: user.email,
        organisationId: 'single-company',
        tenantId: 1,
        role: userData?.role || null,
        name: userData?.name || null,
      };
    },
  });
};
