import { lookup as dnsLookup, type LookupAddress } from "node:dns";
import { request } from "node:https";
import type { IncomingMessage } from "node:http";
import { BlockList, isIP, type LookupFunction } from "node:net";
import { InvalidInputError } from "../../common/domain/errors";

export interface PublicDownloadLimits {
  maxBytes: number;
  timeoutMs: number;
  maxRedirects: number;
}

const BLOCKED_SUBNETS: [string, number, "ipv4" | "ipv6"][] = [
  ["0.0.0.0", 8, "ipv4"],
  ["10.0.0.0", 8, "ipv4"],
  ["100.64.0.0", 10, "ipv4"],
  ["127.0.0.0", 8, "ipv4"],
  ["169.254.0.0", 16, "ipv4"],
  ["172.16.0.0", 12, "ipv4"],
  ["192.0.0.0", 24, "ipv4"],
  ["192.0.2.0", 24, "ipv4"],
  ["192.88.99.0", 24, "ipv4"],
  ["192.168.0.0", 16, "ipv4"],
  ["198.18.0.0", 15, "ipv4"],
  ["198.51.100.0", 24, "ipv4"],
  ["203.0.113.0", 24, "ipv4"],
  ["224.0.0.0", 4, "ipv4"],
  ["240.0.0.0", 4, "ipv4"],
  ["::", 128, "ipv6"],
  ["::1", 128, "ipv6"],
  ["64:ff9b::", 96, "ipv6"],
  ["64:ff9b:1::", 48, "ipv6"],
  ["100::", 64, "ipv6"],
  ["2001::", 23, "ipv6"],
  ["2001:db8::", 32, "ipv6"],
  ["2002::", 16, "ipv6"],
  ["fc00::", 7, "ipv6"],
  ["fe80::", 10, "ipv6"],
  ["ff00::", 8, "ipv6"],
];

const blocked = new BlockList();
for (const [network, prefix, family] of BLOCKED_SUBNETS) blocked.addSubnet(network, prefix, family);

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 0) return false;
  return !blocked.check(address, family === 4 ? "ipv4" : "ipv6");
}

export const publicOnlyLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, { all: true, family: options.family }, (error, addresses) => {
    if (error) {
      callback(error, "", 0);
      return;
    }
    const resolved = addresses as LookupAddress[];
    if (resolved.length === 0 || resolved.some(({ address }) => !isPublicAddress(address))) {
      callback(privateAddressError(), "", 0);
      return;
    }
    if (options.all) {
      callback(null, resolved);
      return;
    }
    callback(null, resolved[0]!.address, resolved[0]!.family);
  });
};

export async function downloadPublicHttps(
  url: URL,
  limits: PublicDownloadLimits,
): Promise<Uint8Array> {
  const signal = AbortSignal.timeout(limits.timeoutMs);
  let current = url;
  for (let redirects = 0; ; redirects += 1) {
    requirePublicHttpsUrl(current);
    const response = await get(current, signal);
    const status = response.statusCode ?? 0;
    if (status >= 300 && status < 400 && response.headers.location) {
      response.resume();
      if (redirects >= limits.maxRedirects) {
        throw new InvalidInputError("The image URL redirected too many times.");
      }
      current = new URL(response.headers.location, current);
      continue;
    }
    if (status !== 200) {
      response.resume();
      throw new InvalidInputError(`The image URL answered HTTP ${status}.`);
    }
    return readBody(response, limits.maxBytes, signal);
  }
}

function requirePublicHttpsUrl(url: URL): void {
  if (url.protocol !== "https:") {
    throw new InvalidInputError("The image URL and its redirects must use https.");
  }
  if (url.username || url.password) {
    throw new InvalidInputError("The image URL must not contain credentials.");
  }
  if (url.port && url.port !== "443") {
    throw new InvalidInputError("The image URL must use the default https port.");
  }
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (isIP(host) && !isPublicAddress(host)) throw privateAddressError();
  if (/(^|\.)localhost\.?$/i.test(host)) throw privateAddressError();
}

function get(url: URL, signal: AbortSignal): Promise<IncomingMessage> {
  return new Promise((resolve, reject) => {
    const req = request(url, {
      method: "GET",
      lookup: publicOnlyLookup,
      signal,
      agent: false,
      headers: { accept: "image/png,image/webp,image/svg+xml", "user-agent": "sarpbc.org" },
    });
    req.once("response", resolve);
    req.once("error", (error) => reject(downloadError(error, signal)));
    req.end();
  });
}

function readBody(
  response: IncomingMessage,
  maxBytes: number,
  signal: AbortSignal,
): Promise<Uint8Array> {
  const declared = Number(response.headers["content-length"]);
  if (Number.isFinite(declared) && declared > maxBytes) {
    response.destroy();
    return Promise.reject(tooLargeError(maxBytes));
  }
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    response.on("data", (chunk: Buffer) => {
      size += chunk.byteLength;
      if (size > maxBytes) {
        response.destroy();
        reject(tooLargeError(maxBytes));
        return;
      }
      chunks.push(chunk);
    });
    response.once("end", () => resolve(new Uint8Array(Buffer.concat(chunks))));
    response.once("error", (error) => reject(downloadError(error, signal)));
    response.once("close", () =>
      reject(downloadError(new Error("the connection closed early"), signal)),
    );
  });
}

function downloadError(error: Error, signal: AbortSignal): Error {
  if (error instanceof InvalidInputError) return error;
  if (signal.aborted) return new InvalidInputError("The image download timed out.");
  return new InvalidInputError(`The image could not be downloaded: ${error.message}`);
}

function privateAddressError(): InvalidInputError {
  return new InvalidInputError(
    "The image URL resolves to a private, loopback or link-local address.",
  );
}

function tooLargeError(maxBytes: number): InvalidInputError {
  return new InvalidInputError(`The image is larger than ${maxBytes / (1024 * 1024)} MB.`);
}
