import { participantName } from "@sarpbc/utils";
import type { NamedParticipant } from "@sarpbc/utils";

export function slotName(
  participants: readonly NamedParticipant[] | undefined,
  index: number,
): string | undefined {
  const participant = participants?.[index];

  return participant ? participantName(participant) || undefined : undefined;
}
