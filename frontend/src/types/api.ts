/**
 * =============================================================================
 * API TYPES
 * =============================================================================
 *
 * TypeScript interfaces for API request/response bodies
 */

// =============================================================================
// USER TYPES
// =============================================================================

export type UserRole = "student" | "company" | "admin";
export type AdminAccessRole =
  | "super_admin"
  | "operations_admin"
  | "finance_admin"
  | "security_admin"
  | "support_agent";

export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  admin_role?: AdminAccessRole | null;
  is_active: boolean;
  is_verified: boolean;
  avatar_url?: string;
  company_name?: string;
  company_description?: string;
  company_size?: string;
  company_industry?: string;
  company_logo_url?: string;
  company_website?: string;
  company_cover_photo_url?: string;
  company_gallery_images?: string[];
  company_culture?: string;
  company_linkedin_url?: string;
  company_telegram_url?: string;
  company_instagram_url?: string;
  company_facebook_url?: string;
  company_founded_year?: number;
  company_video_url?: string;
  verification_state?: "unverified" | "pending" | "approved" | "rejected" | string;
  bio?: string;
  location?: string;
  subscription_tier?: string;
  created_at: string;
  updated_at?: string;
  last_login?: string;
}

export interface UserProfile extends User {
  resumes_count?: number;
  applications_count?: number;
  jobs_posted?: number;
}

// =============================================================================
// AUTH TYPES
// =============================================================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  role?: UserRole;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthResponse {
  success: boolean;
  data: {
    user: User;
    tokens: TokenResponse;
  };
  message?: string;
}

// =============================================================================
// RESUME TYPES
// =============================================================================

export type ResumeStatus = "draft" | "published" | "archived";

export interface ResumeContent {
  personal_info?: {
    name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin_url?: string;
    portfolio_url?: string;
    professional_title?: string;
  };
  summary?: string;
  experience?: Array<{
    company: string;
    position: string;
    start_date: string;
    end_date?: string;
    is_current?: boolean;
    description: string;
    achievements?: string[];
  }>;
  education?: Array<{
    institution: string;
    degree: string;
    field?: string;
    year: string;
    gpa?: string;
  }>;
  skills?: {
    technical?: string[];
    soft?: string[];
  };
  /**
   * Skill verification status map (MVP, optional).
   * { [skillName]: "verified" | "learning" | "unverified" }
   * Backwards-compatible: absent on older resumes.
   */
  skillVerifications?: Record<string, "verified" | "learning" | "unverified">;
  languages?: Array<{
    name: string;
    proficiency: string;
  }>;
  certifications?: Array<{
    name: string;
    issuer: string;
    year: string;
  }>;
  projects?: Array<{
    name: string;
    description: string;
    url?: string;
    technologies?: string[];
  }>;
}

export interface Resume {
  id: string;
  user_id: string;
  title: string;
  content: ResumeContent;
  ai_generated: boolean;
  pdf_url?: string;
  status: ResumeStatus;
  view_count: number;
  ats_score?: number;
  created_at: string;
  updated_at: string;
}

export interface ResumeCreateRequest {
  title: string;
  content: ResumeContent;
}

export interface ResumeGenerateRequest {
  user_data: {
    name: string;
    email: string;
    phone?: string;
    location?: string;
    professional_title?: string;
    skills: string[];
    experience: Array<{
      company: string;
      position: string;
      duration: string;
      description: string;
    }>;
    education: Array<{
      institution: string;
      degree: string;
      field?: string;
      year: string;
    }>;
  };
  template?: "modern" | "classic" | "minimal" | "creative";
  tone?: "professional" | "confident" | "friendly" | "technical";
}

// =============================================================================
// JOB TYPES
// =============================================================================

export type JobType = "full_time" | "part_time" | "remote" | "hybrid" | "contract";
export type ExperienceLevel = "junior" | "mid" | "senior" | "lead" | "executive";
export type JobStatus = "draft" | "active" | "paused" | "closed" | "filled";

