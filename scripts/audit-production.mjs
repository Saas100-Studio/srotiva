import { spawnSync } from "node:child_process";

// These advisories are confined to local lint/Prisma CLI dependency chains.
// Keep the allowlist explicit so any new advisory, including a new runtime
// finding, still fails CI. Re-evaluate each entry when its upstream tool ships
// a compatible patched dependency graph.
const developmentToolAdvisories = [
  "GHSA-mh99-v99m-4gvg", // brace-expansion through lint tooling
  "GHSA-rgw5-rvv9-x895", // brace-expansion through lint tooling
  "GHSA-qhr7-859c-m2p7", // brace-expansion through lint tooling
  "GHSA-6j4f-fj2g-mc7p", // brace-expansion through lint tooling
  "GHSA-q2hr-2g5m-vwhr", // brace-expansion through lint tooling
  "GHSA-vfj7-8cjw-p6xm", // braces through eslint-config-next
  "GHSA-ggr8-5vv4-36mx", // deepmerge-ts through the Prisma CLI
];

const result = spawnSync(
  process.execPath,
  [
    "audit",
    ...developmentToolAdvisories.flatMap((advisory) => ["--ignore", advisory]),
  ],
  { stdio: "inherit" },
);

if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
