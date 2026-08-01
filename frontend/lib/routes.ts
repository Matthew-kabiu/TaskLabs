import { api } from '@convex/_generated/api';

export const BACKEND_ROUTES = {
  workspaces: {
    ensurePersonal: api.workspaces.ensurePersonal,
    defaultWorkspace: api.workspaces.defaultWorkspace,
    list: api.workspaces.list,
    get: api.workspaces.get,
    members: api.workspaces.members,
    create: api.workspaces.create,
    update: api.workspaces.update,
    remove: api.workspaces.remove,
    updateMemberRole: api.workspaces.updateMemberRole,
    removeMember: api.workspaces.removeMember,
  },
  tasks: {
    list: api.tasks.list,
    get: api.tasks.get,
    create: api.tasks.create,
    update: api.tasks.update,
    remove: api.tasks.remove,
    removeMany: api.tasks.removeMany,
    reorder: api.tasks.reorder,
  },
  labels: {
    list: api.labels.list,
    create: api.labels.create,
    update: api.labels.update,
    remove: api.labels.remove,
  },
  notifications: {
    list: api.notifications.list,
    unread: api.notifications.unread,
    markRead: api.notifications.markRead,
    markAllRead: api.notifications.markAllRead,
  },
  events: {
    list: api.events.list,
    get: api.events.get,
    create: api.events.create,
    update: api.events.update,
    complete: api.events.complete,
    remove: api.events.remove,
  },
  setup: {
    status: api.setup.status,
    claimAdmin: api.setup.claimAdmin,
  },
  registration: {
    status: api.registration.status,
    complete: api.registration.complete,
  },
  invitations: {
    pending: api.invitations.pending,
    create: api.invitations.create,
    validate: api.invitations.validate,
    accept: api.invitations.accept,
  },
  settings: {
    getSystem: api.settings.getSystem,
    updateSystem: api.settings.updateSystem,
  },
  profile: {
    get: api.profile.get,
    update: api.profile.update,
    changePassword: api.profile.changePassword,
  },
  telegram: {
    tokenSummary: api.telegram.tokenSummary,
    saveToken: api.telegram.saveToken,
    clearToken: api.telegram.clearToken,
    linkChat: api.telegram.linkChat,
    linkChatFromStart: api.telegram.linkChatFromStart,
    sendTest: api.telegram.sendTest,
  },
  search: {
    workspace: api.search.workspace,
  },
  apiKeys: {
    list: api.apiKeys.list,
    create: api.apiKeys.create,
    revoke: api.apiKeys.revoke,
    rotate: api.apiKeys.rotate,
    verifyBearer: api.apiKeys.verifyBearer,
    mcpDispatch: api.apiKeys.mcpDispatch,
  },
} as const;

export const ROUTES = {
  backend: BACKEND_ROUTES,
  app: {
    landing: '/',
    home: '/app',
    login: '/login',
    register: '/register',
    registerClosed: '/register/closed',
    invite: (token: string) => `/invite/${token}`,
    setup: '/setup',
    tasks: '/tasks',
    task: (id: string) => `/tasks/${id}`,
    calendar: '/calendar',
    notifications: '/notifications',
    settings: {
      profile: '/settings/profile',
      workspace: '/settings/workspace',
      admin: '/settings/admin',
    },
    docs: {
      index: '/docs',
      gettingStarted: '/docs/getting-started',
      configuration: '/docs/configuration',
      usage: '/docs/usage',
      mcp: '/docs/mcp',
      deployment: '/docs/deployment',
    },
  },
} as const;
