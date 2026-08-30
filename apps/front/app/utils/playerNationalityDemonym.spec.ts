import { describe, expect, it } from "vitest";
import {
  playerNationalityDemonymKey,
  resolvePlayerNationalityDemonym,
} from "./playerNationalityDemonym";

describe("playerNationalityDemonymKey", () => {
  it("normalizes codes to uppercase", () => {
    expect(playerNationalityDemonymKey("fr")).toBe("nationalities.demonym.FR");
  });
});

describe("resolvePlayerNationalityDemonym", () => {
  const messages = {
    "nationalities.demonym.FR": "French",
  } satisfies Record<string, string>;

  const te = (key: string) => key in messages;
  const t = (key: string) => messages[key] ?? key;

  it("returns the localized demonym when available", () => {
    expect(resolvePlayerNationalityDemonym("FR", te, t)).toBe("French");
  });

  it("returns null for unknown codes", () => {
    expect(resolvePlayerNationalityDemonym("ZZ", te, t)).toBeNull();
  });

  it("returns null for empty values", () => {
    expect(resolvePlayerNationalityDemonym("  ", te, t)).toBeNull();
    expect(resolvePlayerNationalityDemonym(null, te, t)).toBeNull();
  });
});
