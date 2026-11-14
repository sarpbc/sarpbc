import { isUuid } from "../../../common/domain/entity-ref";
import { NotFoundError } from "../../../common/domain/errors";

export interface IdOrSlugLookup<Entity> {
  findById(id: string): Promise<Entity | null>;
  findBySlug(slug: string): Promise<Entity | null>;
}

/**
 * A UUID is read as an id first, then as a slug (slugs may look like UUIDs).
 * Anything else is a slug only, so a database never sees a malformed id.
 */
export async function findByIdOrSlug<Entity>(
  lookup: IdOrSlugLookup<Entity>,
  token: string,
): Promise<Entity | null> {
  if (!isUuid(token)) return lookup.findBySlug(token);

  return (await lookup.findById(token)) ?? lookup.findBySlug(token);
}

export async function requireByIdOrSlug<Entity>(
  lookup: IdOrSlugLookup<Entity>,
  token: string,
  kind: "Player" | "Team",
): Promise<Entity> {
  const entity = await findByIdOrSlug(lookup, token);

  if (!entity) {
    const search = kind === "Player" ? "search_players" : "search_teams";
    throw new NotFoundError(
      `${kind} "${token}" was not found. Try ${search} to find the correct slug or id.`,
    );
  }

  return entity;
}
