import type { Player } from "../../../roster/infrastructure/roster-persistence";

export class PlayerPlatformLink {
  id!: string;
  platform!: string;
  platformId!: string;
  player!: Player;
}
