import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Simplified ITAM stats hook for single-company internal use.
 * Fetches all asset data without organisation/tenant filtering.
 */
export const useITAMStats = () => {
  return useQuery({
    queryKey: ["itam-stats"],
    staleTime: 5 * 60 * 1000,  // 5 minutes
    gcTime: 10 * 60 * 1000,    // 10 minutes cache retention
    queryFn: async () => {
      // Get total assets count
      const { count: totalAssets } = await supabase
        .from("itam_assets")
        .select("*", { count: "exact", head: true });

      // Get assigned assets count
      const { count: assignedCount } = await supabase
        .from("itam_asset_assignments")
        .select("*", { count: "exact", head: true })
        .is("returned_at", null);

      // Get active licenses count
      const { count: licensesCount } = await supabase
        .from("itam_licenses")
        .select("*", { count: "exact", head: true })
        .eq("is_active", true);

      return {
        totalAssets: totalAssets || 0,
        assigned: assignedCount || 0,
        licenses: licensesCount || 0,
        laptops: 0, // Will be implemented when category filtering is needed
      };
    },
  });
};
