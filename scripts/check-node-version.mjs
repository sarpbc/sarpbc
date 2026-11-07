import { readFileSync } from "node:fs";

const expected = readFileSync(".nvmrc", "utf8").trim().replace(/^v/, "");
const apps = ["back", "front", "admin"];

const mismatches = apps.flatMap((app) => {
  const file = `apps/${app}/Dockerfile`;
  const actual = readFileSync(file, "utf8").match(/^ARG NODE_VERSION=(\S*)$/m)?.[1];
  return actual === expected
    ? []
    : [`${file}: ARG NODE_VERSION=${actual ?? "<missing>"}, expected ${expected}`];
});

if (mismatches.length > 0) {
  console.error(`Dockerfile Node version differs from .nvmrc:\n${mismatches.join("\n")}`);
  process.exit(1);
}
