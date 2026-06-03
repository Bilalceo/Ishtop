# IshTop Company Panel Execution Backlog

Date: 2026-05-25
Scope: Company/HR panel improvements from audit findings
Format: Epic -> Story -> Task -> Acceptance Criteria

## Epic 1: Trust and Data Correctness (P0)
Goal: Remove critical inconsistencies and restore employer trust.

### Story 1.1: Salary Currency Consistency
Priority: P0 | Impact: High | Effort: S

Tasks:
- Align create and edit job forms to use the same currency source.
- Add explicit currency selector (`UZS`, `USD`) with one canonical backend field.
- Migrate old rows with missing/ambiguous currency to safe default (`UZS`) and audit log migrated rows.
- Update job cards and job detail to render currency consistently.

Acceptance Criteria:
- Creating and editing the same job never changes currency unexpectedly.
- API returns stable `salary_currency` across create/read/update.
- Integration test covers create -> edit -> read flow with both `UZS` and `USD`.

### Story 1.2: Remove Test Artifacts from Employer UX
Priority: P0 | Impact: High | Effort: S

Tasks:
- Remove seeded/debug text from production-facing panels.
- Add lint/test guard that blocks known debug phrases in UI bundles.

Acceptance Criteria:
- No seeded/test debug text appears in Company dashboard pages.
- CI fails if blocked phrases are present in production UI strings.

### Story 1.3: OAuth and Session Reliability for Local/Prod
Priority: P0 | Impact: High | Effort: S

Tasks:
- Standardize OAuth redirect URIs by environment.
- Add startup check that logs active `GOOGLE_REDIRECT_URI`, `FRONTEND_URL`, cookie mode.
- Add runbook section for `redirect_uri_mismatch` and profile-load failure.

Acceptance Criteria:
- OAuth callback lands on `/oauth/callback` and `auth/me` succeeds in configured environment.
- Session cookies work in local (`Secure=false`) and enforced secure in production.

## Epic 2: Company Activation and Onboarding (P0)
Goal: Increase registration-to-first-job conversion.

### Story 2.1: Guided Onboarding Checklist
Priority: P0 | Impact: High | Effort: M

Tasks:
- Add first-run checklist widget:
  - Complete profile
  - Create first job
  - Publish first job
  - Respond to first candidate
- Persist completion state per company user.
- Add progress meter and completion celebration state.

Acceptance Criteria:
- New company users always see checklist until all steps complete.
- Completion state survives refresh/login.
- Event tracking exists for each checklist step completion.

### Story 2.2: Empty-State CTA System
Priority: P0 | Impact: Medium | Effort: S

Tasks:
- Add contextual CTA in candidate-empty states.
- Add direct deep links to "Create job" and "Share job" actions.
- Add microcopy variants for UZ/RU.

Acceptance Criteria:
- Every empty state in Company panel has at least one primary action.
- CTA click events are tracked.

## Epic 3: Job Authoring Quality (P0/P1)
Goal: Improve job-post quality and apply conversion.

### Story 3.1: Rich Text Job Description Editor
Priority: P0 | Impact: High | Effort: M

Tasks:
- Replace plain textarea with rich-text editor (TipTap or Quill).
- Support headings, bullets, bold, links, and clean paste.
- Sanitize HTML server-side and render safely in candidate view.

Acceptance Criteria:
- HR can format JD with headings and bullet lists.
- Stored content is sanitized and XSS-safe.
- Candidate-side rendering matches formatted content.

### Story 3.2: Job Template and Clone
Priority: P2 | Impact: Medium | Effort: S

Tasks:
- Add "Duplicate job" action.
- Add optional reusable JD templates for common roles.

Acceptance Criteria:
- HR can clone a previous job in one click.
- Duplicated job opens in draft with editable fields.

## Epic 4: Candidate Pipeline Efficiency (P1)
Goal: Reduce HR operational time per vacancy.

### Story 4.1: Kanban Pipeline View
Priority: P1 | Impact: High | Effort: M

Tasks:
- Add kanban board with statuses (`new`, `screening`, `interview`, `offer`, `hired`, `rejected`).
- Enable drag-and-drop status updates.
- Keep list view as fallback.

Acceptance Criteria:
- Dragging candidate card updates backend status in real time.
- Status counts update instantly per column.
- Permissions enforce company ownership.

### Story 4.2: Bulk Candidate Actions
Priority: P1 | Impact: High | Effort: M

Tasks:
- Add multi-select in candidate list/board.
- Bulk status change.
- Bulk send templated message/email.

Acceptance Criteria:
- HR can update 10+ candidates in one action.
- Bulk action results show per-candidate success/failure summary.

