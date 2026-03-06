
## Plan: Subscriptions App — Full Audit Fixes + User Assignment for License Seats

### What we're building

Combining the approved comprehensive audit fixes with the new user-assignment feature: when assigning a license seat, users can be picked directly from the system's user list (instead of typing name/email manually).

---

### Changes Overview

#### 1. `AddLicenseDialog.tsx` — User Picker for "Assigned To"
**Current**: Two free-text inputs (Name + Email) — user must type manually.
**New**: A searchable user-picker Combobox (same pattern as `AddToolDialog`'s owner picker). When a user is selected from the dropdown, `assigned_to_name`, `assigned_to_email`, and `assigned_to` (user UUID from `users.id`) are auto-filled. Status auto-flips to `"assigned"` when a user is picked. Status auto-resets to `"available"` when cleared.

Key changes:
- Add `user_id` field to form schema (stores `users.id`)
- Import `useUsers` hook
- Replace two manual text inputs with a single searchable Combobox showing `name (email)` per user
- Keep manual name/email inputs as fallback when no system user is selected (for external contractors etc.)
- On submit: set `assigned_to = selected_user.id`
- Fix tool query: remove `.eq("status", "active")` filter — include `trial` and `expiring_soon`

---

#### 2. `LicensesList.tsx` — Show User Reference + Stat Cards
- Add 4 stat cards row: Total, Assigned, Available, Expiring Soon
- Add row background highlighting: amber for expiring ≤30d, red for expired status
- "Assigned To" cell: if `assigned_to` is a user UUID, show it linked (resolved via `useUsersLookup`)

---

#### 3. `SubscriptionLayout.tsx` — Sidebar Restructure
- Remove `"New Subscription"` sidebar item (add button exists on list page)
- Add `"Licenses"`, `"Payments"`, `"Vendors"` as direct sidebar links (pointing to `/subscription/advanced?tab=licenses` etc.)

---

#### 4. `advanced.tsx` — Fix Portal Bug + Remove Placeholder Tabs
- Fix the `TabsTrigger` portal bug: `TabsTrigger`s rendered via portal have no `Tabs` ancestor, so `data-[state=active]` never fires. Replace with manual `Button`-based tab bar using `cn()` for active state, driven by `activeTab` state.
- Remove `"Reports"` tab (all 4 cards say "coming soon" — non-functional, misleading)
- Remove `"Alerts"` tab (switches have no state/persistence)
- Remove `"Settings"` tab (selects never save, hardcoded `defaultValue`)
- Keep: Licenses, Payments, Vendors, Import/Export

---

#### 5. `dashboard.tsx` — Stat Cards + INR Display
- Consolidate from 2 rows (10 cards) to 1 row of 6: Total, Active, Expiring Soon, Monthly Recurring, Annual Cost, Active Vendors
- Add tooltip/note `"~INR"` on currency aggregate fields

---

#### 6. `ToolsList.tsx` — Search Fix
- Add client-side fallback search across vendor name, department, category (currently only searches `tool_name` via DB ilike)

---

#### 7. `detail/[subscriptionId].tsx` — Notes Tab + owned/one_time display
- Load existing `subscription.notes` into `notesValue` via `useEffect` when data arrives
- Show notes as read-only text by default, "Edit" button to switch to textarea
- Hide Monthly/Annual Equiv rows for `owned`/`one_time` types (show "N/A — One-time cost")
- Fix license utilization card visibility: show when `licenses.length > 0 || seatCount > 0`

---

#### 8. `VendorsList.tsx` — Website + Asset Count
- Add clickable Website column (if vendor has website)
- Add Assets count column from the already-fetched `subscriptions_tools(id)` join

---

#### 9. `PaymentsList.tsx` + `AddPaymentDialog.tsx`
- Fix "Total Payments" label → "Filtered Total" with note when filters active
- Fix `AddPaymentDialog` amount Zod schema: `z.string()` → `z.coerce.number().min(0.01)`
- Remove `.eq("status", "active")` filter on tools dropdown

---

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/Subscriptions/AddLicenseDialog.tsx` | User-picker Combobox, fix tool query |
| `src/components/Subscriptions/LicensesList.tsx` | Stat cards, row highlighting |
| `src/layouts/SubscriptionLayout.tsx` | Sidebar restructure |
| `src/pages/helpdesk/subscription/advanced.tsx` | Fix portal/tab bug, remove 3 placeholder tabs |
| `src/pages/helpdesk/subscription/dashboard.tsx` | Consolidate stat cards, INR note |
| `src/components/Subscriptions/ToolsList.tsx` | Client-side search fix |
| `src/pages/helpdesk/subscription/detail/[subscriptionId].tsx` | Notes tab fix, owned/one_time display, utilization fix |
| `src/components/Subscriptions/VendorsList.tsx` | Website column, asset count column |
| `src/components/Subscriptions/PaymentsList.tsx` | Label fix |
| `src/components/Subscriptions/AddPaymentDialog.tsx` | Amount schema fix, tool query fix |

No database schema changes needed — `subscriptions_licenses.assigned_to` column already exists (stores a UUID), `assigned_to_name` and `assigned_to_email` also exist. We just populate them properly from the user picker.
