type ReferenceNoun<K extends string> = readonly [key: K, singular: string, plural: string];

export type ReferenceNouns<K extends string> = readonly ReferenceNoun<K>[];

type MissingKeys<K extends string, Nouns extends ReferenceNouns<K>> = Exclude<K, Nouns[number][0]>;

/** Lists the nouns in message order; omitting a key of `K` is a compile error. */
export const referenceNouns =
  <K extends string>() =>
  <const Nouns extends ReferenceNouns<K>>(
    nouns: Nouns,
    ..._exhaustive: [MissingKeys<K, Nouns>] extends [never] ? [] : [missing: MissingKeys<K, Nouns>]
  ): Nouns =>
    nouns;

export const describeReferences = <K extends string>(
  counts: Record<K, number>,
  nouns: ReferenceNouns<K>,
): string | null => {
  const described = nouns.flatMap(([key, singular, plural]) =>
    counts[key] > 0 ? [`${counts[key]} ${counts[key] === 1 ? singular : plural}`] : [],
  );

  return described.length > 0 ? described.join(", ") : null;
};
