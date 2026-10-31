const CURRENCY_CODE_PATTERN = /^[A-Z]{3}$/;
const CURRENCY_NAMES = new Intl.DisplayNames(["en"], { type: "currency", fallback: "none" });

export function isIso4217Code(value: string): boolean {
  return CURRENCY_CODE_PATTERN.test(value) && CURRENCY_NAMES.of(value) !== undefined;
}

export const MAX_PRIZE_ENTRIES = 64;
export const MAX_PRIZE_AMOUNT = 100_000_000;
export const MAX_PRIZE_PLAYERS = 10;

export function currencyFractionDigits(currency: string): number {
  return (
    new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions()
      .maximumFractionDigits ?? 2
  );
}
