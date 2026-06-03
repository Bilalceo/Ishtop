"use client";

import { useCallback, useState } from "react";
import type { Application, AutoApplyRequest, AutoApplyResponse } from "@/types/api";
import { applicationApi, getApiErrorInfo, getErrorMessage } from "@/lib/api";
import { toast } from "sonner";

interface ApplicationsState {
  applications: Application[];
  isLoading: boolean;
  isAutoApplying: boolean;
  error: string | null;
  autoApplyResult: AutoApplyResponse | null;
  stats: {
    total: number;
    pending: number;
    reviewing: number;
    interview: number;
    accepted: number;
    rejected: number;
  };
}

export function useApplications() {
  const [state, setState] = useState<ApplicationsState>({
    applications: [],
    isLoading: false,
    isAutoApplying: false,
    error: null,
    autoApplyResult: null,
    stats: {
      total: 0,
      pending: 0,
      reviewing: 0,
      interview: 0,
      accepted: 0,
      rejected: 0,
    },
  });

  const fetchMyApplications = useCallback(
    async (params?: { status?: string; page?: number; limit?: number }) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }));

      try {
        const response = await applicationApi.list(params);
        const data = response.data as {
          data?: {
            applications?: Application[];
            total?: number;
            pending_count?: number;
            reviewing_count?: number;
            interview_count?: number;
            accepted_count?: number;
            rejected_count?: number;
          };
        };

        const list = data.data?.applications || [];

        setState((prev) => ({
          ...prev,
          applications: list,
          isLoading: false,
          stats: {
            total: data.data?.total ?? list.length,
            pending: data.data?.pending_count ?? 0,
            reviewing: data.data?.reviewing_count ?? 0,
            interview: data.data?.interview_count ?? 0,
            accepted: data.data?.accepted_count ?? 0,
            rejected: data.data?.rejected_count ?? 0,
          },
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
    },
    []
  );

  const applyToJob = useCallback(
    async (data: { job_id: string; resume_id: string; cover_letter?: string }) => {
      try {
        const response = await applicationApi.apply(data);
        toast.success("Application submitted successfully");
        return response.data;
      } catch (error) {
        const message = getErrorMessage(error);
        toast.error(message);
        throw error;
      }
    },
    []
  );

  const autoApply = useCallback(async (data: AutoApplyRequest) => {
    setState((prev) => ({ ...prev, isAutoApplying: true, error: null }));

    try {
      const response = await applicationApi.autoApply(data);
      const result = response.data as AutoApplyResponse;

      setState((prev) => ({
        ...prev,
        isAutoApplying: false,
        autoApplyResult: result,
      }));

      toast.success(
        result.dry_run
          ? "Auto-apply preview generated"
          : "Auto-apply completed successfully"
      );

      return result;
    } catch (error) {
      const info = getApiErrorInfo(error);
      setState((prev) => ({
        ...prev,
        isAutoApplying: false,
        error: info.message,
      }));
      toast.error(info.message);
      throw error;
    }
  }, []);

  const withdrawApplication = useCallback(async (applicationId: string) => {
    try {
      await applicationApi.withdraw(applicationId);
      toast.success("Application withdrawn");
      // Optimistically update local state
      setState((prev) => ({
        ...prev,
        applications: prev.applications.map((a) =>
          a.id === applicationId ? { ...a, status: "withdrawn" as any } : a
        ),
      }));
    } catch (error) {
      const message = getErrorMessage(error);
      toast.error(message);
      throw error;
    }
  }, []);

  return {
    ...state,
    fetchMyApplications,
    applyToJob,
    autoApply,
    withdrawApplication,
  };
}

export default useApplications;
