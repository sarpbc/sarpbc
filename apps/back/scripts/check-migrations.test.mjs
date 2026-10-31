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
    delete: (name) => rmSync(join(directory, name)),
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

test("reports files that are neither migrations nor snapshots", () => {
  const repo = repository(["Migration20250815162622.ts"]);
  try {
    repo.add("Migration2026010100000_short.ts");
    repo.add("Migration20260101000000-dash.ts");
    repo.add("migration20260101000000.ts");
    repo.add("Migration20260101000000.js");
    const violations = migrationViolations(repo.directory);
    assert.equal(violations.length, 4);
    for (const violation of violations) assert.match(violation, /^Unexpected file /);
  } finally {
    repo.remove();
  }
});

test("reports a base ref that does not resolve without throwing", () => {
  const repo = repository(["Migration20250815162622.ts"]);
  try {
    assert.deepEqual(migrationViolations(repo.directory, "origin/missing"), [
      "BASE_REF origin/missing does not resolve to a commit. Fetch it first or unset BASE_REF to skip the ordering check.",
    ]);
  } finally {
    repo.remove();
  }
});

test("reports a renamed base migration as renamed instead of not newer", () => {
  const repo = repository(["Migration20250815162622.ts", "Migration20260201000000_onBase.ts"]);
  try {
    repo.delete("Migration20260201000000_onBase.ts");
    repo.add("Migration20260201000000_renamed.ts");
    assert.deepEqual(migrationViolations(repo.directory, "base"), [
      "Migration Migration20260201000000_onBase.ts exists on base but was renamed or removed. MikroORM tracks applied migrations by name, so migrations already on base must keep their names.",
    ]);
  } finally {
    repo.remove();
  }
});
