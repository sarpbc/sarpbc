import { isNonEmptyString } from "@sarpbc/utils";
import { AirRiddleResultEnum } from "~/enums/airriddle-result.enum";

export type AirRiddleLetterStatus = "correct" | "misplaced" | "incorrect" | "unused";

const STATUS_RANK = {
  unused: 0,
  incorrect: 1,
  misplaced: 2,
  correct: 3,
} satisfies Record<AirRiddleLetterStatus, number>;

interface AirRiddleAttemptLike {
  letters: string[];
  results?: AirRiddleResultEnum[];
}

const resultToStatus = (result: AirRiddleResultEnum): AirRiddleLetterStatus => {
  switch (result) {
    case AirRiddleResultEnum.CORRECT: {
      return "correct";
    }

    case AirRiddleResultEnum.MISPLACED: {
      return "misplaced";
    }

    case AirRiddleResultEnum.INCORRECT: {
      return "incorrect";
    }

    default: {
      const exhaustive: never = result;

      return exhaustive;
    }
  }
};

export const deriveAirRiddleLetterStatuses = (attempts: AirRiddleAttemptLike[]) => {
  const statuses = new Map<string, AirRiddleLetterStatus>();

  for (const attempt of attempts) {
    for (let index = 0; index < attempt.letters.length; index += 1) {
      const letter = attempt.letters[index]?.toUpperCase();
      const result = attempt.results?.[index];

      if (!isNonEmptyString(letter) || result === undefined) {
        continue;
      }

      const nextStatus = resultToStatus(result);
      const current = statuses.get(letter) ?? "unused";

      if (STATUS_RANK[nextStatus] > STATUS_RANK[current]) {
        statuses.set(letter, nextStatus);
      }
    }
  }

  return Object.fromEntries(statuses) satisfies Record<string, AirRiddleLetterStatus>;
};
