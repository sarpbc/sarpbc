import { Collection } from "@mikro-orm/core";
import type { DataSource, TeamAlias as TeamAliasRecord } from "@sarpbc/types";
import type { Player } from "./player.entity";

export class Team {
  id!: string;
  name!: string;
  players = new Collection<Player>(this);
  active = true;
  location: string | null = null;
  imageUrl: string | null = null;
  darkModeImageUrl: string | null = null;
  logoLightUrl: string | null = null;
  logoDarkUrl: string | null = null;
  slug!: string;
  pandascoreId: number | null = null;
  source: DataSource = "manual";
  mergedInto: Team | null = null;
  aliases: TeamAliasRecord[] = [];
}
