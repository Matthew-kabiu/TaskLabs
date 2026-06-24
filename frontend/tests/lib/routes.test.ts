import { describe, it, expect } from 'vitest';
import { BACKEND_ROUTES, ROUTES } from '@/lib/routes';

describe('ROUTES', () => {
  it('exposes static app paths', () => {
    expect(ROUTES.app.home).toBe('/');
    expect(ROUTES.app.login).toBe('/login');
    expect(ROUTES.app.registerClosed).toBe('/register/closed');
    expect(ROUTES.app.settings.admin).toBe('/settings/admin');
  });

  it('builds dynamic app paths', () => {
    expect(ROUTES.app.invite('abc')).toBe('/invite/abc');
    expect(ROUTES.app.task('t1')).toBe('/tasks/t1');
  });

  it('exports Convex backend function references centrally', () => {
    expect(ROUTES.backend.tasks.list).toBe(BACKEND_ROUTES.tasks.list);
    expect(ROUTES.backend.tasks.reorder).toBe(BACKEND_ROUTES.tasks.reorder);
    expect(ROUTES.backend.workspaces.members).toBe(BACKEND_ROUTES.workspaces.members);
    expect(ROUTES.backend.events.create).toBe(BACKEND_ROUTES.events.create);
    expect(ROUTES.backend.notifications.markAllRead).toBe(
      BACKEND_ROUTES.notifications.markAllRead,
    );
  });
});
