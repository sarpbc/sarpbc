import type { CareerSeasonRecord, CareerTrophy } from "~/types/career";

export function deriveTrophies(seasons: CareerSeasonRecord[]): CareerTrophy[] {
  const trophies: CareerTrophy[] = [];
  for (const season of seasons) {
    for (const split of season.splits) {
      for (const regional of split.regionals) {
        if (regional === "winner") trophies.push({ type: "regional", season: season.season });
      }
      if (split.major === "winner") trophies.push({ type: "major", season: season.season });
    }
    if (season.worlds === "winner") trophies.push({ type: "worlds", season: season.season });
  }
  return trophies;
}
