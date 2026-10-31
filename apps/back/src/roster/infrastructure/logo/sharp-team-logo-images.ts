import sharp, { type Sharp } from "sharp";
import { InvalidInputError } from "../../../common/domain/errors";
import type { TeamLogoImages } from "../../application/ports";
import type { TeamLogoFormat } from "../../domain/team-logo";

const MAX_INPUT_PIXELS = 4096 * 4096;
const MAX_SVG_DENSITY = 2400;

export class SharpTeamLogoImages implements TeamLogoImages {
  async dimensions(bytes: Uint8Array): Promise<{ width: number; height: number }> {
    const { width, height } = await this.decode(() => this.open(bytes).metadata());
    return { width, height };
  }

  async normalize(bytes: Uint8Array, format: TeamLogoFormat, pixels: number): Promise<Uint8Array> {
    const density = format === "svg" ? await this.svgDensity(bytes, pixels) : undefined;
    const output = await this.decode(() =>
      this.open(bytes, density)
        .ensureAlpha()
        .resize(pixels, pixels, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .webp({ quality: 90, alphaQuality: 100, effort: 4 })
        .toBuffer(),
    );
    return new Uint8Array(output);
  }

  private async svgDensity(bytes: Uint8Array, pixels: number): Promise<number> {
    const { width, height } = await this.dimensions(bytes);
    const longest = Math.max(width, height, 1);
    return Math.min(MAX_SVG_DENSITY, Math.max(72, Math.ceil((72 * pixels) / longest)));
  }

  private open(bytes: Uint8Array, density?: number): Sharp {
    return sharp(bytes, { limitInputPixels: MAX_INPUT_PIXELS, animated: false, density });
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
