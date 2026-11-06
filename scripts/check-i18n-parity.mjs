import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function leafKeys(value, prefix = "") {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return [prefix];
  return Object.entries(value).flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key),
  );
}

export function parityViolations(directory) {
  const keys = (locale) =>
    new Set(leafKeys(JSON.parse(readFileSync(path.join(directory, `${locale}.json`), "utf8"))));
  const english = keys("en-US");
  const french = keys("fr-FR");
  return [
    ...[...english].filter((key) => !french.has(key)).map((key) => `${key}: missing in fr-FR`),
    ...[...french].filter((key) => !english.has(key)).map((key) => `${key}: missing in en-US`),
  ];
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const apps = path.join(repository, "apps");
  const directories = readdirSync(apps)
    .map((app) => path.join(apps, app, "i18n", "locales"))
    .filter((directory) => existsSync(directory));
  let failed = false;
  for (const directory of directories) {
    const violations = parityViolations(directory);
    if (violations.length > 0) {
      failed = true;
      const lines = violations.map((violation) => `  ${violation}`).join("\n");
      process.stderr.write(`${path.relative(repository, directory)}\n${lines}\n`);
    }
  }
  if (failed) process.exitCode = 1;
  else process.stdout.write(`i18n parity checked in ${directories.length} locale folders.\n`);
}
