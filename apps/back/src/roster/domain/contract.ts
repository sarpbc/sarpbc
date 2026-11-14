import { isoDay } from "@sarpbc/utils";
import type { ContractRole } from "@sarpbc/types";
import { InvalidInputError } from "../../common/domain/errors/invalid-input-error";
import { UnprocessableError } from "../../common/domain/errors/unprocessable-error";
import type { Player } from "./player";
import type { Team } from "./team";

const FOREVER = new Date(8.64e15);

export class Contract {
  id = "";
  player!: Player;
  team!: Team;
  startDate!: Date;
  endDate: Date | null = null;
  role: ContractRole = "active";
  joinSourceUrl: string | null = null;
  leaveSourceUrl: string | null = null;
  createdAt = new Date();
  close(endDate: Date, sourceUrl: string): void {
    if (endDate < this.startDate)
      throw new InvalidInputError(
        `The departure date precedes the contract start (${isoDay(this.startDate)}).`,
      );
    this.endDate = endDate;
    this.leaveSourceUrl = sourceUrl;
  }
  /** An open contract stands for the current team, which only roster moves change. */
  assertFitsCareer(others: Contract[], currentTeamId: string | null): void {
    if (this.endDate && this.endDate < this.startDate) {
      throw new InvalidInputError(
        `The contract ends (${isoDay(this.endDate)}) before it starts (${isoDay(this.startDate)}).`,
      );
    }

    const stored = others.find((other) => other.id === this.id);

    if (stored && !stored.endDate && stored.team.id === currentTeamId && this.endDate) {
      throw new InvalidInputError(
        `This contract is the player's current ${stored.team.name} contract; record the departure as a roster move instead.`,
      );
    }

    if (!this.endDate && this.team.id !== currentTeamId) {
      throw new InvalidInputError(
        `An open contract must be with the player's current team; give ${this.team.name} an end date or record the move as a roster move.`,
      );
    }

    const overlap = others.find(
      (other) =>
        other.id !== this.id &&
        other.team.id === this.team.id &&
        other.startDate < (this.endDate ?? FOREVER) &&
        this.startDate < (other.endDate ?? FOREVER),
    );

    if (overlap) {
      throw new UnprocessableError(
        `This period overlaps contract "${overlap.id}" with ${this.team.name} (${isoDay(overlap.startDate)} to ${overlap.endDate ? isoDay(overlap.endDate) : "now"}); update that contract instead.`,
      );
    }
  }
}
