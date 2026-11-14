import type { EntityManager } from "@mikro-orm/postgresql";
import { Player } from "./player.entity";
import { Team } from "./team.entity";
import { TeamAlias } from "./team-alias.entity";

/**
 * The slug lookup only adopts rows stored before the PandaScore id was recorded, never start.gg
 * rows: adopting one would relabel it as PandaScore data and drop the start.gg credit.
 */
const adoptable = (slug: string) => ({
  slug,
  pandascoreId: null,
  mergedInto: null,
  source: { $ne: "startgg" as const },
});

/**
 * PandaScore renames player slugs and has given one player's slug a different person's
 * name (`zen-aidan-hui` is Alexis "zen" Bernier), so the PandaScore id is the identity.
 */
export const findPandascorePlayer = async (
  em: Pick<EntityManager, "findOne">,
  pandascoreId: number,
  slug: string,
): Promise<Player | null> => {
  const byId = await em.findOne(Player, { pandascoreId });

  if (byId) {
    return byId;
  }

  return await em.findOne(Player, adoptable(slug));
};

export const findPandascoreTeam = async (
  em: Pick<EntityManager, "findOne">,
  pandascoreId: number | undefined,
  slug: string,
): Promise<Team | null> => {
  const byId = pandascoreId === undefined ? null : await em.findOne(Team, { pandascoreId });

  return await (byId ?? em.findOne(Team, adoptable(slug)));
};

export const findAliasedPandascoreTeam = async (
  em: Pick<EntityManager, "findOne">,
  pandascoreId: number | undefined,
): Promise<string | null> => {
  if (pandascoreId === undefined || (await em.findOne(Team, { pandascoreId }))) {
    return null;
  }

  const alias = await em.findOne(TeamAlias, { pandascoreId });

  return alias ? alias.team.id : null;
};

export const availablePlayerSlug = async (
  em: Pick<EntityManager, "findOne">,
  pandascoreId: number,
  slug: string,
): Promise<string> => {
  const taken = await em.findOne(Player, { slug });

  return taken ? `${slug}-${pandascoreId}` : slug;
};
