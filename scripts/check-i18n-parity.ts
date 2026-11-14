import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { z } from "zod";

const repository = path.resolve(import.meta.dirname, "..");

const localeValue = z.json();
const localeObject = z.record(z.string(), localeValue);

export type LocaleValue = z.infer<typeof localeValue>;

const leafKeys = (value: LocaleValue, prefix = ""): string[] => {
  const object = localeObject.safeParse(value);

  if (!object.success) {
    return [prefix];
  }

  return Object.entries(object.data).flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key),
  );
};

export const parityViolations = (directory: string): string[] => {
  const keys = (locale: string): Set<string> =>
    new Set(
      leafKeys(
        localeValue.parse(
          JSON.parse(readFileSync(path.join(directory, `${locale}.json`), "utf-8")),
        ),
      ),
    );

  const english = keys("en-US");
  const french = keys("fr-FR");

  return [
    ...[...english.difference(french)].map((key) => `${key}: missing in fr-FR`),
    ...[...french.difference(english)].map((key) => `${key}: missing in en-US`),
  ];
};

if (process.argv[1] && path.resolve(process.argv[1]) === import.meta.filename) {
  const candidates = [
    ...readdirSync(path.join(repository, "apps")).map((app) =>
      path.join(repository, "apps", app, "i18n", "locales"),
    ),
    ...readdirSync(path.join(repository, "packages")).map((name) =>
      path.join(repository, "packages", name, "src", "runtime", "locales"),
    ),
  ];

  const directories = candidates.filter((directory) => existsSync(directory));
  let failed = false;

  for (const directory of directories) {
    const violations = parityViolations(directory);

    if (violations.length > 0) {
      failed = true;
      const lines = violations.map((violation) => `  ${violation}`).join("\n");
      process.stderr.write(`${path.relative(repository, directory)}\n${lines}\n`);
    }
  }

  if (failed) {
    process.exitCode = 1;
  } else {
    process.stdout.write(`i18n parity checked in ${directories.length} locale folders.\n`);
  }
}
