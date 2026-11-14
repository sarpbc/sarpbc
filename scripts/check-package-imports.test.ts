import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { frameworkViolations } from "./check-package-imports.ts";

function packageWith(
  files: Record<string, string>,
  manifest: { dependencies?: Record<string, string> } = {},
): string {
  const directory = mkdtempSync(path.join(tmpdir(), "package-imports-"));
  mkdirSync(path.join(directory, "src"));
  writeFileSync(path.join(directory, "package.json"), JSON.stringify(manifest));

  for (const [name, content] of Object.entries(files)) {
    writeFileSync(path.join(directory, "src", name), content);
  }

  return directory;
}

void test("accepts framework-free sources", () => {
  const directory = packageWith({
    "pure.ts": 'import { z } from "zod";\nexport * from "./other";',
  });

  try {
    assert.deepEqual(frameworkViolations(directory), []);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

void test("rejects Vue and Nuxt imports and dependencies", () => {
  const directory = packageWith(
    {
      "a.ts": 'import { ref } from "vue";',
      "b.ts": 'import { useRoute } from "#imports";',
      "c.ts": 'const nuxt = await import("@nuxt/kit");',
      "d.ts": 'export { default } from "vue-router";',
    },
    { dependencies: { vue: "^3" } },
  );

  try {
    assert.equal(frameworkViolations(directory).length, 5);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

void test("rejects relative imports that name a .ts extension", () => {
  const directory = packageWith({
    "index.ts": 'export { ROLES } from "./roles.ts";\nimport type { Role } from "./roles.ts";',
  });

  try {
    assert.equal(frameworkViolations(directory).length, 2);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
