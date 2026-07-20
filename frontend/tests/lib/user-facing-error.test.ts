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

  it('keeps Telegram recovery steps while hiding Convex details', () => {
    const missingStart = new Error(
      '[CONVEX A(telegram:linkChatFromStart)] [Request ID: abc] Server Error Uncaught Error: No /start message found. Send /start to your bot. at handler (convex/telegram.ts:223:10)',
    );
    const notLinked = new Error(
      '[CONVEX A(telegram:sendTest)] [Request ID: def] Server Error Uncaught Error: Bot not linked: send /start to your bot first.',
    );

    expect(getUserFacingError(missingStart)).toBe(
      'Open your Telegram bot, send /start, then try linking the chat again.',
    );
    expect(getUserFacingError(notLinked)).toBe(
      'Link your Telegram chat before sending a test message.',
    );
  });

  it('uses the supplied safe fallback for unknown errors', () => {
    expect(getUserFacingError(new Error('sensitive internal detail'), 'Try later.')).toBe(
      'Try later.',
    );
  });
});
