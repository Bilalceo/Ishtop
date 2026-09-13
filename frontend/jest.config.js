/**
 * =============================================================================
 * JEST CONFIGURATION
 * =============================================================================
 * 
 * Jest configuration for React Testing Library tests.
 * Run tests with: npm test
 */

const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // Provide the path to your Next.js app
  dir: './',
});

/** @type {import('jest').Config} */
const customJestConfig = {
  // Test environment
  testEnvironment: 'jest-environment-jsdom',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Module paths
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  // Test file patterns
  // Only actual test files. The first pattern used to be
  // '**/__tests__/**/*.[jt]s?(x)', which collected helpers like test-utils.tsx
  // as suites and then failed them for containing no tests.
  testMatch: ['**/?(*.)+(spec|test).[jt]s?(x)'],
  
  // The standalone build copies package.json, which jest-haste-map then reports
  // as a duplicate module name on every run.
  modulePathIgnorePatterns: ['<rootDir>/.next/'],

  // Files to ignore
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/.next/',
    // The Playwright suites live in tests/e2e, not e2e — jest was collecting
    // them and failing on `import { test } from '@playwright/test'`.
    '<rootDir>/tests/e2e/',
    '<rootDir>/e2e/',
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/index.{js,ts}',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
  
  // Transform configuration
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Verbose output
  verbose: true,
  
  // Test timeout
  testTimeout: 10000,
};

module.exports = createJestConfig(customJestConfig);
















