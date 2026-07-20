import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const requiredDeploymentEnv = [
  "SITE_URL",
  "JWT_PRIVATE_KEY",
  "JWKS",
  "TELEGRAM_API_ORIGIN",
  "TELEGRAM_CHAT_ID",
];

const optionalDeploymentEnv = ["TELEGRAM_WEBHOOK_ORIGIN"];

const requiredCliEnv = ["CONVEX_SELF_HOSTED_URL", "CONVEX_SELF_HOSTED_ADMIN_KEY"];

function valueFor(name) {
  const value = process.env[name];
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

const missing = [...requiredCliEnv, ...requiredDeploymentEnv].filter(
  (name) => valueFor(name) === null,
);

if (missing.length > 0) {
  console.error(`Missing required Convex env: ${missing.join(", ")}`);
  process.exit(1);
}

const envNames = [
  ...requiredDeploymentEnv,
  ...optionalDeploymentEnv.filter((name) => valueFor(name) !== null),
];

const tempDir = mkdtempSync(join(tmpdir(), "tasklabs-convex-env-"));
const envFile = join(tempDir, "deployment.env");

try {
  const body = envNames.map((name) => `${name}=${process.env[name]}`).join("\n");
  writeFileSync(envFile, `${body}\n`, { mode: 0o600 });

  const result = spawnSync(
    "pnpm",
    ["exec", "convex", "env", "set", "--force", "--from-file", envFile],
    { stdio: "inherit" },
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }

  console.log(`Synced Convex deployment env: ${envNames.join(", ")}`);
} finally {
  rmSync(tempDir, { force: true, recursive: true });
}
