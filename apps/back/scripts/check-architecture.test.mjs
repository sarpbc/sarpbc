import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { architectureViolations } from "./check-architecture.mjs";

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");

test("reports a cycle between features' inner layers once and accepts a one-way import", () => {
  const first = fs.mkdtempSync(path.join(source, "architecture-first-"));
  const second = fs.mkdtempSync(path.join(source, "architecture-second-"));
  const write = (root, relative, content) => {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    return file;
  };
  try {
    const firstName = path.basename(first);
    const secondName = path.basename(second);
    const firstModel = write(first, "application/model.ts", "export type First = string;");
    const secondModel = write(second, "application/model.ts", "export type Second = string;");
    const firstUse = write(
      first,
      "application/use.ts",
      `import type { Second } from "../../${secondName}/application/model";`,
    );
    assert.deepEqual(architectureViolations([firstUse, firstModel, secondModel]), []);

    const secondUse = write(
      second,
      "application/use.ts",
      `import type { First } from "../../${firstName}/application/model";`,
    );
    const cycles = architectureViolations([firstUse, secondUse, firstModel, secondModel]).filter(
      (message) => message.startsWith("feature cycle:"),
    );
    assert.equal(cycles.length, 1);
    const [a, b] = [firstName, secondName].sort();
    assert.equal(
      cycles[0],
      [
        `feature cycle: ${a} -> ${b} -> ${a}`,
        `  ${a} -> ${b}: ${a}/application/use.ts`,
        `  ${b} -> ${a}: ${b}/application/use.ts`,
      ].join("\n"),
    );
  } finally {
    assert.equal(path.dirname(path.resolve(first)), source);
    assert.equal(path.dirname(path.resolve(second)), source);
    fs.rmSync(first, { recursive: true, force: true });
    fs.rmSync(second, { recursive: true, force: true });
  }
});

test("rejects framework dependencies, aliases, type imports, reexports and foreign repositories", () => {
  const probe = fs.mkdtempSync(path.join(source, "architecture-probe-"));
  const other = fs.mkdtempSync(path.join(source, "architecture-other-"));
  const write = (root, relative, content) => {
    const file = path.join(root, relative);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, content);
    return file;
  };
  try {
    const repository = write(
      other,
      "infrastructure/example.repository.ts",
      "export class Repository {};",
    );
    const domain = write(probe, "domain/model.ts", 'import { Injectable } from "@nestjs/common";');
    const alias = `src/${path.basename(other)}/infrastructure/example.repository`;
    const useCase = write(
      probe,
      "application/use-case.ts",
      `import { Repository } from "${alias}";`,
    );
    const barrel = write(probe, "application/index.ts", 'export { Redis } from "ioredis";');
    const port = write(
      probe,
      "application/port.ts",
      'import type { EntityManager } from "@mikro-orm/core";',
    );
    const foreign = write(
      probe,
      "infrastructure/adapter.ts",
      `import { Repository } from "${alias}";`,
    );
    for (const file of [domain, useCase, barrel, port, foreign]) {
      assert.ok(architectureViolations([file]).length > 0, `${file} must fail`);
    }
    assert.ok(
      architectureViolations([useCase]).some((message) =>
        message.includes(`application imports ${path.basename(other)}/infrastructure/`),
      ),
      "resolves aliases before checking the application boundary",
    );
    assert.deepEqual(architectureViolations([repository]), []);
    const pure = write(
      probe,
      "domain/pure.ts",
      "export interface Item { id: string; values: string[] }",
    );
    assert.deepEqual(architectureViolations([pure]), []);
  } finally {
    assert.equal(path.dirname(path.resolve(probe)), source);
    assert.equal(path.dirname(path.resolve(other)), source);
    fs.rmSync(probe, { recursive: true, force: true });
    fs.rmSync(other, { recursive: true, force: true });
  }
});
