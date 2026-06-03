import { Entity, Enum, ManyToOne, PrimaryKey, Property } from "@mikro-orm/core";
import { ContractRepository } from "../contract.repository";
import { Player } from "./player.entity";
import { Team } from "../../team/domain/team.entity";

export enum ContractRole {
  ACTIVE = "active",
  BENCHED = "benched",
  LOANED = "loaned",
}

@Entity({ repository: () => ContractRepository })
export class Contract {
  @PrimaryKey({ type: "uuid", defaultRaw: "gen_random_uuid()" })
  id!: string;

  @ManyToOne(() => Player)
  player!: Player;

  @ManyToOne(() => Team)
  team!: Team;

  @Property({ type: "date" })
  startDate!: Date;

  @Property({ type: "date", nullable: true })
  endDate?: Date;

  @Enum(() => ContractRole)
  role: ContractRole = ContractRole.ACTIVE;

  @Property({ type: "Date", defaultRaw: "now()" })
  createdAt = new Date();
}
