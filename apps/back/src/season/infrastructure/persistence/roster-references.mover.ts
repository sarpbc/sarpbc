import type { EntityManager } from "@mikro-orm/postgresql";
import { mapSequentially } from "../../../common/application/sequentially";
import type { RosterReferenceMover } from "../../../roster/application/ports";
import { Season } from "./season.entity";
import { SeasonAward } from "./season-award.entity";
import { SeasonParticipant } from "./season-participant.entity";
import { SeasonPathEntry } from "./season-path-entry.entity";

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

  async moveTeam(from: string, to: string): Promise<void> {
    await this.em.nativeUpdate(Season, { winnerTeam: from }, { winnerTeam: to });

    const participants = await this.em.find(
      SeasonParticipant,
      { team: { $in: [from, to] } },
      { disableIdentityMap: true },
    );

    const kept = new Map(
      participants
        .filter(({ team }) => team.id === to)
        .map((participant) => [participant.season.id, participant]),
    );

    await mapSequentially(
      participants.filter(({ team }) => team.id === from),
      async (duplicate) => {
        const keeper = kept.get(duplicate.season.id);

        if (!keeper) return;
        await this.em.nativeUpdate(
          SeasonPathEntry,
          { participant: duplicate.id },
          { participant: keeper.id },
        );

        if (keeper.pathNote === null && duplicate.pathNote !== null)
          await this.em.nativeUpdate(
            SeasonParticipant,
            { id: keeper.id },
            { pathNote: duplicate.pathNote },
          );
        await this.em.nativeDelete(SeasonParticipant, { id: duplicate.id });
      },
    );

    await this.em.nativeUpdate(SeasonParticipant, { team: from }, { team: to });
  }
}
