// Shared TypeScript types
// Types will be added as we migrate code

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// Trading configuration types
export * from './trading-config.js';
export * from './trading-config-validation.js';

// Agent position types
export * from './agent-position.js';

// API types
export * from './api/index.js';
