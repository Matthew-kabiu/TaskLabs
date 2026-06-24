/**
 * Auth provider config. On self-hosted Convex, CONVEX_SITE_URL resolves to the
 * backend's CONVEX_SITE_ORIGIN (the :3211 site proxy origin).
 */
export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
};
