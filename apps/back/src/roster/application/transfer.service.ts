import type { TransferType } from "@sarpbc/types";
import { deriveTransfers, type Transfer } from "../domain/transfer";
import type { ContractQueries } from "./ports";
import type { ContractMovementFilter } from "./search-props";

export interface TransferSearchProps extends ContractMovementFilter {
  type?: TransferType;
  limit: number;
  offset: number;
}

export class TransferService {
  constructor(private readonly contracts: ContractQueries) {}

  async findAndCount(
    { type, limit, offset, ...filter }: TransferSearchProps,
    now = new Date(),
  ): Promise<[Transfer[], number]> {
    const contracts = await this.contracts.findMovements(filter);
    const transfers = deriveTransfers(contracts, now).filter(
      (transfer) =>
        (!type || transfer.type === type) &&
        (!filter.from || transfer.date >= filter.from) &&
        (!filter.to || transfer.date <= filter.to),
    );
    return [transfers.slice(offset, offset + limit), transfers.length];
  }
}
