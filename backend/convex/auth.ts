import { Password } from "@convex-dev/auth/providers/Password";
import { convexAuth } from "@convex-dev/auth/server";

/**
 * Convex Auth. Email/password matches the original TaskLabs model.
 * Add OAuth providers (GitHub/Google) here later if desired.
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [Password],
});
