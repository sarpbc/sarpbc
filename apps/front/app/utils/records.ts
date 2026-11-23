import type { RecordTeam } from "@sarpbc/types";

export interface RecordRow {
  key: string;
  rank: number;
  label: string;
  to: string;
  team: RecordTeam | null;
  value: string;
  meta: string | null;
  metaTo: string | null;
}
