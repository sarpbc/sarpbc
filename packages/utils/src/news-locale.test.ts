import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hasFrenchTranslation, localizedNewsFields } from "./news-locale";

void describe("news locale", () => {
  void it("requires both French title and body for a translation", () => {
    assert.equal(hasFrenchTranslation({ contentFr: "Corps", titleFr: "Titre" }), true);
    assert.equal(hasFrenchTranslation({ contentFr: null, titleFr: "Titre" }), false);
    assert.equal(hasFrenchTranslation({ contentFr: "Corps", titleFr: "  " }), false);
  });

  void it("uses French fields only when the locale is French and both are set", () => {
    const article = {
      content: "Hello",
      contentFr: "Bonjour",
      title: "English",
      titleFr: "Français",
    };

    assert.deepEqual(localizedNewsFields(article, "fr-FR"), {
      content: "Bonjour",
      title: "Français",
    });
    assert.deepEqual(localizedNewsFields(article, "en-US"), { content: "Hello", title: "English" });
  });

  void it("falls back to English when French is incomplete", () => {
    const article = { content: "Hello", contentFr: null, title: "English", titleFr: "Français" };
    assert.deepEqual(localizedNewsFields(article, "fr-FR"), { content: "Hello", title: "English" });
  });
});
