/**
 * =============================================================================
 * API CLIENT - Axios Instance with Interceptors
 * =============================================================================
 *
 * Features:
 * - Auto-attach JWT token
 * - Handle 401 (refresh token)
 * - Error handling
 * - Request/response logging
 */

import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { useAuthStore } from "@/store/authStore";
import { getApiBaseUrl } from "@/lib/runtime-config";
import type {
  AdminAccessUsersResponse,
  AdminRoleMatrixResponse,
  AutoApplyRequest,
  AdminUpdateAdminRoleRequest,
  AdminUpdateAdminRoleResponse,
  ApplicationStatusUpdateRequest,
  AdminBulkResolveResponse,
  AdminDashboardResponse,
  AdminErrorListResponse,
  AdminErrorStatsResponse,
  AdminManagedUsersResponse,
  AdminUpdateUserStatusRequest,
  AdminResolveErrorRequest,
  AdminResolveErrorResponse,
  AdminSystemHealthResponse,
  AdminUserStatsResponse,
  LandingContentResponse,
  CreatePaymentIntentRequest,
  PaymentHistoryResponse,
  PaymentIntentResponse,
  PricingResponse,
  PremiumErrorDetail,
} from "@/types/api";

// =============================================================================
// CONFIGURATION
// =============================================================================

const API_BASE_URL = getApiBaseUrl();
const REQUEST_TIMEOUT = 30000; // 30 seconds

// =============================================================================
// CREATE AXIOS INSTANCE
// =============================================================================

export const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: REQUEST_TIMEOUT,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// =============================================================================
// REQUEST INTERCEPTOR
// =============================================================================

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Stage 2 cookie-only browser auth: do NOT inject Authorization headers.
    // withCredentials: true (set on the axios instance above) sends the
    // httpOnly access_token cookie automatically. The backend prefers cookie
    // auth and falls back to Bearer only for mobile/API clients.
    if (process.env.NODE_ENV === "development") {
      console.log(`🚀 [API] ${config.method?.toUpperCase()} ${config.url}`, {
        params: config.params,
        data: config.data,
      });
    }

    return config;
  },
  (error) => {
    console.error("❌ [API] Request error:", error);
    return Promise.reject(error);
  }
);

// =============================================================================
// RESPONSE INTERCEPTOR
// =============================================================================

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: boolean) => void;
  reject: (error: unknown) => void;
}> = [];

const processQueue = (error: unknown, ok = false) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(ok);
    }
  });
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    // Log response in development
    if (process.env.NODE_ENV === "development") {
      console.log(`✅ [API] Response:`, {
        status: response.status,
        url: response.config.url,
        data: response.data,
      });
    }
    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    // Log error in development
    if (process.env.NODE_ENV === "development") {
      console.error(`❌ [API] Error:`, {
        status: error.response?.status,
        url: originalRequest?.url,
        message: error.message,
        data: error.response?.data,
      });
    }

    // Handle 401 Unauthorized — cookie-only flow: call /auth/refresh, then
    // retry the original request. The new access cookie travels with retries
    // automatically via withCredentials.
    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise<boolean>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((ok) => (ok ? api(originalRequest) : Promise.reject(error)))
          .catch((err) => Promise.reject(err));
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const ok = await useAuthStore.getState().refreshAccessToken();

        if (ok) {
          processQueue(null, true);
          return api(originalRequest);
        }

        // Refresh failed — logout + redirect to login
        processQueue(error, false);
        useAuthStore.getState().logout();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
        return Promise.reject(error);
      } catch (refreshError) {
        processQueue(refreshError, false);
        useAuthStore.getState().logout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Handle other errors
    return Promise.reject(error);
  }
);

// =============================================================================
// API METHODS
// =============================================================================

// Auth endpoints
export const authApi = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  
  register: (data: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    role?: string;
  }) => api.post("/auth/register", data),
  
  logout: () => api.post("/auth/logout"),
  
  refreshToken: () => api.post("/auth/refresh"),
  
  forgotPassword: (email: string) =>
    api.post("/auth/forgot-password", { email }),
  
  resetPassword: (token: string, password: string) =>
    api.post("/auth/reset-password", { token, new_password: password }),
  
  me: () => api.get("/auth/me"),
};

