import { Controller, Get, Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { NestFactory } from "@nestjs/core";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { INTERNAL_API_HEADER } from "@sarpbc/utils";
import { createHttpAdapter } from "./fastify-adapter";
import { clientThrottleTracking } from "./client-throttle";

const TOKEN = "internal-api-token-value";

@Controller("probe")
class ProbeController {
  @Get()
  ok() {
    return { ok: true };
  }
}

@Module({
  imports: [
    ThrottlerModule.forRoot({
      ...clientThrottleTracking(TOKEN),
      throttlers: [{ name: "default", ttl: 60_000, limit: 2 }],
    }),
  ],
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
  }) {
    const headers: Record<string, string> = {};
    if (options.forwardedFor) {
      headers["x-forwarded-for"] = options.forwardedFor;
    }
    if (options.connectingIp) {
      headers["cf-connecting-ip"] = options.connectingIp;
    }
    if (options.token) {
      headers[INTERNAL_API_HEADER] = options.token;
    }
    return app.getHttpAdapter().getInstance().inject({
      method: "GET",
      url: "/probe",
      remoteAddress: options.remoteAddress,
      headers,
    });
  }

  it("keeps a separate bucket per Cloudflare visitor", async () => {
    const first = await hit({
      remoteAddress: "10.0.0.8",
      forwardedFor: "104.16.0.1",
      connectingIp: "203.0.113.10",
    });
    const second = await hit({
      remoteAddress: "10.0.0.8",
      forwardedFor: "104.16.0.1",
      connectingIp: "203.0.113.10",
    });
    const blocked = await hit({
      remoteAddress: "10.0.0.8",
      forwardedFor: "104.16.0.1",
      connectingIp: "203.0.113.10",
    });
    const otherVisitor = await hit({
      remoteAddress: "10.0.0.8",
      forwardedFor: "104.16.0.2",
      connectingIp: "203.0.113.11",
    });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(200);
    expect(blocked.statusCode).toBe(429);
    expect(otherVisitor.statusCode).toBe(200);
  });

  it("ignores a spoofed CF-Connecting-IP when the proxy did not see Cloudflare", async () => {
    const options = {
      remoteAddress: "10.0.0.9",
      forwardedFor: "203.0.113.40",
      connectingIp: "198.51.100.20",
    };
    expect((await hit(options)).statusCode).toBe(200);
    expect((await hit({ ...options, connectingIp: "198.51.100.21" })).statusCode).toBe(200);
    expect((await hit({ ...options, connectingIp: "198.51.100.22" })).statusCode).toBe(429);
  });

  it("does not let a public client prepend a forged forwarding hop", async () => {
    const response = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: "GET",
        url: "/probe",
        remoteAddress: "203.0.113.77",
        headers: {
          "x-forwarded-for": "198.51.100.8",
          "cf-connecting-ip": "203.0.113.78",
        },
      });
    const again = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method: "GET",
        url: "/probe",
        remoteAddress: "203.0.113.77",
        headers: {
          "x-forwarded-for": "198.51.100.9",
          "cf-connecting-ip": "203.0.113.79",
        },
      });
    const blocked = await app.getHttpAdapter().getInstance().inject({
      method: "GET",
      url: "/probe",
      remoteAddress: "203.0.113.77",
    });

    expect(response.statusCode).toBe(200);
    expect(again.statusCode).toBe(200);
    expect(blocked.statusCode).toBe(429);
  });

  it("skips the limit for a direct loopback call and for the internal token", async () => {
    for (let attempt = 0; attempt < 4; attempt += 1) {
      expect((await hit({ remoteAddress: "127.0.0.1" })).statusCode).toBe(200);
    }

    for (let attempt = 0; attempt < 4; attempt += 1) {
      expect(
        (
          await hit({
            remoteAddress: "10.0.0.12",
            forwardedFor: "203.0.113.90",
            token: TOKEN,
          })
        ).statusCode,
      ).toBe(200);
    }
  });
});
