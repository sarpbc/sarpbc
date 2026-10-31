import type { AirRiddleResultEnum } from "~/enums/airriddle-result.enum";
import { apiFetch } from "~/utils/apiFetch";

export async function getTodayAirRiddleLength(): Promise<number> {
  try {
    const res = await apiFetch<{ length?: number }>(`/air-riddle/today`, {
      method: "GET",
    });

    return res.length || 0;
  } catch (error) {
    console.error("Error fetching air riddle length:", error);
    return 0;
  }
}

export async function guessAirRiddle(
  guess: string,
  last?: boolean,
): Promise<{ result: AirRiddleResultEnum[]; error?: string; answer?: string }> {
  try {
    const res = await apiFetch<{
      results: AirRiddleResultEnum[];
      error?: string;
      answer?: string;
    }>(`/air-riddle/guess`, {
      method: "POST",
      body: { guess, last },
    });

    return {
      result: res.results,
      error: res.error,
      answer: res.answer,
    };
  } catch (error) {
    console.error("Error fetching air riddle guess:", error);
    return { result: [], error: "submitFailed" };
  }
}
