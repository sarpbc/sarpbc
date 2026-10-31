import type { Transfer as TransferResponse } from "@sarpbc/types";
import type { Transfer } from "../../domain/transfer";

export function mapTransfer({ id, type, date, sourceUrl, contract }: Transfer): TransferResponse {
  const { player, team } = contract;
  return {
    id,
    type,
    date: date.toISOString().slice(0, 10),
    role: contract.role,
    sourceUrl,
    player: {
      id: player.id,
      name: player.name,
      slug: player.slug,
      imageUrl: player.imageUrl,
      nationality: player.nationality,
    },
    team: {
      id: team.id,
      name: team.name,
      slug: team.slug,
      imageUrl: team.imageUrl,
      darkModeImageUrl: team.darkModeImageUrl,
    },
  };
}
