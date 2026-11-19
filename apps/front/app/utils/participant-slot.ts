import { participantName } from "@sarpbc/utils";
import type { NamedParticipant } from "@sarpbc/utils";

export const slotName = (participants: readonly NamedParticipant[] | undefined, index: number) => {
  const participant = participants?.[index];

  return participant ? participantName(participant) || undefined : undefined;
};
