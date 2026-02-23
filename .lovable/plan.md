

# Import Peripheral Assets from Excel + Fix Build Error

## Overview

Process the uploaded Excel file containing 53 employee rows with 3 peripheral types each (Headphones, Keyboards, Mice) to create individual asset records. Also fix the existing build error in `create-backup/index.ts`.

## Data Analysis

- **53 rows**, up to 3 assets per row (Headphone RT-HP-XXX, Mouse RT-MOU-XXX, Keyboard RT-KB-XXX)
- **Skip rule**: Any entry where serial number OR asset tag is "NA" or empty
- **Row 43 ("Stock")**: No email -- assets created as unassigned (status: available)
- **Estimated**: ~130 records after NA exclusions

## Fix 1: Build Error in create-backup/index.ts

The Deno std library `encoding/hex.ts` at v0.224.0 no longer exports `encode`. Replace with the Web Crypto API approach or use `encodeHex` from the newer path.

**File**: `supabase/functions/create-backup/index.ts` line 2

Change:
```typescript
import { encode as hexEncode } from "https://deno.land/std@0.224.0/encoding/hex.ts";
```
To:
```typescript
import { encodeHex } from "https://deno.land/std@0.224.0/encoding/hex.ts";
```
Then update all usages of `hexEncode` to `encodeHex`.

## Fix 2: Import Peripherals Function

### File: `src/hooks/useAssetExportImport.tsx`

Add a new `importPeripherals` function that:

1. Parses the XLSX using existing `parseFileToRows`
2. Fetches all users from the `users` table
3. Applies the email alias map to resolve mismatched emails
4. For each row, creates up to 3 asset records:
   - **Headphone**: asset_tag from col 5, serial from col 4, category_id = `b74a9d25-2143-419f-945e-3a978c38fab0`
   - **Mouse**: asset_tag from col 7, serial from col 6, category_id = `efff9267-49db-4dbe-a106-d4ee9f5e579b`
   - **Keyboard**: asset_tag from col 9, serial from col 8, category_id = `8736a5f8-a761-49c1-be5d-8bb784614e3c`
5. Skips any peripheral where serial or asset_tag is "NA" or empty
6. Checks for duplicate asset_tag before inserting
7. Sets status to `in_use` and `assigned_to` when email resolves; `available` for Stock row

### Email Alias Map (hardcoded)

```text
palla.siva.prasad@realthingks.com -> siva.prasad@realthingks.com
pranay.m@realthingks.com -> pranay.marchande@realthingks.com
ramakrishna.t@realthingks.com -> ramakrishna.tondapu@realthingks.com
sidharth.d@realthingks.com -> sidharth.dhammi@realthingks.com
shraddha.n@realthingks.com -> shraddha.nandwadekar@realthingks.com
vishal.s@realthingks.com -> vishal.srivastav@realthingks.com
```

### File: `src/pages/helpdesk/assets/import-export.tsx`

Add a third tab "Peripherals" (or a section under Import) with:
- File upload input for the peripheral Excel
- Import button
- Progress bar and results display
- Explanation of expected format (Sr No, Name, Email, Headphone Serial, HP Tag, Mouse Serial, Mouse Tag, KB Serial, KB Tag)

## Files to Modify

| File | Change |
|------|--------|
| `supabase/functions/create-backup/index.ts` | Fix hex encode import (build error) |
| `src/hooks/useAssetExportImport.tsx` | Add `importPeripherals()` with email alias map, dedup check, NA skip |
| `src/pages/helpdesk/assets/import-export.tsx` | Add "Import Peripherals" tab/section with upload UI |

## Technical Details

### Asset Record Shape (per peripheral)

```typescript
{
  asset_tag: "RT-HP-001",
  asset_id: "RT-HP-001",
  name: "Headphones - Abhijeet Raj",
  serial_number: "2328ALA06GT8",
  category_id: "b74a9d25-...",
  assigned_to: "<user_uuid>",
  checked_out_to: "<user_uuid>",
  checked_out_at: new Date().toISOString(),
  status: "in_use",
  is_active: true
}
```

For "Stock" row (no email): `status: "available"`, no `assigned_to`.

### Duplicate Prevention

Before each insert, check if `asset_tag` already exists in `itam_assets` (active). If it does, skip and log as "already exists".

