import type { CountryDetail, CountrySummary } from "@sarpbc/types";
import { getApiErrorStatus } from "@sarpbc/utils";

export const getCountries = async (): Promise<CountrySummary[]> => {
  const res = await apiFetch<{ countries: CountrySummary[] }>("/countries", { method: "GET" });

  return res.countries;
};

export const getCountry = async (
  code: string,
  query: { limit: number; offset: number },
): Promise<CountryDetail | null> => {
  try {
    const res = await apiFetch<{ country: CountryDetail }>(
      `/countries/${encodeURIComponent(code)}`,
      { method: "GET", query },
    );

    return res.country;
  } catch (error) {
    if (getApiErrorStatus(error) === 404) {
      return null;
    }

    throw error;
  }
};

export const useCountryName = () => {
  const { locale } = useI18n();

  const names = computed(
    () => new Intl.DisplayNames([locale.value], { type: "region", fallback: "code" }),
  );

  return (code: string): string => names.value.of(code) ?? code;
};