export interface JobRequirements {
  skills?: string[];
  experience?: string;
  education?: string;
  certifications?: string[];
}

export interface Job {
  id: string;
  company_id: string;
  title: string;
  description: string;
  requirements: JobRequirements;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  location: string;
  city_slug?: string;
  job_type: JobType;
  experience_level: ExperienceLevel;
  profession_slug?: string;
  company_slug?: string;
  status: JobStatus;
  close_reason_code?: "hired" | "other" | string;
  close_reason_note?: string;
  applications_count: number;
  views_count: number;
  trust_score?: number;
  trust_badges?: string[];
  trust_factors?: Array<{
    code: string;
    label: string;
    score: number;
    weight: number;
    state: "strong" | "medium" | "weak";
  }>;
  verification_state?: "unverified" | "pending" | "approved" | "rejected" | string;
  /** When set, this is an external (aggregated) listing — apply happens on the source. */
  external_apply_url?: string | null;
  created_at: string;
  updated_at: string;
  expires_at?: string;
  company?: {
    name: string;
    logo_url?: string;
    logo?: string;
    location?: string;
    website?: string;
    cover_photo_url?: string;
    gallery_images?: string[];
    culture?: string;
    linkedin_url?: string;
    telegram_url?: string;
    instagram_url?: string;
    facebook_url?: string;
    founded_year?: number;
    video_url?: string;
    verification_state?: string;
    is_verified?: boolean;
  };
  matchScore?: number;
  explainability?: {
    confidence: "low" | "medium" | "high" | string;
    fit_reasons: string[];
    missing_items: string[];
    improvement_plan: {
      d7: string[];
      d14: string[];
      d30: string[];
    };
  };
}

export interface JobCreateRequest {
  title: string;
  description: string;
  requirements: JobRequirements;
  salary_min?: number;
  salary_max?: number;
  location: string;
  job_type: JobType;
  experience_level: ExperienceLevel;
  expires_at?: string;
}

export interface JobSearchParams {
  search?: string;
  location?: string;
  job_type?: JobType[];
  experience_level?: ExperienceLevel[];
  salary_min?: number;
  salary_max?: number;
  sort_by?: "created_at" | "salary" | "relevance";
  page?: number;
  limit?: number;
}

// =============================================================================
// APPLICATION TYPES
// =============================================================================

export type KnownApplicationStatus =
  | "pending"
  | "reviewing"
  | "shortlisted"
  | "interview"
  | "accepted"
  | "hired"
  | "rejected"
  | "withdrawn";

export type ApplicationStatus = string;

export interface ApplicationStatusUpdateRequest {
  status: KnownApplicationStatus;
  notes?: string;
  tags?: string[];
  message_history?: Array<{
    id: string;
    sent_at: string;
    sender_id?: string;
    sender_name?: string;
    channel?: string;
    subject: string;
    body: string;
    template_key?: string;
    delivered?: boolean;
  }>;
  interview_at?: string;
  interview_type?: "video" | "phone" | "in-person";
  meeting_link?: string;
}

export interface Application {
  id: string;
  job_id: string;
  user_id: string;
  resume_id: string;
  cover_letter?: string;
  status: ApplicationStatus;
  applied_at: string;
  reviewed_at?: string;
  interview_at?: string;
  interview_type?: "video" | "phone" | "in-person";
  meeting_link?: string;
  decided_at?: string;
  notes?: string;
  updated_at: string;
  match_score?: string | null;
  match_breakdown?: {
    score: number;
    matched_skills: string[];
    missing_skills: string[];
    reasons: string[];
  } | null;
  tags?: string[];
  message_history?: Array<{
    id: string;
    sent_at: string;
    sender_id?: string;
    sender_name?: string;
    channel?: string;
    subject: string;
    body: string;
    template_key?: string;
    delivered?: boolean;
  }>;
  job?: Job;
  resume?: Resume;
  applicant?: User;
}

export interface ApplicationCreateRequest {
  job_id: string;
  resume_id: string;
  cover_letter?: string;
}

