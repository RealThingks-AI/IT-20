
# Fix Asset Column Settings + Compact List View

## Root Cause Found

The column settings ARE being saved to the database correctly, but they are never read back. The bug is on **line 138 of `src/hooks/useUISettings.tsx`**:

```ts
const uiSettingsData = data?.preferences?.[0]?.ui_settings;
```

The Supabase query returns `preferences` as a **single object** (not an array) because `user_preferences` has a unique constraint on `user_id`, making it a 1-to-1 relationship. So `preferences[0]` returns `undefined`, and the code always falls back to default column settings.

**Evidence**: The network response confirms this:
```json
{"id":"...","preferences":{"ui_settings":{"assetColumns":[...]}}}
```

Accessing `preferences[0]` on an object returns `undefined`.

---

## Changes

### Fix 1: Read settings correctly (`src/hooks/useUISettings.tsx`)

**Line 138** - Change the data extraction to handle both object and array:

```ts
// Before (broken):
const uiSettingsData = data?.preferences?.[0]?.ui_settings;

// After (fixed):
const prefs = data?.preferences;
const uiSettingsData = Array.isArray(prefs)
  ? prefs[0]?.ui_settings
  : prefs?.ui_settings;
```

This single fix resolves the entire column settings issue - save, load, and real-time updates will all work.

### Fix 2: Reduce list view font size, spacing, and padding (`src/components/helpdesk/assets/AssetsList.tsx`)

- Table header text: add `text-xs` class
- Table cell text: add `text-xs` class
- Row height: reduce padding with `py-1` on cells
- Status badge: reduce to `text-[10px] px-1.5 py-0`
- Column min-widths: reduce by ~20% for tighter layout
- Pagination text: already `text-xs`, keep as-is

### Fix 3: Compact column settings dialog (`src/components/helpdesk/assets/AssetColumnSettings.tsx`)

- Reduce checkbox row padding from `p-2` to `p-1.5`
- Use `text-sm` for column labels (already used, keep)
- Tighten ScrollArea height if needed

---

## Technical Details

### Why the mutation appeared to work
The `updateAssetColumns` mutation correctly:
1. Saves to `user_preferences.ui_settings` via upsert
2. Invalidates the `["user-settings-combined"]` query cache
3. The query refetches fresh data from the DB

But on refetch, the same broken line 138 extracts `undefined` again, so the table never updates.

### Files to modify
| File | Change |
|------|--------|
| `src/hooks/useUISettings.tsx` | Fix line 138 - handle object vs array for preferences |
| `src/components/helpdesk/assets/AssetsList.tsx` | Add `text-xs` to cells, reduce padding, compact rows |
| `src/components/helpdesk/assets/AssetColumnSettings.tsx` | Minor spacing tightening |
