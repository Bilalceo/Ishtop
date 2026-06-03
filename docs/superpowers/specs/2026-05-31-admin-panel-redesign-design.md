# Admin Panel Redesign & Feature Expansion

**Date:** 2026-05-31  
**Project:** IshTop  
**Audience:** Small ops team (2–5 admins)  
**Approach:** Feature-first, then UI polish — implemented in priority order

---

## Overview

The IshTop admin panel currently has 6 pages (dashboard, users, jobs, companies, applications, access) with functional but sparse UI and no collaboration features. This spec covers a phased upgrade: sidebar navigation, analytics charts, bulk actions, audit log, notifications, and a command palette.

---

## Section 1: Sidebar Nav Redesign

### Goal
Replace the generic `DashboardLayout` with a dedicated admin sidebar so all admin pages feel unified and navigable.

### Components
- **`AdminSidebarLayout`** — new layout component used by `admin/layout.tsx`
- **`AdminSidebar`** — persistent left sidebar with:
  - Brand area: "IshTop Admin" label + live green pulse dot
  - Nav groups with icons linking to all 6 admin pages + new Audit Log page
  - Notification badge counts on relevant nav items (Companies: pending verifications, Errors: unresolved count)
  - Bottom section: current admin avatar, role badge, logout button
  - Active item: brand-colored left border accent + subtle background highlight
  - Mobile: collapsible via hamburger toggle, slides in as overlay

### Files Changed
- `frontend/src/app/(dashboard)/admin/layout.tsx` — swap `DashboardLayout` for `AdminSidebarLayout`
- `frontend/src/components/layouts/AdminSidebarLayout.tsx` — new file
- `frontend/src/components/admin/AdminSidebar.tsx` — new file

---

## Section 2: Analytics Charts

### Goal
Replace raw KPI numbers with trend context so admins can see direction, not just snapshots.

### Charts (all use `recharts`)
| Chart | Type | Location | Data |
|---|---|---|---|
| User growth | Line | Dashboard Trends section | New registrations per day, 30 days |
| Applications funnel | Bar | Dashboard Trends section | Count per status stage |
| Jobs activity | Stacked area | Dashboard Trends section | Active vs closed over time |
| Error rate sparkline | Inline sparkline | Existing error monitoring card | 7-day error count |

### Layout
New "Trends" section below existing KPI cards, 2-column grid on desktop.

### Backend
New endpoint: `GET /admin/stats/timeseries?metric=users|jobs|applications&days=30`  
Returns: `{ date: string, value: number }[]`

### Files Changed
- `frontend/src/app/(dashboard)/admin/page.tsx` — add Trends section
- `frontend/src/components/admin/charts/` — new directory with chart components
- `backend/app/api/v1/routes/admin.py` — add timeseries endpoint

---

## Section 3: Bulk Actions

### Goal
Allow admins to act on multiple records at once instead of one at a time.

### Behavior
- Checkbox column added to Users, Jobs, Companies list pages
- "Select all" checkbox in table header
- **Floating action bar** appears at bottom when ≥1 row selected: shows count + available actions
- Available actions per entity:
  - **Users**: Activate, Deactivate, Export CSV
  - **Jobs**: Approve, Pause, Close, Delete
  - **Companies**: Verify, Deactivate, Export CSV
- Confirmation dialog for destructive actions showing affected count
- Toast on completion: `"5 companies verified"` 
- `Escape` clears selection

### Backend
Three new endpoints:
- `POST /admin/users/bulk-action` — `{ ids: string[], action: "activate"|"deactivate"|"export" }`
- `POST /admin/jobs/bulk-action` — `{ ids: string[], action: "approve"|"pause"|"close"|"delete" }`
- `POST /admin/companies/bulk-action` — `{ ids: string[], action: "verify"|"deactivate"|"export" }`

All bulk actions require `super_admin` or `operations_admin` role.

### Files Changed
- `frontend/src/app/(dashboard)/admin/users/page.tsx`
- `frontend/src/app/(dashboard)/admin/jobs/page.tsx`
- `frontend/src/app/(dashboard)/admin/companies/page.tsx`
- `frontend/src/components/admin/BulkActionBar.tsx` — new shared component
- `backend/app/api/v1/routes/admin.py` — add 3 bulk endpoints

---

## Section 4: Activity / Audit Log

### Goal
Append-only record of all admin actions for accountability and debugging in a multi-admin team.

### New Page
`/admin/audit` — added to sidebar nav

