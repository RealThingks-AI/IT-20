

# Fix Asset Photo Selector to Show All Images (Including Migrated)

## Root Cause

In `src/components/helpdesk/assets/AssetPhotoSelector.tsx`, line 56:

```ts
const { data, error } = await supabase.storage.from(bucket).list("", { ... });
```

This only lists files at the **root** of the `asset-photos` bucket. The migration edge function uploads images to `migrated/{hash}.jpg`, and the PhotosTab uploads to `{assetId}/{filename}`. Neither of these subfolders is listed by the current code.

Supabase `storage.list()` is **not recursive** — it only returns files and folders at the specified path level.

## Solution

Update `fetchPhotos` in `AssetPhotoSelector.tsx` to:

1. List the root level to discover folders (like `migrated/`, asset ID folders)
2. List inside `migrated/` folder specifically
3. Merge all results into a single deduplicated photo list

### File: `src/components/helpdesk/assets/AssetPhotoSelector.tsx`

**Change the `fetchPhotos` function** to scan multiple paths:

```typescript
const fetchPhotos = async () => {
  setIsLoading(true);
  try {
    const imageExtensions = ["jpg", "jpeg", "png", "gif", "webp"];
    const allPhotos: { name: string; url: string }[] = [];
    const seenUrls = new Set<string>();

    const addPhotosFromPath = async (path: string) => {
      const { data, error } = await supabase.storage.from(bucket).list(path, {
        limit: 200,
        sortBy: { column: "created_at", order: "desc" },
      });
      if (error || !data) return;

      for (const file of data) {
        if (file.name === ".emptyFolderPlaceholder") continue;
        const ext = file.name.toLowerCase().split(".").pop();
        if (!imageExtensions.includes(ext || "")) continue;

        const fullPath = path ? `${path}/${file.name}` : file.name;
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fullPath);
        if (!seenUrls.has(urlData.publicUrl)) {
          seenUrls.add(urlData.publicUrl);
          allPhotos.push({ name: file.name, url: urlData.publicUrl });
        }
      }
    };

    // List root-level images
    await addPhotosFromPath("");

    // List migrated/ folder
    await addPhotosFromPath("migrated");

    // Discover and list other subfolders (asset ID folders, etc.)
    const { data: rootItems } = await supabase.storage.from(bucket).list("", {
      limit: 100,
    });
    if (rootItems) {
      const folders = rootItems.filter(
        (item) => item.id === null && item.name !== "migrated"
      );
      await Promise.all(folders.map((folder) => addPhotosFromPath(folder.name)));
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

### Key Points
- Scans root, `migrated/`, and any discovered subfolders
- Deduplicates by URL to avoid showing the same image twice
- Uses `Promise.all` for parallel subfolder scanning (fast)
- New uploads still go to root level and will appear immediately

### Additional: Upload path consistency

New uploads in `AssetPhotoSelector` go to root (`fileName`), while `PhotosTab` uploads go to `{assetId}/fileName`. This is fine — both paths will now be scanned.

## Files to Modify

| File | Change |
|------|--------|
| `src/components/helpdesk/assets/AssetPhotoSelector.tsx` | Replace `fetchPhotos` to scan root + `migrated/` + subfolder paths |

