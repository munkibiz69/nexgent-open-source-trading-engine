/**
 * Theme configuration
 * 
 * Centralized theme values for colors, spacing, and styling.
 * This makes the design system easily customizable and maintainable.
 * 
 * @module shared/config
 * 
 * @example
 * ```tsx
 * import { theme } from '@/shared/config/theme.config';
 * 
 * <div style={{ backgroundColor: theme.colors.background.card }}>
 *   Content
 * </div>
 * ```
 */

/**
 * Theme configuration object
 * 
 * Contains all design tokens used throughout the application.
 * Colors are defined as hex values for consistency.
 */
export const theme = {
  /**
   * Color palette
   * 
   * All colors used in the application should reference these values.
   */
  colors: {
    /**
     * Background colors
     */
    background: {
      /** Page background color (black) */
      page: '#000000',
      /** Card/container background color (dark gray) */
      card: '#121212',
      /** Input field background */
      input: 'rgba(31, 31, 31, 0.5)', // gray-800/50
      /** Mobile sidebar background - matches reference project */
      mobileSidebar: '#18181b', // zinc-900
    },
    /**
     * Border colors
     */
    border: {
      /** Default border color */
      default: '#262626',
    },
    /**
     * Accent colors
     */
    accent: {
      /** Primary accent color (green) - matches reference project #16B364 */
      primary: '#16B364',
      /** Primary accent color hover state */
      primaryHover: 'rgba(22, 179, 100, 0.9)',
    },
    /**
     * Text colors
     */
    text: {
      /** Primary text color (white) */
      primary: '#FFFFFF',
      /** Secondary text color (light gray) */
      secondary: '#9CA3AF', // gray-400
      /** Muted text color (darker gray) */
      muted: '#6B7280', // gray-500
    },
    /**
     * Error/destructive colors
     */
    error: {
      /** Error background */
      background: 'rgba(239, 68, 68, 0.15)', // red-500/15
      /** Error text */
      text: '#F87171', // red-400
    },
  },
  /**
   * Spacing and dimensions
   */
  spacing: {
    /** Standard button height */
    buttonHeight: '44px',
    /** Border width */
    borderWidth: '1px',
  },
  /**
   * Border radius values
   */
  radius: {
    /** Default border radius */
    default: '0.75rem', // rounded-xl
  },
} as const;

/**
 * Type for theme colors
 */
export type ThemeColors = typeof theme.colors;

/**
 * Type for theme spacing
 */
export type ThemeSpacing = typeof theme.spacing;

