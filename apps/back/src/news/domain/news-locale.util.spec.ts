import {
  emptyToNull,
  hasFrenchTranslation,
  localizedNewsFields,
  parseNewsLocale,
} from "./news-locale.util";

describe("news-locale.util", () => {
  it("parses French locale prefixes as fr-FR", () => {
    expect(parseNewsLocale("fr")).toBe("fr-FR");
    expect(parseNewsLocale("fr-FR")).toBe("fr-FR");
    expect(parseNewsLocale("FR-fr")).toBe("fr-FR");
  });

  it("defaults non-French locales to en-US", () => {
    expect(parseNewsLocale(undefined)).toBe("en-US");
    expect(parseNewsLocale("en")).toBe("en-US");
    expect(parseNewsLocale("en-US")).toBe("en-US");
  });

  it("requires both French title and body for a translation", () => {
    expect(hasFrenchTranslation({ titleFr: "Titre", contentFr: "Corps" })).toBe(true);
    expect(hasFrenchTranslation({ titleFr: "Titre", contentFr: null })).toBe(false);
    expect(hasFrenchTranslation({ titleFr: "  ", contentFr: "Corps" })).toBe(false);
  });

  it("uses French fields only when the locale is French and both are set", () => {
    const article = {
      title: "English",
      content: "Hello",
      titleFr: "Français",
      contentFr: "Bonjour",
    };
    expect(localizedNewsFields(article, "fr-FR")).toEqual({
      title: "Français",
      content: "Bonjour",
    });
    expect(localizedNewsFields(article, "en-US")).toEqual({
      title: "English",
      content: "Hello",
    });
  });

  it("falls back to English when French is incomplete", () => {
    const article = {
      title: "English",
      content: "Hello",
      titleFr: "Français",
      contentFr: null,
    };
    expect(localizedNewsFields(article, "fr-FR")).toEqual({
      title: "English",
      content: "Hello",
    });
  });

  it("turns blank strings into null", () => {
    expect(emptyToNull(undefined)).toBeUndefined();
    expect(emptyToNull(null)).toBeNull();
    expect(emptyToNull("  ")).toBeNull();
    expect(emptyToNull("Titre")).toBe("Titre");
  });
});
