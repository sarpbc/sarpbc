import type { Sharp, SharpOptions } from "sharp";
import { InvalidInputError } from "../../../common/domain/errors";
import type { TeamLogoImages } from "../../application/ports";
import type { TeamLogoFormat } from "../../domain/team-logo";

const MAX_INPUT_PIXELS = 4096 * 4096;
const MAX_SVG_DENSITY = 2400;
const PIPELINE_TIMEOUT_SECONDS = 10;

type SharpFactory = (input: Uint8Array, options: SharpOptions) => Sharp;

let sharpFactory: Promise<SharpFactory> | undefined;

function loadSharp(): Promise<SharpFactory> {
  sharpFactory ??= import("sharp").then(({ default: sharp }) => {
    sharp.cache(false);
    sharp.concurrency(1);
    return sharp;
  });
  return sharpFactory;
}

export class SharpTeamLogoImages implements TeamLogoImages {
  async dimensions(bytes: Uint8Array): Promise<{ width: number; height: number }> {
    const image = await this.open(bytes);
    const { width, height } = await this.decode(() => image.metadata());
    return { width, height };
  }

  async normalize(bytes: Uint8Array, format: TeamLogoFormat, pixels: number): Promise<Uint8Array> {
    const density = format === "svg" ? await this.svgDensity(bytes, pixels) : undefined;
    const image = await this.open(bytes, { density });
    const output = await this.decode(() =>
      image
        .timeout({ seconds: PIPELINE_TIMEOUT_SECONDS })
        .ensureAlpha()
        .resize(pixels, pixels, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 90, alphaQuality: 100, effort: 4 })
        .toBuffer(),
    );
    return new Uint8Array(output);
  }

  private async svgDensity(bytes: Uint8Array, pixels: number): Promise<number> {
    const image = await this.open(bytes, { limitInputPixels: false });
    const { width, height } = await this.decode(() => image.metadata());
    const longest = Math.max(width, height, 1);
    return Math.min(MAX_SVG_DENSITY, Math.max(1, Math.ceil((72 * pixels) / longest)));
  }

  private async open(bytes: Uint8Array, options: SharpOptions = {}): Promise<Sharp> {
    const sharp = await loadSharp();
    return sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS, animated: false, ...options });
  }

  private async decode<T>(work: () => Promise<T>): Promise<T> {
    try {
      return await work();
    } catch {
      throw new InvalidInputError(
        "The logo could not be decoded. Use a valid PNG, WebP or SVG of at most 4096x4096 pixels.",
      );
    }
  }
}
