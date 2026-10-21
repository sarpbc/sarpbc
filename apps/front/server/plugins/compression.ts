import { promisify } from "node:util";
import { brotliCompress, constants, gzip } from "node:zlib";

// Nitro's node-server preset only precompresses public assets, so SSR HTML
// would otherwise reach the proxy uncompressed.
const MIN_BYTES = 1024;
const COMPRESSIBLE_TYPES = ["text/", "application/json", "application/xml", "image/svg+xml"];

// Quality 4 keeps dynamic brotli close to gzip's CPU cost; the default (11) takes
// hundreds of milliseconds per page.
const compressors = {
  br: (body: Buffer) =>
    promisify(brotliCompress)(body, {
      params: { [constants.BROTLI_PARAM_QUALITY]: 4 },
    }),
  gzip: (body: Buffer) => promisify(gzip)(body),
} as const;

type Encoding = keyof typeof compressors;

function acceptedEncoding(header: string | undefined): Encoding | undefined {
  const accepted = new Set(
    (header ?? "").split(",").map((token) => token.split(";")[0]?.trim().toLowerCase()),
  );
  return (["br", "gzip"] as const).find((encoding) => accepted.has(encoding));
}

async function compress(
  event: Parameters<typeof getRequestHeader>[0],
  response: { body?: unknown; headers?: Record<string, unknown> },
) {
  if (event.method === "HEAD" || typeof response.body !== "string") {
    return;
  }
  if (getResponseHeader(event, "content-encoding") || response.headers?.["content-encoding"]) {
    return;
  }

  const contentType = String(
    response.headers?.["content-type"] ?? getResponseHeader(event, "content-type") ?? "",
  );
  if (!COMPRESSIBLE_TYPES.some((type) => contentType.startsWith(type))) {
    return;
  }

  const body = Buffer.from(response.body);
  const encoding = acceptedEncoding(getRequestHeader(event, "accept-encoding"));
  if (!encoding || body.byteLength < MIN_BYTES) {
    return;
  }

  appendResponseHeader(event, "vary", "Accept-Encoding");
  setResponseHeader(event, "content-encoding", encoding);
  response.body = await compressors[encoding](body);
}

export default defineNitroPlugin((nitroApp) => {
  if (import.meta.dev) {
    return;
  }
  nitroApp.hooks.hook("render:response", (response, { event }) => compress(event, response));
  nitroApp.hooks.hook("beforeResponse", (event, response) => compress(event, response));
});
