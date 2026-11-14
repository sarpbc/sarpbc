import type { DataSource } from "@sarpbc/types";
import type { TeamAlias } from "./team-alias";
import { linkPandascore } from "./link-pandascore";
import type { ImportedTeamProfile } from "./imported-profile";
import type { Player } from "./player";

export class Team {
  id = "";
  name = "";
  players: Player[] = [];
  active = true;
  location: string | null = null;
  imageUrl: string | null = null;
  darkModeImageUrl: string | null = null;
  logoLightUrl: string | null = null;
  logoDarkUrl: string | null = null;
  slug = "";
  pandascoreId: number | null = null;
  source: DataSource = "manual";
  mergedIntoId: string | null = null;
  aliases: TeamAlias[] = [];
  linkPandascore(pandascoreId: number): void {
    linkPandascore(this, pandascoreId);
  }
  synchronizeProfile(input: ImportedTeamProfile): void {
    this.name = input.name;

    if (input.pandascoreId !== undefined) this.linkPandascore(input.pandascoreId);

    if (input.location !== undefined) this.location = input.location;

    if (
      (this.imageUrl === null || this.imageUrl === "") &&
      input.imageUrl !== undefined &&
      input.imageUrl !== ""
    )
      this.imageUrl = input.imageUrl;

    if (
      (this.darkModeImageUrl === null || this.darkModeImageUrl === "") &&
      input.darkModeImageUrl !== undefined &&
      input.darkModeImageUrl !== ""
    )
      this.darkModeImageUrl = input.darkModeImageUrl;
  }
}
