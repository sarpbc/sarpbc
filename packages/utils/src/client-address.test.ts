import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  canonicalIp,
  forwardedPublicClient,
  internalApiTokenMatches,
  isCloudflareIp,
  isDirectLoopback,
  isPublicIp,
  resolveClientAddress,
  visitorAddressFromProxy,
} from "./client-address.ts";
import { INTERNAL_API_HEADER, INTERNAL_CLIENT_HEADER } from "./internal-api.ts";

const TOKEN = "internal-api-token-value";

describe("client address", () => {
  it("unwraps IPv4-mapped loopback and rejects junk", () => {
    assert.equal(canonicalIp("::ffff:127.0.0.1"), "127.0.0.1");
    assert.equal(canonicalIp("::FFFF:104.16.0.1"), "104.16.0.1");
    assert.equal(canonicalIp("203.0.113.9"), "203.0.113.9");
    assert.equal(canonicalIp("not-an-ip"), undefined);
    assert.equal(canonicalIp("203.0.113.9, 198.51.100.1"), undefined);
  });

  it("recognises Cloudflare edges and public visitors", () => {
    assert.equal(isCloudflareIp("104.16.0.1"), true);
    assert.equal(isCloudflareIp("::ffff:104.24.1.1"), true);
    assert.equal(isCloudflareIp("2606:4700:4700::1111"), true);
    assert.equal(isCloudflareIp("203.0.113.9"), false);
    assert.equal(isCloudflareIp("10.0.0.4"), false);
    assert.equal(isPublicIp("203.0.113.9"), true);
    assert.equal(isPublicIp("10.1.1.1"), false);
    assert.equal(isPublicIp("100.64.0.1"), false);
    assert.equal(isPublicIp("100.127.255.255"), false);
    assert.equal(isPublicIp("100.128.0.1"), true);
    assert.equal(isPublicIp("127.0.0.1"), false);
    assert.equal(isPublicIp("::1"), false);
  });

  it("uses CF-Connecting-IP only when the proxy-seen address is Cloudflare", () => {
    assert.equal(
      resolveClientAddress({ ip: "104.16.0.1", headers: { "cf-connecting-ip": "203.0.113.9" } }),
      "203.0.113.9",
    );
    assert.equal(
      resolveClientAddress({
        ip: "::ffff:104.16.0.1",
        headers: { "cf-connecting-ip": "2001:db8::1" },
      }),
      "2001:db8::1",
    );
    assert.equal(
      resolveClientAddress({ ip: "203.0.113.50", headers: { "cf-connecting-ip": "198.51.100.1" } }),
      "203.0.113.50",
    );
    assert.equal(
      resolveClientAddress({ ip: "104.16.0.1", headers: { "cf-connecting-ip": "10.1.1.1" } }),
      "104.16.0.1",
    );
    assert.equal(
      resolveClientAddress({
        ip: "104.16.0.1",
        headers: { "cf-connecting-ip": ["203.0.113.9", "198.51.100.1"] },
      }),
      "104.16.0.1",
    );
  });

  it("treats a direct loopback socket as local even when the header says otherwise", () => {
    assert.equal(isDirectLoopback({ socket: { remoteAddress: "::ffff:127.0.0.1" } }), true);
    assert.equal(isDirectLoopback({ socket: { remoteAddress: "10.0.0.8" } }), false);
    assert.equal(isDirectLoopback({ ip: "127.0.0.1" }), false);
  });

  it("reads the visitor the same way a trusted proxy in front of Cloudflare does", () => {
    assert.equal(
      visitorAddressFromProxy({
        socketAddress: "10.0.0.5",
        forwardedFor: "203.0.113.10, 104.16.0.1",
        connectingIp: "203.0.113.10",
      }),
      "203.0.113.10",
    );
    assert.equal(
      visitorAddressFromProxy({
        socketAddress: "203.0.113.77",
        forwardedFor: "198.51.100.8",
        connectingIp: "203.0.113.10",
      }),
      "203.0.113.77",
    );
    assert.equal(
      visitorAddressFromProxy({ socketAddress: "10.0.0.5", forwardedFor: "10.1.1.1" }),
      undefined,
    );
  });

  it("accepts a public forwarded client and ignores a private one", () => {
    const forwarded = (address: string) =>
      forwardedPublicClient({ headers: { [INTERNAL_CLIENT_HEADER]: address } });
    assert.equal(forwarded("203.0.113.10"), "203.0.113.10");
    assert.equal(forwarded("10.1.1.1"), undefined);
    assert.equal(forwarded("100.80.0.4"), undefined);
  });

  it("accepts the internal token with a constant-time compare and ignores a wrong length", () => {
    const withToken = (value: string) => ({ headers: { [INTERNAL_API_HEADER]: value } });
    assert.equal(internalApiTokenMatches(withToken(TOKEN), TOKEN), true);
    assert.equal(internalApiTokenMatches(withToken("nope"), TOKEN), false);
    assert.equal(internalApiTokenMatches(withToken(TOKEN), undefined), false);
    assert.equal(internalApiTokenMatches({ headers: {} }, TOKEN), false);
  });
});
