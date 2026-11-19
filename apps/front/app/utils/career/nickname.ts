import type {
  CareerDestiny,
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

const countTrophies = (trophies: CareerNicknameInput["trophies"], type: CareerTrophy["type"]) =>
  trophies.filter((trophy) => trophy.type === type).length;

const isWorldsPodium = (placement: CareerPlacement | null) =>
  placement === "finalist" || placement === "top4";

const classifyNickname = (input: CareerNicknameInput) => {
  const worldsWins = countTrophies(input.trophies, "worlds");
  const majorWins = countTrophies(input.trophies, "major");
  const worldsPodiums = input.seasons.filter((season) => isWorldsPodium(season.worlds)).length;

  if (worldsWins >= 2) {
    return "goat";
  }

  if (worldsWins === 1) {
    return "champion";
  }

  if (majorWins >= 2) {
    return "majors";
  }

  if (worldsPodiums >= 2) {
    return "nearly";
  }

  if (input.seasons.length <= 2 && majorWins === 0) {
    return "bust";
  }

  return "journeyman";
};

const nicknameForChampion = (role: CareerRole) => {
  switch (role) {
    case "offense": {
      return "closer";
    }

    case "defense": {
      return "iceBlood";
    }

    case "technical": {
      return "airSurgeon";
    }

    default: {
      const _exhaustive: never = role;

      return _exhaustive;
    }
  }
};

const nicknameForNearly = (role: CareerRole) => {
  switch (role) {
    case "offense": {
      return "surfaceFox";
    }

    case "defense": {
      return "theWall";
    }

    case "technical": {
      return "resetGhost";
    }

    default: {
      const _exhaustive: never = role;

      return _exhaustive;
    }
  }
};

const nicknameForJourneyman = (destiny: CareerDestiny) => {
  switch (destiny) {
    case "streamer": {
      return "theMic";
    }

    case "coach": {
      return "sideline";
    }

    case "quit": {
      return "walkedOff";
    }

    default: {
      const _exhaustive: never = destiny;

      return _exhaustive;
    }
  }
};

export const pickCareerNickname = (input: CareerNicknameInput) => {
  const tier = classifyNickname(input);

  switch (tier) {
    case "goat": {
      return "goat";
    }

    case "champion": {
      return nicknameForChampion(input.role);
    }

    case "majors": {
      return "majorHunter";
    }

    case "nearly": {
      return nicknameForNearly(input.role);
    }

    case "journeyman": {
      return nicknameForJourneyman(input.destiny);
    }

    case "bust": {
      return "lanTourist";
    }

    default: {
      const _exhaustive: never = tier;

      return _exhaustive;
    }
  }
};
