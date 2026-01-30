
# Ticket Management Module - Enterprise-Grade ITSM Fix Plan

## Executive Summary

This plan addresses all issues identified in the comprehensive audit to make the Ticket module enterprise-grade, ITIL-aligned, and production-ready. The changes are organized into 7 phases with clear priorities.

---

## Phase 1: Global Status & Color Dictionary (CRITICAL)

### 1.1 Standardize Status Colors

**Current State in `src/lib/ticketUtils.ts`:**
- open: blue (correct)
- in_progress: purple (correct)  
- on_hold: orange (WRONG - should be yellow)
- resolved: green (correct)
- closed: grey (correct)
- pending: yellow (correct)
- known_error: red (correct)

**Files to Update:**
- `src/lib/ticketUtils.ts` - Central color definitions
- `src/components/helpdesk/DashboardCharts.tsx` - STATUS_COLORS object
- `src/pages/helpdesk/tickets/dashboard.tsx` - Icon colors
- `src/pages/helpdesk/dashboard.tsx` - Icon colors
- `src/components/helpdesk/RecentTicketsList.tsx` - Local color functions

**Changes Required:**
```
on_hold: Change from orange to yellow
Ensure all dashboard icon colors match:
- Open → text-blue-500
- In Progress → text-purple-500
- On Hold → text-yellow-500
- Resolved → text-green-500
- Closed → text-gray-500
- Urgent/SLA Breached → text-red-500
```

### 1.2 Remove All "Unknown" Values

**Locations showing "Unknown":**
1. `src/components/helpdesk/TicketTableView.tsx:167-169` - Shows "Unknown" for created_by
2. `src/components/helpdesk/ProblemTableView.tsx:143-145` - Shows "Unknown" for created_by
3. `src/pages/helpdesk/problems/[id].tsx:260` - Shows "Unknown"

**Fix:** Replace "Unknown" with "System" or fetch the actual user data before rendering.

### 1.3 Standardize Date Format

**Current inconsistencies:**
- `TicketTableView.tsx`: `format(date, 'MMM dd, yyyy')`
- `ProblemTableView.tsx`: `format(date, 'MMM dd, yyyy')`
- `RecentTicketsList.tsx`: Uses `FormattedDate` with "short"
- Ticket detail pages: Various formats

**Fix:** Create a unified date format constant and use `FormattedDate` component everywhere.

### 1.4 Enforce Unique ID Formats

**Current State:**
- Tickets: TKT-XXXXXX (for all types)
- Problems: PRB-XXXXXX (correct)

**Required:**
- Incidents: INC-XXXXXX
- Service Requests: SR-XXXXXX
- Problems: PRB-XXXXXX (keep)

**Files to Update:**
- `supabase/functions` - Update `generate_helpdesk_ticket_number` and `generate_unified_request_number`
- Database function `generate_unified_request_number` needs modification

---

## Phase 2: Dashboard - Action Summary Section (HIGH PRIORITY)

### 2.1 Add Missing Dashboard Cards

**Current Cards in `src/pages/helpdesk/tickets/dashboard.tsx`:**
- Total Tickets
- Open
- In Progress
- Resolved
- Urgent
- Last 7 Days

**Missing Cards (add to top row):**
- **Unassigned Tickets** - Filter: `assignee_id IS NULL AND status NOT IN ('resolved', 'closed')`
- **SLA Breached Tickets** - Filter: `sla_breached = true`

### 2.2 Update useUnifiedRequestsStats Hook

**File:** `src/hooks/useUnifiedRequests.tsx`

**Add new stats:**
```typescript
// Add to the stats calculation
const unassignedTickets = tickets.filter(t => 
  !t.assignee_id && !['resolved', 'closed'].includes(t.status)
).length;

const slaBreachedCount = tickets.filter(t => t.sla_breached).length;
```

### 2.3 Add Tooltips to All Cards

Each stat card should explain what it represents when hovered.

### 2.4 Ensure All Cards Are Clickable

**Current:** Most cards navigate correctly
**Fix:** Add navigation to all cards, including:
- Unassigned → `/tickets/list?assignee=unassigned`
- SLA Breached → `/tickets/list?sla=breached`

---

## Phase 3: All Tickets List - UX & Data Fixes

### 3.1 Add Missing Table Columns

**File:** `src/components/helpdesk/TicketTableView.tsx`

**Add columns:**
- **SLA Due Time** - Show formatted due date
- **SLA Status** - Badge showing "On Track" / "Warning" / "Breached"

