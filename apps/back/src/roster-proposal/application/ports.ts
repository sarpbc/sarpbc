import type { RosterProposalStatus } from "@sarpbc/types";
import type { RosterProposal } from "../domain/roster-proposal";

export interface RosterProposalStore {
  /** Locks the row inside a transaction so a proposal is reviewed once. */
  findById: (id: string) => Promise<RosterProposal | null>;
  list: (status: RosterProposalStatus, limit: number) => Promise<RosterProposal[]>;
  save: (proposal: RosterProposal) => Promise<void>;
  names: (ids: RosterNameIds) => Promise<Record<string, string>>;
}

export interface RosterNameIds {
  players: string[];
  teams: string[];
  users: string[];
  tournaments: string[];
  matches: string[];
  events: string[];
  circuits: string[];
  seasons: string[];
}

export interface RosterProposalTransaction {
  run: <T>(work: (proposals: RosterProposalStore) => Promise<T>) => Promise<T>;
}
