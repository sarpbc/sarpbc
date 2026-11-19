import { BlockList, isIP } from "node:net";
import { timingSafeEqual } from "node:crypto";
import { INTERNAL_API_HEADER, INTERNAL_CLIENT_HEADER } from "./internal-api";
import { isNonEmptyString } from "./text";

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

const addCidrs = (list: BlockList, cidrs: readonly string[], family: "ipv4" | "ipv6") => {
  for (const cidr of cidrs) {
    const [address, prefix] = cidr.split("/");

    if (!address || !prefix) {
      continue;
    }

    list.addSubnet(address, Number(prefix), family);
  }
};

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

export interface ClientRequest {
  ip?: string;
  headers?: Record<string, HeaderValue>;
  socket?: { remoteAddress?: string | null };
  raw?: { socket?: { remoteAddress?: string | null } };
}

export const canonicalIp = (value: string | undefined | null) => {
  const trimmed = isNonEmptyString(value) ? (value.trim().split("%")[0] ?? "") : "";
  const mapped = /^::ffff:(?<ipv4>\d{1,3}(?:\.\d{1,3}){3})$/iu.exec(trimmed);
  const candidate = mapped?.[1] ?? trimmed;
  const version = isIP(candidate);

  if (version === 4) {
    return candidate;
  }

  return version === 6 ? candidate.toLowerCase() : undefined;
};

const ipFamily = (ip: string) => (isIP(ip) === 6 ? "ipv6" : "ipv4");

export const isCloudflareIp = (value: string | undefined) => {
  const ip = canonicalIp(value);

  if (!isNonEmptyString(ip)) {
    return false;
  }

  return cloudflare.check(ip, ipFamily(ip));
};

export const isTrustedProxy = (value: string | undefined) => {
  const ip = canonicalIp(value);

  if (!isNonEmptyString(ip)) {
    return false;
  }

  return trustedProxy.check(ip, ipFamily(ip));
};

export const isPublicIp = (value: string | undefined) => {
  const ip = canonicalIp(value);

  if (!isNonEmptyString(ip)) {
    return false;
  }

  return !nonPublic.check(ip, ipFamily(ip));
};

const header = (headers: ClientRequest["headers"], name: string) => {
  const value = headers?.[name] ?? headers?.[name.toLowerCase()];

  if (Array.isArray(value)) {
    const trimmed = value.length === 1 ? value[0]?.trim() : undefined;

    return isNonEmptyString(trimmed) ? trimmed : undefined;
  }

  const trimmed = value?.trim();

  return isNonEmptyString(trimmed) ? trimmed : undefined;
};

export const resolveClientAddress = (request: ClientRequest) => {
  const seen = canonicalIp(request.ip);

  if (!isNonEmptyString(seen)) {
    return "unknown";
  }

  if (isCloudflareIp(seen)) {
    const client = canonicalIp(header(request.headers, "cf-connecting-ip"));

    if (isNonEmptyString(client) && isPublicIp(client)) {
      return client;
    }
  }

  return seen;
};

export const peerAddress = (request: ClientRequest) => {
  const address = request.socket?.remoteAddress ?? request.raw?.socket?.remoteAddress;

  return isNonEmptyString(address) ? canonicalIp(address) : undefined;
};

export const isDirectLoopback = (request: ClientRequest) => {
  const peer = peerAddress(request);

  return peer === "127.0.0.1" || peer === "::1";
};

export const addressSeenByTrustedProxy = (
  socketAddress: string | undefined | null,
  forwardedFor: string | undefined | null,
) => {
  const socket = canonicalIp(socketAddress);

  if (socket === undefined) {
    return socket;
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
};

const joinedHeader = (value: string | string[] | undefined | null) => {
  if (Array.isArray(value)) {
    return value.join(",");
  }

  return value ?? undefined;
};

const singleHeader = (value: string | string[] | undefined | null) => {
  if (Array.isArray(value)) {
    return value.length === 1 ? value[0] : undefined;
  }

  return value ?? undefined;
};

export const visitorAddressFromProxy = (input: {
  socketAddress?: string | null;
  forwardedFor?: string | string[] | null;
  connectingIp?: string | string[] | null;
}) => {
  const seen = addressSeenByTrustedProxy(input.socketAddress, joinedHeader(input.forwardedFor));

  if (seen === undefined) {
    return seen;
  }

  const resolved = resolveClientAddress({
    headers: { "cf-connecting-ip": singleHeader(input.connectingIp) },
    ip: seen,
  });

  return isPublicIp(resolved) ? resolved : undefined;
};

export const forwardedPublicClient = (request: ClientRequest) => {
  const client = canonicalIp(header(request.headers, INTERNAL_CLIENT_HEADER));

  return isNonEmptyString(client) && isPublicIp(client) ? client : undefined;
};

export const internalApiTokenMatches = (request: ClientRequest, expected: string | undefined) => {
  const token = expected?.trim();

  if (!isNonEmptyString(token)) {
    return false;
  }

  const provided = header(request.headers, INTERNAL_API_HEADER);

  if (!isNonEmptyString(provided)) {
    return false;
  }

  const left = Buffer.from(provided);
  const right = Buffer.from(token);

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
};
