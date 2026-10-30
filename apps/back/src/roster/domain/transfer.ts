import type { TransferType } from "@sarpbc/types";
import { Contract, ContractRole } from "./roster";

export interface Transfer {
  id: string;
  type: TransferType;
  date: Date;
  contract: Contract;
  sourceUrl: string | null;
}

function joinType(role: ContractRole): TransferType {
  switch (role) {
    case ContractRole.ACTIVE:
      return "arrival";
    case ContractRole.BENCHED:
      return "benched";
    case ContractRole.LOANED:
      return "loan";
    default: {
      const unreachable: never = role;
      return unreachable;
    }
  }
}

export function deriveTransfers(contracts: Contract[], until: Date): Transfer[] {
  const stint = (contract: Contract, day: Date) =>
    `${contract.player.id}:${contract.team.id}:${day.getTime()}`;
  const starts = new Set(contracts.map((contract) => stint(contract, contract.startDate)));

  const transfers: Transfer[] = [];
  for (const contract of contracts) {
    transfers.push({
      id: `${contract.id}:join`,
      type: joinType(contract.role),
      date: contract.startDate,
      contract,
      sourceUrl: contract.joinSourceUrl,
    });
    if (contract.endDate && !starts.has(stint(contract, contract.endDate))) {
      transfers.push({
        id: `${contract.id}:leave`,
        type: "departure",
        date: contract.endDate,
        contract,
        sourceUrl: contract.leaveSourceUrl,
      });
    }
  }
  return transfers
    .filter((transfer) => transfer.date <= until)
    .sort((a, b) => b.date.getTime() - a.date.getTime() || a.id.localeCompare(b.id));
}
