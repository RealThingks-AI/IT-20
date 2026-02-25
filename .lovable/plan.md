
Goal: make the Photo Gallery and asset image selection reliably show real images from `asset-photos/migrated/**` (not folder placeholders), and ensure new uploads also go into `migrated/`.

1) Findings from current code and runtime evidence

- The selected UI element (`migrated`) comes from `PhotoGalleryDialog.tsx` where `assetPhotos` is built from:
  - `supabase.storage.from("asset-photos").list()` (root listing only)
  - then `getPublicUrl(file.name)`
- Because root listing includes a folder entry named `migrated` (not an image), the gallery renders a card for that folder.
- The `<img>` fails to load, triggering the fallback “No Image” placeholder (exactly what your screenshot shows).
- Your network log confirms real image files exist under prefix `migrated` (`POST .../object/list/asset-photos` with `prefix:"migrated"` returns many `.jpg` files), so data exists but UI is reading the wrong path.
- `PhotoGalleryDialog` upload currently writes to bucket root (`upload(fileName, file)`), which conflicts with your requirement to use `migrated/`.

2) Root cause

- Non-recursive and wrong-level storage read in `PhotoGalleryDialog`:
  - `list()` at root returns folders + root files, not the files inside `migrated/`.
- Folder items are treated like image files and rendered as thumbnails.
- Upload path inconsistency (root instead of `migrated/`) keeps splitting image sources.

3) Implementation plan

A. Fix `PhotoGalleryDialog` data loading to target migrated images only
- Replace query function logic to list from `migrated` prefix:
  - `supabase.storage.from("asset-photos").list("migrated", { limit, sortBy })`
- Filter/guard against non-image entries and folder rows (`id === null`).
- Build public URL with full path:
  - `getPublicUrl(\`migrated/${file.name}\`)`
- Return photo objects with stable keying and path-aware metadata.

B. Fix `PhotoGalleryDialog` upload destination
- Change upload path from root to:
  - `const filePath = \`migrated/${fileName}\``
- Keep existing success refetch/invalidation logic.

C. Fix delete behavior for migrated files
- Current delete uses `remove([photo.name])` (root path).
- Change to path-aware delete:
  - `remove([photo.path])` where `path` is `migrated/<filename>`.

D. Harden rendering and dedupe
- Use URL or full path as list key (not just id) to avoid collisions.
- Skip invalid URL records before rendering.
- Keep fallback image behavior for broken files.

E. Align both image surfaces (consistency pass)
- Verify `AssetPhotoSelector` and `PhotoGalleryDialog` follow same bucket conventions:
  - source = `migrated/`
  - upload = `migrated/`
  - public URL built with full path.
- If needed, extract a small shared helper later, but first fix directly in `PhotoGalleryDialog` to unblock you quickly.

4) Files to update

- `src/components/helpdesk/assets/PhotoGalleryDialog.tsx`
  - queryFn storage listing path + filtering + URL generation
  - upload mutation path
  - delete mutation path
  - local `AssetPhoto` shape (add `path` field)
- (Validation-only check) `src/components/helpdesk/assets/AssetPhotoSelector.tsx`
  - confirm no regression and same migrated-path behavior.

5) Technical details (for implementation)

- Data model update in gallery:
  - from:
    - `{ id, name, photo_url, created_at }`
  - to:
    - `{ id, name, path, photo_url, created_at }`
- Suggested guards:
  - `if (item.id === null) return` (folder)
  - `ext` in `[jpg,jpeg,png,gif,webp]`
  - `publicUrl` non-empty check
- Query sizing:
  - keep `limit` high enough (e.g. 1000) with created_at desc for recent-first UX.
- No DB migration needed; this is a client-side storage path/read fix.

6) End-to-end validation checklist

- Open Assets → Documents → Photo Gallery.
- Confirm cards show actual thumbnails (no “migrated” folder tile).
- Confirm photo count reflects real file count under `migrated/`.
- Upload one new image from gallery and verify:
  - it appears immediately,
  - URL path includes `/asset-photos/migrated/`.
- Delete an image and verify it is removed from UI and storage.
- Open asset edit flow with `AssetPhotoSelector` and confirm the same images are visible/selectable.

7) Expected result

- You will see all actual images from `migrated/` in the gallery.
- New uploads will consistently go to `migrated/`.
- No fake folder thumbnail entries like “migrated”.
- Image selection and gallery management will stay in one consistent folder structure.
