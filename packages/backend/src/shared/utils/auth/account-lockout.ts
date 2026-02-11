/**
 * Account lockout utilities
 * 
 * Handles account lockout logic to prevent brute-force attacks.
 * Locks accounts after a configurable number of failed login attempts.
 */

import { prisma } from '@/infrastructure/database/client.js';

// Account lockout configuration
const LOCKOUT_ATTEMPTS = 5; // Lock account after 5 failed attempts
const LOCKOUT_DURATION_MS = 900000; // 15 minutes lockout duration

/**
 * Checks if an account is currently locked
 * 
 * @param user - User object with lockout fields
 * @returns True if account is locked, false otherwise
 */
export function isAccountLocked(user: {
  lockedUntil: Date | null;
  failedLoginAttempts: number;
}): boolean {
  if (!user.lockedUntil) {
    return false;
  }

  // Check if lockout period has expired
  if (user.lockedUntil < new Date()) {
    return false;
  }

  return true;
}

/**
 * Increments failed login attempts and locks account if threshold reached
 * 
 * @param userId - User ID to update
 * @returns Updated user with lockout information
 */
export async function incrementFailedAttempts(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { failedLoginAttempts: true, lockedUntil: true },
  });

  if (!user) {
    throw new Error('User not found');
  }

  const newAttempts = user.failedLoginAttempts + 1;
  const shouldLock = newAttempts >= LOCKOUT_ATTEMPTS;

  const lockedUntil = shouldLock
    ? new Date(Date.now() + LOCKOUT_DURATION_MS)
    : null;

  return await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: newAttempts,
      lockedUntil,
    },
  });
}

/**
 * Resets failed login attempts (called on successful login)
 * 
 * @param userId - User ID to reset
 */
export async function resetFailedAttempts(userId: string) {
  await prisma.user.update({
    where: { id: userId },
    data: {
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });
}

/**
 * Gets lockout information for a user
 * 
 * @param user - User object with lockout fields
 * @returns Lockout information
 */
export function getLockoutInfo(user: {
  lockedUntil: Date | null;
  failedLoginAttempts: number;
}): {
  isLocked: boolean;
  lockedUntil: Date | null;
  failedAttempts: number;
  remainingAttempts: number;
} {
  const isLocked = isAccountLocked(user);
  const remainingAttempts = Math.max(
    0,
    LOCKOUT_ATTEMPTS - user.failedLoginAttempts
  );

  return {
    isLocked,
    lockedUntil: user.lockedUntil,
    failedAttempts: user.failedLoginAttempts,
    remainingAttempts,
  };
}

