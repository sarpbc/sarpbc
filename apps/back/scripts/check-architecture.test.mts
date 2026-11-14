import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { architectureViolations } from "./check-architecture.mts";

interface Fixture {
  root: string;
  write: (relative: string, content: string) => string;
  violations: (files: string[]) => string[];
  cleanup: () => void;
}

function fixture(): Fixture {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "architecture-"));

  return {
    root,
    write(relative: string, content: string): string {
      const file = path.join(root, relative);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, content);

      return file;
    },
    violations: (files: string[]): string[] => architectureViolations(files, root),
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

test("allows another feature's persistence only through its facade or infrastructure composition", () => {
  const { write, violations, cleanup } = fixture();

  try {
    write("owner/infrastructure/persistence/owner.entity.ts", "export class Owner {}");
    write(
      "owner/infrastructure/owner-persistence.ts",
      'export { Owner } from "./persistence/owner.entity";',
    );

    const viaEntity = write(
      "probe/infrastructure/persistence/probe.store.ts",
      'import { Owner } from "../../../owner/infrastructure/persistence/owner.entity";',
    );

    const viaFacade = write(
      "probe/infrastructure/persistence/probe.entity.ts",
      'import { Owner } from "../../../owner/infrastructure/owner-persistence";',
    );

    const composition = write(
      "probe/infrastructure/composition.ts",
      'import { Owner } from "../../owner/infrastructure/persistence/owner.entity";',
    );

    assert.ok(
      violations([viaEntity]).some((message) => message.includes("private persistence of owner")),
      "rejects a non-facade persistence import",
    );
    assert.deepEqual(violations([viaFacade]), []);
    assert.deepEqual(violations([composition]), []);
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

test("rejects common importing a feature and accepts common, root infrastructure and packages", () => {
  const { write, violations, cleanup } = fixture();

  try {
    write("user/domain/user.ts", "export interface User {}");
    write("infrastructure/config/env.ts", "export const env = {};");
    write("common/domain/shared.ts", "export type Shared = string;");

    const feature = write(
      "common/infrastructure/reader.ts",
      'import type { User } from "../../user/domain/user";',
    );

    const allowed = write(
      "common/infrastructure/config-reader.ts",
      [
        'import { env } from "../../infrastructure/config/env";',
        'import type { Shared } from "../domain/shared";',
        'import { z } from "zod";',
      ].join("\n"),
    );

    assert.ok(
      violations([feature]).some((message) => message.includes("common imports feature code")),
    );
    assert.deepEqual(violations([allowed]), []);
  } finally {
    cleanup();
  }
});
