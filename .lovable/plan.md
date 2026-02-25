

# Fix: Remove Duplicate Photos (425 → Under 100)

## Root Cause Analysis

The database confirms the duplication:
- **322 assets** have a `photo_url` set
- Only **112 distinct URLs** exist in the DB
- Only **103 truly unique original images** (by `original_photo_url`)
- The gallery shows **425** because it also scans storage for "orphaned" files — these orphans ARE the old duplicates that were never cleaned up
- 15 assets still point to external `assettiger.com` URLs

The 425 count = 112 DB-referenced URLs + ~313 orphaned storage files (old duplicates with UUID filenames that the dedup edge function didn't finish cleaning because it timed out).

## Plan

### 1. Fix the edge function to work in batches (avoid timeout)

The `deduplicate-asset-photos` function timed out previously because it tried to download and hash all files in one go. Update it to:
- Process files in smaller batches
- Skip files already named with a SHA-256 hash pattern (already canonical)
- Focus on deleting storage files that are NOT referenced by any `itam_assets.custom_fields->>'photo_url'`

### 2. Stop scanning storage for orphans in the UI

The core fix: both `PhotoGalleryDialog` and `AssetPhotoSelector` currently scan storage for "orphaned images not linked to assets." This is what inflates 112 to 425. These orphans are duplicates awaiting cleanup — they should NOT be shown.

**Change both components to only show distinct `photo_url` values from `itam_assets`** (the DB is already the source of truth with 112 unique URLs). Remove the `scanStorageFolder` / `addFromStorage` calls entirely.

### 3. Migrate remaining 15 external URLs

Update the edge function to also handle the 15 remaining `assettiger.com` references by downloading, hashing, and storing them in `migrated/`.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/helpdesk/assets/PhotoGalleryDialog.tsx` | Remove `scanStorageFolder` — only query distinct `photo_url` from DB |
| `src/components/helpdesk/assets/AssetPhotoSelector.tsx` | Remove `addFromStorage` — only query distinct `photo_url` from DB |
| `supabase/functions/deduplicate-asset-photos/index.ts` | Add orphan cleanup: delete storage files not referenced by any asset |

## Technical Details

### UI changes (both components)

Remove the storage scanning entirely. The query becomes:
```
SELECT DISTINCT custom_fields->>'photo_url' as photo_url
FROM itam_assets
WHERE is_active = true
  AND custom_fields->>'photo_url' IS NOT NULL
  AND custom_fields->>'photo_url' LIKE '%supabase%'
```

This gives exactly 97 unique Supabase-hosted URLs (112 minus 15 external) — well under 100.

### Edge function: orphan cleanup phase

After the existing hash-based dedup, add a new phase:
1. List all files in `migrated/`
2. Get all distinct `photo_url` values from `itam_assets`
3. For each storage file, check if its public URL appears in the DB
4. If not referenced by any asset, delete it from storage
5. Also migrate the 15 remaining external URLs

This cleans up the ~313 orphaned files left from incomplete previous migrations.

### Expected outcome
- Gallery count drops from 425 to ~97 unique photos
- Storage gets cleaned of ~313+ orphaned duplicate files
- No visual duplicates remain

