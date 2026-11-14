import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { parityViolations } from "./check-i18n-parity.ts";
import type { LocaleValue } from "./check-i18n-parity.ts";

function locales(english: LocaleValue, french: LocaleValue): string {
  const directory = mkdtempSync(join(tmpdir(), "i18n-parity-"));
  writeFileSync(join(directory, "en-US.json"), JSON.stringify(english));
  writeFileSync(join(directory, "fr-FR.json"), JSON.stringify(french));

  return directory;
}

test("accepts locales with the same nested keys", () => {
  const directory = locales({ a: { b: "x" }, c: "y" }, { a: { b: "z" }, c: "w" });

  try {
    assert.deepEqual(parityViolations(directory), []);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("reports a key missing from either locale", () => {
  const directory = locales({ a: { b: "x" }, only: "y" }, { a: {}, extra: "w" });

  try {
    assert.deepEqual(parityViolations(directory), [
      "a.b: missing in fr-FR",
      "only: missing in fr-FR",
      "extra: missing in en-US",
    ]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
