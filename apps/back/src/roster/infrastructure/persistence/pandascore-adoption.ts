import type { EntityManager } from "@mikro-orm/postgresql";
import { Player } from "./player.entity";
import { Team } from "./team.entity";
import { TeamAlias } from "./team-alias.entity";

const adoptable = (slug: string) => ({
  mergedInto: null,
  pandascoreId: null,
  slug,
});

/**
 * PandaScore renames player slugs and has given one player's slug a different person's
 * name (`zen-aidan-hui` is Alexis "zen" Bernier), so the PandaScore id is the identity.
 */
export const findPandascorePlayer = async (
  em: Pick<EntityManager, "findOne">,
  pandascoreId: number,
  slug: string,
) => {
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
) => {
  const byId = pandascoreId === undefined ? null : await em.findOne(Team, { pandascoreId });

  return await (byId ?? em.findOne(Team, adoptable(slug)));
};

export const findAliasedPandascoreTeam = async (
  em: Pick<EntityManager, "findOne">,
  pandascoreId: number | undefined,
) => {
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
) => {
  const taken = await em.findOne(Player, { slug });

  return taken ? `${slug}-${pandascoreId}` : slug;
};
