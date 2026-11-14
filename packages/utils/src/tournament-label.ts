import { isNonEmptyString } from "./text";

interface EventStage {
  name: string;
  event: { name: string };
}

export const distinctStageName = (stage: EventStage): string | null => {
  const stageName = stage.name.trim();

  // An event without a PandaScore serie is named after its only stage, sometimes behind the
  // league name, so showing the stage again would repeat it.
  if (!stageName || stage.event.name.trim().toLowerCase().endsWith(stageName.toLowerCase())) {
    return null;
  }

  return stageName;
};

export const tournamentStageLabel = (stage: EventStage): string => {
  const eventName = stage.event.name.trim();
  const stageName = distinctStageName(stage);

  return isNonEmptyString(stageName) ? `${eventName} ${stageName}` : eventName;
};
