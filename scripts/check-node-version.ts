import { readFileSync } from "node:fs";

const expected = readFileSync(".nvmrc", "utf-8").trim().replace(/^v/u, "");
const apps = ["back", "front", "admin"];

const mismatches = apps.flatMap((app) => {
  const file = `apps/${app}/Dockerfile`;
  const found = /^ARG NODE_VERSION=(?<version>\S*)$/mu.exec(readFileSync(file, "utf-8"));
  const actual = found?.groups?.version;

  return actual === expected
    ? []
    : [`${file}: ARG NODE_VERSION=${actual ?? "<missing>"}, expected ${expected}`];
});

if (mismatches.length > 0) {
  console.error(`Dockerfile Node version differs from .nvmrc:\n${mismatches.join("\n")}`);
  process.exit(1);
}
