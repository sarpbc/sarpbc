import type { ContractRole, DataSource, PlayerStatus } from "@sarpbc/types";
import { linkPandascore } from "./link-pandascore";
import type { ImportedPlayerProfile } from "./imported-profile";
import type { Contract } from "./contract";
import type { PlayerPhoto } from "./player-photo";
import type { Team } from "./team";

function roleFromPandascore(role: string | null): ContractRole {
  switch (
    role
      ?.trim()
      .toLowerCase()
      .replaceAll(/[\s-]+/gu, "_") ??
    ""
  ) {
    case "coach":
    case "head_coach": {
      return "coach";
    }

    case "assistant_coach":
    case "co_coach": {
      return "assistant_coach";
    }

    case "analyst": {
      return "analyst";
    }

    case "manager":
    case "staff": {
      return "manager";
    }

    default: {
      return "active";
    }
  }
}

export class Player {
  id = "";
  name = "";
  team: Team | null = null;
  birthday: Date | null = null;
  nationality: string | null = null;
  firstName: string | null = null;
  lastName: string | null = null;
  imageUrl: string | null = null;
  role: string | null = null;
  contractRole: ContractRole | null = null;
  status: PlayerStatus = "active";
  slug = "";
  pandascoreId: number | null = null;
  source: DataSource = "manual";
  mergedIntoId: string | null = null;
  contracts: Contract[] = [];
  photos: PlayerPhoto[] = [];
  linkPandascore(pandascoreId: number): void {
    linkPandascore(this, pandascoreId);
  }
  synchronizeProfile(input: ImportedPlayerProfile): void {
    this.linkPandascore(input.pandascoreId);
    this.name = input.name;
    this.firstName = input.firstName ?? null;
    this.lastName = input.lastName ?? null;
    this.birthday = input.birthday ? new Date(input.birthday) : null;
    this.nationality = input.nationality ?? null;

    if (
      (this.imageUrl === null || this.imageUrl === "") &&
      input.imageUrl !== undefined &&
      input.imageUrl !== ""
    ) {
      this.imageUrl = input.imageUrl;
    }

    if (input.role !== undefined) {
      this.role = input.role;
    }
  }
  currentRole(): ContractRole | null {
    if (!this.team) {
      return null;
    }

    return this.contractRole ?? roleFromPandascore(this.role);
  }
  replaceProfilePhoto(url: string | null): string | null {
    const archived =
      this.imageUrl !== null && this.imageUrl !== "" && this.imageUrl !== url
        ? this.imageUrl
        : null;

    this.imageUrl = url;

    return archived;
  }
}
