import { describe, expect, it } from 'vitest';
import {
  getDashboardRedirectForFirstRun,
  getLoginRedirectForFirstRun,
  getSetupRedirectAfterFirstRun,
} from '@/lib/first-run-routing';
import { ROUTES } from '@/lib/routes';

describe('first-run routing', () => {
  it('sends the root route to setup before rendering the workspace shell', async () => {
    expect(
      getDashboardRedirectForFirstRun({ setupNeeded: true }, null),
    ).toBe(ROUTES.app.setup);
  });

  it('sends unauthenticated users to login after setup is complete', () => {
    expect(
      getDashboardRedirectForFirstRun({ setupNeeded: false }, null),
    ).toBe(ROUTES.app.login);
  });

  it('keeps the dashboard route available after setup when authenticated', () => {
    expect(
      getDashboardRedirectForFirstRun({ setupNeeded: false }, 'token'),
    ).toBeNull();
  });

  it('sends direct login visits to setup while setup is still needed', () => {
    expect(getLoginRedirectForFirstRun({ setupNeeded: true })).toBe(
      ROUTES.app.setup,
    );
  });

  it('keeps the login page available after setup is complete', () => {
    expect(getLoginRedirectForFirstRun({ setupNeeded: false })).toBeNull();
  });

  it('keeps the setup route available while setup is still needed', () => {
    expect(
      getSetupRedirectAfterFirstRun({ setupNeeded: true }, false),
    ).toBeNull();
  });

  it('sends unauthenticated direct setup visits to login after setup is complete', () => {
    expect(
      getSetupRedirectAfterFirstRun({ setupNeeded: false }, false),
    ).toBe(ROUTES.app.login);
  });

  it('sends authenticated direct setup visits home after setup is complete', () => {
    expect(
      getSetupRedirectAfterFirstRun({ setupNeeded: false }, true),
    ).toBe(ROUTES.app.home);
  });
});
