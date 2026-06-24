import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Treat `_`-prefixed args/vars as deliberately unused (e.g. `_req` in
  // route handlers required by signature). This matches the typescript-eslint
  // recommended convention.
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "dist-worker/**",
    "next-env.d.ts",
    // Build cache + generated artifacts.
    "tsconfig.tsbuildinfo",
    "node_modules/**",
  ]),
  // Test files: vitest mocks legitimately use `any` for partial implementations
  // and inline component wrappers don't need display names. Production-grade
  // checks still apply elsewhere.
  {
    files: [
      "**/*.test.ts",
      "**/*.test.tsx",
      "tests/**/*",
      "**/__tests__/**/*",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-require-imports": "off",
      "react/display-name": "off",
    },
  },
]);

export default eslintConfig;
