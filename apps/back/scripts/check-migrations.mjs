import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/infrastructure/database/migrations",
);
const migrationPattern = /^Migration(\d{14})(?=[_.])/;

function timestampOf(name) {
  return migrationPattern.exec(name)?.[1];
}

function baseMigrationNames(directory, baseRef) {
  const output = execFileSync("git", ["ls-tree", "--name-only", baseRef, "--", "."], {
    cwd: directory,
    encoding: "utf8",
  });
  return output
    .split(/\r?\n/)
    .filter(Boolean)
    .map((file) => path.posix.basename(file));
}

export function migrationViolations(directory = defaultDirectory, baseRef = "") {
  const names = readdirSync(directory)
    .filter((name) => timestampOf(name))
    .sort();
  const violations = [];

  const byTimestamp = Map.groupBy(names, timestampOf);
  for (const [timestamp, group] of byTimestamp) {
    if (group.length > 1) {
      violations.push(
        `Duplicate migration timestamp ${timestamp}: ${group.join(", ")}. Regenerate one of them with a new timestamp.`,
      );
    }
  }

  if (baseRef) {
    const baseNames = new Set(baseMigrationNames(directory, baseRef));
    const baseTimestamps = [...baseNames].map(timestampOf).filter(Boolean).sort();
    const newestBase = baseTimestamps.at(-1);
    if (newestBase) {
      for (const name of names.filter((name) => !baseNames.has(name))) {
        if (timestampOf(name) <= newestBase) {
          violations.push(
            `Migration ${name} is not newer than ${newestBase}, the newest migration on ${baseRef}. Regenerate it after updating the branch so it runs after the migrations already on ${baseRef}.`,
          );
        }
      }
    }
  }

  return violations;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const baseRef = process.env.BASE_REF ?? "";
  const violations = migrationViolations(defaultDirectory, baseRef);
  if (violations.length) {
    process.stderr.write(`${violations.join("\n")}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(
      `Migration names checked${baseRef ? ` against ${baseRef}` : ""}: no duplicate or out-of-order timestamps.\n`,
    );
  }
}
