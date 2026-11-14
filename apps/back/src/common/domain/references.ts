export type ReferenceNouns<K extends string> = Record<
  K,
  readonly [singular: string, plural: string]
>;

export function describeReferences<K extends string>(
  counts: Record<K, number>,
  nouns: ReferenceNouns<K>,
): string | null {
  const keys: K[] = Object.keys(nouns).filter((key): key is K => key in counts);

  const described = keys.flatMap((key) =>
    counts[key] > 0 ? [`${counts[key]} ${nouns[key][counts[key] === 1 ? 0 : 1]}`] : [],
  );

  return described.length > 0 ? described.join(", ") : null;
}
