import type { DataSource } from "./competition";
import type { Player } from "./player";

export const TEAM_LOGO_VARIANTS = ["light", "dark"] as const;

export type TeamLogoVariant = (typeof TEAM_LOGO_VARIANTS)[number];

export interface TeamLogos {
  imageUrl: string | null;
  darkModeImageUrl: string | null;
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
}

export interface TeamSummary extends Omit<TeamLogos, "darkModeImageUrl"> {
  id: string;
  name: string;
  slug: string;
  location: string | null;
}

export interface TeamAliasInput {
  name: string;
  from: string;
  to: string | null;
  sourceUrl: string;
  logoUrl: string | null;
  pandascoreId: number | null;
}

export interface TeamAlias extends TeamAliasInput {
  id: string;
}

export interface Team extends TeamSummary {
  pandascoreId: number | null;
  source: DataSource;
  players: Player[];
  aliases: TeamAlias[];
}
