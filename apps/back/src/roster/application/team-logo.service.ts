import { createHash } from "node:crypto";
import {
  detectTeamLogoFormat,
  MAX_TEAM_LOGO_BYTES,
  pendingTeamLogoKey,
  publishedTeamLogoKey,
  requirePendingTeamLogoKey,
  requireSafeSvg,
  requireTeamLogoDimensions,
  requireTeamLogoUrl,
  TEAM_LOGO_PIXELS,
  type TeamLogoVariant,
} from "../domain/team-logo";
import type { StoredTeamLogo, TeamLogoImages, TeamLogoSource, TeamLogoStorage } from "./ports";

export class TeamLogoService {
  constructor(
    private readonly source: TeamLogoSource,
    private readonly images: TeamLogoImages,
    private readonly storage: TeamLogoStorage,
  ) {}

  async upload(
    teamId: string,
    variant: TeamLogoVariant,
    imageUrl: string,
  ): Promise<StoredTeamLogo> {
    const bytes = await this.source.download(requireTeamLogoUrl(imageUrl), MAX_TEAM_LOGO_BYTES);
    const format = detectTeamLogoFormat(bytes);
    if (format === "svg") {
      requireSafeSvg(bytes);
    } else {
      const { width, height } = await this.images.dimensions(bytes);
      requireTeamLogoDimensions(width, height);
    }
    const normalized = await this.images.normalize(bytes, format, TEAM_LOGO_PIXELS);
    const hash = createHash("sha256").update(normalized).digest("hex").slice(0, 16);
    return this.storage.put(pendingTeamLogoKey(teamId, variant, hash), normalized, "image/webp");
  }

  async publish(pendingKey: string): Promise<StoredTeamLogo> {
    const published = await this.storage.copy(pendingKey, publishedTeamLogoKey(pendingKey));
    await this.storage.delete(pendingKey);
    return published;
  }

  async discard(pendingKey: string): Promise<void> {
    requirePendingTeamLogoKey(pendingKey);
    await this.storage.delete(pendingKey);
  }
}
