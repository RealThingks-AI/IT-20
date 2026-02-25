

# Fix Duplicate Images: Full Storage Cleanup + Content Deduplication

## Investigation Findings

The database reveals the root cause clearly:
- **Many assets still reference external assettiger.com URLs** (not yet migrated). The original migration ran but didn't update all assets.
- **Multiple assets share the same source photo** (e.g., 83 assets share one image, 75 share another). When the migration ran, it may have created separate storage files for images that were already migrated.
- The `migrated/` folder contains multiple files with identical visual content but different UUID-based filenames.

This means the gallery shows the same image multiple times because multiple storage files exist with identical content.

## Solution: Edge Function for Content-Based Deduplication

Since you want full storage cleanup with visual similarity, I will create an edge function that:

1. Lists all files in the `migrated/` folder
2. Downloads each file and computes a SHA-256 content hash
3. Groups files by hash (identical content = same hash)
4. For each group with duplicates:
   - Keeps the first file as the canonical copy
   - Updates all `itam_assets` records pointing to duplicate files to point to the canonical one
   - Deletes the duplicate files from storage
5. Also re-migrates any assets still pointing to external assettiger.com URLs (158+ assets still not migrated)

### UI Fix (Immediate)

Additionally, I will update both `PhotoGalleryDialog` and `AssetPhotoSelector` to deduplicate by the `original_photo_url` field stored in `custom_fields`. This provides instant UI-level dedup even before running the cleanup function, by grouping images that came from the same source URL.

## Files to Create/Modify

| File | Change |
|------|--------|
| `supabase/functions/deduplicate-asset-photos/index.ts` | **New** - Edge function for content-hash-based dedup + cleanup |
| `src/components/helpdesk/assets/PhotoGalleryDialog.tsx` | Add DB-driven dedup using `original_photo_url` to eliminate visual duplicates |
| `src/components/helpdesk/assets/AssetPhotoSelector.tsx` | Same DB-driven dedup approach |

## Technical Details

### Edge Function: `deduplicate-asset-photos`

```text
Flow:
1. list("migrated", limit=1000) → get all files
2. For each file: download → SHA-256 hash
3. Group by hash: { hash → [file1, file2, ...] }
4. For groups with >1 file:
   a. canonical = first file
   b. canonical_url = getPublicUrl(canonical)
   c. For each duplicate:
      - UPDATE itam_assets SET custom_fields = jsonb_set(custom_fields, '{photo_url}', canonical_url)
        WHERE custom_fields->>'photo_url' = duplicate_url
      - DELETE duplicate from storage
5. Return summary: { duplicatesRemoved, assetsUpdated, errors }
```

### UI Dedup Strategy

Query `itam_assets` for distinct `photo_url` values, then show only unique images. This makes the gallery instantly clean without waiting for the storage cleanup.

### Re-migration

The edge function will also handle the 158+ assets still pointing to `assettiger.com` by downloading and storing those images in `migrated/`, using content hashing to avoid creating new duplicates.

