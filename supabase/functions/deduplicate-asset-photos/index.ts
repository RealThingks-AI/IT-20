import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function sha256Hex(data: ArrayBuffer): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // --- PHASE 1: Re-migrate external URLs ---
    const { data: externalAssets } = await supabase
      .from("itam_assets")
      .select("id, asset_tag, custom_fields")
      .eq("is_active", true)
      .like("custom_fields->>photo_url", "%assettiger.com%")
      .limit(1000);

    let remigratedCount = 0;
    const remigrationErrors: string[] = [];
    // Build a map of external URL → already-migrated storage path to avoid re-downloading
    const externalToLocal = new Map<string, string>();

    if (externalAssets && externalAssets.length > 0) {
      // Group by URL for dedup
      const urlGroups = new Map<string, typeof externalAssets>();
      for (const a of externalAssets) {
        const url = a.custom_fields?.photo_url;
        if (!url) continue;
        if (!urlGroups.has(url)) urlGroups.set(url, []);
        urlGroups.get(url)!.push(a);
      }

      for (const [extUrl, assets] of urlGroups) {
        try {
          const resp = await fetch(extUrl);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const buf = await resp.arrayBuffer();
          const hash = await sha256Hex(buf);
          const contentType = resp.headers.get("content-type") || "image/jpeg";
          const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
          const fileName = `migrated/${hash}.${ext}`;

          // Upload with upsert (idempotent)
          await supabase.storage.from("asset-photos").upload(fileName, buf, { contentType, upsert: true });
          const { data: urlData } = supabase.storage.from("asset-photos").getPublicUrl(fileName);
          const newUrl = urlData.publicUrl;
          externalToLocal.set(extUrl, newUrl);

          for (const asset of assets) {
            const updated = { ...asset.custom_fields, photo_url: newUrl, original_photo_url: extUrl };
            await supabase.from("itam_assets").update({ custom_fields: updated }).eq("id", asset.id);
            remigratedCount++;
          }
        } catch (e) {
          remigrationErrors.push(`${extUrl}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }

    // --- PHASE 2: Content-hash dedup of migrated/ files ---
    const allFiles: { name: string; path: string }[] = [];
    const listFiles = async (prefix: string) => {
      const { data } = await supabase.storage.from("asset-photos").list(prefix, { limit: 1000 });
      if (!data) return;
      for (const item of data) {
        if (item.name === ".emptyFolderPlaceholder") continue;
        const fullPath = prefix ? `${prefix}/${item.name}` : item.name;
        if (item.id === null) {
          await listFiles(fullPath);
          continue;
        }
        const ext = item.name.toLowerCase().split(".").pop();
        if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) {
          allFiles.push({ name: item.name, path: fullPath });
        }
      }
    };
    await listFiles("migrated");

    console.log(`Found ${allFiles.length} image files in migrated/`);

    // Download each and compute hash
    const hashToFiles = new Map<string, { name: string; path: string; url: string }[]>();
    for (const file of allFiles) {
      try {
        const { data: dlData, error: dlError } = await supabase.storage.from("asset-photos").download(file.path);
        if (dlError || !dlData) continue;
        const buf = await dlData.arrayBuffer();
        const hash = await sha256Hex(buf);
        const { data: urlData } = supabase.storage.from("asset-photos").getPublicUrl(file.path);
        const entry = { ...file, url: urlData.publicUrl };
        if (!hashToFiles.has(hash)) hashToFiles.set(hash, []);
        hashToFiles.get(hash)!.push(entry);
      } catch {
        // skip individual file errors
      }
    }

    let duplicatesRemoved = 0;
    let assetsUpdated = 0;
    const dedupErrors: string[] = [];

    for (const [_hash, files] of hashToFiles) {
      if (files.length <= 1) continue;

      // Keep the first file as canonical
      const canonical = files[0];
      const duplicates = files.slice(1);

      for (const dup of duplicates) {
        try {
          // Update any assets pointing to the duplicate URL
          const { data: affectedAssets } = await supabase
            .from("itam_assets")
            .select("id, custom_fields")
            .eq("custom_fields->>photo_url", dup.url);

          if (affectedAssets && affectedAssets.length > 0) {
            for (const asset of affectedAssets) {
              const updated = { ...asset.custom_fields, photo_url: canonical.url };
              await supabase.from("itam_assets").update({ custom_fields: updated }).eq("id", asset.id);
              assetsUpdated++;
            }
          }

          // Delete the duplicate file from storage
          const { error: rmError } = await supabase.storage.from("asset-photos").remove([dup.path]);
          if (rmError) throw rmError;
          duplicatesRemoved++;
        } catch (e) {
          dedupErrors.push(`${dup.path}: ${e instanceof Error ? e.message : String(e)}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: "Deduplication complete",
        phase1_remigrated: remigratedCount,
        phase1_errors: remigrationErrors.slice(0, 10),
        phase2_uniqueHashes: hashToFiles.size,
        phase2_duplicatesRemoved: duplicatesRemoved,
        phase2_assetsUpdated: assetsUpdated,
        phase2_errors: dedupErrors.slice(0, 10),
        totalFilesScanned: allFiles.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Dedup error:", message);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