export interface AutoApplyRequest {
  criteria: {
    job_types?: JobType[];
    locations?: string[];
    experience_levels?: ExperienceLevel[];
    salary_min?: number;
    min_salary?: number;
    keywords?: string[];
    exclude_companies?: string[];
    max_applications?: number;
    include_cover_letter?: boolean;
  };
  resume_id: string;
  dry_run?: boolean;
}

export interface AutoApplyResult {
  job_id: string;
  job_title: string;
  company_name: string;
  match_score: number;
  applied: boolean;
  message: string;
  application_id?: string;
}

export type QuotaLimit = number | "unlimited";

export interface QuotaMetadata {
  feature?: string;
  tier?: string;
  used?: number;
  monthly_used?: number;
  current?: number;
  limit?: QuotaLimit;
  monthly_limit?: QuotaLimit;
  remaining?: number | "unlimited";
  monthly_remaining?: number | "unlimited";
  is_unlimited?: boolean;
  unlimited?: boolean;
  percent_used?: number;
  reset_at?: string;
}

export interface AutoApplyResponse {
  total_jobs_matched: number;
  applications_submitted: number;
  applications_skipped: number;
  results: AutoApplyResult[];
  resume_used: string;
  dry_run: boolean;
  quota?: QuotaMetadata;
  quota_used?: number;
  monthly_used?: number;
  quota_current?: number;
  quota_limit?: QuotaLimit;
  monthly_limit?: QuotaLimit;
  quota_remaining?: number | "unlimited";
  monthly_remaining?: number | "unlimited";
  quota_unlimited?: boolean;
  quota_tier?: string;
  quota_feature?: string;
}

export interface PremiumErrorDetail {
  error?: string;
  message?: string;
  current_tier?: string | null;
  upgrade_url?: string;
  contact_url?: string;
}

// =============================================================================
// PAYMENT TYPES
// =============================================================================

export type BillingCycle = "monthly" | "yearly";

export interface CreatePaymentIntentRequest {
  subscription_tier: "premium" | "enterprise";
  subscription_months: number;
  idempotency_key?: string;
}

export interface PaymentIntentResponse {
  success: boolean;
  payment_id: string;
  client_secret: string;
  amount: number;
  currency: string;
  subscription_tier: string;
  subscription_months: number;
}

export interface PricingResponse {
  success: boolean;
  pricing: Record<string, { monthly: number; yearly: number }>;
}

export interface PaymentHistoryItem {
  id: string;
  created_at?: string | null;
  provider: string;
  status: string;
  amount: number;
  currency: string;
  subscription_tier: string;
  subscription_months: number;
  provider_payment_id?: string | null;
}

export interface PaymentHistoryResponse {
  success: boolean;
  payments: PaymentHistoryItem[];
  total: number;
}

// =============================================================================
// ADMIN TYPES
// =============================================================================

export interface AdminErrorLog {
  id: string;
  timestamp: string;
  category: string;
  severity: string;
  error_type: string;
  error_message: string;
  error_code?: string | null;
  stack_trace?: string | null;
  request_id?: string | null;
  endpoint?: string | null;
  method?: string | null;
  path?: string | null;
  query_params?: Record<string, unknown> | null;
  user_id?: string | null;
  user_email?: string | null;
  user_role?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  extra_data?: Record<string, unknown> | null;
  resolved: boolean;
  resolved_at?: string | null;
  resolved_by?: string | null;
  resolution_notes?: string | null;
}

export interface AdminDashboardOverview {
  total_users: number;
  new_users_today: number;
  total_resumes: number;
  total_jobs: number;
  total_applications: number;
}

export interface AdminDashboardErrorSummary {
  total_24h: number;
  by_severity: Record<string, number>;
  by_category: Record<string, number>;
  recent: AdminErrorLog[];
}

export interface AdminDashboardData {
  overview: AdminDashboardOverview;
  errors: AdminDashboardErrorSummary;
  timestamp: string;
  applications_by_status?: Record<string, number>;
}

export interface AdminDashboardResponse {
  success: boolean;
  dashboard: AdminDashboardData;
}