// Resume endpoints
export const resumeApi = {
  list: (params?: { page?: number; limit?: number; status?: string }) =>
    api.get("/resumes", { params }),
  
  get: (id: string) => api.get(`/resumes/${id}`),
  
  create: (data: { title: string; content: object }) =>
    api.post("/resumes/create", data),
  
  generateAI: (data: {
    user_data: object;
    template?: string;
    tone?: string;
    language?: "uz" | "ru" | "en";
  }) => api.post("/resumes/generate-ai", data),
  
  update: (id: string, data: Partial<{ title: string; content: object; status: string }>) =>
    api.put(`/resumes/${id}`, data),
  
  delete: (id: string) => api.delete(`/resumes/${id}`),
  
  publish: (id: string) => api.post(`/resumes/${id}/publish`),
  
  archive: (id: string) => api.post(`/resumes/${id}/archive`),
  
  download: (id: string) =>
    api.get(`/resumes/${id}/pdf`, { responseType: "blob" }),
  
  analytics: (id: string) => api.get(`/resumes/${id}/analytics`),
};

// Job endpoints
export const jobApi = {
  list: (params?: {
    search?: string;
    location?: string;
    job_type?: string;
    experience_level?: string;
    salary_min?: number;
    salary_max?: number;
    page?: number;
    limit?: number;
    sort_by?: string;
  }) => api.get("/jobs", { params }),
  
  get: (id: string) => api.get(`/jobs/${id}`),
  
  create: (data: object) => api.post("/jobs", data),
  
  update: (id: string, data: object) => api.put(`/jobs/${id}`, data),
  
  delete: (id: string) => api.delete(`/jobs/${id}`),
  
  myJobs: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get("/jobs/my", { params }),

  publish: (id: string) => api.post(`/jobs/${id}/publish`),

  pause: (id: string) => api.post(`/jobs/${id}/pause`),

  reopen: (id: string) => api.post(`/jobs/${id}/reopen`),

  close: (id: string, data?: { reason_code?: "hired" | "other"; reason_note?: string }) =>
    api.post(`/jobs/${id}/close`, data || {}),

  clone: (id: string) => api.post(`/jobs/${id}/clone`),

  match: (resumeId: string) =>
    api.post("/jobs/match", { resume_id: resumeId }),

  recommended: (params?: { limit?: number; remote_only?: boolean }) =>
    api.get("/jobs/recommended", { params }),

  applications: (id: string) => api.get(`/jobs/${id}/applications`),

  saveJob: (id: string) => api.post(`/jobs/${id}/save`),

  unsaveJob: (id: string) => api.delete(`/jobs/${id}/save`),

  savedJobs: (params?: { page?: number; limit?: number }) =>
    api.get("/jobs/saved", { params }),

  submitCompanyVerification: (data: { notes?: string; requested_badges?: string[] }) =>
    api.post("/jobs/company/verification/submit", data),

  discoveryCity: (slug: string, params?: { page?: number; limit?: number }) =>
    api.get(`/jobs/discovery/cities/${slug}`, { params }),

  discoveryProfession: (slug: string, params?: { page?: number; limit?: number }) =>
    api.get(`/jobs/discovery/professions/${slug}`, { params }),

  discoveryCompany: (slug: string, params?: { page?: number; limit?: number }) =>
    api.get(`/jobs/discovery/companies/${slug}`, { params }),

  trackEvent: (data: { event_name: string; job_id?: string; source?: string; metadata?: Record<string, unknown> }) =>
    api.post("/jobs/events", data),
};

