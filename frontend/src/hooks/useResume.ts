/**
 * =============================================================================
 * useResume Hook
 * =============================================================================
 *
 * Custom hook for resume operations
 */

"use client";

import { useCallback, useState } from "react";
import axios from "axios";
import type { Resume } from "@/types/api";
import { resumeApi, getErrorMessage } from "@/lib/api";
import { toast } from "sonner";
import { getPreferredLocale } from "@/lib/i18n";

// =============================================================================
// TYPES
// =============================================================================

interface ResumeState {
  resumes: Resume[];
  currentResume: Resume | null;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
}

interface CreateResumeData {
  title: string;
  content: Record<string, any>;
}

interface GenerateResumeData {
  user_data: {
    name: string;
    email: string;
    phone?: string;
    location?: string;
    professional_title?: string;
    linkedin_url?: string;
    portfolio_url?: string;
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
  language?: "uz" | "ru" | "en";
  // Optional skill verification statuses (frontend MVP), persisted into
  // resume.content.skillVerifications so the preview/PDF can show them.
  skill_verifications?: Record<string, "verified" | "learning" | "unverified">;
}

const TRANSIENT_AI_ERROR_REGEX =
  /(unavailable|rate.?limit|too many requests|overload|temporar(?:y|ily)|try again|throttl(?:e|ed|ing)|busy)/i;

function collectErrorStrings(value: unknown): string[] {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectErrorStrings(item));
  }

  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap((item) =>
      collectErrorStrings(item)
    );
  }

  return [];
}

function isTransientAIOverloadError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) {
    return false;
  }

  const status = error.response?.status;
  if (status === 429 || status === 503) {
    return true;
  }

  const data = error.response?.data;
  const messageCandidates = [
    error.message,
    ...collectErrorStrings(data),
  ].filter(Boolean);

  return messageCandidates.some((message) =>
    TRANSIENT_AI_ERROR_REGEX.test(message)
  );
}

const TRANSIENT_AI_RETRY_MESSAGE =
  "AI xizmati vaqtincha band. 20-60 soniyadan keyin qayta urinib ko'ring. Сервис временно перегружен, попробуйте снова через 20-60 секунд.";

const resumeMessages = {
  uz: {
    created: "Rezyume yaratildi",
    generated: "AI rezyume muvaffaqiyatli yaratildi",
    updated: "Rezyume yangilandi",
    deleted: "Rezyume o'chirildi",
    published: "Rezyume e'lon qilindi",
    archived: "Rezyume arxivlandi",
    downloadStarted: "Rezyume PDF yuklab olish boshlandi",
    generateFailed: "AI orqali rezyume yaratib bo'lmadi",
  },
  ru: {
    created: "Резюме создано",
    generated: "AI-резюме успешно создано",
    updated: "Резюме обновлено",
    deleted: "Резюме удалено",
    published: "Резюме опубликовано",
    archived: "Резюме архивировано",
    downloadStarted: "Загрузка PDF резюме началась",
    generateFailed: "Не удалось создать резюме через AI",
  },
} as const;

function resumeMessage(key: keyof (typeof resumeMessages)["uz"]): string {
  const locale = getPreferredLocale();
  return resumeMessages[locale][key];
}

function unwrapApiData<T>(payload: unknown): T {
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const record = payload as Record<string, unknown>;

    if (record.data !== undefined) {
      return unwrapApiData<T>(record.data);
    }

    if (record.result !== undefined) {
      return unwrapApiData<T>(record.result);
    }
  }

  return payload as T;
}

function isResumeLike(value: unknown): value is Resume {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    "id" in value &&
    "title" in value &&
    "content" in value
  );
}

function extractResumeList(payload: unknown): Resume[] {
  const data = unwrapApiData<{
    resumes?: Resume[];
    items?: Resume[];
  } | Resume[] | null>(payload);

  if (Array.isArray(data)) {
    return data;
  }

  if (data && typeof data === "object") {
    const record = data as { resumes?: Resume[]; items?: Resume[] };

    if (Array.isArray(record.resumes)) {
      return record.resumes;
    }

    if (Array.isArray(record.items)) {
      return record.items;
    }
  }

  return [];
}

function extractResume(payload: unknown): Resume {
  const data = unwrapApiData<Record<string, unknown> | Resume>(payload);

  if (isResumeLike(data)) {
    return data;
  }

  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;

    if (isResumeLike(record.resume)) {
      return record.resume;
    }

    if (isResumeLike(record.item)) {
      return record.item;
    }
  }

  throw new Error("Unexpected resume response format");
}

