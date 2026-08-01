/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as apiKeys from "../apiKeys.js";
import type * as apiKeys_model from "../apiKeys/model.js";
import type * as apiKeys_scopes from "../apiKeys/scopes.js";
import type * as apiKeys_service from "../apiKeys/service.js";
import type * as apiKeys_token from "../apiKeys/token.js";
import type * as auth from "../auth.js";
import type * as crons from "../crons.js";
import type * as events from "../events.js";
import type * as events_model from "../events/model.js";
import type * as events_service from "../events/service.js";
import type * as http from "../http.js";
import type * as invitations from "../invitations.js";
import type * as invitations_model from "../invitations/model.js";
import type * as invitations_service from "../invitations/service.js";
import type * as labels from "../labels.js";
import type * as labels_model from "../labels/model.js";
import type * as labels_service from "../labels/service.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_rateLimits from "../lib/rateLimits.js";
import type * as lib_users from "../lib/users.js";
import type * as lib_validators from "../lib/validators.js";
import type * as notifications from "../notifications.js";
import type * as notifications_model from "../notifications/model.js";
import type * as notifications_service from "../notifications/service.js";
import type * as profile from "../profile.js";
import type * as registration from "../registration.js";
import type * as search from "../search.js";
import type * as settings from "../settings.js";
import type * as settings_model from "../settings/model.js";
import type * as setup from "../setup.js";
import type * as tasks from "../tasks.js";
import type * as tasks_model from "../tasks/model.js";
import type * as tasks_service from "../tasks/service.js";
import type * as telegram from "../telegram.js";
import type * as telegram_crypto from "../telegram/crypto.js";
import type * as telegram_env from "../telegram/env.js";
import type * as telegram_model from "../telegram/model.js";
import type * as workspaces from "../workspaces.js";
import type * as workspaces_model from "../workspaces/model.js";
import type * as workspaces_service from "../workspaces/service.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  apiKeys: typeof apiKeys;
  "apiKeys/model": typeof apiKeys_model;
  "apiKeys/scopes": typeof apiKeys_scopes;
  "apiKeys/service": typeof apiKeys_service;
  "apiKeys/token": typeof apiKeys_token;
  auth: typeof auth;
  crons: typeof crons;
  events: typeof events;
  "events/model": typeof events_model;
  "events/service": typeof events_service;
  http: typeof http;
  invitations: typeof invitations;
  "invitations/model": typeof invitations_model;
  "invitations/service": typeof invitations_service;
  labels: typeof labels;
  "labels/model": typeof labels_model;
  "labels/service": typeof labels_service;
  "lib/auth": typeof lib_auth;
  "lib/rateLimits": typeof lib_rateLimits;
  "lib/users": typeof lib_users;
  "lib/validators": typeof lib_validators;
  notifications: typeof notifications;
  "notifications/model": typeof notifications_model;
  "notifications/service": typeof notifications_service;
  profile: typeof profile;
  registration: typeof registration;
  search: typeof search;
  settings: typeof settings;
  "settings/model": typeof settings_model;
  setup: typeof setup;
  tasks: typeof tasks;
  "tasks/model": typeof tasks_model;
  "tasks/service": typeof tasks_service;
  telegram: typeof telegram;
  "telegram/crypto": typeof telegram_crypto;
  "telegram/env": typeof telegram_env;
  "telegram/model": typeof telegram_model;
  workspaces: typeof workspaces;
  "workspaces/model": typeof workspaces_model;
  "workspaces/service": typeof workspaces_service;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
