// Shared utilities
// Utilities will be added as we migrate code

export const formatDate = (date: Date): string => {
  return date.toISOString();
};

// Stop loss calculator utilities
export * from './stop-loss-calculator.js';

// Take-profit calculator utilities
export * from './take-profit-calculator.js';

