/**
 * Account lockout utility unit tests
 *
 * Tests isAccountLocked, getLockoutInfo (pure), and incrementFailedAttempts /
 * resetFailedAttempts with mocked Prisma.
 */

import {
  isAccountLocked,
  getLockoutInfo,
  incrementFailedAttempts,
  resetFailedAttempts,
} from '@/shared/utils/auth/account-lockout.js';

jest.mock('@/infrastructure/database/client.js', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  },
}));

import { prisma } from '@/infrastructure/database/client.js';

type MockedUser = {
  findUnique: jest.Mock;
  update: jest.Mock;
};
const mockPrisma = prisma as unknown as { user: MockedUser };

describe('isAccountLocked', () => {
  it('should return false when lockedUntil is null', () => {
    expect(
      isAccountLocked({ lockedUntil: null, failedLoginAttempts: 5 })
    ).toBe(false);
  });

  it('should return false when lockout has expired', () => {
    const pastDate = new Date(Date.now() - 60000);
    expect(
      isAccountLocked({ lockedUntil: pastDate, failedLoginAttempts: 5 })
    ).toBe(false);
  });

  it('should return true when lockedUntil is in the future', () => {
    const futureDate = new Date(Date.now() + 900000);
    expect(
      isAccountLocked({ lockedUntil: futureDate, failedLoginAttempts: 5 })
    ).toBe(true);
  });
});

describe('getLockoutInfo', () => {
  it('should return correct info when not locked', () => {
    const info = getLockoutInfo({
      lockedUntil: null,
      failedLoginAttempts: 2,
    });
    expect(info.isLocked).toBe(false);
    expect(info.failedAttempts).toBe(2);
    expect(info.remainingAttempts).toBe(3);
    expect(info.lockedUntil).toBeNull();
  });

  it('should return remainingAttempts 0 when at threshold', () => {
    const info = getLockoutInfo({
      lockedUntil: null,
      failedLoginAttempts: 5,
    });
    expect(info.remainingAttempts).toBe(0);
  });

  it('should return isLocked true when lockedUntil is in future', () => {
    const futureDate = new Date(Date.now() + 900000);
    const info = getLockoutInfo({
      lockedUntil: futureDate,
      failedLoginAttempts: 5,
    });
    expect(info.isLocked).toBe(true);
    expect(info.lockedUntil).toEqual(futureDate);
  });
});

describe('incrementFailedAttempts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should increment attempts and not lock when below threshold', async () => {
    const userId = 'user-123';
    mockPrisma.user.findUnique.mockResolvedValue({
      failedLoginAttempts: 2,
      lockedUntil: null,
    });
    mockPrisma.user.update.mockResolvedValue({
      id: userId,
      failedLoginAttempts: 3,
      lockedUntil: null,
    });

    const result = await incrementFailedAttempts(userId);

    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: userId },
      select: { failedLoginAttempts: true, lockedUntil: true },
    });
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { failedLoginAttempts: 3, lockedUntil: null },
    });
    expect(result.failedLoginAttempts).toBe(3);
    expect(result.lockedUntil).toBeNull();
  });

  it('should lock account when threshold reached (5 attempts)', async () => {
    const userId = 'user-456';
    mockPrisma.user.findUnique.mockResolvedValue({
      failedLoginAttempts: 4,
      lockedUntil: null,
    });
    const lockedUntil = new Date(Date.now() + 900000);
    mockPrisma.user.update.mockImplementation(
      (args: { data: { failedLoginAttempts: number; lockedUntil: Date | null } }) => {
        expect(args.data.failedLoginAttempts).toBe(5);
        expect(args.data.lockedUntil).toBeInstanceOf(Date);
        return Promise.resolve({
          id: userId,
          failedLoginAttempts: 5,
          lockedUntil: args.data.lockedUntil,
        });
      }
    );

    const result = await incrementFailedAttempts(userId);

    expect(result.failedLoginAttempts).toBe(5);
    expect(result.lockedUntil).toBeInstanceOf(Date);
  });

  it('should throw when user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    await expect(incrementFailedAttempts('nonexistent')).rejects.toThrow(
      'User not found'
    );
  });
});

describe('resetFailedAttempts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should reset failedAttempts and lockedUntil to zero/null', async () => {
    const userId = 'user-789';
    mockPrisma.user.update.mockResolvedValue({});

    await resetFailedAttempts(userId);

    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: userId },
      data: { failedLoginAttempts: 0, lockedUntil: null },
    });
  });
});
