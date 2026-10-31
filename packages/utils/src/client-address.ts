import { BlockList, isIP } from "node:net";
import { timingSafeEqual } from "node:crypto";
import { INTERNAL_API_HEADER, INTERNAL_CLIENT_HEADER } from "./internal-api.ts";

/**
 * Cloudflare publishes these ranges at https://www.cloudflare.com/ips-v4 and
 * https://www.cloudflare.com/ips-v6. Snapshot taken 2026-10-30.
 * `CF-Connecting-IP` is only trusted when the address Traefik saw is in this list.
 */
const CLOUDFLARE_IPV4 = [
  "173.245.48.0/20",
  "103.21.244.0/22",
  "103.22.200.0/22",
  "103.31.4.0/22",
  "141.101.64.0/18",
  "108.162.192.0/18",
  "190.93.240.0/20",
  "188.114.96.0/20",
  "197.234.240.0/22",
  "198.41.128.0/17",
  "162.158.0.0/15",
  "104.16.0.0/13",
  "104.24.0.0/14",
  "172.64.0.0/13",
  "131.0.72.0/22",
] as const;

const CLOUDFLARE_IPV6 = [
  "2400:cb00::/32",
  "2606:4700::/32",
  "2803:f800::/32",
  "2405:b500::/32",
  "2405:8100::/32",
  "2a06:98c0::/29",
  "2c0f:f248::/32",
] as const;

const cloudflare = new BlockList();
const nonPublic = new BlockList();

function addCidrs(list: BlockList, cidrs: readonly string[], family: "ipv4" | "ipv6"): void {
  for (const cidr of cidrs) {
    const [address, prefix] = cidr.split("/");
    if (!address || !prefix) {
      continue;
    }
    list.addSubnet(address, Number(prefix), family);
  }
}

const trustedProxy = new BlockList();

addCidrs(cloudflare, CLOUDFLARE_IPV4, "ipv4");
addCidrs(cloudflare, CLOUDFLARE_IPV6, "ipv6");

trustedProxy.addSubnet("127.0.0.0", 8, "ipv4");
trustedProxy.addSubnet("10.0.0.0", 8, "ipv4");
trustedProxy.addSubnet("172.16.0.0", 12, "ipv4");
trustedProxy.addSubnet("192.168.0.0", 16, "ipv4");
trustedProxy.addAddress("::1", "ipv6");
trustedProxy.addSubnet("fc00::", 7, "ipv6");

nonPublic.addSubnet("0.0.0.0", 8, "ipv4");
nonPublic.addSubnet("10.0.0.0", 8, "ipv4");
nonPublic.addSubnet("127.0.0.0", 8, "ipv4");
nonPublic.addSubnet("169.254.0.0", 16, "ipv4");
nonPublic.addSubnet("172.16.0.0", 12, "ipv4");
nonPublic.addSubnet("192.168.0.0", 16, "ipv4");
nonPublic.addSubnet("100.64.0.0", 10, "ipv4");
nonPublic.addAddress("::1", "ipv6");
nonPublic.addSubnet("fc00::", 7, "ipv6");
nonPublic.addSubnet("fe80::", 10, "ipv6");

export type HeaderValue = string | string[] | undefined;

export type ClientRequest = {
  ip?: string;
  headers?: Record<string, HeaderValue>;
  socket?: { remoteAddress?: string | null };
  raw?: { socket?: { remoteAddress?: string | null } };
};

export function canonicalIp(value: string | undefined | null): string | undefined {
  if (!value) {
    return undefined;
  }
  const trimmed = value.trim().split("%")[0] ?? "";
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(trimmed);
  const candidate = mapped?.[1] ?? trimmed;
  const version = isIP(candidate);
  if (version === 0) {
    return undefined;
  }
  return version === 4 ? candidate : candidate.toLowerCase();
}

function ipFamily(ip: string): "ipv4" | "ipv6" {
  return isIP(ip) === 6 ? "ipv6" : "ipv4";
}

