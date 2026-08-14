import { hasFrenchTranslation, localizedNewsFields, parseNewsLocale } from "@sarpbc/utils";

describe("news locale", () => {
  it("maps only known French locale codes to fr-FR", () => {
    expect(parseNewsLocale("fr")).toBe("fr-FR");
    expect(parseNewsLocale("fr-FR")).toBe("fr-FR");
    expect(parseNewsLocale("FR-fr")).toBe("en-US");
    expect(parseNewsLocale("fromage")).toBe("en-US");
  });

  it("defaults omitted and English codes to en-US", () => {
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
});
