/**
 * =============================================================================
 * APPLICATION STORE - Zustand State Management
 * =============================================================================
 *
 * Handles job application state:
 * - List of applications
 * - Application tracking
 * - Apply/withdraw actions
 * - Auto-apply feature
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { Application, ApplicationStatus, Job } from "@/types/api";

// =============================================================================
// TYPES
// =============================================================================

interface ApplicationState {
  // State
  applications: Application[];
  currentApplication: Application | null;
  isLoading: boolean;
  isApplying: boolean;
  error: string | null;
  
  // Actions
  fetchApplications: () => Promise<void>;
  fetchApplication: (id: string) => Promise<Application | null>;
  applyToJob: (data: ApplyData) => Promise<Application>;
  withdrawApplication: (id: string) => Promise<void>;
  autoApply: (criteria: AutoApplyCriteria) => Promise<Application[]>;
  setCurrentApplication: (application: Application | null) => void;
  clearError: () => void;
}

interface ApplyData {
  jobId: string;
  resumeId: string;
  coverLetter?: string;
  answers?: Record<string, string>;
}

interface AutoApplyCriteria {
  jobTypes?: string[];
  locations?: string[];
  experienceLevels?: string[];
  salaryMin?: number;
  maxApplications?: number;
  resumeId: string;
}

// =============================================================================
// STORE
// =============================================================================

export const useApplicationStore = create<ApplicationState>()(
  immer((set, get) => ({
    // Initial state
    applications: [],
    currentApplication: null,
    isLoading: false,
    isApplying: false,
    error: null,

    // Fetch all applications
    fetchApplications: async () => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Mock data
        const mockApplications: Application[] = [
          {
            id: "app-1",
            job_id: "job-1",
            user_id: "user-1",
            resume_id: "resume-1",
            cover_letter: "I am excited to apply...",
            status: "interview",
            applied_at: "2024-01-15T10:00:00Z",
            reviewed_at: "2024-01-17T14:00:00Z",
            interview_at: "2024-01-25T10:00:00Z",
            updated_at: "2024-01-20T10:00:00Z",
          },
          {
            id: "app-2",
            job_id: "job-2",
            user_id: "user-1",
            resume_id: "resume-1",
            status: "reviewing",
            applied_at: "2024-01-14T08:00:00Z",
            reviewed_at: "2024-01-16T10:00:00Z",
            updated_at: "2024-01-16T10:00:00Z",
          },
          {
            id: "app-3",
            job_id: "job-3",
            user_id: "user-1",
            resume_id: "resume-2",
            status: "pending",
            applied_at: "2024-01-18T12:00:00Z",
            updated_at: "2024-01-18T12:00:00Z",
          },
        ];

        set((state) => {
          state.applications = mockApplications;
          state.isLoading = false;
        });
      } catch (error: any) {
        set((state) => {
          state.isLoading = false;
          state.error = error.message || "Failed to fetch applications";
        });
      }
    },

    // Fetch single application
    fetchApplication: async (id) => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500));

        const application = get().applications.find((a) => a.id === id) || null;

        set((state) => {
          state.currentApplication = application;
          state.isLoading = false;
        });

        return application;
      } catch (error: any) {
        set((state) => {
          state.isLoading = false;
          state.error = error.message || "Failed to fetch application";
        });
        return null;
      }
    },

    // Apply to job
    applyToJob: async (data) => {
      set((state) => {
        state.isApplying = true;
        state.error = null;
      });

      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const newApplication: Application = {
          id: `app-${Date.now()}`,
          job_id: data.jobId,
          user_id: "user-1",
          resume_id: data.resumeId,
          cover_letter: data.coverLetter,
          status: "pending",
          applied_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        set((state) => {
          state.applications.unshift(newApplication);
          state.currentApplication = newApplication;
          state.isApplying = false;
        });

        return newApplication;
      } catch (error: any) {
        set((state) => {
          state.isApplying = false;
          state.error = error.message || "Failed to apply";
        });
        throw error;
      }
    },

    // Withdraw application
    withdrawApplication: async (id) => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500));

        set((state) => {
          state.applications = state.applications.filter((a) => a.id !== id);
          if (state.currentApplication?.id === id) {
            state.currentApplication = null;
          }
          state.isLoading = false;
        });
      } catch (error: any) {
        set((state) => {
          state.isLoading = false;
          state.error = error.message || "Failed to withdraw application";
        });
        throw error;
      }
    },

    // Auto-apply to multiple jobs
    autoApply: async (criteria) => {
      set((state) => {
        state.isApplying = true;
        state.error = null;
      });

      try {
        // Simulate finding matching jobs and applying
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Mock: create multiple applications
        const newApplications: Application[] = Array.from(
          { length: Math.min(criteria.maxApplications || 5, 5) },
          (_, i) => ({
            id: `app-auto-${Date.now()}-${i}`,
            job_id: `job-auto-${i}`,
            user_id: "user-1",
            resume_id: criteria.resumeId,
            status: "pending" as ApplicationStatus,
            applied_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
        );

        set((state) => {
          state.applications.unshift(...newApplications);
          state.isApplying = false;
        });

        return newApplications;
      } catch (error: any) {
        set((state) => {
          state.isApplying = false;
          state.error = error.message || "Auto-apply failed";
        });
        throw error;
      }
    },

    // Set current application
    setCurrentApplication: (application) =>
      set((state) => {
        state.currentApplication = application;
      }),

    // Clear error
    clearError: () =>
      set((state) => {
        state.error = null;
      }),
  }))
);

// =============================================================================
// SELECTORS
// =============================================================================

export const selectApplications = (state: ApplicationState) => state.applications;
export const selectCurrentApplication = (state: ApplicationState) => state.currentApplication;
export const selectIsLoading = (state: ApplicationState) => state.isLoading;
export const selectIsApplying = (state: ApplicationState) => state.isApplying;
export const selectError = (state: ApplicationState) => state.error;

// Status counts
export const selectStatusCounts = (state: ApplicationState) => ({
  total: state.applications.length,
  pending: state.applications.filter((a) => a.status === "pending").length,
  reviewing: state.applications.filter((a) => a.status === "reviewing").length,
  interview: state.applications.filter((a) => a.status === "interview").length,
  accepted: state.applications.filter((a) => a.status === "accepted").length,
  rejected: state.applications.filter((a) => a.status === "rejected").length,
});
