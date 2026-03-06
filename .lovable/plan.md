

# Subscriptions Module — Full Audit, Bug Fixes, and User Assignment

## Build Error Fix (Immediate)
- `supabase/functions/subscription-renewal-check/index.ts` line 108: `error` is `unknown` type. Fix with `(error as Error).message`.

## Bugs & Logic Issues Found

### 1. AddToolDialog — Owner picker uses name-matching (fragile)
**Bug**: Owner is stored as `owner_name` string, matched via `u.name === field.value`. If two users share a name, wrong user is selected. Owner email resolution only works on submit, not on re-edit.
**Fix**: Store owner as user UUID internally, resolve display name from users list. Keep `owner_name`/`owner_email` DB columns populated for display.

### 2. AddToolDialog — Quantity field: user assignment feature (NEW)
**Current**: Quantity is a plain number input. No way to assign specific users to subscription seats.
**New**: Add a "Manage Assigned Users" section below quantity. When quantity > 0, show a user-picker list where users can be added/removed. Assigned users are stored in `subscriptions_licenses` table (one row per user-seat). This reuses the existing license infrastructure but makes it seamless from the subscription form itself.

### 3. Subscription Detail — License tab shows `license.user_id` as fallback (line 320)
**Bug**: Falls back to raw UUID `license.user_id` which doesn't exist on the schema. Should show "Unassigned" instead.
**Fix**: Remove `license.user_id` fallback, use "—" for unassigned.

### 4. Subscription Detail — Quantity/seats sync issue
**Bug**: `license_count` is set to `values.quantity` on save, but when users are assigned via licenses tab, the count can drift. The utilization card shows `license_count` as total but `licenses.filter(assigned)` as used — these can be inconsistent.
**Fix**: Always derive total seats from `quantity` field. Show utilization card whenever `quantity > 0` (not just when licenses exist).

### 5. `/subscription/new` route — Orphaned page
The `/subscription/new` route opens `AddToolDialog` as a standalone page. When closed, it navigates to `/subscription/tools`. This is fragile — the dialog opens detached from any list context.
**Fix**: Remove the `/subscription/new` route entirely. The "Add" button on the tools list and dashboard already opens the dialog properly.

### 6. Dashboard — 10 skeleton cards on loading (line 178)
Shows 10 skeleton cards but only 6 stat cards exist after load.
**Fix**: Match skeleton count to actual card count (6).

## User Assignment Feature

### Approach
When editing a subscription in `AddToolDialog`, add a collapsible "Assigned Users" section that:
1. Shows current users assigned to this subscription (from `subscriptions_licenses` where `tool_id = this.id`)
2. Provides a user-picker (reusing the existing Combobox pattern) to assign new users
3. Auto-creates a `subscriptions_licenses` row with `status: "assigned"`, `assigned_to: user.id`, `assigned_to_name`, `assigned_to_email`
4. Allows removing assignments (deletes the license row)
5. Updates the quantity field to reflect actual assigned count

This is only shown when editing (not creating) since we need the tool ID to create license rows.

### On the Subscription Detail page
- The Licenses tab already shows assigned users. Enhance it to show the user-picker inline (same as AddLicenseDialog but embedded).

## UI/UX Consistency Fixes

### 7. LicensesList — stat cards have inconsistent padding with other tabs
PaymentsList and VendorsList don't have stat cards and use the full height for the table. LicensesList has stat cards + search bar + table, making it feel different from sibling tabs.
**Fix**: Move search/filter bar and Add button into a unified top row (matching PaymentsList/VendorsList pattern). Keep stat cards but make them more compact (single row, smaller).

### 8. All list components — Reset page on filter change
Already handled correctly in most places. Verified.

### 9. AddLicenseDialog — "available" as default status but DB default is "assigned"
The DB column `subscriptions_licenses.status` defaults to `'assigned'`, but the form defaults to `'available'`. This mismatch means if status isn't explicitly set, the DB and form disagree.
**Fix**: Change form default to "assigned" to match DB. When no user is selected, auto-set to "available".

## Files to Modify

| File | Changes |
|------|---------|
| `supabase/functions/subscription-renewal-check/index.ts` | Fix TS error: `(error as Error).message` |
| `src/components/Subscriptions/AddToolDialog.tsx` | Add "Assigned Users" section for editing mode; fix owner picker to be UUID-based |
| `src/components/Subscriptions/AddLicenseDialog.tsx` | Fix default status to "assigned"; minor cleanup |
| `src/components/Subscriptions/LicensesList.tsx` | Compact stat cards; consistent layout |
| `src/pages/helpdesk/subscription/detail/[subscriptionId].tsx` | Fix `license.user_id` fallback; show utilization when quantity > 0; inline user assignment in Licenses tab |
| `src/pages/helpdesk/subscription/dashboard.tsx` | Fix skeleton count (10 → 6) |
| `src/App.tsx` | Remove `/subscription/new` route |
| `src/pages/helpdesk/subscription/new.tsx` | Delete file |

No database schema changes needed. The existing `subscriptions_licenses` table already has `assigned_to` (UUID), `assigned_to_name`, `assigned_to_email`, and `tool_id` — perfect for storing user-to-subscription assignments.