### UI
- Chronological timeline feed, newest first
- Each entry: timestamp, admin avatar + name, action badge (color-coded by type), target entity label, optional notes
- Filters: by admin, by action type, by date range
- Free-text search across action descriptions
- CSV export button

### Action Types Tracked
`user_activate`, `user_deactivate`, `company_verify`, `company_unverify`, `job_approve`, `job_pause`, `job_close`, `job_delete`, `error_resolve`, `admin_role_change`, `bulk_action`

### Backend
New `AuditLog` model:
```
id: UUID
admin_id: UUID (FK → users)
action: str
target_type: str  # "user" | "job" | "company" | "error"
target_id: UUID
target_label: str  # human-readable, e.g. "john@example.com"
notes: str | None
created_at: datetime
```
- Audit entries written inside each existing admin endpoint after successful action
- `GET /admin/audit-logs?admin_id=&action=&from=&to=&page=` — paginated, filtered
- Audit logs are append-only, never deleted or updated

### Files Changed
- `backend/app/models/` — new `AuditLog` model + Alembic migration
- `backend/app/api/v1/routes/admin.py` — audit write calls + GET endpoint
- `frontend/src/app/(dashboard)/admin/audit/page.tsx` — new page
- `frontend/src/components/admin/AuditTimeline.tsx` — new component

---

## Section 5: In-App Notifications

### Goal
Proactively alert admins to conditions needing attention without requiring manual dashboard refreshes.

### UI
- Bell icon in sidebar header with unread count badge
- Dropdown panel on click: list of notifications, newest first
- Each notification: icon, message, relative timestamp, unread dot
- "Mark all read" button
- Click navigates to relevant page/record

### Notification Types
| Type | Trigger | Severity |
|---|---|---|
| Critical error spike | >10 errors in 1 hour | 🔴 Red |
| New company pending verification | Company registers | 🟡 Yellow |
| Job flagged for review | Spam keyword match | 🟠 Orange |
| New admin account created | Admin role assigned | 🔵 Blue |
| Bulk action completed | Long-running bulk op | ✅ Green |

### Polling
Frontend polls `GET /admin/notifications?unread=true` every 60 seconds.

### Backend
New `AdminNotification` model:
```
id: UUID
admin_id: UUID (FK → users)  # null = broadcast to all admins
type: str
message: str
link: str  # relative URL to navigate to
is_read: bool
created_at: datetime
```
Endpoints:
- `GET /admin/notifications` — list with `?unread=true` filter
- `POST /admin/notifications/{id}/read`
- `POST /admin/notifications/read-all`

Notifications generated by backend triggers (error rate monitor, company registration hook).

### Files Changed
- `backend/app/models/` — new `AdminNotification` model + migration
- `backend/app/api/v1/routes/admin.py` — 3 notification endpoints + trigger hooks
- `frontend/src/components/admin/NotificationBell.tsx` — new component
- `frontend/src/components/layouts/AdminSidebarLayout.tsx` — integrate bell

---

## Section 6: Command Palette (Quick Actions)

### Goal
Reduce navigation friction for common ops tasks with a keyboard-driven command palette.

### UI
- Triggered by `Cmd+K` (Mac) / `Ctrl+K` (Windows/Linux) from any admin page
- Search box at top
- Default state: 5 most recent actions by this admin
- Search results grouped: Users / Companies / Jobs / Pages
- Quick actions: "Verify company: X", "Resolve error #Y", "Go to audit log"
- Keyboard navigation: arrows + Enter to execute, Escape to close

### Implementation
- `cmdk` library (already in shadcn/ui ecosystem)
- Wrapped around the `AdminSidebarLayout` so it's globally available
- Searches against in-memory cached lists for users/companies/jobs (refreshed on mount)

### Files Changed
- `frontend/src/components/admin/CommandPalette.tsx` — new component
- `frontend/src/components/layouts/AdminSidebarLayout.tsx` — register `Cmd+K` listener + render palette

---

## Implementation Order

1. Sidebar nav redesign (foundation everything else depends on)
2. Analytics charts (dashboard improvement, backend endpoint)
3. Bulk actions (users, jobs, companies pages + backend)
4. Audit log (new model, migration, new page)
5. Notifications (new model, migration, polling, bell component)
6. Command palette (frontend only, no backend needed)

---

## Tech Stack Notes
- Charts: `recharts` (add to frontend deps)
- Command palette: `cmdk` (add to frontend deps)
- All new backend endpoints follow existing admin router patterns with `require_admin_permission` dependency
- All new DB models follow existing SQLAlchemy patterns with Alembic migrations
- Translations: all new UI copy added to both `uz` and `ru` locale objects
