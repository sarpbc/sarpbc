import { execFileSync } from "node:child_process";
import { readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const defaultDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../src/infrastructure/database/migrations",
);
const migrationPattern = /^Migration(\d{14})(?:_[A-Za-z0-9]+)?\.ts$/;
const snapshotPattern = /^\.snapshot-[^/]+\.json$/;

function timestampOf(name) {
  return migrationPattern.exec(name)?.[1];
}

function baseMigrationNames(directory, baseRef) {
  try {
    execFileSync("git", ["rev-parse", "--verify", "--quiet", `${baseRef}^{commit}`], {
      cwd: directory,
      stdio: "ignore",
    });
  } catch {
    return undefined;
  }
  const output = execFileSync("git", ["ls-tree", "--name-only", baseRef, "--", "."], {
    cwd: directory,
    encoding: "utf8",
  });
  return output
    .split(/\r?\n/)
    .map((file) => path.posix.basename(file))
    .filter((name) => timestampOf(name));
}

export function migrationViolations(directory = defaultDirectory, baseRef = "") {
  const files = readdirSync(directory).sort();
  const names = files.filter((name) => timestampOf(name));
  const violations = files
    .filter((name) => !timestampOf(name) && !snapshotPattern.test(name))
    .map(
      (name) =>
        `Unexpected file ${name} in the migrations directory. Migrations must be named Migration<14-digit timestamp>.ts or Migration<14-digit timestamp>_<name>.ts.`,
    );

  const byTimestamp = Map.groupBy(names, timestampOf);
  for (const [timestamp, group] of byTimestamp) {
    if (group.length > 1) {
      violations.push(
        `Duplicate migration timestamp ${timestamp}: ${group.join(", ")}. Regenerate one of them with a new timestamp.`,
      );
    }
  }

  if (!baseRef) return violations;

  const baseList = baseMigrationNames(directory, baseRef);
  if (!baseList) {
    violations.push(
      `BASE_REF ${baseRef} does not resolve to a commit. Fetch it first or unset BASE_REF to skip the ordering check.`,
    );
    return violations;
  }

  const current = new Set(names);
  const baseNames = new Set(baseList);
  const missing = baseList.filter((name) => !current.has(name)).sort();
  for (const name of missing) {
    violations.push(
      `Migration ${name} exists on ${baseRef} but was renamed or removed. MikroORM tracks applied migrations by name, so migrations already on ${baseRef} must keep their names.`,
    );
  }

  const missingTimestamps = new Set(missing.map(timestampOf));
  const newestBase = baseList.map(timestampOf).sort().at(-1);
  if (newestBase) {
    for (const name of names.filter((name) => !baseNames.has(name))) {
      const timestamp = timestampOf(name);
      if (timestamp <= newestBase && !missingTimestamps.has(timestamp)) {
        violations.push(
          `Migration ${name} is not newer than ${newestBase}, the newest migration on ${baseRef}. Regenerate it after updating the branch so it runs after the migrations already on ${baseRef}.`,
        );
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
      `Migration names checked${baseRef ? ` against ${baseRef}` : ""}: no unexpected, duplicate, renamed or out-of-order migrations.\n`,
    );
  }
}
