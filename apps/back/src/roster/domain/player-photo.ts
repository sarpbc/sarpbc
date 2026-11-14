import type { Player } from "./player";

export class PlayerPhoto {
  id = "";
  player!: Player;
  url = "";
  createdAt = new Date();
}
