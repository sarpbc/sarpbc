import { describe, expect, it } from "vitest";
import { INTERNAL_API_HEADER } from "@sarpbc/utils";
import {
  canonicalIp,
  internalApiTokenMatches,
  isCloudflareIp,
  isDirectLoopback,
  isPublicIp,
  resolveClientAddress,
} from "./client-address";

const TOKEN = "internal-api-token-value";

describe("client address", () => {
  it("unwraps IPv4-mapped loopback and rejects junk", () => {
    expect(canonicalIp("::ffff:127.0.0.1")).toBe("127.0.0.1");
    expect(canonicalIp("::FFFF:104.16.0.1")).toBe("104.16.0.1");
    expect(canonicalIp("203.0.113.9")).toBe("203.0.113.9");
    expect(canonicalIp("not-an-ip")).toBeUndefined();
    expect(canonicalIp("203.0.113.9, 198.51.100.1")).toBeUndefined();
  });

  it("recognises Cloudflare edges and public visitors", () => {
    expect(isCloudflareIp("104.16.0.1")).toBe(true);
    expect(isCloudflareIp("::ffff:104.24.1.1")).toBe(true);
    expect(isCloudflareIp("2606:4700:4700::1111")).toBe(true);
    expect(isCloudflareIp("203.0.113.9")).toBe(false);
    expect(isCloudflareIp("10.0.0.4")).toBe(false);
    expect(isPublicIp("203.0.113.9")).toBe(true);
    expect(isPublicIp("10.1.1.1")).toBe(false);
    expect(isPublicIp("127.0.0.1")).toBe(false);
    expect(isPublicIp("::1")).toBe(false);
  });

  it("uses CF-Connecting-IP only when the proxy-seen address is Cloudflare", () => {
    expect(
      resolveClientAddress({
        ip: "104.16.0.1",
        headers: { "cf-connecting-ip": "203.0.113.9" },
      }),
    ).toBe("203.0.113.9");

    expect(
      resolveClientAddress({
        ip: "::ffff:104.16.0.1",
        headers: { "cf-connecting-ip": "2001:db8::1" },
      }),
    ).toBe("2001:db8::1");

    expect(
      resolveClientAddress({
        ip: "203.0.113.50",
        headers: { "cf-connecting-ip": "198.51.100.1" },
      }),
    ).toBe("203.0.113.50");

    expect(
      resolveClientAddress({
        ip: "104.16.0.1",
        headers: { "cf-connecting-ip": "10.1.1.1" },
      }),
    ).toBe("104.16.0.1");

    expect(
      resolveClientAddress({
        ip: "104.16.0.1",
        headers: { "cf-connecting-ip": ["203.0.113.9", "198.51.100.1"] },
      }),
    ).toBe("104.16.0.1");
  });

  it("treats a direct loopback socket as local even when the header says otherwise", () => {
    expect(isDirectLoopback({ socket: { remoteAddress: "::ffff:127.0.0.1" } })).toBe(true);
    expect(isDirectLoopback({ socket: { remoteAddress: "10.0.0.8" } })).toBe(false);
    expect(isDirectLoopback({ ip: "127.0.0.1" })).toBe(false);
  });

  it("accepts the internal token with a constant-time compare and ignores a wrong length", () => {
    expect(internalApiTokenMatches({ headers: { [INTERNAL_API_HEADER]: TOKEN } }, TOKEN)).toBe(
      true,
    );
    expect(internalApiTokenMatches({ headers: { [INTERNAL_API_HEADER]: "nope" } }, TOKEN)).toBe(
      false,
    );
    expect(internalApiTokenMatches({ headers: { [INTERNAL_API_HEADER]: TOKEN } }, undefined)).toBe(
      false,
    );
    expect(internalApiTokenMatches({ headers: {} }, TOKEN)).toBe(false);
  });
});
