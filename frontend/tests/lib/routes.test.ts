import { describe, it, expect } from 'vitest';
import { BACKEND_ROUTES, ROUTES } from '@/lib/routes';

describe('ROUTES', () => {
  it('exposes static app paths', () => {
    expect(ROUTES.app.landing).toBe('/');
    expect(ROUTES.app.home).toBe('/app');
    expect(ROUTES.app.login).toBe('/login');
    expect(ROUTES.app.registerClosed).toBe('/register/closed');
    expect(ROUTES.app.settings.admin).toBe('/settings/admin');
  });

  it('exposes documentation paths', () => {
    expect(ROUTES.app.docs.index).toBe('/docs');
    expect(ROUTES.app.docs.gettingStarted).toBe('/docs/getting-started');
    expect(ROUTES.app.docs.configuration).toBe('/docs/configuration');
    expect(ROUTES.app.docs.usage).toBe('/docs/usage');
    expect(ROUTES.app.docs.mcp).toBe('/docs/mcp');
    expect(ROUTES.app.docs.deployment).toBe('/docs/deployment');
  });

  it('builds dynamic app paths', () => {
    expect(ROUTES.app.invite('abc')).toBe('/invite/abc');
    expect(ROUTES.app.task('t1')).toBe('/tasks/t1');
  });

  it('exports Convex backend function references centrally', () => {
    expect(ROUTES.backend.tasks.list).toBe(BACKEND_ROUTES.tasks.list);
    expect(ROUTES.backend.tasks.removeMany).toBe(BACKEND_ROUTES.tasks.removeMany);
    expect(ROUTES.backend.tasks.reorder).toBe(BACKEND_ROUTES.tasks.reorder);
    expect(ROUTES.backend.workspaces.members).toBe(BACKEND_ROUTES.workspaces.members);
    expect(ROUTES.backend.events.create).toBe(BACKEND_ROUTES.events.create);
    expect(ROUTES.backend.notifications.markAllRead).toBe(
      BACKEND_ROUTES.notifications.markAllRead,
    );
  });
});
