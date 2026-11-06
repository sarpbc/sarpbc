import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasFrenchTranslation, localizedNewsFields } from "./news-locale.ts";

describe("news locale", () => {
  it("requires both French title and body for a translation", () => {
    assert.equal(hasFrenchTranslation({ titleFr: "Titre", contentFr: "Corps" }), true);
    assert.equal(hasFrenchTranslation({ titleFr: "Titre", contentFr: null }), false);
    assert.equal(hasFrenchTranslation({ titleFr: "  ", contentFr: "Corps" }), false);
  });

  it("uses French fields only when the locale is French and both are set", () => {
    const article = {
      title: "English",
      content: "Hello",
      titleFr: "Français",
      contentFr: "Bonjour",
    };
    assert.deepEqual(localizedNewsFields(article, "fr-FR"), {
      title: "Français",
      content: "Bonjour",
    });
    assert.deepEqual(localizedNewsFields(article, "en-US"), { title: "English", content: "Hello" });
  });

  it("falls back to English when French is incomplete", () => {
    const article = { title: "English", content: "Hello", titleFr: "Français", contentFr: null };
    assert.deepEqual(localizedNewsFields(article, "fr-FR"), { title: "English", content: "Hello" });
  });
});
