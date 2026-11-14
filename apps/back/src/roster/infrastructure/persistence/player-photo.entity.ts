import type { Player } from "./player.entity";

export class PlayerPhoto {
  id!: string;
  player!: Player;
  url!: string;
  createdAt = new Date();
}
