import { Collection } from "@mikro-orm/core";

export function collectionItems<T extends object>(
  collection: Collection<T> | T[] | null | undefined,
): T[] {
  if (!collection) {
    return [];
  }
  if (Array.isArray(collection)) {
    return collection;
  }
  return collection.isInitialized() ? collection.getItems() : [];
}
