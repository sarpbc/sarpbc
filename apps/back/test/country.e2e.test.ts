import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { Test } from "@nestjs/testing";
import { APP_FILTER } from "@nestjs/core";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import request from "supertest";
import { z } from "zod";
import { AllExceptionsFilter } from "../src/common/infrastructure/http/filters/all-exceptions.filter";
import { configureApp } from "../src/configure-app";
import { CountryService } from "../src/country/application/country.service";
import { CountryController } from "../src/country/infrastructure/http/country.controller";
import { countrySources } from "./country-fixtures";

const countryBody = z.object({
  country: z.looseObject({
    code: z.string(),
    players: z.array(z.looseObject({ slug: z.string() })),
    teams: z.array(z.looseObject({ slug: z.string() })),
    matches: z.array(z.looseObject({ id: z.string() })),
    matchTotal: z.number(),
  }),
});

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
    const response = await request(app.getHttpServer()).get("/countries");

    expect(response.status).toBe(200);
    expect(response.body).toStrictEqual({
      countries: [
        { code: "FR", playerCount: 4 },
        { code: "US", playerCount: 1 },
      ],
    });
  });

  const frenchCountry = async () => {
    const response = await request(app.getHttpServer()).get("/countries/fr");

    expect(response.status).toBe(200);

    return countryBody.parse(response.body).country;
  };

  it("returns the players of a country", async () => {
    const country = await frenchCountry();

    expect(country.code).toBe("FR");
    expect(country.players.map(({ slug }) => slug)).toStrictEqual([
      "alpha54",
      "exotiik",
      "vatira",
      "zen",
    ]);
    expect(country.players[0]).toMatchObject({
      nationality: "fr",
      team: { id: "vitality", slug: "team-vitality" },
    });
  });

  it("returns the teams and matches of a country without start.gg matches", async () => {
    const country = await frenchCountry();

    expect(country.teams.map(({ slug }) => slug)).toStrictEqual(["karmine-corp", "team-vitality"]);
    expect(country.matches.map(({ id }) => id)).toStrictEqual(["final"]);
    expect(country.matchTotal).toBe(1);
    expect(JSON.stringify(country)).not.toContain("startgg");
  });

  it("pages the matches", async () => {
    const response = await request(app.getHttpServer()).get("/countries/FR?limit=5&offset=10");

    expect(response.status).toBe(200);
    expect(list).toHaveBeenLastCalledWith(
      "results",
      expect.objectContaining({ limit: 5, offset: 10, redistributableOnly: true }),
    );
  });

  it.each(["de", "france"])(
    "answers 404 for the code %s that no player holds or that is malformed",
    async (code) => {
      const response = await request(app.getHttpServer()).get(`/countries/${code}`);

      expect(response.status).toBe(404);
    },
  );

  it("refuses an invalid match page", async () => {
    const response = await request(app.getHttpServer()).get("/countries/fr?limit=0");

    expect(response.status).toBe(400);
  });
});
