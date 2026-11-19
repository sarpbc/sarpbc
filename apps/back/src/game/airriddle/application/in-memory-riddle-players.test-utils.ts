import type { RiddlePlayers } from "./ports";

export class InMemoryRiddlePlayers implements RiddlePlayers {
  private readonly players: { id: string; name: string }[];

  constructor(players: { id: string; name: string }[]) {
    this.players = players;
  }

  async getRandomPlayer() {
    return this.players[0] ?? null;
  }

  async find(options: { name: string }) {
    return this.players.filter((player) =>
      player.name.toUpperCase().includes(options.name.toUpperCase()),
    );
  }
}
