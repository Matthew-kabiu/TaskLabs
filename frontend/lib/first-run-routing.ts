import { ROUTES } from '@/lib/routes';

type SetupStatus = {
  setupNeeded: boolean;
};

export function getDashboardRedirectForFirstRun(
  setupStatus: SetupStatus,
  token: string | null | undefined,
) {
  if (setupStatus.setupNeeded) return ROUTES.app.setup;
  if (!token) return ROUTES.app.login;
  return null;
}

export function getLoginRedirectForFirstRun(setupStatus: SetupStatus) {
  if (setupStatus.setupNeeded) return ROUTES.app.setup;
  return null;
}

export function getSetupRedirectAfterFirstRun(
  setupStatus: SetupStatus,
  isAuthenticated: boolean,
) {
  if (setupStatus.setupNeeded) return null;
  return isAuthenticated ? ROUTES.app.home : ROUTES.app.login;
}
