/**
 * =============================================================================
 * JOB STORE - Zustand State Management
 * =============================================================================
 *
 * Thin compatibility layer over the current job API client.
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import { getErrorMessage, jobApi } from "@/lib/api";
import type {
  Job,
  JobSearchParams,
  JobCreateRequest,
} from "@/types/api";

// =============================================================================
// TYPES
// =============================================================================

interface JobState {
  // State
  jobs: Job[];
  myJobs: Job[]; // Company's own jobs
  currentJob: Job | null;
  searchParams: JobSearchParams;
  totalJobs: number;
  totalPages: number;
  currentPage: number;
  isLoading: boolean;
  error: string | null;

  // Match results
  matchResults: MatchedJob[];
  isMatching: boolean;

  // Actions
  searchJobs: (params?: JobSearchParams) => Promise<void>;
  fetchJob: (id: string) => Promise<Job>;
  fetchMyJobs: () => Promise<void>;
  createJob: (data: JobCreateRequest) => Promise<Job>;
  updateJob: (id: string, data: Partial<JobCreateRequest>) => Promise<Job>;
  deleteJob: (id: string) => Promise<void>;
  publishJob: (id: string) => Promise<void>;
  closeJob: (id: string) => Promise<void>;
  matchJobs: (resumeId: string) => Promise<MatchedJob[]>;

  // Helpers
  setSearchParams: (params: Partial<JobSearchParams>) => void;
  setCurrentJob: (job: Job | null) => void;
  clearError: () => void;
  resetSearch: () => void;
}

type JobListPayload = {
  jobs?: Job[];
  items?: Job[];
  total?: number;
  page?: number;
  page_size?: number;
  limit?: number;
  total_pages?: number;
  pages?: number;
};

type MatchedJob = Job & { matchScore?: number };

type JobMatchPayload = {
  matches?: MatchedJob[];
  items?: MatchedJob[];
  jobs?: MatchedJob[];
};

// =============================================================================
// DEFAULT SEARCH PARAMS
// =============================================================================

const defaultSearchParams: JobSearchParams = {
  page: 1,
  limit: 12,
  sort_by: "created_at",
};

// =============================================================================
// STORE
// =============================================================================

export const useJobStore = create<JobState>()(
  immer((set, get) => ({
    // =======================================================================
    // INITIAL STATE
    // =======================================================================
    jobs: [],
    myJobs: [],
    currentJob: null,
    searchParams: defaultSearchParams,
    totalJobs: 0,
    totalPages: 0,
    currentPage: 1,
    isLoading: false,
    error: null,
    matchResults: [],
    isMatching: false,

    // =======================================================================
    // SEARCH JOBS
    // =======================================================================
    searchJobs: async (params?: JobSearchParams) => {
      const searchParams = params || get().searchParams;

      set((state) => {
        state.isLoading = true;
        state.error = null;
        state.searchParams = { ...state.searchParams, ...params };
      });

      try {
        const response = await jobApi.list(searchParams as any);
        const data = response.data as JobListPayload;
        const jobs = data.jobs || data.items || [];

        set((state) => {
          state.jobs = jobs;
          state.totalJobs = data.total ?? jobs.length;
          state.totalPages = data.total_pages ?? data.pages ?? 1;
          state.currentPage = data.page ?? searchParams.page ?? 1;
          state.isLoading = false;
        });
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error) || "Failed to search jobs";
        set((state) => {
          state.error = errorMessage;
          state.isLoading = false;
        });
      }
    },

    // =======================================================================
    // FETCH SINGLE JOB
    // =======================================================================
    fetchJob: async (id: string) => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        const response = await jobApi.get(id);
        const job = response.data as Job;
        set((state) => {
          state.currentJob = job;
          state.isLoading = false;
        });
        return job;
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error) || "Failed to fetch job";
        set((state) => {
          state.error = errorMessage;
          state.isLoading = false;
        });
        throw error;
      }
    },

    // =======================================================================
    // FETCH MY JOBS (Company)
    // =======================================================================
    fetchMyJobs: async () => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        const response = await jobApi.myJobs();
        const data = response.data as JobListPayload;
        set((state) => {
          state.myJobs = data.jobs || data.items || [];
          state.isLoading = false;
        });
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error) || "Failed to fetch your jobs";
        set((state) => {
          state.error = errorMessage;
          state.isLoading = false;
        });
      }
    },

    // =======================================================================
    // CREATE JOB
    // =======================================================================
    createJob: async (data: JobCreateRequest) => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        const response = await jobApi.create(data);
        const job = response.data as Job;
        set((state) => {
          state.myJobs.unshift(job);
          state.currentJob = job;
          state.isLoading = false;
        });
        return job;
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error) || "Failed to create job";
        set((state) => {
          state.error = errorMessage;
          state.isLoading = false;
        });
        throw error;
      }
    },

    // =======================================================================
    // UPDATE JOB
    // =======================================================================
    updateJob: async (id: string, data: Partial<JobCreateRequest>) => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        const response = await jobApi.update(id, data);
        const job = response.data as Job;
        set((state) => {
          // Update in myJobs
          const myIndex = state.myJobs.findIndex((j) => j.id === id);
          if (myIndex !== -1) {
            state.myJobs[myIndex] = job;
          }
          // Update in jobs
          const index = state.jobs.findIndex((j) => j.id === id);
          if (index !== -1) {
            state.jobs[index] = job;
          }
          if (state.currentJob?.id === id) {
            state.currentJob = job;
          }
          state.isLoading = false;
        });
        return job;
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error) || "Failed to update job";
        set((state) => {
          state.error = errorMessage;
          state.isLoading = false;
        });
        throw error;
      }
    },

    // =======================================================================
    // DELETE JOB
    // =======================================================================
    deleteJob: async (id: string) => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        await jobApi.delete(id);
        set((state) => {
          state.myJobs = state.myJobs.filter((j) => j.id !== id);
          state.jobs = state.jobs.filter((j) => j.id !== id);
          if (state.currentJob?.id === id) {
            state.currentJob = null;
          }
          state.isLoading = false;
        });
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error) || "Failed to delete job";
        set((state) => {
          state.error = errorMessage;
          state.isLoading = false;
        });
        throw error;
      }
    },

    // =======================================================================
    // PUBLISH JOB
    // =======================================================================
    publishJob: async (id: string) => {
      try {
        await jobApi.publish(id);
        set((state) => {
          const myIndex = state.myJobs.findIndex((j) => j.id === id);
          if (myIndex !== -1) {
            state.myJobs[myIndex] = {
              ...state.myJobs[myIndex],
              status: "active",
              updated_at: new Date().toISOString(),
            };
          }
          if (state.currentJob?.id === id) {
            state.currentJob = {
              ...state.currentJob,
              status: "active",
              updated_at: new Date().toISOString(),
            };
          }
        });
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error) || "Failed to publish job";
        set((state) => {
          state.error = errorMessage;
        });
        throw error;
      }
    },

    // =======================================================================
    // CLOSE JOB
    // =======================================================================
    closeJob: async (id: string) => {
      try {
        await jobApi.close(id);
        set((state) => {
          const myIndex = state.myJobs.findIndex((j) => j.id === id);
          if (myIndex !== -1) {
            state.myJobs[myIndex] = {
              ...state.myJobs[myIndex],
              status: "closed",
              updated_at: new Date().toISOString(),
            };
          }
          if (state.currentJob?.id === id) {
            state.currentJob = {
              ...state.currentJob,
              status: "closed",
              updated_at: new Date().toISOString(),
            };
          }
        });
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error) || "Failed to close job";
        set((state) => {
          state.error = errorMessage;
        });
        throw error;
      }
    },

    // =======================================================================
    // MATCH JOBS (AI)
    // =======================================================================
    matchJobs: async (resumeId: string) => {
      set((state) => {
        state.isMatching = true;
        state.error = null;
      });

      try {
        const response = await jobApi.match(resumeId);
        const data = response.data as JobMatchPayload;
        const matches = data.matches || data.items || data.jobs || [];
        set((state) => {
          state.matchResults = matches;
          state.isMatching = false;
        });
        return matches;
      } catch (error: unknown) {
        const errorMessage = getErrorMessage(error) || "Failed to match jobs";
        set((state) => {
          state.error = errorMessage;
          state.isMatching = false;
        });
        throw error;
      }
    },

    // =======================================================================
    // HELPERS
    // =======================================================================
    setSearchParams: (params: Partial<JobSearchParams>) => {
      set((state) => {
        state.searchParams = { ...state.searchParams, ...params };
      });
    },

    setCurrentJob: (job: Job | null) => {
      set((state) => {
        state.currentJob = job;
      });
    },

    clearError: () => {
      set((state) => {
        state.error = null;
      });
    },

    resetSearch: () => {
      set((state) => {
        state.searchParams = defaultSearchParams;
        state.jobs = [];
        state.totalJobs = 0;
        state.totalPages = 0;
        state.currentPage = 1;
      });
    },
  }))
);

// =============================================================================
// SELECTORS
// =============================================================================

export const selectJobs = (state: JobState) => state.jobs;
export const selectMyJobs = (state: JobState) => state.myJobs;
export const selectCurrentJob = (state: JobState) => state.currentJob;
export const selectIsLoading = (state: JobState) => state.isLoading;
export const selectError = (state: JobState) => state.error;
export const selectSearchParams = (state: JobState) => state.searchParams;
export const selectMatchResults = (state: JobState) => state.matchResults;
export const selectIsMatching = (state: JobState) => state.isMatching;
export const selectPagination = (state: JobState) => ({
  total: state.totalJobs,
  totalPages: state.totalPages,
  currentPage: state.currentPage,
});
















