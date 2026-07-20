import { describe, expect, it } from 'vitest';
import { getUserFacingError } from '@/lib/user-facing-error';

describe('getUserFacingError', () => {
  it('hides backend request details and configuration names', () => {
    const raw = new Error(
      '[Request ID: abc123] Server Error Missing environment variable `JWT_PRIVATE_KEY`',
    );

    const result = getUserFacingError(raw);

    expect(result).toBe(
      'TaskLabs is not fully available right now. Please try again shortly.',
    );
    expect(result).not.toContain('JWT_PRIVATE_KEY');
    expect(result).not.toContain('Request ID');
  });

  it('maps known workflow errors to useful copy', () => {
    expect(getUserFacingError(new Error('Setup already complete'))).toBe(
      'Setup has already been completed. Sign in to continue.',
    );
  });

  it('uses the supplied safe fallback for unknown errors', () => {
    expect(getUserFacingError(new Error('sensitive internal detail'), 'Try later.')).toBe(
      'Try later.',
    );
  });
});
