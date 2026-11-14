import { Controller, Get } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { INTERNAL_API_HEADER, INTERNAL_CLIENT_HEADER } from "@sarpbc/utils";
import { createHttpAdapter } from "./fastify-adapter";
import { createClientThrottleOptions } from "./client-throttle";

const TOKEN = "internal-api-token-value";
const PUBLIC_LIMIT = 100;
const SSR_LIMIT = 400;

@Controller("probe")
class ProbeController {
  readonly body = { ok: true };

  @Get()
  ok() {
    return this.body;
  }
}

describe("client throttle behind a trusted proxy", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot(createClientThrottleOptions(TOKEN))],
      controllers: [ProbeController],
      providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
    }).compile();

    const nest = moduleRef.createNestApplication<NestFastifyApplication>(createHttpAdapter(), {
      logger: false,
    });

    await nest.init();
    await nest.getHttpAdapter().getInstance().ready();
    app = nest;
  });

  afterAll(async () => {
    await app.close();
  });

  async function hit(options: {
    remoteAddress: string;
    forwardedFor?: string;
    connectingIp?: string;
    token?: string;
    client?: string;
  }) {
    const headers: Record<string, string> = {};

    if (options.forwardedFor !== undefined) {
      headers["x-forwarded-for"] = options.forwardedFor;
    }

    if (options.connectingIp !== undefined) {
      headers["cf-connecting-ip"] = options.connectingIp;
    }

    if (options.token !== undefined) {
      headers[INTERNAL_API_HEADER] = options.token;
    }

    if (options.client !== undefined) {
      headers[INTERNAL_CLIENT_HEADER] = options.client;
    }

    return await app.getHttpAdapter().getInstance().inject({
      method: "GET",
      url: "/probe",
      remoteAddress: options.remoteAddress,
      headers,
    });
  }

  it("keeps a separate bucket per Cloudflare visitor", async () => {
    const visitor = {
      remoteAddress: "10.0.0.8",
      forwardedFor: "104.16.0.1",
      connectingIp: "203.0.113.10",
    };

    const responses = await Promise.all(
      Array.from({ length: PUBLIC_LIMIT }, async () => await hit(visitor)),
    );

    for (const response of responses) {
      expect(response.statusCode).toBe(200);
    }

    const response2 = await hit(visitor);
    expect(response2.statusCode).toBe(429);

    const otherVisitor = {
      remoteAddress: "10.0.0.8",
      forwardedFor: "104.16.0.2",
      connectingIp: "203.0.113.11",
    };

    const response3 = await hit(otherVisitor);
    expect(response3.statusCode).toBe(200);
  });

  it("ignores a spoofed CF-Connecting-IP when the proxy did not see Cloudflare", async () => {
    const options = {
      remoteAddress: "10.0.0.9",
      forwardedFor: "203.0.113.40",
    };

    const responses = await Promise.all(
      Array.from(
        { length: PUBLIC_LIMIT },
        async (_, attempt) => await hit({ ...options, connectingIp: `198.51.100.${attempt}` }),
      ),
    );

    for (const response of responses) {
      expect(response.statusCode).toBe(200);
    }

    const response5 = await hit({ ...options, connectingIp: "198.51.100.200" });
    expect(response5.statusCode).toBe(429);
  });

  it("does not let a public client prepend a forged forwarding hop", async () => {
    const forged = async (attempt: number) =>
      await app
        .getHttpAdapter()
        .getInstance()
        .inject({
          method: "GET",
          url: "/probe",
          remoteAddress: "203.0.113.77",
          headers: {
            "x-forwarded-for": `198.51.100.${attempt}`,
            "cf-connecting-ip": `203.0.113.${attempt}`,
          },
        });

    const responses = await Promise.all(
      Array.from({ length: PUBLIC_LIMIT }, async (_, attempt) => await forged(attempt)),
    );

    for (const response of responses) {
      expect(response.statusCode).toBe(200);
    }

    const blocked = await app.getHttpAdapter().getInstance().inject({
      method: "GET",
      url: "/probe",
      remoteAddress: "203.0.113.77",
    });

    expect(blocked.statusCode).toBe(429);
  });

  it("skips the limit for a direct loopback call", async () => {
    const responses = await Promise.all(
      Array.from({ length: 4 }, async () => await hit({ remoteAddress: "127.0.0.1" })),
    );

    for (const response of responses) {
      expect(response.statusCode).toBe(200);
    }
  });

  const callInternal = async (client: string) =>
    await hit({ remoteAddress: "10.0.0.12", token: TOKEN, client });

  const callPrivateHop = async (client: string) =>
    await hit({
      remoteAddress: "10.0.0.22",
      forwardedFor: "198.51.100.88",
      token: TOKEN,
      client,
    });

  it("limits internal SSR calls per forwarded visitor above the public limit", async () => {
    const responses = await Promise.all(
      Array.from({ length: SSR_LIMIT }, async () => await callInternal("203.0.113.50")),
    );

    for (const response of responses) {
      expect(response.statusCode).toBe(200);
    }

    const callResult2 = await callInternal("203.0.113.50");
    expect(callResult2.statusCode).toBe(429);
    const callResult3 = await callInternal("203.0.113.51");
    expect(callResult3.statusCode).toBe(200);
  });

  it("ignores a forwarded visitor without the internal token", async () => {
    const base = {
      remoteAddress: "10.0.0.21",
      forwardedFor: "198.51.100.77",
    };

    const responses = await Promise.all(
      Array.from(
        { length: PUBLIC_LIMIT },
        async (_, attempt) => await hit({ ...base, client: `203.0.113.${attempt}` }),
      ),
    );

    for (const response of responses) {
      expect(response.statusCode).toBe(200);
    }

    const response8 = await hit({ ...base, client: "203.0.113.200" });
    expect(response8.statusCode).toBe(429);
  });

  it("does not split the SSR bucket on a private forwarded visitor", async () => {
    const responses = await Promise.all(
      Array.from(
        { length: SSR_LIMIT },
        async (_, attempt) => await callPrivateHop(attempt % 2 === 0 ? "10.9.9.1" : "100.64.1.1"),
      ),
    );

    for (const response of responses) {
      expect(response.statusCode).toBe(200);
    }

    const callResult5 = await callPrivateHop("10.9.9.2");
    expect(callResult5.statusCode).toBe(429);
  });
});
