import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { architectureViolations } from "./check-architecture.mjs";

const source = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../src");

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