// =============================================================================
// HOOK
// =============================================================================

export function useResume() {
  const [state, setState] = useState<ResumeState>({
    resumes: [],
    currentResume: null,
    isLoading: false,
    isGenerating: false,
    error: null,
  });

  // Fetch all resumes
  const fetchResumes = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await resumeApi.list();
      const resumes = extractResumeList(response.data);

      setState((prev) => ({
        ...prev,
        resumes,
        isLoading: false,
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
  }, []);

  // Fetch single resume
  const fetchResume = useCallback(async (id: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await resumeApi.get(id);
      const resume = extractResume(response.data);

      setState((prev) => ({
        ...prev,
        currentResume: resume,
        isLoading: false,
      }));
      return resume;
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

  // Create resume manually
  const createResume = useCallback(async (data: CreateResumeData) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await resumeApi.create(data);
      const newResume = extractResume(response.data);

      setState((prev) => ({
        ...prev,
        resumes: [newResume, ...prev.resumes],
        currentResume: newResume,
        isLoading: false,
      }));

      toast.success(resumeMessage("created"));
      return newResume;
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

  // Generate resume with AI
  const generateResume = useCallback(async (data: GenerateResumeData) => {
    setState((prev) => ({ ...prev, isGenerating: true, error: null }));

    try {
      const response = await resumeApi.generateAI(data);
      const result = unwrapApiData<{
        success: boolean;
        message?: string;
        resume?: Resume;
      }>(response.data);

      if (result.success === false) {
        throw new Error(result.message || resumeMessage("generateFailed"));
      }

      const newResume = extractResume(result);

      setState((prev) => ({
        ...prev,
        resumes: [newResume, ...prev.resumes],
        currentResume: newResume,
        isGenerating: false,
      }));

      toast.success(resumeMessage("generated"));
      return newResume;
    } catch (error) {
      const message = isTransientAIOverloadError(error)
        ? TRANSIENT_AI_RETRY_MESSAGE
        : getErrorMessage(error);
      setState((prev) => ({
        ...prev,
        isGenerating: false,
        error: message,
      }));
      toast.error(message);
      throw error;
    }
  }, []);

  // Update resume
  const updateResume = useCallback(async (id: string, data: Partial<Resume>) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await resumeApi.update(id, data);
      const updated = extractResume(response.data);

      setState((prev) => ({
        ...prev,
        resumes: prev.resumes.map((r) =>
          r.id === id ? updated : r
        ),
        currentResume:
          prev.currentResume?.id === id
            ? updated
            : prev.currentResume,
        isLoading: false,
      }));
      toast.success(resumeMessage("updated"));
      return updated;
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

  // Delete resume
  const deleteResume = useCallback(async (id: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      await resumeApi.delete(id);

      setState((prev) => ({
        ...prev,
        resumes: prev.resumes.filter((r) => r.id !== id),
        currentResume: prev.currentResume?.id === id ? null : prev.currentResume,
        isLoading: false,
      }));
      toast.success(resumeMessage("deleted"));
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

  // Publish resume
  const publishResume = useCallback(async (id: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await resumeApi.publish(id);
      const updated = extractResume(response.data);

      setState((prev) => ({
        ...prev,
        resumes: prev.resumes.map((r) => (r.id === id ? updated : r)),
        currentResume: prev.currentResume?.id === id ? updated : prev.currentResume,
        isLoading: false,
      }));

      toast.success(resumeMessage("published"));
      return updated;
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

  // Archive resume
  const archiveResume = useCallback(async (id: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await resumeApi.archive(id);
      const updated = extractResume(response.data);

      setState((prev) => ({
        ...prev,
        resumes: prev.resumes.map((r) => (r.id === id ? updated : r)),
        currentResume: prev.currentResume?.id === id ? updated : prev.currentResume,
        isLoading: false,
      }));

      toast.success(resumeMessage("archived"));
      return updated;
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

  // Download resume as PDF
  const downloadResume = useCallback(async (id: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const response = await resumeApi.download(id);
      const blob = response.data as Blob;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "resume.pdf";
      a.click();
      window.URL.revokeObjectURL(url);

      setState((prev) => ({
        ...prev,
        isLoading: false,
      }));
      toast.success(resumeMessage("downloadStarted"));
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

  return {
    ...state,
    fetchResumes,
    fetchResume,
    createResume,
    generateResume,
    updateResume,
    deleteResume,
    publishResume,
    archiveResume,
    downloadResume,
  };
}

export default useResume;
