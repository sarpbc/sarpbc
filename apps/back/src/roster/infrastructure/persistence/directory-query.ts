import type { DirectorySearchProps } from "../../application/search-props";

function namePattern(name: string | undefined, start: string | undefined): string | null {
  if (name !== undefined && name !== "") return `%${name}%`;

  if (start !== undefined && start !== "") return `${start}%`;

  return null;
}

/** A name search wins over a first-letter filter; both leave out merged duplicates. */
export function directoryQuery({ name, start, limit, offset }: Partial<DirectorySearchProps>) {
  const pattern = namePattern(name, start);

  return {
    where: {
      ...(pattern !== null && pattern !== "" && { name: { $ilike: pattern } }),
      mergedInto: null,
    },
    page: { limit: limit ?? 25, offset: offset ?? 0, orderBy: { name: "asc" as const } },
  };
}
