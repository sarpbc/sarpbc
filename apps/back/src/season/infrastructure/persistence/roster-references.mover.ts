import type { EntityManager } from "@mikro-orm/postgresql";
import type { RosterReferenceMover } from "../../../roster/application/ports";
import { SeasonAward } from "./season.entities";

const awardKey = ({ season, awardType, region }: SeasonAward) =>
  JSON.stringify([season.id, awardType, region]);

export class SeasonRosterReferences implements RosterReferenceMover {
  constructor(private readonly em: EntityManager) {}

  async movePlayer(from: string, to: string): Promise<void> {
    const awards = await this.em.find(
      SeasonAward,
      { player: { $in: [from, to] } },
      { disableIdentityMap: true },
    );
    const held = new Set(awards.filter(({ player }) => player.id === to).map(awardKey));
    const duplicates = awards
      .filter((award) => award.player.id === from && held.has(awardKey(award)))
      .map(({ id }) => id);
    if (duplicates.length) await this.em.nativeDelete(SeasonAward, { id: { $in: duplicates } });
    await this.em.nativeUpdate(SeasonAward, { player: from }, { player: to });
  }

  async moveTeam(): Promise<void> {}
}
