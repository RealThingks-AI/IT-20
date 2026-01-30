import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Simplified asset reports hook for single-company internal use.
 * Fetches all asset data without organisation/tenant filtering.
 */
export const useAssetReports = () => {
  return useQuery({
    queryKey: ["asset-reports"],
    staleTime: 5 * 60 * 1000,  // 5 minutes
    gcTime: 10 * 60 * 1000,    // 10 minutes cache retention
    queryFn: async () => {
      // Fetch all data in parallel
      const [assetsRes, assignmentsRes, licensesRes, repairsRes] = await Promise.all([
        supabase.from("itam_assets").select("*"),
        supabase.from("itam_asset_assignments").select("*"),
        supabase.from("itam_licenses").select("*"),
        supabase.from("itam_repairs").select("*"),
      ]);

      return {
        assets: assetsRes.data || [],
        assignments: assignmentsRes.data || [],
        licenses: licensesRes.data || [],
        repairs: repairsRes.data || [],
      };
    },
  });
};
