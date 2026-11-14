import {
  canonicalImageContentType,
  IMAGE_CONTENT_TYPES,
  isTweetImageUrl,
  MAX_IMAGE_BYTES,
} from "@sarpbc/utils";
import { ApplicationError } from "../../common/domain/errors/application-error";
import { IntegrationError } from "../../common/domain/errors/integration-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import type { TweetImage, TweetImageGateway } from "../application/tweet-image.service";

const FETCH_TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 2;
const TWIMG_ORIGIN = "https://pbs.twimg.com";

// X also serves AVIF, which the cover upload does not accept.
const TWIMG_CONTENT_TYPES = new Set<string>([...IMAGE_CONTENT_TYPES, "image/avif"]);

function unavailable(): IntegrationError {
  return new IntegrationError("Could not load this image from X. Try again in a moment.");
}

function twimgUrl(input: string, base?: string): string | null {
  let url: URL;

  try {
    url = new URL(input, base);
  } catch {
    return null;
  }

  if (!isTweetImageUrl(url.href)) return null;

  return `${TWIMG_ORIGIN}${url.pathname}${url.search}`;
}

async function readImage(response: Response): Promise<TweetImage> {
  if (response.status === 404 || response.status === 410) {
    await response.body?.cancel();
    throw new NotFoundError("This image is no longer available on X.");
  }

  const contentType = canonicalImageContentType(response.headers.get("content-type") ?? "");

  if (
    !response.ok ||
    !response.body ||
    !TWIMG_CONTENT_TYPES.has(contentType) ||
    Number(response.headers.get("content-length")) > MAX_IMAGE_BYTES
  ) {
    await response.body?.cancel();
    throw unavailable();
  }

  const chunks: Uint8Array[] = [];
  let size = 0;

  // Leaving the loop early cancels the stream.
  for await (const chunk of response.body) {
    const value: unknown = chunk;

    if (!(value instanceof Uint8Array)) throw unavailable();

    size += value.byteLength;

    if (size > MAX_IMAGE_BYTES) throw unavailable();

    chunks.push(value);
  }

  return { contentType, body: Buffer.concat(chunks) };
}

async function fetchImage(
  target: string | null,
  redirects: number,
  signal: AbortSignal,
): Promise<TweetImage> {
  if (target === null || target === "") throw unavailable();

  const response = await fetch(target, {
    redirect: "manual",
    signal,
    headers: { Accept: "image/*" },
  });

  if (response.status < 300 || response.status >= 400) {
    return await readImage(response);
  }

  await response.body?.cancel();
  const location = response.headers.get("location");

  if (location === null || location === "" || redirects >= MAX_REDIRECTS) throw unavailable();

  return await fetchImage(twimgUrl(location, target), redirects + 1, signal);
}

export class TwimgImageGateway implements TweetImageGateway {
  async load(url: string): Promise<TweetImage> {
    try {
      return await fetchImage(twimgUrl(url), 0, AbortSignal.timeout(FETCH_TIMEOUT_MS));
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      throw unavailable();
    }
  }
}
