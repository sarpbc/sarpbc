import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "node:test";
import { OVERLAY_PATH } from "../fixtures/accuracy.ts";
import { loadOverlay, parseOverlay } from "./overlay.ts";

void describe("overlay config", () => {
  void it("loads the Coupe de France Slash 2026 scoreboard with every character it needs", async () => {
    const overlay = await loadOverlay(OVERLAY_PATH);
    assert.equal(overlay.id, "coupe-de-france-slash-2026");
    assert.deepEqual(
      [...new Set(overlay.templates.map((template) => template.char))].toSorted(),
      "+0123456789:".split("").toSorted(),
    );
  });

  void it("rejects templates that do not match the glyph size", async () => {
    const overlay = parseOverlay(await readFile(OVERLAY_PATH, "utf-8"));
    assert.throws(() =>
      parseOverlay(JSON.stringify({ ...overlay, templates: [{ char: "1", rows: ["#", "#"] }] })),
    );
    assert.throws(() => parseOverlay(JSON.stringify({ ...overlay, visibleWhen: [] })));
    assert.throws(() => parseOverlay("{"));
  });
});
