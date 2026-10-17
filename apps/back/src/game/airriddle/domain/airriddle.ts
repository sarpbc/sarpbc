import { AirRiddleResultEnum } from "./airriddle-result.enum";
export interface DailyRiddle {
  id: string;
  playerId: string;
  playerName: string;
  createdAt: Date;
}
export function evaluateGuess(guess: string, answer: string): AirRiddleResultEnum[] {
  const results: AirRiddleResultEnum[] = Array.from({ length: guess.length });
  const letters: (string | null)[] = answer.split("");
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === answer[i]) {
      results[i] = AirRiddleResultEnum.CORRECT;
      letters[i] = null;
    }
  }
  for (let i = 0; i < guess.length; i++) {
    if (results[i] === undefined) {
      const found = letters.indexOf(guess[i]);
      if (found < 0) results[i] = AirRiddleResultEnum.INCORRECT;
      else {
        results[i] = AirRiddleResultEnum.MISPLACED;
        letters[found] = null;
      }
    }
  }
  return results;
}
