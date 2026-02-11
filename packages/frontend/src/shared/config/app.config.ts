/**
 * Application configuration
 * 
 * Centralized configuration for URLs, feature flags, and other settings.
 * Values can be overridden via environment variables for different deployments.
 */

/**
 * Application configuration object
 * 
 * Contains all configurable values that may vary between deployments.
 */
export const config = {
  /**
   * External URLs
   * 
   * All external links should reference these values.
   * Can be overridden via environment variables.
   */
  urls: {
    /**
     * Home page URL
     * 
     * @default 'https://nexgent.ai/'
     */
    home: process.env.NEXT_PUBLIC_HOME_URL || 'https://nexgent.ai/',
    /**
     * Documentation and resource URLs
     */
    docs: {
      /**
       * Platform documentation URL
       */
      platform: 'https://docs.nexgent.ai/trading-engine',
      /**
       * API documentation URL
       */
      api: 'https://docs.nexgent.ai/trading-engine/api-reference/overview',
      /**
       * Changelog URL (GitHub releases)
       */
      changelog: 'https://github.com/Nexgent-ai/nexgent-open-source-trading-engine/releases',
    },
  },
} as const;

/**
 * Type for application configuration
 */
export type AppConfig = typeof config;

