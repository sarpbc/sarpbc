import { Collection } from "@mikro-orm/core";
import type { ContractRole, DataSource, PlayerStatus } from "@sarpbc/types";
import type { Team } from "./team.entity";
import type { Contract } from "./contract.entity";
import type { PlayerPhoto } from "./player-photo.entity";

export class Player {
  id!: string;
  name!: string;
  team: Team | null = null;
  birthday: Date | null = null;
  nationality: string | null = null;
  firstName: string | null = null;
  lastName: string | null = null;
  imageUrl: string | null = null;
  /** PandaScore role (e.g. "Coach"); null for standard roster players. */
  role: string | null = null;
  contractRole: ContractRole | null = null;
  status: PlayerStatus = "active";
  slug!: string;
  pandascoreId: number | null = null;
  source: DataSource = "manual";
  mergedInto: Player | null = null;
  contracts = new Collection<Contract>(this);
  photos = new Collection<PlayerPhoto>(this);
}
