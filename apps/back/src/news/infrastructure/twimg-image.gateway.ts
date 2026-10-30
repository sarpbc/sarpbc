import { isTweetImageUrl } from "@sarpbc/utils";
import { ApplicationError, IntegrationError, NotFoundError } from "../../common/domain/errors";
import { canonicalImageContentType } from "../../common/domain/image-content-type";
import type { TweetImage, TweetImageGateway } from "../application/tweet-image.service";

const FETCH_TIMEOUT_MS = 5_000;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_REDIRECTS = 2;
const TWIMG_ORIGIN = "https://pbs.twimg.com";
const IMAGE_CONTENT_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/avif",
]);

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

export class TwimgImageGateway implements TweetImageGateway {
  async load(url: string): Promise<TweetImage> {
    const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
    try {
      let target = twimgUrl(url);
      for (let redirects = 0; ; redirects++) {
        if (!target) throw unavailable();
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
        if (!location || redirects >= MAX_REDIRECTS) throw unavailable();
        target = twimgUrl(location, target);
      }
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      throw unavailable();
    }
  }
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
    !IMAGE_CONTENT_TYPES.has(contentType) ||
    Number(response.headers.get("content-length")) > MAX_IMAGE_BYTES
  ) {
    await response.body?.cancel();
    throw unavailable();
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (let chunk = await reader.read(); !chunk.done; chunk = await reader.read()) {
    size += chunk.value.byteLength;
    if (size > MAX_IMAGE_BYTES) {
      await reader.cancel();
      throw unavailable();
    }
    chunks.push(chunk.value);
  }
  return { contentType, body: Buffer.concat(chunks) };
}
