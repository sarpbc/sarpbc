import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { nativeControlViolations } from "./check-native-controls.ts";

const componentsWith = (files: Record<string, string>) => {
  const directory = mkdtempSync(path.join(tmpdir(), "native-controls-"));

  for (const [name, content] of Object.entries(files)) {
    writeFileSync(path.join(directory, name), content);
  }

  return directory;
};

const check = (files: Record<string, string>) => {
  const directory = componentsWith(files);

  try {
    return nativeControlViolations(directory);
  } finally {
    rmSync(directory, { force: true, recursive: true });
  }
};

void test("accepts library components", () => {
  assert.deepEqual(
    check({
      "Ok.vue":
        '<template>\n  <SButton label="Save" />\n  <SInput v-model="name" />\n</template>\n',
    }),
    [],
  );
});

void test("rejects native controls with their replacement", () => {
  const violations = check({
    "Native.vue":
      "<template>\n  <button>Go</button>\n  <input />\n  <select></select>\n  <textarea />\n</template>\n",
  });

  assert.equal(violations.length, 4);
  assert.match(violations[0] ?? "", /Native\.vue:2: <button> — use SButton/u);
  assert.match(violations[3] ?? "", /<textarea> — use STextarea/u);
});

void test("accepts an exception that states its reason", () => {
  assert.deepEqual(
    check({
      "Upload.vue":
        '<template>\n  <!-- native-control: hidden file input behind an SButton -->\n  <input type="file" hidden />\n</template>\n',
    }),
    [],
  );
});

void test("rejects an exception without a reason", () => {
  assert.equal(
    check({ "Bare.vue": "<template>\n  <!-- native-control: -->\n  <button />\n</template>\n" })
      .length,
    1,
  );
});

void test("ignores script code and lookalike component names", () => {
  assert.deepEqual(
    check({
      "Script.vue":
        '<script setup lang="ts">\nconst html = "<button>";\n</script>\n\n<template>\n  <buttonGroup />\n  <SButton />\n</template>\n',
    }),
    [],
  );
});