### Story 4.3: Candidate Tagging and Internal Notes
Priority: P2 | Impact: Medium | Effort: S

Tasks:
- Add tags and private notes per candidate.
- Add filter by tag.

Acceptance Criteria:
- Notes are only visible to company users.
- Tag filtering works with existing filters.

## Epic 5: Employer Insights and Analytics (P0/P1)
Goal: Make hiring decisions data-driven and improve retention.

### Story 5.1: Vacancy-Level Analytics
Priority: P1 | Impact: Medium | Effort: M

Tasks:
- Show per-job metrics: impressions, views, applies, interview rate.
- Add simple time-range filter (`7d`, `30d`, `90d`).

Acceptance Criteria:
- Each job detail has analytics card with baseline funnel metrics.
- Numbers match backend event aggregation.

### Story 5.2: Company Analytics Dashboard
Priority: P0 | Impact: High | Effort: L

Tasks:
- Build dashboard with funnel:
  - Jobs published
  - Candidate views
  - Applications
  - Interviews
  - Hires
- Add response-time and SLA widget.
- Add trend chart and top-performing vacancies.

Acceptance Criteria:
- Dashboard loads under target p95 budget.
- Data is available by date range and vacancy filter.
- KPI definitions documented and versioned.

## Epic 6: Communication and Notifications (P1)
Goal: Improve response speed and keep workflows in-platform.

### Story 6.1: Telegram Notifications
Priority: P1 | Impact: High | Effort: S

Tasks:
- Add Telegram bot/channel integration for employer alerts.
- Notify on new matched candidate/application and interview updates.
- Add notification preference toggles per company.

Acceptance Criteria:
- Company can opt in/out from settings.
- Notification delivery events are logged.

### Story 6.2: In-Platform Messaging (Candidate <-> Company)
Priority: P1 | Impact: High | Effort: L

Tasks:
- Add thread-based messaging UI.
- Add message templates + AI assist.
- Add unread counters and message timestamps.

Acceptance Criteria:
- HR can message candidate without leaving platform.
- Candidate receives and can reply in-app.
- Message history persists and is searchable.

## Epic 7: Company Profile Conversion Uplift (P1)
Goal: Increase candidate trust and apply rates.

### Story 7.1: Rich Company Profile
Priority: P1 | Impact: High | Effort: M

Tasks:
- Add company media (logo, cover, gallery).
- Add culture, benefits, and social links sections.
- Add profile quality score and recommendations.

Acceptance Criteria:
- Company profile completion score visible in settings and public page.
- Candidate-facing company page shows new trust content blocks.

## Epic 8: Reliability, Localization, and UX Polish (P0/P1)
Goal: Ensure stable behavior and consistent UZ/RU quality.

### Story 8.1: AI Action Feedback States
Priority: P1 | Impact: Medium | Effort: S

Tasks:
- Add explicit loading/progress/success/error states for AI generation actions.
- Prevent double-submit while request is active.

Acceptance Criteria:
- AI actions never appear stuck without user feedback.
- Duplicate clicks do not create duplicate operations.

### Story 8.2: Language Consistency QA
Priority: P1 | Impact: Medium | Effort: S

Tasks:
- Remove mixed-language fragments in company flows.
- Add snapshot checks for key UZ/RU pages.

Acceptance Criteria:
- No English fallback text appears in audited UZ/RU company routes.
- Translation coverage for new UI strings is 100%.

## Cross-Epic Instrumentation Requirements

Mandatory events:
- `company_onboarding_step_completed`
- `company_profile_completed`
- `job_create_started`
- `job_create_published`
- `candidate_status_changed`
- `candidate_bulk_action_executed`
- `company_message_sent`
- `company_dashboard_viewed`

Mandatory funnels:
- Signup -> First Profile Complete -> First Job Publish
- Job Publish -> First Candidate -> First Interview -> Hire

## 30/60/90 Delivery Mapping

### 0-30 Days
- Epic 1 (all)
- Epic 2 (all)
- Epic 8 Story 8.2
- Epic 6 Story 6.1

### 31-60 Days
- Epic 3 Story 3.1
- Epic 4 Story 4.1 + 4.2
- Epic 5 Story 5.1
- Epic 8 Story 8.1

### 61-90 Days
- Epic 5 Story 5.2
- Epic 6 Story 6.2
- Epic 7 Story 7.1
- Epic 3 Story 3.2
- Epic 4 Story 4.3

## Definition of Done (Global)

- Feature behind flag if high-risk.
- UZ/RU copy finalized.
- Unit + integration tests added.
- E2E path updated for company core flow.
- KPI dashboard reflects new event data.
- No regression in apply flow and auth flow.
