import type {
  CareerDestiny,
  CareerNicknameKey,
  CareerPlacement,
  CareerRole,
  CareerSeasonRecord,
  CareerTrophy,
} from "~/types/career";

export interface CareerNicknameInput {
  role: CareerRole;
  destiny: CareerDestiny;
  trophies: readonly Pick<CareerTrophy, "type">[];
  seasons: readonly Pick<CareerSeasonRecord, "worlds">[];
}

type NicknameTier = "goat" | "champion" | "majors" | "nearly" | "journeyman" | "bust";

function countTrophies(
  trophies: CareerNicknameInput["trophies"],
  type: CareerTrophy["type"],
): number {
  return trophies.filter((trophy) => trophy.type === type).length;
}

function isWorldsPodium(placement: CareerPlacement | null): boolean {
  return placement === "finalist" || placement === "top4";
}

function classifyNickname(input: CareerNicknameInput): NicknameTier {
  const worldsWins = countTrophies(input.trophies, "worlds");
  const majorWins = countTrophies(input.trophies, "major");
  const worldsPodiums = input.seasons.filter((season) => isWorldsPodium(season.worlds)).length;

  if (worldsWins >= 2) return "goat";
  if (worldsWins === 1) return "champion";
  if (majorWins >= 2) return "majors";
  if (worldsPodiums >= 2) return "nearly";
  if (input.seasons.length <= 2 && majorWins === 0) return "bust";
  return "journeyman";
}

function nicknameForChampion(role: CareerRole): CareerNicknameKey {
  switch (role) {
    case "offense":
      return "closer";
    case "defense":
      return "iceBlood";
    case "technical":
      return "airSurgeon";
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

function nicknameForNearly(role: CareerRole): CareerNicknameKey {
  switch (role) {
    case "offense":
      return "surfaceFox";
    case "defense":
      return "theWall";
    case "technical":
      return "resetGhost";
    default: {
      const _exhaustive: never = role;
      return _exhaustive;
    }
  }
}

function nicknameForJourneyman(destiny: CareerDestiny): CareerNicknameKey {
  switch (destiny) {
    case "streamer":
      return "theMic";
    case "coach":
      return "sideline";
    case "quit":
      return "walkedOff";
    default: {
      const _exhaustive: never = destiny;
      return _exhaustive;
    }
  }
}

/** Pick one authored epithet from how the career actually went. */
export function pickCareerNickname(input: CareerNicknameInput): CareerNicknameKey {
  const tier = classifyNickname(input);
  switch (tier) {
    case "goat":
      return "goat";
    case "champion":
      return nicknameForChampion(input.role);
    case "majors":
      return "majorHunter";
    case "nearly":
      return nicknameForNearly(input.role);
    case "journeyman":
      return nicknameForJourneyman(input.destiny);
    case "bust":
      return "lanTourist";
    default: {
      const _exhaustive: never = tier;
      return _exhaustive;
    }
  }
}
