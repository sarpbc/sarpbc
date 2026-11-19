import { MemoryGames } from "../../../test/memory-games";
import type { GameRecord } from "./ports";

export class SaveFailingGames extends MemoryGames {
  private failure: Error | null = null;

  failNextSave(error: Error) {
    this.failure = error;
  }

  override async save(game: GameRecord) {
    if (this.failure) {
      const { failure } = this;

      this.failure = null;

      throw failure;
    }

    return await super.save(game);
  }
}
