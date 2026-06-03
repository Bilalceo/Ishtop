/**
 * =============================================================================
 * RESUME STORE - Zustand State Management
 * =============================================================================
 *
 * Handles resume state:
 * - List of resumes
 * - Current resume being edited
 * - CRUD operations
 * - AI generation
 */

import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { Resume, ResumeContent } from "@/types/api";

// =============================================================================
// TYPES
// =============================================================================

interface ResumeState {
  // State
  resumes: Resume[];
  currentResume: Resume | null;
  isLoading: boolean;
  isGenerating: boolean;
  error: string | null;
  
  // Actions
  fetchResumes: () => Promise<void>;
  fetchResume: (id: string) => Promise<Resume | null>;
  createResume: (data: CreateResumeData) => Promise<Resume>;
  generateAI: (data: GenerateResumeData) => Promise<Resume>;
  updateResume: (id: string, data: Partial<Resume>) => Promise<void>;
  deleteResume: (id: string) => Promise<void>;
  publishResume: (id: string) => Promise<void>;
  archiveResume: (id: string) => Promise<void>;
  setCurrentResume: (resume: Resume | null) => void;
  clearError: () => void;
}

interface CreateResumeData {
  title: string;
  content: ResumeContent;
}

interface GenerateResumeData {
  personalInfo: {
    name: string;
    email: string;
    phone?: string;
    location?: string;
    professionalTitle?: string;
    linkedinUrl?: string;
    portfolioUrl?: string;
  };
  experience: Array<{
    company: string;
    position: string;
    startDate: string;
    endDate?: string;
    isCurrent?: boolean;
    description: string;
  }>;
  education: Array<{
    institution: string;
    degree: string;
    field?: string;
    year: string;
  }>;
  skills: {
    technical: string[];
    soft: string[];
  };
  languages?: Array<{
    name: string;
    proficiency: string;
  }>;
  template?: "modern" | "classic" | "minimal" | "creative";
  tone?: "professional" | "confident" | "friendly" | "technical";
}

// =============================================================================
// STORE
// =============================================================================

export const useResumeStore = create<ResumeState>()(
  immer((set, get) => ({
    // Initial state
    resumes: [],
    currentResume: null,
    isLoading: false,
    isGenerating: false,
    error: null,

    // Fetch all resumes
    fetchResumes: async () => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Mock data
        const mockResumes: Resume[] = [
          {
            id: "resume-1",
            user_id: "user-1",
            title: "Senior Software Engineer Resume",
            content: {
              personal_info: {
                name: "John Doe",
                email: "john@example.com",
                professional_title: "Senior Software Engineer",
              },
              skills: {
                technical: ["Python", "FastAPI", "PostgreSQL"],
                soft: ["Leadership", "Communication"],
              },
            },
            ai_generated: true,
            status: "published",
            view_count: 45,
            ats_score: 92,
            created_at: "2024-01-15T10:00:00Z",
            updated_at: "2024-01-20T14:30:00Z",
          },
        ];

        set((state) => {
          state.resumes = mockResumes;
          state.isLoading = false;
        });
      } catch (error: any) {
        set((state) => {
          state.isLoading = false;
          state.error = error.message || "Failed to fetch resumes";
        });
      }
    },

    // Fetch single resume
    fetchResume: async (id) => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500));

        const resume = get().resumes.find((r) => r.id === id) || null;

        set((state) => {
          state.currentResume = resume;
          state.isLoading = false;
        });

        return resume;
      } catch (error: any) {
        set((state) => {
          state.isLoading = false;
          state.error = error.message || "Failed to fetch resume";
        });
        return null;
      }
    },

    // Create resume
    createResume: async (data) => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500));

        const newResume: Resume = {
          id: `resume-${Date.now()}`,
          user_id: "user-1",
          title: data.title,
          content: data.content,
          ai_generated: false,
          status: "draft",
          view_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        set((state) => {
          state.resumes.unshift(newResume);
          state.currentResume = newResume;
          state.isLoading = false;
        });

        return newResume;
      } catch (error: any) {
        set((state) => {
          state.isLoading = false;
          state.error = error.message || "Failed to create resume";
        });
        throw error;
      }
    },

    // Generate AI resume
    generateAI: async (data) => {
      set((state) => {
        state.isGenerating = true;
        state.error = null;
      });

      try {
        // Simulate AI generation (takes longer)
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const newResume: Resume = {
          id: `resume-${Date.now()}`,
          user_id: "user-1",
          title: `${data.personalInfo.name} - ${data.template || "Modern"} Resume`,
          content: {
            personal_info: {
              name: data.personalInfo.name,
              email: data.personalInfo.email,
              phone: data.personalInfo.phone,
              location: data.personalInfo.location,
              professional_title: data.personalInfo.professionalTitle,
              linkedin_url: data.personalInfo.linkedinUrl,
              portfolio_url: data.personalInfo.portfolioUrl,
            },
            summary: "AI-generated professional summary based on your experience and skills...",
            experience: data.experience.map((exp) => ({
              company: exp.company,
              position: exp.position,
              start_date: exp.startDate,
              end_date: exp.endDate,
              is_current: exp.isCurrent,
              description: exp.description,
              achievements: ["Achievement 1", "Achievement 2"],
            })),
            education: data.education.map((edu) => ({
              institution: edu.institution,
              degree: edu.degree,
              field: edu.field,
              year: edu.year,
            })),
            skills: data.skills,
            languages: data.languages,
          },
          ai_generated: true,
          status: "draft",
          view_count: 0,
          ats_score: 92,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        set((state) => {
          state.resumes.unshift(newResume);
          state.currentResume = newResume;
          state.isGenerating = false;
        });

        return newResume;
      } catch (error: any) {
        set((state) => {
          state.isGenerating = false;
          state.error = error.message || "Failed to generate resume";
        });
        throw error;
      }
    },

    // Update resume
    updateResume: async (id, data) => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500));

        set((state) => {
          const index = state.resumes.findIndex((r) => r.id === id);
          if (index !== -1) {
            state.resumes[index] = {
              ...state.resumes[index],
              ...data,
              updated_at: new Date().toISOString(),
            };
            if (state.currentResume?.id === id) {
              state.currentResume = state.resumes[index];
            }
          }
          state.isLoading = false;
        });
      } catch (error: any) {
        set((state) => {
          state.isLoading = false;
          state.error = error.message || "Failed to update resume";
        });
        throw error;
      }
    },

    // Delete resume
    deleteResume: async (id) => {
      set((state) => {
        state.isLoading = true;
        state.error = null;
      });

      try {
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500));

        set((state) => {
          state.resumes = state.resumes.filter((r) => r.id !== id);
          if (state.currentResume?.id === id) {
            state.currentResume = null;
          }
          state.isLoading = false;
        });
      } catch (error: any) {
        set((state) => {
          state.isLoading = false;
          state.error = error.message || "Failed to delete resume";
        });
        throw error;
      }
    },

    // Publish resume
    publishResume: async (id) => {
      await get().updateResume(id, { status: "published" });
    },

    // Archive resume
    archiveResume: async (id) => {
      await get().updateResume(id, { status: "archived" });
    },

    // Set current resume
    setCurrentResume: (resume) =>
      set((state) => {
        state.currentResume = resume;
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

export const selectResumes = (state: ResumeState) => state.resumes;
export const selectCurrentResume = (state: ResumeState) => state.currentResume;
export const selectIsLoading = (state: ResumeState) => state.isLoading;
export const selectIsGenerating = (state: ResumeState) => state.isGenerating;
export const selectError = (state: ResumeState) => state.error;
