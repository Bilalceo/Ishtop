/**
 * =============================================================================
 * useJobs Hook
 * =============================================================================
 *
 * Custom hook for job operations
 */

"use client";

import { useCallback, useRef, useState } from "react";
import type { Job } from "@/types/api";
import { jobApi, getErrorMessage } from "@/lib/api";
import { toast } from "sonner";

// =============================================================================
// TYPES
// =============================================================================

interface JobsState {
  jobs: Job[];
  currentJob: Job | null;
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  totalPages: number;
}

interface JobFilters {
  search?: string;
  location?: string;
  job_type?: string[];
  experience_level?: string[];
  salary_min?: number;
  salary_max?: number;
  sort_by?: "created_at" | "salary" | "relevance";
}

interface JobMatchApiItem {
  job: Job;
  match_score: number;
  explainability?: Job["explainability"];
}

interface JobMatchApiResponse {
  matches?: JobMatchApiItem[];
}

// =============================================================================
// HOOK
// =============================================================================

export function useJobs() {
  const [state, setState] = useState<JobsState>({
    jobs: [],
    currentJob: null,
    isLoading: false,
    error: null,
    totalCount: 0,
    currentPage: 1,
    totalPages: 1,
  });

  const [filters, setFilters] = useState<JobFilters>({});
  // Use a ref so fetchJobs has a stable reference and doesn't cause infinite loops
  const filtersRef = useRef<JobFilters>({});

  // Fetch jobs
  const fetchJobs = useCallback(async (newFilters?: JobFilters, page: number = 1, append: boolean = false) => {
    // On append (infinite scroll) keep the current list visible instead of
    // flipping the full-page loading state.
    setState((prev) => ({ ...prev, isLoading: append ? prev.isLoading : true, error: null }));

    try {
      // Merge and persist filters via ref (avoids recreating the callback)
      const merged = newFilters !== undefined
        ? { ...filtersRef.current, ...newFilters }
        : filtersRef.current;

      if (newFilters !== undefined) {
        filtersRef.current = merged;
        setFilters(merged);
      }

      const params: any = { page, ...merged };

      const response = await jobApi.list(params);
      const data = response.data as {
        jobs?: Job[];
        items?: Job[];
        total?: number;
        page?: number;
        page_size?: number;
        total_pages?: number;
        pages?: number;
      };

      const jobList = data.jobs || data.items || [];

      setState((prev) => ({
        ...prev,
        jobs: append ? [...prev.jobs, ...jobList] : jobList,
        isLoading: false,
        totalCount: data.total ?? jobList.length,
        currentPage: data.page ?? page,
        totalPages: data.total_pages ?? data.pages ?? 1,
      }));
    } catch (error) {
      const message = getErrorMessage(error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      toast.error(message);
    }
  }, []); // stable — no deps, uses filtersRef internally

  // Fetch single job
  const fetchJob = useCallback(async (id: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await jobApi.get(id);
      const job = response.data as Job;
      
      setState((prev) => ({
        ...prev,
        currentJob: job,
        isLoading: false,
      }));

      return job;
    } catch (error) {
      const message = getErrorMessage(error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      toast.error(message);
    }
  }, []);

  // Search jobs
  const searchJobs = useCallback(async (query: string) => {
    return fetchJobs({ ...filtersRef.current, search: query });
  }, [fetchJobs]);

  // Apply filters
  const applyFilters = useCallback(async (newFilters: JobFilters) => {
    return fetchJobs({ ...filtersRef.current, ...newFilters });
  }, [fetchJobs]);

  // Clear filters
  const clearFilters = useCallback(async () => {
    filtersRef.current = {};
    setFilters({});
    return fetchJobs({});
  }, [fetchJobs]);

  // Match jobs to resume (AI)
  const matchJobs = useCallback(async (resumeId: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await jobApi.match(resumeId);
      const data = response.data as JobMatchApiResponse;
      const matchedJobs: (Job & { matchScore?: number })[] = (data.matches || []).map((m) => ({
        ...m.job,
        matchScore: m.match_score,
        explainability: m.explainability,
      }));

      setState((prev) => ({
        ...prev,
        jobs: matchedJobs,
        isLoading: false,
        totalCount: matchedJobs.length,
        currentPage: 1,
        totalPages: 1,
      }));

      return matchedJobs;
    } catch (error) {
      const message = getErrorMessage(error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      toast.error(message);
      throw error;
    }
  }, []);

  // Fetch company's own jobs
  const fetchMyJobs = useCallback(async (params?: { status?: string }) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const response = await jobApi.myJobs(params);
      const data = response.data as {
        jobs?: Job[];
        items?: Job[];
        total?: number;
        total_pages?: number;
        pages?: number;
      };
      const jobList = data.jobs || data.items || [];
      setState((prev) => ({
        ...prev,
        jobs: jobList,
        isLoading: false,
        totalCount: data.total ?? jobList.length,
        totalPages: data.total_pages ?? data.pages ?? 1,
      }));
      return jobList;
    } catch (error) {
      const message = getErrorMessage(error);
      setState((prev) => ({ ...prev, isLoading: false, error: message }));
      toast.error(message);
      return [];
    }
  }, []);

  // Publish a job
  const publishJob = useCallback(async (jobId: string) => {
    try {
      await jobApi.publish(jobId);
      setState((prev) => ({
        ...prev,
        jobs: prev.jobs.map((j) => j.id === jobId ? { ...j, status: "active" } : j),
      }));
      toast.success("Vakansiya nashr etildi");
    } catch (error) {
      toast.error(getErrorMessage(error));
      throw error;
    }
  }, []);

  // Pause a job
  const pauseJob = useCallback(async (jobId: string) => {
    try {
      await jobApi.pause(jobId);
      setState((prev) => ({
        ...prev,
        jobs: prev.jobs.map((j) => j.id === jobId ? { ...j, status: "paused" } : j),
      }));
      toast.success("Vakansiya pauzaga qo'yildi");
    } catch (error) {
      toast.error(getErrorMessage(error));
      throw error;
    }
  }, []);

  // Reopen a job
  const reopenJob = useCallback(async (jobId: string) => {
    try {
      await jobApi.reopen(jobId);
      setState((prev) => ({
        ...prev,
        jobs: prev.jobs.map((j) => j.id === jobId ? { ...j, status: "active", close_reason_code: undefined, close_reason_note: undefined } : j),
      }));
      toast.success("Vakansiya qayta ochildi");
    } catch (error) {
      toast.error(getErrorMessage(error));
      throw error;
    }
  }, []);

  // Close a job
  const closeJob = useCallback(async (jobId: string, reason?: { reason_code?: "hired" | "other"; reason_note?: string }) => {
    try {
      await jobApi.close(jobId, reason);
      setState((prev) => ({
        ...prev,
        jobs: prev.jobs.map((j) => j.id === jobId ? { ...j, status: "closed", close_reason_code: reason?.reason_code, close_reason_note: reason?.reason_note } : j),
      }));
      toast.success("Vakansiya yopildi");
    } catch (error) {
      toast.error(getErrorMessage(error));
      throw error;
    }
  }, []);

  // Delete a job
  const deleteJob = useCallback(async (jobId: string) => {
    try {
      await jobApi.delete(jobId);
      setState((prev) => ({
        ...prev,
        jobs: prev.jobs.filter((j) => j.id !== jobId),
        totalCount: prev.totalCount - 1,
      }));
      toast.success("Vakansiya o'chirildi");
    } catch (error) {
      toast.error(getErrorMessage(error));
      throw error;
    }
  }, []);

  const cloneJob = useCallback(async (jobId: string) => {
    try {
      const response = await jobApi.clone(jobId);
      const clonedJob = response.data as Job;
      setState((prev) => ({
        ...prev,
        jobs: [clonedJob, ...prev.jobs],
        totalCount: prev.totalCount + 1,
      }));
      toast.success("Vakansiya nusxasi qoralama holatda yaratildi");
      return clonedJob;
    } catch (error) {
      toast.error(getErrorMessage(error));
      throw error;
    }
  }, []);

  // Save job
  const saveJob = useCallback(async (jobId: string) => {
    console.log("Job saved:", jobId);
  }, []);

  // Unsave job
  const unsaveJob = useCallback(async (jobId: string) => {
    console.log("Job unsaved:", jobId);
  }, []);

  return {
    ...state,
    filters,
    fetchJobs,
    fetchMyJobs,
    fetchJob,
    searchJobs,
    applyFilters,
    clearFilters,
    matchJobs,
    publishJob,
    pauseJob,
    reopenJob,
    closeJob,
    cloneJob,
    deleteJob,
    saveJob,
    unsaveJob,
  };
}

export default useJobs;
