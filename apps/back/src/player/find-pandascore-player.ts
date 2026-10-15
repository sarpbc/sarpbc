import type { EntityManager } from "@mikro-orm/postgresql";
import { Player } from "./player.entities";

/**
 * PandaScore renames player slugs and has given one player's slug a different person's
 * name (`zen-aidan-hui` is Alexis "zen" Bernier), so the PandaScore id is the identity.
 * The slug lookup only adopts rows stored before the id was recorded.
 */
export async function findPandascorePlayer(
  em: EntityManager,
  pandascoreId: number,
  slug: string,
): Promise<Player | null> {
  const byId = await em.findOne(Player, { pandascoreId });
  if (byId) {
    return byId;
  }
  return em.findOne(Player, { slug, pandascoreId: null });
}

export async function availablePlayerSlug(
  em: EntityManager,
  pandascoreId: number,
  slug: string,
): Promise<string> {
  const taken = await em.findOne(Player, { slug });
  return taken ? `${slug}-${pandascoreId}` : slug;
}
