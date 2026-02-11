import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  // Run setup file before tests - this ensures integration tests use the correct database
  setupFilesAfterEnv: ['<rootDir>/tests/integration/jest.setup.ts'],
  moduleNameMapper: {
    // Map path aliases
    '^@/(.*)\\.js$': '<rootDir>/src/$1',
    '^@/(.*)$': '<rootDir>/src/$1',
    // Map @nexgent/shared and handle nested imports
    '^@nexgent/shared$': '<rootDir>/../shared/src/index.ts',
    '^@nexgent/shared/(.*)\\.js$': '<rootDir>/../shared/src/$1.ts',
    '^@nexgent/shared/(.*)$': '<rootDir>/../shared/src/$1',
    // Map relative imports with .js extension to .ts files
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: {
            module: 'es2020',
            moduleResolution: 'node',
            allowJs: true, // Allow JS files to be compiled
            // Ensure we don't emit declarations or other things that confuse Jest
            declaration: false,
            noEmit: false, 
        }
      },
    ],
    // Add transform for JS files in packages/shared
    '^.+\\.js$': ['babel-jest', { presets: [['@babel/preset-env', { targets: { node: 'current' } }]] }],
  },
  transformIgnorePatterns: [
    // Don't ignore packages/shared so it gets transformed
    '/node_modules/',
    '\\\\.pnpm\\\\',
  ],
  modulePathIgnorePatterns: ['<rootDir>/dist/'],
  testMatch: ['**/*.test.ts', '**/__tests__/**/*.ts'],
  testTimeout: 30000,
  // Teardown in jest.setup.ts closes queue workers, queue client, and Redis after each file
  // so the process can exit without forceExit. If the process still hangs, run with
  // --detectOpenHandles to find remaining open handles.
  forceExit: false,
  // Prevent coverage regression; ratchet thresholds up over time (e.g. when adding tests).
  // Current baseline from unit tests only; run with --coverage to enforce.
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 17,
      functions: 27,
      lines: 24,
      statements: 24,
    },
  },
};

export default config;
