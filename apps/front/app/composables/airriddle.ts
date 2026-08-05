import type { AirRiddleResultEnum } from "~/enums/airriddle-result.enum";

export async function getTodayAirRiddleLength(): Promise<number> {
  const config = useRuntimeConfig();
  try {
    const res = await $fetch<{ length?: number }>(`${config.public.apiBase}/air-riddle/today`, {
      method: "GET",
      credentials: "include",
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
  const config = useRuntimeConfig();
  try {
    const res = await $fetch<{
      results: AirRiddleResultEnum[];
      error?: string;
      answer?: string;
    }>(`${config.public.apiBase}/air-riddle/guess`, {
      method: "POST",
      credentials: "include",
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
