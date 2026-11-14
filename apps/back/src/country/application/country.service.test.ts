import { describe, expect, it } from "vitest";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import { kc } from "../../../test/career-fixtures";
import {
  alpha54,
  countrySources,
  exotiik,
  vatira,
  vitality,
  zen,
} from "../../../test/country-fixtures";
import { CountryService } from "./country.service";

const firstPage = { limit: 25, offset: 0 };

describe(CountryService, () => {
  it("lists the nationalities stored on player profiles", async () => {
    const { sources } = countrySources();

    await expect(new CountryService(sources).list()).resolves.toEqual([
      { code: "FR", players: 4 },
      { code: "US", players: 1 },
    ]);
  });

  it("gathers the players, their current teams and the finished matches of a country", async () => {
    const { sources, findByNationality, list } = countrySources();
    const page = await new CountryService(sources).detail(" fr ", firstPage);

    expect(findByNationality).toHaveBeenCalledWith("FR");
    expect(page.code).toBe("FR");
    expect(page.players).toEqual([alpha54, exotiik, vatira, zen]);
    expect(page.teams).toEqual([kc, vitality]);
    expect(list).toHaveBeenCalledWith("results", {
      ...firstPage,
      playerIds: ["alpha54", "exotiik", "vatira", "zen"],
      redistributableOnly: true,
    });
  });

  it("leaves start.gg matches and stages out of the public page", async () => {
    const { sources } = countrySources();
    const page = await new CountryService(sources).detail("FR", firstPage);

    expect(page.matches.map(({ id }) => id)).toEqual(["final"]);
    expect(page.matchTotal).toBe(1);
  });

  it("reports a code no player holds", async () => {
    const { sources, list } = countrySources();

    await expect(new CountryService(sources).detail("DE", firstPage)).rejects.toThrow(
      NotFoundError,
    );
    expect(list).not.toHaveBeenCalled();
  });

  it("reports an empty or malformed code without querying players", async () => {
    const { sources, findByNationality } = countrySources();
    const service = new CountryService(sources);

    await expect(service.detail("", firstPage)).rejects.toThrow(NotFoundError);
    await expect(service.detail("FRA", firstPage)).rejects.toThrow(NotFoundError);
    expect(findByNationality).not.toHaveBeenCalled();
  });
});
