import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { APP_FILTER } from "@nestjs/core";
import { FastifyAdapter, NestFastifyApplication } from "@nestjs/platform-fastify";
import request from "supertest";
import type { CountryDetail, CountrySummary } from "@sarpbc/types";
import { AllExceptionsFilter } from "../src/common/infrastructure/http/filters/all-exceptions.filter";
import { configureApp } from "../src/configure-app";
import { CountryService } from "../src/country/application/country.service";
import { CountryController } from "../src/country/infrastructure/http/country.controller";
import { countrySources } from "./country-fixtures";

describe("country pages (e2e)", () => {
  let app: NestFastifyApplication;
  const { sources, list } = countrySources();

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      controllers: [CountryController],
      providers: [
        { provide: CountryService, useValue: new CountryService(sources) },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    }).compile();

    app = moduleFixture.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await configureApp(app, []);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it("lists the nationalities in use", async () => {
    const response = await request(app.getHttpServer()).get("/countries").expect(200);
    const { countries }: { countries: CountrySummary[] } = response.body;

    expect(countries).toEqual([
      { code: "FR", playerCount: 4 },
      { code: "US", playerCount: 1 },
    ]);
  });

  it("returns the players, teams and matches of a country without start.gg matches", async () => {
    const response = await request(app.getHttpServer()).get("/countries/fr").expect(200);
    const { country }: { country: CountryDetail } = response.body;

    expect(country.code).toBe("FR");
    expect(country.players.map(({ slug }) => slug)).toEqual([
      "alpha54",
      "exotiik",
      "vatira",
      "zen",
    ]);
    expect(country.players[0]).toMatchObject({
      nationality: "fr",
      team: { id: "vitality", slug: "team-vitality" },
    });
    expect(country.teams.map(({ slug }) => slug)).toEqual(["karmine-corp", "team-vitality"]);
    expect(country.matches.map(({ id }) => id)).toEqual(["final"]);
    expect(country.matchTotal).toBe(1);
    expect(JSON.stringify(country)).not.toContain("startgg");
  });

  it("pages the matches", async () => {
    await request(app.getHttpServer()).get("/countries/FR?limit=5&offset=10").expect(200);

    expect(list).toHaveBeenLastCalledWith(
      "results",
      expect.objectContaining({ limit: 5, offset: 10, redistributableOnly: true }),
    );
  });

  it("answers 404 for a code no player holds or a malformed code", async () => {
    await request(app.getHttpServer()).get("/countries/de").expect(404);
    await request(app.getHttpServer()).get("/countries/france").expect(404);
  });

  it("refuses an invalid match page", async () => {
    await request(app.getHttpServer()).get("/countries/fr?limit=0").expect(400);
  });
});
