import type { Team } from "./team.entity";

export class TeamAlias {
  id!: string;
  team!: Team;
  name!: string;
  validFrom!: string;
  validTo: string | null = null;
  sourceUrl!: string;
  logoUrl: string | null = null;
  pandascoreId: number | null = null;
  createdAt = new Date();
}