export function isCloudflareIp(value: string | undefined): boolean {
  const ip = canonicalIp(value);
  if (!ip) {
    return false;
  }
  return cloudflare.check(ip, ipFamily(ip));
}

export function isTrustedProxy(value: string | undefined): boolean {
  const ip = canonicalIp(value);
  if (!ip) {
    return false;
  }
  return trustedProxy.check(ip, ipFamily(ip));
}

export function isPublicIp(value: string | undefined): boolean {
  const ip = canonicalIp(value);
  if (!ip) {
    return false;
  }
  return !nonPublic.check(ip, ipFamily(ip));
}

function header(headers: ClientRequest["headers"], name: string): string | undefined {
  const value = headers?.[name] ?? headers?.[name.toLowerCase()];
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (Array.isArray(value) && value.length === 1) {
    const trimmed = value[0]?.trim();
    return trimmed ? trimmed : undefined;
  }
  return undefined;
}

/**
 * `request.ip` is the address left after trusting the private proxy hop.
 * When that address is a Cloudflare edge, the visitor IP is `CF-Connecting-IP`.
 * Otherwise the header is ignored so a direct client cannot pick their bucket.
 */
export function resolveClientAddress(request: ClientRequest): string {
  const seen = canonicalIp(request.ip);
  if (!seen) {
    return "unknown";
  }
  if (isCloudflareIp(seen)) {
    const client = canonicalIp(header(request.headers, "cf-connecting-ip"));
    if (client && isPublicIp(client)) {
      return client;
    }
  }
  return seen;
}

export function peerAddress(request: ClientRequest): string | undefined {
  const address = request.socket?.remoteAddress ?? request.raw?.socket?.remoteAddress;
  return typeof address === "string" ? canonicalIp(address) : undefined;
}

export function isDirectLoopback(request: ClientRequest): boolean {
  const peer = peerAddress(request);
  return peer === "127.0.0.1" || peer === "::1";
}

export function addressSeenByTrustedProxy(
  socketAddress: string | undefined | null,
  forwardedFor: string | undefined | null,
): string | undefined {
  const socket = canonicalIp(socketAddress);
  if (!socket) {
    return undefined;
  }
  const forwarded = (forwardedFor ?? "")
    .split(",")
    .map((part) => canonicalIp(part))
    .filter((part): part is string => part !== undefined);
  const chain = [...forwarded, socket];
  let index = chain.length - 1;
  while (index > 0 && isTrustedProxy(chain[index])) {
    index -= 1;
  }
  return chain[index];
}

function joinedHeader(value: string | string[] | undefined | null): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.join(",");
  }
  return undefined;
}

function singleHeader(value: string | string[] | undefined | null): string | undefined {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value) && value.length === 1) {
    return value[0];
  }
  return undefined;
}

export function visitorAddressFromProxy(input: {
  socketAddress?: string | null;
  forwardedFor?: string | string[] | null;
  connectingIp?: string | string[] | null;
}): string | undefined {
  const seen = addressSeenByTrustedProxy(input.socketAddress, joinedHeader(input.forwardedFor));
  if (!seen) {
    return undefined;
  }
  const resolved = resolveClientAddress({
    ip: seen,
    headers: { "cf-connecting-ip": singleHeader(input.connectingIp) },
  });
  return isPublicIp(resolved) ? resolved : undefined;
}

export function forwardedPublicClient(request: ClientRequest): string | undefined {
  const client = canonicalIp(header(request.headers, INTERNAL_CLIENT_HEADER));
  if (!client || !isPublicIp(client)) {
    return undefined;
  }
  return client;
}

export function internalApiTokenMatches(
  request: ClientRequest,
  expected: string | undefined,
): boolean {
  const token = expected?.trim();
  if (!token) {
    return false;
  }
  const provided = header(request.headers, INTERNAL_API_HEADER);
  if (!provided) {
    return false;
  }
  const left = Buffer.from(provided);
  const right = Buffer.from(token);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}
