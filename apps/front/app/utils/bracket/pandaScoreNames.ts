export type BracketSection = "upper" | "lower" | "finals";

export type BracketRoundParse = {
  section: BracketSection;
  column: number | null;
};

/**
 * PandaScore match names encode section and column when feeder links are omitted.
 */
export function parseBracketRoundFromName(name: string | undefined): BracketRoundParse | null {
  const normalized = name?.trim().toLowerCase() ?? "";
  if (!normalized) {
    return null;
  }

  if (normalized.includes("upper bracket")) {
    let column: number | null = null;
    if (normalized.includes("upper bracket quarterfinal")) {
      column = 2;
    } else if (normalized.includes("upper bracket semifinal")) {
      column = 3;
    } else if (normalized.includes("upper bracket final")) {
      column = 4;
    }
    return { section: "upper", column };
  }

  if (normalized.includes("lower bracket")) {
    let column: number | null = null;
    if (normalized.includes("lower bracket round 1")) {
      column = 0;
    } else if (normalized.includes("lower bracket round 2")) {
      column = 1;
    } else if (normalized.includes("lower bracket quarterfinal")) {
      column = 2;
    }
    return { section: "lower", column };
  }

  if (normalized.includes("grand final") || normalized.includes("semifinal")) {
    let column: number | null = null;
    if (normalized.includes("semifinal")) {
      column = 3;
    }
    if (normalized.includes("grand final")) {
      column = 4;
    }
    return { section: "finals", column };
  }

  return null;
}

export function getBracketSectionFromName(name: string | undefined): BracketSection | null {
  return parseBracketRoundFromName(name)?.section ?? null;
}

export function getCombinedColumnFromName(name: string | undefined): number | null {
  const parsed = parseBracketRoundFromName(name);
  if (!parsed || parsed.section === "upper") {
    return null;
  }
  return parsed.column;
}

export function getUpperColumnFromName(name: string | undefined): number | null {
  const parsed = parseBracketRoundFromName(name);
  if (!parsed || parsed.section !== "upper") {
    return null;
  }
  return parsed.column;
}
