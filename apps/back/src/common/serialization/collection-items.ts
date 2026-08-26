interface CollectionLike<T> {
  isInitialized?: () => boolean;
  getItems?: () => T[];
}

export function collectionItems<T>(collection: CollectionLike<T> | T[] | null | undefined): T[] {
  if (!collection) {
    return [];
  }
  if (Array.isArray(collection)) {
    return collection;
  }
  if (typeof collection.isInitialized === "function" && !collection.isInitialized()) {
    return [];
  }
  if (typeof collection.getItems === "function") {
    return collection.getItems();
  }
  return [];
}
