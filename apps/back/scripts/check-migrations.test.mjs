import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { migrationViolations } from "./check-migrations.mjs";

function repository(baseMigrations) {
  const root = mkdtempSync(join(tmpdir(), "check-migrations-"));
  const directory = join(root, "migrations");
  mkdirSync(directory);
  const git = (...args) => execFileSync("git", args, { cwd: root, stdio: "ignore" });
  git("init", "--quiet", "--initial-branch", "base");
  for (const name of baseMigrations) writeFileSync(join(directory, name), "");
  writeFileSync(join(directory, ".snapshot-sarpbc.json"), "{}");
  git("add", ".");
  git(
    "-c",
    "user.name=test",
    "-c",
    "user.email=test@example.com",
    "-c",
    "commit.gpgsign=false",
    "commit",
    "--quiet",
    "--no-verify",
    "-m",
    "base",
  );
  return {
    directory,
    add: (name) => writeFileSync(join(directory, name), ""),
    remove: () => rmSync(root, { recursive: true, force: true }),
  };
}

test("accepts unique migrations newer than every migration on base", () => {
  const repo = repository(["Migration20250815162622.ts", "Migration20250817144821_addPlayer.ts"]);
  try {
    repo.add("Migration20260101000000_addThing.ts");
    assert.deepEqual(migrationViolations(repo.directory), []);
    assert.deepEqual(migrationViolations(repo.directory, "base"), []);
  } finally {
    repo.remove();
  }
});

test("reports migrations sharing a timestamp, including ones without a name suffix", () => {
  const repo = repository([]);
  try {
    repo.add("Migration20260101000000.ts");
    repo.add("Migration20260101000000_addThing.ts");
    repo.add("Migration20260102000000_other.ts");
    const violations = migrationViolations(repo.directory);
    assert.equal(violations.length, 1);
    assert.match(violations[0], /^Duplicate migration timestamp 20260101000000: /);
    assert.match(violations[0], /Migration20260101000000\.ts/);
    assert.match(violations[0], /Migration20260101000000_addThing\.ts/);
  } finally {
    repo.remove();
  }
});

test("reports added migrations that are not newer than the newest migration on base", () => {
  const repo = repository(["Migration20250815162622.ts", "Migration20260201000000_onBase.ts"]);
  try {
    repo.add("Migration20260115000000_older.ts");
    repo.add("Migration20260201000000_same.ts");
    repo.add("Migration20260301000000_newer.ts");
    const violations = migrationViolations(repo.directory, "base");
    assert.equal(violations.length, 3);
    assert.match(violations[0], /^Duplicate migration timestamp 20260201000000: /);
    assert.match(
      violations[1],
      /^Migration Migration20260115000000_older\.ts is not newer than 20260201000000, the newest migration on base\./,
    );
    assert.match(violations[2], /^Migration Migration20260201000000_same\.ts is not newer/);
  } finally {
    repo.remove();
  }
});
