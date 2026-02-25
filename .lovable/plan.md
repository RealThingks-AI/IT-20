

# Fix Duplicate Images in Asset Photo Selector

## Root Cause

The current approach scans the storage bucket directory-by-directory (root, `migrated/`, subfolders). This causes duplicates because:
1. The same image content can exist under different filenames (e.g., uploaded to root as `1709123456-abc.jpg` AND migrated to `migrated/xyz.jpg`)
2. Multiple assets may have had photos uploaded independently to different subfolders with the same content

The URL-based deduplication only catches exact URL matches, not content-level duplicates across different paths.

## Solution

Replace the bucket-scanning approach with a **database-driven** approach that is inherently duplicate-free:

1. Query `itam_assets` for all distinct `custom_fields->>'photo_url'` values that are non-null and non-empty
2. Also list the bucket root for any recently uploaded images not yet assigned to assets
3. Combine and deduplicate by URL

This guarantees each unique image appears exactly once.

### File: `src/components/helpdesk/assets/AssetPhotoSelector.tsx`

Replace the `fetchPhotos` function:

```typescript
const fetchPhotos = async () => {
  setIsLoading(true);
  try {
    const allPhotos: { name: string; url: string }[] = [];
    const seenUrls = new Set<string>();

    // 1. Get all unique photo_urls from assets in the database
    const { data: assets } = await supabase
      .from("itam_assets")
      .select("custom_fields")
      .eq("is_active", true)
      .not("custom_fields->photo_url", "is", null);

    if (assets) {
      for (const asset of assets) {
        const photoUrl = (asset.custom_fields as any)?.photo_url;
        if (photoUrl && typeof photoUrl === "string" && photoUrl.trim() && !seenUrls.has(photoUrl)) {
          seenUrls.add(photoUrl);
          const name = photoUrl.split("/").pop() || "image";
          allPhotos.push({ name, url: photoUrl });
        }
      }
    }

    // 2. Also list root-level uploads (not yet assigned to any asset)
    const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp"];
    const { data: rootFiles } = await supabase.storage.from(bucket).list("", {
      limit: 100,
      sortBy: { column: "created_at", order: "desc" },
    });
    if (rootFiles) {
      for (const file of rootFiles) {
        if (file.name === ".emptyFolderPlaceholder") continue;
        const ext = file.name.toLowerCase().split(".").pop();
        if (!imageExtensions.includes(ext || "")) continue;
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(file.name);
        if (!seenUrls.has(urlData.publicUrl)) {
          seenUrls.add(urlData.publicUrl);
          allPhotos.push({ name: file.name, url: urlData.publicUrl });
        }
      }
    }

    setPhotos(allPhotos);
  } catch (error) {
    console.error("Error fetching photos:", error);
    toast.error("Failed to load photos from storage");
  } finally {
    setIsLoading(false);
  }
};
```

### Why This Works
- Each unique `photo_url` from the database appears exactly once - no content duplicates
- Newly uploaded images (root level, not yet saved to an asset) are still discoverable
- Faster than scanning multiple storage folders
- The `key` in the grid uses `photo.url` instead of `photo.name` to avoid React key collisions

### Additional Fix
Change the `key` prop on the photo grid buttons from `photo.name` to `photo.url` since names can repeat across paths.

## Files to Modify
| File | Change |
|------|--------|
| `src/components/helpdesk/assets/AssetPhotoSelector.tsx` | Replace fetchPhotos with DB-driven approach, fix React key |

