import { createHash } from "node:crypto";
import { InvalidInputError } from "../../common/domain/errors";
import {
  detectTeamLogoFormat,
  MAX_TEAM_LOGO_BYTES,
  requireSafeSvg,
  requireTeamLogoDimensions,
  requireTeamLogoUrl,
  TEAM_LOGO_PIXELS,
  teamLogoKey,
  type TeamLogoVariant,
} from "../domain/team-logo";
import type { TeamLogoImages, TeamLogoSource, TeamLogoStorage } from "./ports";

export class TeamLogoService {
  constructor(
    private readonly source: TeamLogoSource,
    private readonly images: TeamLogoImages,
    private readonly storage: TeamLogoStorage,
  ) {}

  async upload(teamId: string, variant: TeamLogoVariant, imageUrl: string): Promise<string> {
    const bytes = await this.source.download(requireTeamLogoUrl(imageUrl), MAX_TEAM_LOGO_BYTES);
    if (bytes.byteLength > MAX_TEAM_LOGO_BYTES) {
      throw new InvalidInputError("The logo is larger than 2 MB.");
    }
    const format = detectTeamLogoFormat(bytes);
    if (format === "svg") {
      requireSafeSvg(bytes);
    } else {
      const { width, height } = await this.images.dimensions(bytes);
      requireTeamLogoDimensions(width, height);
    }
    const normalized = await this.images.normalize(bytes, format, TEAM_LOGO_PIXELS);
    const hash = createHash("sha256").update(normalized).digest("hex").slice(0, 16);
    return this.storage.put(teamLogoKey(teamId, variant, hash), normalized, "image/webp");
  }
}
