import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const repository = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const frameworkFree = ["packages/types", "packages/utils"];
const frameworkPackage = /^(?:vue(?:$|[/-])|@vue\/|nuxt(?:$|[/-])|@nuxt\/|@nuxtjs\/|#)/;

const dependencyFields = ["dependencies", "devDependencies", "peerDependencies"] as const;
const dependencies = z.record(z.string(), z.string()).optional();

const packageManifest = z.object({
  dependencies,
  devDependencies: dependencies,
  peerDependencies: dependencies,
});

const specifierPattern =
  /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|\bimport\s+)["']([^"']+)["']/g;

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = path.join(directory, entry.name);

    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : sourceFiles(file);

    return /\.(?:ts|mts|mjs|js|vue)$/.test(entry.name) ? [file] : [];
  });
}

export function frameworkViolations(directory: string, root = directory): string[] {
  const violations: string[] = [];

  for (const file of sourceFiles(directory)) {
    const text = readFileSync(file, "utf8");

    for (const [, specifier] of text.matchAll(specifierPattern)) {
      if (frameworkPackage.test(specifier)) {
        violations.push(`${path.relative(root, file)}: imports ${specifier}`);
      }

      if (specifier.startsWith(".") && specifier.endsWith(".ts")) {
        violations.push(`${path.relative(root, file)}: imports ${specifier} with a .ts extension`);
      }
    }
  }

  const manifestPath = path.join(directory, "package.json");
  const manifest = packageManifest.parse(JSON.parse(readFileSync(manifestPath, "utf8")));

  for (const field of dependencyFields) {
    for (const name of Object.keys(manifest[field] ?? {})) {
      if (frameworkPackage.test(name)) {
        violations.push(`${path.relative(root, manifestPath)}: ${field} lists ${name}`);
      }
    }
  }

  return violations;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const violations = frameworkFree.flatMap((directory) =>
    frameworkViolations(path.join(repository, directory), repository),
  );

  if (violations.length > 0) {
    process.stderr.write(`${violations.join("\n")}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(
      `${frameworkFree.join(" and ")} import no Vue or Nuxt code and no relative import names a .ts extension.\n`,
    );
  }
}
