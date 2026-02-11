/**
 * Safe localStorage utilities
 * 
 * Provides type-safe, error-handled access to localStorage.
 * Handles SSR safety, quota errors, and private browsing mode.
 */

/**
 * Get a value from localStorage
 * 
 * @param key - Storage key
 * @param defaultValue - Default value to return if key doesn't exist or error occurs
 * @returns The stored value or defaultValue
 * 
 * @example
 * ```ts
 * const preference = storage.get('currencyPreference', 'USD');
 * ```
 */
export function getStorageItem<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') {
    return defaultValue;
  }

  try {
    const item = localStorage.getItem(key);
    if (item === null) {
      return defaultValue;
    }
    return JSON.parse(item) as T;
  } catch (error) {
    console.warn(`Failed to read ${key} from localStorage:`, error);
    return defaultValue;
  }
}

/**
 * Get a string value from localStorage (non-JSON)
 * 
 * Useful for simple string values that don't need JSON parsing.
 * 
 * @param key - Storage key
 * @param defaultValue - Default value to return if key doesn't exist or error occurs
 * @returns The stored string value or defaultValue
 * 
 * @example
 * ```ts
 * const agentId = storage.getString('selectedAgentId', null);
 * ```
 */
export function getStorageString(key: string, defaultValue: string | null): string | null {
  if (typeof window === 'undefined') {
    return defaultValue;
  }

  try {
    return localStorage.getItem(key) ?? defaultValue;
  } catch (error) {
    console.warn(`Failed to read ${key} from localStorage:`, error);
    return defaultValue;
  }
}

/**
 * Set a value in localStorage
 * 
 * @param key - Storage key
 * @param value - Value to store (will be JSON stringified)
 * @returns true if successful, false otherwise
 * 
 * @example
 * ```ts
 * storage.setItem('currencyPreference', 'USD');
 * ```
 */
export function setStorageItem<T>(key: string, value: T): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`Failed to save ${key} to localStorage:`, error);
    return false;
  }
}

/**
 * Set a string value in localStorage (non-JSON)
 * 
 * Useful for simple string values that don't need JSON stringification.
 * 
 * @param key - Storage key
 * @param value - String value to store
 * @returns true if successful, false otherwise
 * 
 * @example
 * ```ts
 * storage.setString('selectedAgentId', 'agent-123');
 * ```
 */
export function setStorageString(key: string, value: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn(`Failed to save ${key} to localStorage:`, error);
    return false;
  }
}

/**
 * Remove a value from localStorage
 * 
 * @param key - Storage key to remove
 * @returns true if successful, false otherwise
 * 
 * @example
 * ```ts
 * storage.removeItem('selectedAgentId');
 * ```
 */
export function removeStorageItem(key: string): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.warn(`Failed to remove ${key} from localStorage:`, error);
    return false;
  }
}

/**
 * Storage utility object with all methods
 * 
 * @example
 * ```ts
 * import { storage } from '@/lib/utils/storage';
 * 
 * storage.set('key', value);
 * const value = storage.get('key', defaultValue);
 * storage.remove('key');
 * ```
 */
export const storage = {
  get: getStorageItem,
  getString: getStorageString,
  set: setStorageItem,
  setString: setStorageString,
  remove: removeStorageItem,
};

