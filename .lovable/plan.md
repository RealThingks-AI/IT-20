

# Admin Panel — All Issues Found & Fix Plan

## Issues Discovered

### 1. CRITICAL: `update_user_status` DB function crashes (the error you see)
**Error**: `invalid input value for enum app_role: "owner"`
**Root cause**: The `update_user_status` function has an ORDER BY clause that compares `role` (typed as `app_role`) against `'owner'` and `'staff'` — neither exists in the `app_role` enum `{admin, manager, user, viewer}`. PostgreSQL tries to cast these strings to `app_role` and crashes.
**Fix**: Replace the ORDER BY to only use valid enum values.

### 2. CRITICAL: `notify_role_change` trigger references non-existent column
The `user_role_change_notification` trigger on the `users` table calls `notify_role_change()`, which references `NEW.organisation_id`. The `users` table has **no `organisation_id` column**. If `users.role` ever changes, this trigger crashes. Currently masked because EditUserDialog doesn't update the role column on the `users` table directly.
**Fix**: Update the function to pass `NULL` instead of `NEW.organisation_id`.

### 3. `users.role` column drifts out of sync with `user_roles.role`
Pratik Wable has `admin` in `users.role` but `viewer` in `user_roles.role`. The `update_user_role` RPC updates `user_roles` but never syncs `users.role`. The UI reads from `user_roles` (correct), but the stale `users.role` creates confusion and potential bugs elsewhere.
**Fix**: Add a sync step in `update_user_role` to also update `users.role`.

### 4. `UserRecentActivity` queries wrong ID column
In the detail sheet, `UserRecentActivity` uses `detailUser.auth_user_id` to query `audit_logs.user_id`. But audit logs store the app user ID (`users.id`), not `auth_user_id`. Result: "No recent activity" is always shown even for active users.
**Fix**: Pass `detailUser.id` (app user ID) instead of `detailUser.auth_user_id`.

### 5. `log_role_change` trigger missing from `user_roles` table
The `log_role_change()` function exists but has no trigger attached to `user_roles` (confirmed by checking `pg_trigger`). Role changes are never logged to `audit_logs`.
**Fix**: Create the trigger on `user_roles`.

## Files to Modify

| File/Resource | Change |
|---|---|
| **DB migration** | Fix `update_user_status` (remove 'owner'/'staff' from CASE), fix `notify_role_change` (remove `organisation_id` reference), update `update_user_role` to sync `users.role`, add `log_role_change` trigger |
| `src/components/settings/AdminUsers.tsx` line 649 | Fix `UserRecentActivity` to use `detailUser.id` instead of `detailUser.auth_user_id` |

## Technical Details

### DB Migration SQL

```sql
-- 1. Fix update_user_status: remove invalid enum comparisons
CREATE OR REPLACE FUNCTION public.update_user_status(...)
  -- Remove 'owner' and 'staff' from ORDER BY CASE
  ORDER BY CASE role
    WHEN 'admin' THEN 1
    WHEN 'manager' THEN 2
    WHEN 'user' THEN 3
    WHEN 'viewer' THEN 4
  END

-- 2. Fix notify_role_change: remove organisation_id reference
  PERFORM create_notification(
    NEW.auth_user_id, ..., NULL, NULL  -- was NEW.organisation_id
  );

-- 3. Sync users.role in update_user_role
  UPDATE public.users SET role = new_role WHERE auth_user_id = target_user_id;

-- 4. Attach log_role_change trigger
CREATE TRIGGER on_role_change AFTER UPDATE ON public.user_roles
  FOR EACH ROW WHEN (OLD.role IS DISTINCT FROM NEW.role)
  EXECUTE FUNCTION log_role_change();

-- 5. Fix existing data drift
UPDATE users u SET role = ur.role::text
FROM user_roles ur WHERE ur.user_id = u.auth_user_id
AND u.role != ur.role::text;
```

### Frontend Fix (1 line)
In `AdminUsers.tsx` line 649, change `userId={detailUser.auth_user_id}` to `userId={detailUser.id}`.

