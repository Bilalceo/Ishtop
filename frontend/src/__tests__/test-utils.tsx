/**
 * =============================================================================
 * TEST UTILITIES
 * =============================================================================
 * 
 * Custom render function and test utilities for React Testing Library.
 */

import React, { ReactElement, ReactNode } from 'react';
import { render, RenderOptions, RenderResult } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// =============================================================================
// MOCK PROVIDERS
// =============================================================================

interface MockProvidersProps {
  children: ReactNode;
}

/**
 * Mock providers wrapper for tests
 */
function MockProviders({ children }: MockProvidersProps) {
  return <>{children}</>;
}

// =============================================================================
// CUSTOM RENDER
// =============================================================================

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  initialState?: Record<string, unknown>;
}

/**
 * Custom render function that wraps components with necessary providers
 */
function customRender(
  ui: ReactElement,
  options?: CustomRenderOptions
): RenderResult & { user: ReturnType<typeof userEvent.setup> } {
  const user = userEvent.setup();
  
  const renderResult = render(ui, {
    wrapper: MockProviders,
    ...options,
  });

  return {
    ...renderResult,
    user,
  };
}

// =============================================================================
// MOCK DATA GENERATORS
// =============================================================================

/**
 * Generate mock user data
 */
export function createMockUser(overrides = {}) {
  return {
    id: 'user-123',
    email: 'test@example.com',
    full_name: 'Test User',
    phone: '+998901234567',
    role: 'student' as const,
    is_active: true,
    is_verified: true,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Generate mock resume data
 */
export function createMockResume(overrides = {}) {
  return {
    id: 'resume-123',
    user_id: 'user-123',
    title: 'Software Engineer Resume',
    content: {
      personal_info: {
        name: 'John Doe',
        email: 'john@example.com',
        phone: '+998901234567',
        professional_title: 'Software Engineer',
      },
      experience: [
        {
          company: 'Tech Corp',
          position: 'Senior Developer',
          start_date: '2020-01',
          end_date: '2024-01',
          description: 'Built applications',
          achievements: ['Achievement 1', 'Achievement 2'],
        },
      ],
      education: [
        {
          institution: 'University',
          degree: "Bachelor's",
          field: 'Computer Science',
          year: '2019',
        },
      ],
      skills: {
        technical: ['Python', 'React', 'TypeScript'],
        soft: ['Leadership', 'Communication'],
      },
    },
    ai_generated: false,
    status: 'published' as const,
    view_count: 25,
    ats_score: 85,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Generate mock job data
 */
export function createMockJob(overrides = {}) {
  return {
    id: 'job-123',
    company_id: 'company-123',
    title: 'Senior Backend Developer',
    description: 'We are looking for an experienced developer...',
    requirements: {
      skills: ['Python', 'FastAPI', 'PostgreSQL'],
      experience: '5+ years',
      education: "Bachelor's in CS",
    },
    salary_min: 3000,
    salary_max: 5000,
    location: 'Tashkent',
    job_type: 'full_time' as const,
    experience_level: 'senior' as const,
    status: 'active' as const,
    applications_count: 45,
    views_count: 892,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    company: {
      name: 'Tech Corp',
      logo_url: '/logos/tech.png',
    },
    ...overrides,
  };
}

/**
 * Generate mock application data
 */
export function createMockApplication(overrides = {}) {
  return {
    id: 'app-123',
    job_id: 'job-123',
    user_id: 'user-123',
    resume_id: 'resume-123',
    cover_letter: 'I am excited to apply...',
    status: 'pending' as const,
    applied_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

// =============================================================================
// ASYNC UTILITIES
// =============================================================================

/**
 * Wait for loading state to resolve
 */
export async function waitForLoadingToFinish() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * Create a deferred promise for testing async operations
 */
export function createDeferred<T>() {
  let resolve: (value: T) => void;
  let reject: (reason?: unknown) => void;
  
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve: resolve!, reject: reject! };
}

// =============================================================================
// MOCK API RESPONSES
// =============================================================================

export const mockApiResponses = {
  loginSuccess: {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    token_type: 'bearer',
    user: createMockUser(),
  },
  registerSuccess: {
    access_token: 'mock-access-token',
    refresh_token: 'mock-refresh-token',
    token_type: 'bearer',
    user: createMockUser(),
  },
  resumeList: [createMockResume(), createMockResume({ id: 'resume-456', title: 'Resume 2' })],
  jobList: [createMockJob(), createMockJob({ id: 'job-456', title: 'Frontend Developer' })],
  applicationList: [createMockApplication()],
};

// =============================================================================
// RE-EXPORTS
// =============================================================================

export * from '@testing-library/react';
export { customRender as render };
export { userEvent };
















