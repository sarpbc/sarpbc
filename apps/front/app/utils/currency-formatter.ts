import { currencyFractionDigits, isNonEmptyString } from "@sarpbc/utils";

const CURRENCY_CODES = {
  "British Pound": "GBP",
  Dollar: "USD",
  Euro: "EUR",
  "Japanese Yen": "JPY",
  Pound: "GBP",
  "US Dollar": "USD",
  "United State Dollar": "USD",
  "United States Dollar": "USD",
  Yen: "JPY",
} as const;

const currencyCodeFor = (name: string): string => {
  for (const [label, code] of Object.entries(CURRENCY_CODES)) {
    if (label === name) {
      return code;
    }
  }

  return "USD";
};

export const formatPrizepool = (prizepool: string | undefined | null, locale = "en-US"): string => {
  if (!isNonEmptyString(prizepool)) {
    return "";
  }

  const parts = prizepool.trim().split(" ");

  if (parts.length < 2) {
    return prizepool;
  }

  const amount = Number((parts[0] ?? "").replaceAll(",", ""));

  if (Number.isNaN(amount)) {
    return prizepool;
  }

  const currencyCode = currencyCodeFor(parts.slice(1).join(" "));

  try {
    return new Intl.NumberFormat(locale, {
      currency: currencyCode,
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
      style: "currency",
    }).format(amount);
  } catch {
    return `$${amount.toLocaleString()}`;
  }
};

export const formatPrizeAmount = (amount: number, currency: string, locale: string): string => {
  const fractionDigits = Number.isInteger(amount) ? 0 : currencyFractionDigits(currency);

  return new Intl.NumberFormat(locale, {
    currency,
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
    style: "currency",
  }).format(amount);
};
