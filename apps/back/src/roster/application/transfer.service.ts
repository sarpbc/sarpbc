import type { TransferType } from "@sarpbc/types";
import { deriveTransfers, type Transfer } from "../domain/transfer";
import type { ContractQueries } from "./ports";
import type { ContractMovementFilter } from "./search-props";

export interface TransferSearchProps extends ContractMovementFilter {
  type?: TransferType;
  from?: Date;
  to?: Date;
  limit: number;
  offset: number;
}

export class TransferService {
  constructor(private readonly contracts: ContractQueries) {}

  async findAndCount(
    { type, from, to, limit, offset, ...filter }: TransferSearchProps,
    now = new Date(),
  ): Promise<[Transfer[], number]> {
    const contracts = await this.contracts.findMovements(filter);

    const transfers = deriveTransfers(contracts, now).filter(
      (transfer) =>
        (!type || transfer.type === type) &&
        (!from || transfer.date >= from) &&
        (!to || transfer.date <= to),
    );

    return [transfers.slice(offset, offset + limit), transfers.length];
  }

  async onDay(month: number, day: number, now = new Date()): Promise<Transfer[]> {
    const contracts = await this.contracts.findMovementsOnDay(month, day);

    return deriveTransfers(contracts, now).filter(
      ({ date }) => date.getUTCMonth() + 1 === month && date.getUTCDate() === day,
    );
  }
}