// Application endpoints
export const applicationApi = {
  list: (params?: { status?: string; page?: number; limit?: number }) =>
    api.get("/applications/my-applications", { params }),
  
  get: (id: string) => api.get(`/applications/${id}`),
  
  apply: (data: {
    job_id: string;
    resume_id: string;
    cover_letter?: string;
  }) => api.post("/applications/apply", data),
  
  withdraw: (id: string) => api.post(`/applications/${id}/withdraw`),
  
  updateStatus: (id: string, data: ApplicationStatusUpdateRequest) =>
    api.put(`/applications/${id}/status`, data),
  
  autoApply: (data: AutoApplyRequest) =>
    api.post("/applications/auto-apply", data),

  hiringFunnel: (params?: { days?: number }) =>
    api.get("/applications/analytics/funnel", { params }),

  companyDashboardAnalytics: (params?: { days?: number; start_date?: string; end_date?: string }) =>
    api.get("/applications/analytics/company-dashboard", { params }),

  jobAnalytics: (jobId: string, params?: { days?: number; start_date?: string; end_date?: string }) =>
    api.get(`/applications/analytics/job/${jobId}`, { params }),

  dashboardActions: () =>
    api.get("/applications/analytics/dashboard-actions"),

  upcomingInterviews: (params?: { days?: number }) =>
    api.get("/applications/interviews/upcoming", { params }),

  companyList: (params?: { job_id?: string; status?: string; search?: string; tag?: string; page?: number; page_size?: number }) =>
    api.get("/applications/company/list", { params }),

  bulkStatusUpdate: (data: { application_ids: string[]; status: string; notes?: string }) =>
    api.post("/applications/company/bulk-status", data),

  bulkSendEmail: (data: { application_ids: string[]; subject: string; body: string; template_key?: string }) =>
    api.post("/applications/company/bulk-email", data),

  updateNotesTags: (applicationId: string, data: { notes?: string; tags: string[] }) =>
    api.put(`/applications/${applicationId}/notes-tags`, data),

  getMessages: (applicationId: string) =>
    api.get(`/applications/${applicationId}/messages`),

  sendMessage: (applicationId: string, data: { subject: string; body: string; template_key?: string }) =>
    api.post(`/applications/${applicationId}/messages/send`, data),

  topCandidatesForJob: (jobId: string, params?: { limit?: number; pool?: "applicants" | "all" }) =>
    api.get(`/applications/jobs/${jobId}/top-candidates`, { params }),

  listScorecards: (applicationId: string) =>
    api.get(`/applications/${applicationId}/scorecards`),

  submitScorecard: (
    applicationId: string,
    data: {
      technical_score?: number | null;
      communication_score?: number | null;
      cultural_fit_score?: number | null;
      motivation_score?: number | null;
      problem_solving_score?: number | null;
      recommendation?: "hire" | "maybe" | "pass" | null;
      notes?: string | null;
    },
  ) => api.post(`/applications/${applicationId}/scorecards`, data),
};

// Admin endpoints
export const adminApi = {
  dashboard: () => api.get<AdminDashboardResponse>("/admin/dashboard"),
  systemHealth: () => api.get<AdminSystemHealthResponse>("/admin/system/health"),
  userStats: () => api.get<AdminUserStatsResponse>("/admin/users/stats"),
  listUsers: (params?: { role?: "student" | "company" | "admin"; is_active?: boolean; search?: string; limit?: number; offset?: number }) =>
    api.get<AdminManagedUsersResponse>("/admin/users", { params }),
  updateUserStatus: (userId: string, data: AdminUpdateUserStatusRequest) =>
    api.patch(`/admin/users/${userId}/status`, data),
  errors: (params?: { limit?: number; offset?: number; resolved?: boolean; hours?: number }) =>
    api.get<AdminErrorListResponse>("/admin/errors", { params }),
  errorStats: (hours = 24) => api.get<AdminErrorStatsResponse>("/admin/errors/stats", { params: { hours } }),
  resolveError: (errorId: string, data: AdminResolveErrorRequest = {}) =>
    api.post<AdminResolveErrorResponse>(`/admin/errors/${errorId}/resolve`, data),
  bulkResolveErrors: (errorIds: string[], resolution_notes?: string) =>
    api.post<AdminBulkResolveResponse>("/admin/errors/bulk-resolve", {
      error_ids: errorIds,
      resolution_notes,
    }),
  roleMatrix: () => api.get<AdminRoleMatrixResponse>("/admin/access/roles-matrix"),
  adminUsers: () => api.get<AdminAccessUsersResponse>("/admin/access/admin-users"),
  updateAdminRole: (userId: string, data: AdminUpdateAdminRoleRequest) =>
    api.patch<AdminUpdateAdminRoleResponse>(`/admin/access/admin-users/${userId}/role`, data),

  // Platform moderation
  listJobs: (params?: { search?: string; status?: string; offset?: number; limit?: number }) =>
    api.get("/admin/jobs", { params }),
  updateJobStatus: (jobId: string, status: string) =>
    api.patch(`/admin/jobs/${jobId}/status`, { status }),

  listCompanyVerification: (params?: { state?: string; limit?: number; offset?: number }) =>
    api.get("/admin/companies/verification", { params }),

  reviewCompanyVerification: (
    companyId: string,
    data: { action: "approve" | "reject"; notes?: string; badges?: string[] },
  ) => api.post(`/admin/companies/${companyId}/verification/review`, data),
  deleteJob: (jobId: string) => api.delete(`/admin/jobs/${jobId}`),

  listCompanies: (params?: { search?: string; is_verified?: boolean; offset?: number; limit?: number }) =>
    api.get("/admin/companies", { params }),
  verifyCompany: (companyId: string, is_verified: boolean) =>
    api.patch(`/admin/companies/${companyId}/verify`, { is_verified }),

  bulkUsers: (ids: string[], action: string) =>
    api.post<{ success: boolean; affected: number; action: string }>("/admin/users/bulk-action", { ids, action }),
  bulkJobs: (ids: string[], action: string) =>
    api.post<{ success: boolean; affected: number; action: string }>("/admin/jobs/bulk-action", { ids, action }),
  bulkCompanies: (ids: string[], action: string) =>
    api.post<{ success: boolean; affected: number; action: string }>("/admin/companies/bulk-action", { ids, action }),

  listApplications: (params?: { status?: string; search?: string; offset?: number; limit?: number }) =>
    api.get("/admin/applications", { params }),

  timeseries: (metric: "users" | "jobs" | "applications", days = 30) =>
    api.get<{ success: boolean; metric: string; days: number; data: { date: string; value: number }[] }>(
      `/admin/stats/timeseries?metric=${metric}&days=${days}`
    ),

  getLandingContent: (locale: "uz" | "ru") => api.get<LandingContentResponse>(`/landing/admin/content?locale=${locale}`),
  upsertLandingContent: (data: { locale: "uz" | "ru"; payload: Record<string, unknown>; is_published: boolean }) =>
    api.put<LandingContentResponse>("/landing/admin/content", data),
  deleteLandingContent: (locale: "uz" | "ru") => api.delete(`/landing/admin/content?locale=${locale}`),

  auditLogs: (params?: { admin_id?: string; action?: string; from_date?: string; to_date?: string; page?: number }) =>
    api.get<{
      success: boolean;
      total: number;
      page: number;
      logs: {
        id: string;
        admin_id: string | null;
        admin_name: string;
        action: string;
        target_type: string;
        target_id: string | null;
        target_label: string | null;
        notes: string | null;
        created_at: string;
      }[];
    }>("/admin/audit-logs", { params }),

  adminNotifications: (unread?: boolean) =>
    api.get<{
      success: boolean;
      unread_count: number;
      notifications: {
        id: string;
        type: string;
        message: string;
        link: string | null;
        is_read: boolean;
        created_at: string;
      }[];
    }>(`/admin/admin-notifications${unread ? "?unread=true" : ""}`),
  markNotificationRead: (id: string) =>
    api.post<{ success: boolean }>(`/admin/admin-notifications/${id}/read`),
  markAllNotificationsRead: () =>
    api.post<{ success: boolean }>("/admin/admin-notifications/read-all"),
};

