import type { TransferType, ContractRole } from "@sarpbc/types";
import { Contract } from "./contract";

export interface Transfer {
  id: string;
  type: TransferType;
  date: Date;
  contract: Contract;
  sourceUrl: string | null;
}

const joinType = (role: ContractRole) => {
  switch (role) {
    case "active": {
      return "arrival" satisfies TransferType;
    }

    case "benched": {
      return "benched" satisfies TransferType;
    }

    case "loaned": {
      return "loan" satisfies TransferType;
    }

    case "coach":
    case "assistant_coach":
    case "analyst":
    case "manager": {
      return "staff" satisfies TransferType;
    }

    default: {
      const unreachable: never = role;

      return unreachable satisfies TransferType;
    }
  }
};

const stint = (contract: Contract, day: Date) =>
  `${contract.player.id}:${contract.team.id}:${day.getTime()}`;

export const deriveTransfers = (contracts: Contract[], until: Date) => {
  const starts = new Set(contracts.map((contract) => stint(contract, contract.startDate)));

  const transfers: Transfer[] = [];

  for (const contract of contracts) {
    transfers.push({
      contract,
      date: contract.startDate,
      id: `${contract.id}:join`,
      sourceUrl: contract.joinSourceUrl,
      type: joinType(contract.role),
    });

    if (contract.endDate && !starts.has(stint(contract, contract.endDate))) {
      transfers.push({
        contract,
        date: contract.endDate,
        id: `${contract.id}:leave`,
        sourceUrl: contract.leaveSourceUrl,
        type: "departure",
      });
    }
  }

  return transfers
    .filter((transfer) => transfer.date <= until)
    .toSorted((a, b) => b.date.getTime() - a.date.getTime() || a.id.localeCompare(b.id));
};
