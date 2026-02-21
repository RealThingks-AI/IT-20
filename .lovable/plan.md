
# Fix Image Migration (Dedup) & Default Page Sizes

## 1. Deduplicated Image Migration (Edge Function)

The current `migrate-asset-photos/index.ts` downloads one image per asset, even if 20 assets share the same external URL. This wastes storage and time.

### New Logic

1. Fetch all assets with `assettiger.com` URLs
2. Group them by `photo_url` -- e.g., if 20 assets share the same URL, that URL appears once in the processing queue
3. For each unique URL:
   - Download the image once
   - Upload once to `asset-photos/migrated/{hash}.{ext}` (using a hash of the URL as filename)
   - Get the public URL
4. Update ALL assets that shared that original URL in a single batch update
5. Store `original_photo_url` for reference

This means instead of downloading 322 images, we might only download ~30-50 unique images.

### File to Modify
- `supabase/functions/migrate-asset-photos/index.ts`

### Technical Approach
```
// Pseudocode
1. SELECT id, custom_fields FROM itam_assets WHERE photo_url LIKE '%assettiger.com%'
2. Build a Map<originalUrl, assetId[]>
3. For each unique URL:
   a. Fetch image once
   b. Upload to asset-photos/migrated/{urlHash}.{ext}
   c. Get public URL
   d. UPDATE itam_assets SET custom_fields photo_url = newUrl WHERE id IN (all asset IDs with that URL)
4. Return stats: uniqueImages, totalAssetsUpdated, failed
```

---

## 2. Default Page Size: 100, with options 100/200/500

### File to Modify
- `src/components/helpdesk/assets/AssetsList.tsx`

### Changes
- Line 28: Change `PAGE_SIZE_OPTIONS` from `[25, 50, 100]` to `[100, 200, 500]`
- Line 75: Change default `pageSize` from `25` to `100`

---

## Summary of Changes

| File | Change |
|------|--------|
| `supabase/functions/migrate-asset-photos/index.ts` | Deduplicate by URL before downloading; batch-update all assets sharing same image |
| `src/components/helpdesk/assets/AssetsList.tsx` | Default page size 100, options 100/200/500 |
