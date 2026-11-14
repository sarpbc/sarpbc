import type { LookupAddress, LookupOptions } from "node:dns";
import type { RequestOptions } from "node:https";
import type { IncomingMessage } from "node:http";
import { BlockList, isIP } from "node:net";
import type { LookupFunction } from "node:net";
import { finished } from "node:stream/promises";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";

export interface PublicDownloadOptions {
  maxBytes: number;
  timeoutMs: number;
  maxRedirects: number;
  isAllowedHost: (hostname: string) => boolean;
}

interface HttpsRequest {
  once: ((event: "response", listener: (response: IncomingMessage) => void) => HttpsRequest) &
    ((event: "error", listener: (error: Error) => void) => HttpsRequest);
  end: () => void;
}

/** The Node primitives a download needs, so a caller supplies them (`https.request`, `dns.promises.lookup`). */
export interface PublicHttpsTransport {
  request: (url: URL, options: RequestOptions) => HttpsRequest;
  lookup: (
    hostname: string,
    options: { all: true; family: LookupOptions["family"] },
  ) => Promise<LookupAddress[]>;
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
  ["::", 96, "ipv6"],
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

for (const [network, prefix, family] of BLOCKED_SUBNETS) {
  blocked.addSubnet(network, prefix, family);
}

export function isPublicAddress(address: string): boolean {
  const family = isIP(address);

  if (family === 0) {
    return false;
  }

  return !blocked.check(address, family === 4 ? "ipv4" : "ipv6");
}

function privateAddressError(): InvalidInputError {
  return new InvalidInputError(
    "The image URL resolves to a private, loopback or link-local address.",
  );
}

function tooLargeError(maxBytes: number): InvalidInputError {
  return new InvalidInputError(`The image is larger than ${maxBytes / (1024 * 1024)} MB.`);
}

function downloadError(error: Error, signal: AbortSignal): Error {
  if (error instanceof InvalidInputError) {
    return error;
  }

  if (signal.aborted) {
    return new InvalidInputError("The image download timed out.");
  }

  return new InvalidInputError(`The image could not be downloaded: ${error.message}`);
}

async function resolvePublicAddresses(
  lookup: PublicHttpsTransport["lookup"],
  hostname: string,
  family: LookupOptions["family"],
): Promise<LookupAddress[] | Error> {
  try {
    const resolved = await lookup(hostname, { all: true, family });

    if (resolved.some(({ address }) => !isPublicAddress(address))) {
      return privateAddressError();
    }

    return resolved;
  } catch (error) {
    return error instanceof Error ? error : new Error(String(error));
  }
}

function createPublicOnlyLookup(lookup: PublicHttpsTransport["lookup"]): LookupFunction {
  return (hostname, options, respond) => {
    const answer = async (): Promise<void> => {
      const resolved = await resolvePublicAddresses(lookup, hostname, options.family);

      if (resolved instanceof Error) {
        respond(resolved, "", 0);

        return;
      }

      const first: (typeof resolved)[number] | undefined = resolved[0];

      if (first === undefined) {
        respond(privateAddressError(), "", 0);

        return;
      }

      if (options.all === true) {
        respond(null, resolved);

        return;
      }

      respond(null, first.address, first.family);
    };

    void answer();
  };
}

function requirePublicHttpsUrl(url: URL, isAllowedHost: (hostname: string) => boolean): void {
  if (url.protocol !== "https:") {
    throw new InvalidInputError("The image URL and its redirects must use https.");
  }

  if (url.username || url.password) {
    throw new InvalidInputError("The image URL must not contain credentials.");
  }

  if (url.port && url.port !== "443") {
    throw new InvalidInputError("The image URL must use the default https port.");
  }

  const host = url.hostname.replaceAll(/^\[|\]$/gu, "");

  if (isIP(host) && !isPublicAddress(host)) {
    throw privateAddressError();
  }

  if (/(?:^|\.)localhost\.?$/iu.test(host)) {
    throw privateAddressError();
  }

  if (!isAllowedHost(host)) {
    throw new InvalidInputError(`The image URL host "${host}" is not an accepted source.`);
  }
}

async function get(
  url: URL,
  signal: AbortSignal,
  transport: PublicHttpsTransport,
): Promise<IncomingMessage> {
  const req = transport.request(url, {
    method: "GET",
    lookup: createPublicOnlyLookup(transport.lookup),
    signal,
    agent: false,
    headers: { accept: "image/png,image/webp,image/svg+xml", "user-agent": "sarpbc.org" },
  });

  const { promise, resolve, reject } = Promise.withResolvers<IncomingMessage>();
  req.once("response", resolve);
  req.once("error", (error) => {
    reject(downloadError(error, signal));
  });
  req.end();

  return await promise;
}

async function readBody(
  response: IncomingMessage,
  maxBytes: number,
  signal: AbortSignal,
): Promise<Uint8Array> {
  const declared = Number(response.headers["content-length"]);

  if (Number.isFinite(declared) && declared > maxBytes) {
    response.destroy();

    throw tooLargeError(maxBytes);
  }

  const chunks: Buffer[] = [];
  let size = 0;
  response.on("data", (chunk: Buffer) => {
    size += chunk.byteLength;

    if (size > maxBytes) {
      response.destroy(tooLargeError(maxBytes));

      return;
    }

    chunks.push(chunk);
  });

  try {
    await finished(response);
  } catch (error) {
    throw downloadError(error instanceof Error ? error : new Error(String(error)), signal);
  }

  return new Uint8Array(Buffer.concat(chunks));
}

async function followRedirects(
  current: URL,
  redirects: number,
  options: PublicDownloadOptions,
  transport: PublicHttpsTransport,
  signal: AbortSignal,
): Promise<Uint8Array> {
  requirePublicHttpsUrl(current, options.isAllowedHost);
  const response = await get(current, signal, transport);
  const status = response.statusCode ?? 0;

  if (
    status >= 300 &&
    status < 400 &&
    response.headers.location !== undefined &&
    response.headers.location !== ""
  ) {
    response.resume();

    if (redirects >= options.maxRedirects) {
      throw new InvalidInputError("The image URL redirected too many times.");
    }

    if (!URL.canParse(response.headers.location, current)) {
      throw new InvalidInputError("The image URL redirected to an invalid location.");
    }

    return await followRedirects(
      new URL(response.headers.location, current),
      redirects + 1,
      options,
      transport,
      signal,
    );
  }

  if (status !== 200) {
    response.resume();
    throw new InvalidInputError(`The image URL answered HTTP ${status}.`);
  }

  return await readBody(response, options.maxBytes, signal);
}

export async function downloadPublicHttps(
  url: URL,
  options: PublicDownloadOptions,
  transport: PublicHttpsTransport,
): Promise<Uint8Array> {
  return await followRedirects(url, 0, options, transport, AbortSignal.timeout(options.timeoutMs));
}
