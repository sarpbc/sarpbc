import { Controller, Get, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { NestFactory } from "@nestjs/core";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
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
  @Get()
  ok() {
    return { ok: true };
  }
}

@Module({
  imports: [ThrottlerModule.forRoot(createClientThrottleOptions(TOKEN))],
  controllers: [ProbeController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
class ProbeModule {}

describe("client throttle behind a trusted proxy", () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const nest = await NestFactory.create<NestFastifyApplication>(
      ProbeModule,
      createHttpAdapter(),
      {
        logger: false,
      },
    );

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

    for (let attempt = 0; attempt < PUBLIC_LIMIT; attempt += 1) {
      expect((await hit(visitor)).statusCode).toBe(200);
    }

    expect((await hit(visitor)).statusCode).toBe(429);

    const otherVisitor = {
      remoteAddress: "10.0.0.8",
      forwardedFor: "104.16.0.2",
      connectingIp: "203.0.113.11",
    };

    expect((await hit(otherVisitor)).statusCode).toBe(200);
  });

  it("ignores a spoofed CF-Connecting-IP when the proxy did not see Cloudflare", async () => {
    const options = {
      remoteAddress: "10.0.0.9",
      forwardedFor: "203.0.113.40",
    };

    for (let attempt = 0; attempt < PUBLIC_LIMIT; attempt += 1) {
      expect((await hit({ ...options, connectingIp: `198.51.100.${attempt}` })).statusCode).toBe(
        200,
      );
    }

    expect((await hit({ ...options, connectingIp: "198.51.100.200" })).statusCode).toBe(429);
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

    for (let attempt = 0; attempt < PUBLIC_LIMIT; attempt += 1) {
      expect((await forged(attempt)).statusCode).toBe(200);
    }

    const blocked = await app.getHttpAdapter().getInstance().inject({
      method: "GET",
      url: "/probe",
      remoteAddress: "203.0.113.77",
    });

    expect(blocked.statusCode).toBe(429);
  });

  it("skips the limit for a direct loopback call", async () => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      expect((await hit({ remoteAddress: "127.0.0.1" })).statusCode).toBe(200);
    }
  });

  it("limits internal SSR calls per forwarded visitor above the public limit", async () => {
    const call = async (client: string) =>
      await hit({ remoteAddress: "10.0.0.12", token: TOKEN, client });

    for (let attempt = 0; attempt < SSR_LIMIT; attempt += 1) {
      expect((await call("203.0.113.50")).statusCode).toBe(200);
    }

    expect((await call("203.0.113.50")).statusCode).toBe(429);
    expect((await call("203.0.113.51")).statusCode).toBe(200);
  });

  it("ignores a forwarded visitor without the internal token", async () => {
    const base = {
      remoteAddress: "10.0.0.21",
      forwardedFor: "198.51.100.77",
    };

    for (let attempt = 0; attempt < PUBLIC_LIMIT; attempt += 1) {
      expect((await hit({ ...base, client: `203.0.113.${attempt}` })).statusCode).toBe(200);
    }

    expect((await hit({ ...base, client: "203.0.113.200" })).statusCode).toBe(429);
  });

  it("does not split the SSR bucket on a private forwarded visitor", async () => {
    const call = async (client: string) =>
      await hit({
        remoteAddress: "10.0.0.22",
        forwardedFor: "198.51.100.88",
        token: TOKEN,
        client,
      });

    for (let attempt = 0; attempt < SSR_LIMIT; attempt += 1) {
      expect((await call(attempt % 2 === 0 ? "10.9.9.1" : "100.64.1.1")).statusCode).toBe(200);
    }

    expect((await call("10.9.9.2")).statusCode).toBe(429);
  });
});