export const landingApi = {
  getPublicContent: (locale: "uz" | "ru") => api.get<LandingContentResponse>(`/landing/content?locale=${locale}`),
};

// User endpoints
export const userApi = {
  getProfile: () => api.get("/users/me"),
  
  updateProfile: (data: Partial<{
    full_name: string;
    phone: string;
    avatar_url: string;
  }>) => api.put("/users/me", data),
  
  changePassword: (data: {
    old_password: string;
    new_password: string;
  }) => api.post("/auth/change-password", data),
  
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return api.post("/users/me/avatar", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  deleteAccount: () => api.delete("/users/me"),
};

// AI endpoints
export const aiApi = {
  generateResume: (data: object) =>
    api.post("/ai/generate-resume", data),
  
  generateCoverLetter: (data: {
    resume_text: string;
    job_description: string;
    company_name: string;
    hiring_manager?: string;
    tone?: string;
  }) => api.post("/ai/generate-cover-letter", data),
  
  analyzeResume: (resumeId: string) =>
    api.post("/ai/analyze-resume", { resume_id: resumeId }),
  
  matchJob: (resumeId: string, jobId: string) =>
    api.post("/ai/match-job", { resume_id: resumeId, job_id: jobId }),

  // ---------- AI HR (recruiter-facing) ----------
  hrJobDescription: (data: {
    title: string;
    seniority: string;
    tone?: "professional" | "friendly" | "startup";
    industry?: string;
    location?: string;
    must_have?: string[];
    locale?: "uz" | "ru" | "en" | string;
  }) => api.post("/ai/hr/job-description", data),

  hrCandidateSummary: (applicationId: string, locale = "uz") =>
    api.post(`/ai/hr/applications/${applicationId}/summary?locale=${locale}`),

  hrInterviewQuestions: (applicationId: string, count = 8, locale = "uz") =>
    api.post(`/ai/hr/applications/${applicationId}/questions?count=${count}&locale=${locale}`),

  hrEmailTemplate: (applicationId: string, data: {
    action: "interview" | "reject" | "offer" | "shortlist" | "follow_up";
    interview_at?: string;
    meeting_link?: string;
    locale?: string;
  }) => api.post(`/ai/hr/applications/${applicationId}/email`, data),

  hrEmailSend: (applicationId: string, data: { subject: string; body: string }) =>
    api.post(`/ai/hr/applications/${applicationId}/email/send`, data),

  projectHelp: (data: { question: string; locale?: "uz" | "ru"; context_page?: string }) =>
    api.post("/ai/help-assistant", data),
};

// Payment endpoints
export const paymentApi = {
  createPaymentIntent: (data: CreatePaymentIntentRequest) =>
    api.post<PaymentIntentResponse>("/payments/create-payment-intent", data),

  getPricing: () => api.get<PricingResponse>("/payments/pricing"),

  getMyPayments: () => api.get<PaymentHistoryResponse>("/payments/my-payments"),
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

export interface ApiErrorInfo {
  message: string;
  status?: number;
  upgradeUrl?: string;
  isPremiumRequired?: boolean;
}

function getDetailMessage(detail: unknown): {
  message?: string;
  upgradeUrl?: string;
} {
  if (typeof detail === "string") {
    return { message: detail };
  }

  if (detail && typeof detail === "object") {
    const data = detail as PremiumErrorDetail & Record<string, unknown>;
    const message =
      typeof data.message === "string"
        ? data.message
        : typeof data.error === "string"
          ? data.error
          : undefined;
    const upgradeUrl =
      typeof data.upgrade_url === "string"
        ? data.upgrade_url
        : typeof data.contact_url === "string"
          ? data.contact_url
          : undefined;

    return { message, upgradeUrl };
  }

  return {};
}

/**
 * Normalize API errors into user-friendly metadata
 */
/**
 * Coerce arbitrary backend "validation details" payloads into a readable
 * string. Tolerates: array of strings, array of FastAPI/loc-msg objects,
 * array of envelope {field,message} objects, Record<field, string[]>, or
 * Record<field, string>. Returns undefined when nothing useful is found.
 */
export function formatValidationDetails(value: unknown): string | undefined {
  if (value == null) return undefined;

  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    const parts = value
      .map((item) => {
        if (item == null) return "";
        if (typeof item === "string") return item;
        if (typeof item === "object") {
          const o = item as Record<string, unknown>;
          const field =
            (Array.isArray(o.loc) ? o.loc.filter((p) => p !== "body").join(".") : undefined) ||
            (typeof o.field === "string" ? o.field : undefined) ||
            (typeof o.name === "string" ? o.name : undefined);
          const msg =
            (typeof o.msg === "string" ? o.msg : undefined) ||
            (typeof o.message === "string" ? o.message : undefined) ||
            (typeof o.detail === "string" ? o.detail : undefined);
          if (field && msg) return `${field}: ${msg}`;
          return msg || "";
        }
        return "";
      })
      .filter(Boolean);
    return parts.length ? parts.join("; ") : undefined;
  }

  if (typeof value === "object") {
    const parts = Object.entries(value as Record<string, unknown>)
      .map(([field, errors]) => {
        if (Array.isArray(errors)) {
          const inner = errors
            .map((e) => (typeof e === "string" ? e : formatValidationDetails(e)))
            .filter(Boolean)
            .join(", ");
          return inner ? `${field}: ${inner}` : "";
        }
        if (typeof errors === "string") return `${field}: ${errors}`;
        const inner = formatValidationDetails(errors);
        return inner ? `${field}: ${inner}` : "";
      })
      .filter(Boolean);
    return parts.length ? parts.join("; ") : undefined;
  }

  return undefined;
}

/**
 * Read the user's selected locale without a React context.
 * Mirrors getPreferredLocale() in lib/i18n but kept tiny here so api.ts
 * stays usable from non-React modules (axios interceptors, hooks, SSR).
 */
type UiLocale = "uz" | "ru";

function getActiveLocale(): UiLocale {
  if (typeof window === "undefined") return "uz";
  try {
    const stored = window.localStorage.getItem("locale");
    if (stored === "ru" || stored === "uz") return stored;
  } catch {
    // localStorage may be unavailable (Safari private mode, SSR rehydrate);
    // fall through to default.
  }
  return "uz";
}

/** Localized fallback message tables for known HTTP statuses. */
const STATUS_MESSAGES: Record<UiLocale, Record<number | "generic" | "non_axios", string>> = {
  uz: {
    400: "Noto'g'ri so'rov. Iltimos, ma'lumotlarni tekshirib qayta urinib ko'ring.",
    401: "Tizimga kirishingiz kerak.",
    403: "Bu amalni bajarishga ruxsatingiz yo'q.",
    404: "So'ralgan ma'lumot topilmadi.",
    409: "Bu allaqachon mavjud.",
    422: "Kiritilgan ma'lumotlar noto'g'ri.",
    429: "Juda ko'p so'rov yuborildi. Iltimos, biroz kutib turing.",
    500: "Kutilmagan xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
    generic: "Xatolik yuz berdi. Iltimos, qayta urinib ko'ring.",
    non_axios: "Kutilmagan xatolik yuz berdi.",
  },
  ru: {
    400: "Неверный запрос. Пожалуйста, проверьте введённые данные.",
    401: "Пожалуйста, войдите в систему.",
    403: "У вас нет прав на это действие.",
    404: "Запрашиваемый ресурс не найден.",
    409: "Этот ресурс уже существует.",
    422: "Введённые данные недопустимы.",
    429: "Слишком много запросов. Пожалуйста, попробуйте позже.",
    500: "Произошла непредвиденная ошибка. Пожалуйста, попробуйте ещё раз.",
    generic: "Произошла ошибка. Пожалуйста, попробуйте ещё раз.",
    non_axios: "Произошла непредвиденная ошибка.",
  },
};

/** "Upgrade at …" copy for 402/Premium gate, localized. */
function premiumGateText(locale: UiLocale, baseMessage: string, upgradeUrl: string): string {
  if (locale === "ru") {
    return `${baseMessage} Перейдите по ссылке ${upgradeUrl}, чтобы продолжить.`;
  }
  return `${baseMessage} Davom etish uchun ${upgradeUrl} sahifasiga o'ting.`;
}

function defaultPremiumBase(locale: UiLocale): string {
  return locale === "ru"
    ? "Эта функция доступна только в Premium или Enterprise подписке."
    : "Bu funksiya faqat Premium yoki Enterprise obunada mavjud.";
}

export function getApiErrorInfo(error: unknown): ApiErrorInfo {
  const locale = getActiveLocale();
  const msgs = STATUS_MESSAGES[locale];

  if (!axios.isAxiosError(error)) {
    return {
      message: error instanceof Error ? error.message : msgs.non_axios,
    };
  }

  const status = error.response?.status;
  const data = error.response?.data as {
    detail?: unknown;
    details?: unknown;
    error?: { message?: string; details?: unknown };
    errors?: unknown;
    message?: string;
    detail_message?: string;
  } | undefined;

  // Project envelope: { error: { details: [...] | {...} } }
  const envelopeDetails = formatValidationDetails(data?.error?.details);
  if (envelopeDetails) {
    return { message: envelopeDetails, status };
  }

  // FastAPI native 422: { detail: [{loc,msg,type}, ...] }
  if (Array.isArray(data?.detail)) {
    const formatted = formatValidationDetails(data!.detail);
    if (formatted) return { message: formatted, status };
  }

  // Generic top-level details / errors fields
  const topDetails = formatValidationDetails(data?.details);
  if (topDetails) return { message: topDetails, status };
  const topErrors = formatValidationDetails(data?.errors);
  if (topErrors) return { message: topErrors, status };

  const detailInfo = getDetailMessage(data?.detail);
  const explicitMessage =
    detailInfo.message ||
    data?.error?.message ||
    data?.message ||
    data?.detail_message;

  if (status === 402) {
    const upgradeUrl = detailInfo.upgradeUrl || "/pricing";
    const baseMessage = explicitMessage || defaultPremiumBase(locale);
    return {
      message: premiumGateText(locale, baseMessage, upgradeUrl),
      status,
      upgradeUrl,
      isPremiumRequired: true,
    };
  }

  // Backend's explicit message wins — it may already be localized, and we
  // never want to silently swallow a server-supplied human-readable error.
  if (explicitMessage) {
    return { message: explicitMessage, status };
  }

  // No backend message → fall back to localized status-code default.
  const fallback = (status !== undefined && msgs[status]) || msgs.generic;
  return { message: fallback, status };
}

/**
 * Handle API error and return user-friendly message
 */
export function getErrorMessage(error: unknown): string {
  return getApiErrorInfo(error).message;
}

/**
 * Create a debounced function
 */
type AnyFunction = (...args: unknown[]) => unknown;

export function debounce<T extends AnyFunction>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export default api;
