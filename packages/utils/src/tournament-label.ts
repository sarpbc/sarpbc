import { isNonEmptyString } from "./text";

interface EventStage {
  name: string;
  event: { name: string };
}

export const distinctStageName = (stage: EventStage) => {
  const stageName = stage.name.trim();

  if (!stageName || stage.event.name.trim().toLowerCase().endsWith(stageName.toLowerCase())) {
    return null;
  }

  return stageName;
};

export const tournamentStageLabel = (stage: EventStage) => {
  const eventName = stage.event.name.trim();
  const stageName = distinctStageName(stage);

  return isNonEmptyString(stageName) ? `${eventName} ${stageName}` : eventName;
};
