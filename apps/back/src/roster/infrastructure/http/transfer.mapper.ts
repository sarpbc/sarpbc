import type { Transfer as TransferResponse } from "@sarpbc/types";
import { isoDay } from "@sarpbc/utils";
import type { Transfer } from "../../domain/transfer";

export const mapTransfer = ({ id, type, date, sourceUrl, contract }: Transfer) => {
  const { player, team } = contract;

  return {
    date: isoDay(date),
    id,
    player: {
      id: player.id,
      imageUrl: player.imageUrl,
      name: player.name,
      nationality: player.nationality,
      slug: player.slug,
    },
    role: contract.role,
    sourceUrl,
    team: {
      darkModeImageUrl: team.darkModeImageUrl,
      id: team.id,
      imageUrl: team.imageUrl,
      logoDarkUrl: team.logoDarkUrl,
      logoLightUrl: team.logoLightUrl,
      name: team.name,
      slug: team.slug,
    },
    type,
  } satisfies TransferResponse;
};
