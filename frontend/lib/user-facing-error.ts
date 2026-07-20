const DEFAULT_ERROR_MESSAGE =
  'We could not complete that request. Please try again.';

export function getUserFacingError(
  error: unknown,
  fallback = DEFAULT_ERROR_MESSAGE,
) {
  const message = error instanceof Error ? error.message : String(error ?? '');
  const normalized = message.toLowerCase();

  if (normalized.includes('setup already complete')) {
    return 'Setup has already been completed. Sign in to continue.';
  }

  if (normalized.includes('public registration is disabled')) {
    return 'New account registration is currently disabled.';
  }

  if (
    normalized.includes('invalid email or password') ||
    normalized.includes('invalidaccountid')
  ) {
    return 'The email or password is incorrect.';
  }

  if (
    normalized.includes('rate limit') ||
    normalized.includes('too many requests')
  ) {
    return 'Too many attempts. Wait a moment, then try again.';
  }

  if (
    normalized.includes('missing environment variable') ||
    normalized.includes('server error') ||
    normalized.includes('request id:') ||
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror')
  ) {
    return 'TaskLabs is not fully available right now. Please try again shortly.';
  }

  return fallback;
}
