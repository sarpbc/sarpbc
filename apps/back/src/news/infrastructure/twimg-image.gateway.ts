import {
  canonicalImageContentType,
  IMAGE_CONTENT_TYPES,
  isTweetImageUrl,
  MAX_IMAGE_BYTES,
} from "@sarpbc/utils";
import { ApplicationError } from "../../common/domain/errors/application-error";
import { IntegrationError } from "../../common/domain/errors/integration-error";
import { NotFoundError } from "../../common/domain/errors/not-found-error";
import type { TweetImageGateway } from "../application/tweet-image.service";

const FETCH_TIMEOUT_MS = 5000;
const MAX_REDIRECTS = 2;

const TWIMG_CONTENT_TYPES = new Set<string>([...IMAGE_CONTENT_TYPES, "image/avif"]);

const unavailable = () =>
  new IntegrationError("Could not load this image from X. Try again in a moment.");

const twimgUrl = (input: string, base?: string) => {
  let url: URL;

  try {
    url = new URL(input, base);
  } catch {
    return null;
  }

  if (!isTweetImageUrl(url.href)) {
    return null;
  }

  // WARNING: a literal host prefix keeps every request on pbs.twimg.com, whatever path the input carries.
  return `https://pbs.twimg.com/${url.pathname.slice(1)}${url.search}`;
};

const readImage = async (response: Response) => {
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

  for await (const chunk of response.body) {
    const value: unknown = chunk;

    if (!(value instanceof Uint8Array)) {
      throw unavailable();
    }

    size += value.byteLength;

    if (size > MAX_IMAGE_BYTES) {
      throw unavailable();
    }

    chunks.push(value);
  }

  return { body: Buffer.concat(chunks), contentType };
};

const fetchImage = async (target: string | null, redirects: number, signal: AbortSignal) => {
  if (target === null || target === "") {
    throw unavailable();
  }

  const response = await fetch(target, {
    headers: { Accept: "image/*" },
    redirect: "manual",
    signal,
  });

  if (response.status < 300 || response.status >= 400) {
    return await readImage(response);
  }

  await response.body?.cancel();
  const location = response.headers.get("location");

  if (location === null || location === "" || redirects >= MAX_REDIRECTS) {
    throw unavailable();
  }

  return await fetchImage(twimgUrl(location, target), redirects + 1, signal);
};

export class TwimgImageGateway implements TweetImageGateway {
  async load(url: string) {
    try {
      return await fetchImage(twimgUrl(url), 0, AbortSignal.timeout(FETCH_TIMEOUT_MS));
    } catch (error) {
      if (error instanceof ApplicationError) {
        throw error;
      }

      throw unavailable();
    }
  }
}
