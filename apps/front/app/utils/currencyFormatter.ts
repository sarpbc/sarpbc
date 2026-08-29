const CURRENCY_CODES = {
  "United State Dollar": "USD",
  "United States Dollar": "USD",
  "US Dollar": "USD",
  Dollar: "USD",
  Euro: "EUR",
  "British Pound": "GBP",
  Pound: "GBP",
  "Japanese Yen": "JPY",
  Yen: "JPY",
} as const;

function currencyCodeFor(name: string): string {
  for (const [label, code] of Object.entries(CURRENCY_CODES)) {
    if (label === name) return code;
  }
  return "USD";
}

export function formatPrizepool(prizepool: string | undefined | null): string {
  if (!prizepool) return "";

  const parts = prizepool.trim().split(" ");
  if (parts.length < 3) return prizepool;

  const amount = parseFloat(parts[0] || "0");
  if (isNaN(amount)) return prizepool;

  const currencyCode = currencyCodeFor(parts.slice(1).join(" "));

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `$${amount.toLocaleString()}`;
  }
}

export function createCurrencyFormatter(locale: string = "en-US") {
  return {
    format(prizepool: string | undefined | null): string {
      if (!prizepool) return "";

      const parts = prizepool.trim().split(" ");
      if (parts.length < 3) return prizepool;

      const amount = parseFloat(parts[0] || "0");
      if (isNaN(amount)) return prizepool;

      const currencyCode = currencyCodeFor(parts.slice(1).join(" "));

      try {
        return new Intl.NumberFormat(locale, {
          style: "currency",
          currency: currencyCode,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(amount);
      } catch {
        return `$${amount.toLocaleString()}`;
      }
    },
  };
}
