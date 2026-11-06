import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { architectureViolations } from "./check-architecture.mjs";

function fixture() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "architecture-"));
  return {
    root,
    write(relative, content) {
      const file = path.join(root, relative);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, content);
      return file;
    },
    violations: (files) => architectureViolations(files, root),
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}

test("reports a cycle between features' inner layers once and accepts a one-way import", () => {
  const { write, violations, cleanup } = fixture();
  try {
    const firstModel = write("first/application/model.ts", "export type First = string;");
    const secondModel = write("second/application/model.ts", "export type Second = string;");
    const firstUse = write(
      "first/application/use.ts",
      'import type { Second } from "../../second/application/model";',
    );
    assert.deepEqual(violations([firstUse, firstModel, secondModel]), []);

    const secondUse = write(
      "second/application/use.ts",
      'import type { First } from "../../first/application/model";',
    );
    const cycles = violations([firstUse, secondUse, firstModel, secondModel]).filter((message) =>
      message.startsWith("feature cycle:"),
    );
    assert.equal(cycles.length, 1);
    assert.equal(
      cycles[0],
      [
        "feature cycle: first -> second -> first",
        "  first -> second: first/application/use.ts",
        "  second -> first: second/application/use.ts",
      ].join("\n"),
    );
  } finally {
    cleanup();
  }
});

test("rejects non-allowlisted packages, aliases, type imports, reexports and foreign repositories", () => {
  const { write, violations, cleanup } = fixture();
  try {
    const repository = write(
      "other/infrastructure/example.repository.ts",
      "export class Repository {};",
    );
    const alias = "src/other/infrastructure/example.repository";
    const domain = write("probe/domain/model.ts", 'import { Injectable } from "@nestjs/common";');
    const hasher = write("probe/domain/hasher.ts", 'import bcrypt from "bcrypt";');
    const useCase = write(
      "probe/application/use-case.ts",
      `import { Repository } from "${alias}";`,
    );
    const barrel = write("probe/application/index.ts", 'export { Redis } from "ioredis";');
    const port = write(
      "probe/application/port.ts",
      'import type { EntityManager } from "@mikro-orm/core";',
    );
    const foreign = write(
      "probe/infrastructure/adapter.ts",
      'import { Repository } from "../../other/infrastructure/example.repository";',
    );
    for (const file of [domain, hasher, useCase, barrel, port, foreign]) {
      assert.ok(violations([file]).length > 0, `${file} must fail`);
    }
    assert.ok(
      violations([hasher]).some((message) => message.includes("non-allowlisted package bcrypt")),
      "rejects a package outside the allowlist",
    );
    assert.ok(
      violations([useCase]).some((message) => message.includes("use a relative import")),
      "rejects src/ aliases",
    );
    assert.deepEqual(violations([repository]), []);
    const pure = write(
      "probe/domain/pure.ts",
      [
        'import { v4 } from "uuid";',
        'import slugify from "slugify";',
        'import { createHash } from "node:crypto";',
        'import type { Role } from "@sarpbc/types";',
        'import { slugOf } from "@sarpbc/utils";',
        "export interface Item { id: string; values: string[] }",
      ].join("\n"),
    );
    assert.deepEqual(violations([pure]), []);
  } finally {
    cleanup();
  }
});