**Update:** `src/lib/ticketUtils.ts` - Add to defaultTicketColumns:
```typescript
{ id: 'sla_due_date', label: 'SLA Due', visible: true },
{ id: 'sla_status', label: 'SLA Status', visible: true },
```

### 3.2 Implement Row Highlighting

**File:** `src/components/helpdesk/TicketTableView.tsx`

**Add highlighting rules:**
- Priority Urgent/High → light red/orange background
- Assignee missing → light yellow background
- SLA breached → red left border

**Current:** Only SLA breached has highlighting (line 124)

**Enhance to:**
```typescript
className={cn(
  "cursor-pointer hover:bg-muted/50 h-11",
  isSLABreached(ticket) && 'bg-red-50 dark:bg-red-950/20',
  !ticket.assignee_id && ['open', 'in_progress'].includes(ticket.status) && 'bg-yellow-50 dark:bg-yellow-950/20',
  ticket.priority === 'urgent' && 'border-l-4 border-red-500',
  ticket.priority === 'high' && 'border-l-4 border-orange-500'
)}
```

### 3.3 Create Separate View Tabs

**File:** `src/pages/helpdesk/tickets/list.tsx`

**Add view filter tabs:**
- All Requests
- Incidents Only (request_type = 'ticket')
- Service Requests Only (request_type = 'service_request')
- My Tickets (assignee = current user)
- SLA Breached

### 3.4 Add Bulk Actions

**Current bulk actions in `BulkActionsButton.tsx`:**
- Change Status
- Change Priority
- Delete

**Missing:**
- Assign (bulk assign to user)
- Close (bulk close)

### 3.5 Freeze Critical Columns

**File:** `src/components/helpdesk/TicketTableView.tsx`

Make Checkbox, Ticket ID, and Status columns sticky using CSS:
```css
position: sticky;
left: 0;
z-index: 1;
background: inherit;
```

---

## Phase 4: Problems Module - ITIL Compliance

### 4.1 Update Problem Status Lifecycle

**Current in `src/components/helpdesk/ProblemTableView.tsx:29-35`:**
```typescript
const statusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'known_error', label: 'Known Error' },
];
```

**Required ITIL workflow:**
```typescript
const statusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'investigating', label: 'Investigating' },  // NEW - replaces in_progress
  { value: 'known_error', label: 'Known Error' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
];
```

**Files to update:**
- `src/components/helpdesk/ProblemTableView.tsx`
- `src/pages/helpdesk/tickets/problems.tsx`
- `src/lib/ticketUtils.ts` - Add 'investigating' status color
- Database: May need migration if status values are constrained

### 4.2 Add Validation for Problem Resolution

**File:** `src/components/helpdesk/EditProblemDialog.tsx`

A Problem cannot be resolved without:
- Root Cause (required field)
- Fix/Workaround (at least one required)

Add validation:
```typescript
if (status === 'resolved' && !rootCause) {
  toast.error("Root cause is required to resolve a problem");
  return;
}
```

### 4.3 Add Linked Tickets Count Column

**File:** `src/pages/helpdesk/tickets/problems.tsx`

**Current query:**
```typescript
.select(`*, category:helpdesk_categories(name)`)
```

**Update to include count:**
```typescript
.select(`
  *, 
  category:helpdesk_categories(name),
  linked_tickets:helpdesk_problem_tickets(count)
`)
```

### 4.4 Add RCA Status Column

**File:** `src/components/helpdesk/ProblemTableView.tsx`

Add column showing:
- "Pending" if root_cause is null
- "Documented" if root_cause exists

### 4.5 Visual Distinction for Known Errors

**File:** `src/lib/ticketUtils.ts`

Update `known_error` styling to be more distinct:
```typescript
case 'known_error': return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700 font-semibold';
```

---

## Phase 5: Ticket Settings - Structure & Safety

### 5.1 Reorder Settings Cards

**File:** `src/components/helpdesk/TicketConfiguration.tsx`

**Current order:**
1. SLA Policies
2. Queues
3. Assignment Rules
4. Categories
5. Canned Responses
6. Ticket Templates
7. Automation Rules
8. Column Settings

**Recommended order (by impact):**
1. Categories (with SLA + default priority mapping)
2. SLA Policies (response, resolution, escalation)
3. Assignment Rules (with preview/test mode)
4. Automation Rules (with execution logs)
5. Queues
6. Ticket Templates
7. Canned Responses
8. Column Settings

### 5.2 Add Change Warning for Live-Impacting Settings

**File:** `src/pages/helpdesk/sla.tsx`