export interface AdminUserStats {
  users: {
    total: number;
    by_role: Record<string, number>;
    active_last_7_days: number;
    new_last_7_days: number;
    verified: number;
    unverified: number;
  };
  content: {
    total_resumes: number;
    total_jobs: number;
    total_applications: number;
  };
  timestamp: string;
}

export interface AdminUserStatsResponse {
  success: boolean;
  stats: AdminUserStats;
}

export interface AdminManagedUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  is_verified: boolean;
  created_at: string;
  last_login?: string | null;
}

export interface AdminManagedUsersResponse {
  success: boolean;
  total: number;
  users: AdminManagedUser[];
}

export interface AdminUpdateUserStatusRequest {
  is_active: boolean;
}

export interface AdminSystemHealthComponent {
  status: string;
  [key: string]: unknown;
}

export interface AdminSystemHealthResponse {
  success: boolean;
  status: string;
  components: Record<string, AdminSystemHealthComponent>;
  timestamp: string;
}

export interface AdminErrorStats {
  total_errors: number;
  errors_by_category: Record<string, number>;
  errors_by_severity: Record<string, number>;
  errors_by_hour: Record<string, number>;
  top_error_types: Array<{ type: string; count: number }>;
  top_endpoints: Array<{ endpoint: string; count: number }>;
  from_time?: string | null;
  to_time?: string | null;
}

export interface AdminErrorStatsResponse {
  success: boolean;
  stats: AdminErrorStats;
}

export interface AdminErrorListResponse {
  success: boolean;
  total: number;
  errors: AdminErrorLog[];
}

export interface AdminResolveErrorRequest {
  resolution_notes?: string;
}

export interface AdminResolveErrorResponse {
  success: boolean;
  error: AdminErrorLog;
}

export interface AdminBulkResolveResponse {
  success: boolean;
  message: string;
  resolved_count: number;
  requested_count: number;
}

export interface AdminRoleMatrixPermission {
  key: string;
  label: string;
  description?: string;
}

export interface AdminRoleMatrixSection {
  key: string;
  label: string;
  permissions: AdminRoleMatrixPermission[];
}

export interface AdminRoleMatrixItem {
  role: AdminAccessRole;
  label: string;
  sections: AdminRoleMatrixSection[];
}

export interface AdminRoleMatrixResponse {
  success: boolean;
  matrix?: AdminRoleMatrixItem[];
  roles?: Record<string, string[]>;
  data?: {
    matrix?: AdminRoleMatrixItem[];
    roles?: Record<string, string[]>;
  };
}

export interface AdminAccessUser {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  admin_role?: AdminAccessRole | null;
  is_active: boolean;
  is_verified: boolean;
  created_at?: string;
  last_login?: string | null;
}

export interface AdminAccessUsersResponse {
  success: boolean;
  total?: number;
  users: Array<
    Partial<AdminAccessUser> & {
      user_id?: string;
      is_active_account?: boolean;
      effective_permissions?: string[];
      last_login_at?: string | null;
    }
  >;
  data?: {
    total?: number;
    users: Array<
      Partial<AdminAccessUser> & {
        user_id?: string;
        is_active_account?: boolean;
        effective_permissions?: string[];
        last_login_at?: string | null;
      }
    >;
  };
}

export interface AdminUpdateAdminRoleRequest {
  admin_role: AdminAccessRole;
}

export interface AdminUpdateAdminRoleResponse {
  success: boolean;
  message?: string;
  user?: AdminAccessUser;
  data?: {
    user_id: string;
    admin_role: AdminAccessRole;
  };
}

export interface LandingContentData {
  id?: string;
  locale: "uz" | "ru";
  payload: Record<string, unknown>;
  is_published: boolean;
  updated_at?: string;
}

export interface LandingContentResponse {
  success: boolean;
  data: LandingContentData;
}

// =============================================================================
// API RESPONSE TYPES
// =============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: {
    timestamp: string;
    request_id: string;
  };
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: {
    items: T[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
  message?: string;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, string[]>;
  };
}