Before modifying SLA policies that affect existing tickets:
```typescript
// Show warning dialog
<AlertDialog>
  <AlertDialogContent>
    <AlertDialogTitle>Warning: This will affect X active tickets</AlertDialogTitle>
    <AlertDialogDescription>
      Changing this SLA policy will recalculate due dates for all open tickets with this priority.
    </AlertDialogDescription>
  </AlertDialogContent>
</AlertDialog>
```

### 5.3 Add Audit Logging for Setting Changes

Create audit log entries when:
- SLA policies are created/updated/deleted
- Assignment rules are modified
- Automation rules are toggled

---

## Phase 6: SLA Engine Enhancements

### 6.1 Add First Response Time Tracking

**Files:**
- `src/hooks/useUnifiedRequestsStats.tsx` - Add first_response tracking
- `src/hooks/useHelpdeskStats.tsx` - Already has avgFirstResponse

**Dashboard display:** Already partially implemented in `DashboardCharts.tsx`

### 6.2 Add SLA Breach Indicator to List View

**File:** `src/components/helpdesk/TicketTableView.tsx`

**Current:** Shows triangle icon for breached tickets
**Enhancement:** Add red badge "BREACHED" that's visible without hover

### 6.3 SLA Status in Dashboard Cards

**File:** `src/pages/helpdesk/tickets/dashboard.tsx`

Add dedicated SLA card showing:
- Breached count
- At-risk count (within 2 hours)
- On-track count

---

## Phase 7: Visual & UX Polish

### 7.1 Consistent Card Padding

**Standardize all cards to use:**
```css
CardContent: padding: 1rem (p-4)
CardHeader: padding-bottom: 0.5rem (pb-2)
```

### 7.2 Table Row Heights

**Standardize to:**
```css
TableRow: height: 2.75rem (h-11)
Font-size: 0.875rem (text-sm)
```

### 7.3 Muted Icons, Bold Numbers

**Pattern:** Icon should use `text-muted-foreground`, numbers should use `text-2xl font-bold`

### 7.4 Responsive Breakpoints

**File:** `src/pages/helpdesk/tickets/dashboard.tsx`

Add intermediate breakpoints for tablet view:
```typescript
className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4"
```

### 7.5 Action Button Spacing

Ensure minimum 0.5rem gap between action buttons to prevent misclicks:
```typescript
<div className="flex justify-end gap-2">
```

---

## Implementation Summary

### Files to Create
1. `src/lib/statusConfig.ts` - Central status/priority configuration

### Files to Modify (Major Changes)
1. `src/lib/ticketUtils.ts` - Status colors, add investigating status
2. `src/hooks/useUnifiedRequests.tsx` - Add unassigned/SLA stats
3. `src/pages/helpdesk/tickets/dashboard.tsx` - Add missing cards, fix colors
4. `src/components/helpdesk/TicketTableView.tsx` - Add columns, row highlighting
5. `src/components/helpdesk/ProblemTableView.tsx` - Status lifecycle, new columns
6. `src/pages/helpdesk/tickets/list.tsx` - View tabs, filters
7. `src/components/helpdesk/TicketConfiguration.tsx` - Reorder settings

### Files to Modify (Minor Changes)
8. `src/components/helpdesk/DashboardCharts.tsx` - Fix on_hold color
9. `src/components/helpdesk/RecentTicketsList.tsx` - Use central colors
10. `src/pages/helpdesk/dashboard.tsx` - Fix icon colors
11. `src/components/helpdesk/BulkActionsButton.tsx` - Add assign/close actions
12. `src/pages/helpdesk/sla.tsx` - Add change warnings

### Database Changes
1. Update `generate_unified_request_number` function for INC/SR prefixes
2. Consider adding 'investigating' to problem status enum if constrained

---

## Testing Checklist

After implementation, validate:
- [ ] All dashboard numbers match list data when filtered
- [ ] Every card, pill, count, and badge is clickable
- [ ] Zero "Unknown" values appear anywhere
- [ ] SLA breaches are visible without opening tickets
- [ ] Status colors are consistent across all views
- [ ] Date formats are consistent
- [ ] Ticket IDs follow INC/SR/PRB convention
- [ ] Problem resolution requires root cause
- [ ] Settings changes show appropriate warnings

---

## Estimated Effort

| Phase | Description | Effort |
|-------|-------------|--------|
| 1 | Global Status & Colors | 3 hours |
| 2 | Dashboard Action Summary | 4 hours |
| 3 | All Tickets List | 6 hours |
| 4 | Problems Module | 5 hours |
| 5 | Ticket Settings | 2 hours |
| 6 | SLA Engine | 3 hours |
| 7 | Visual & UX Polish | 3 hours |
| **Total** | | **~26 hours** |

