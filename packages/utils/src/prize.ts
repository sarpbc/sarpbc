export const CURRENCY_CODE_LENGTH = 3;
const CURRENCY_CODE_PATTERN = new RegExp(`^[A-Z]{${CURRENCY_CODE_LENGTH}}$`, "u");
const CURRENCY_NAMES = new Intl.DisplayNames(["en"], { type: "currency", fallback: "none" });

export const isIso4217Code = (value: string): boolean =>
  CURRENCY_CODE_PATTERN.test(value) && CURRENCY_NAMES.of(value) !== undefined;

export const MAX_PRIZE_ENTRIES = 64;
export const MIN_PRIZE_PLACEMENT = 1;
export const MIN_PRIZE_AMOUNT = 1;
export const MAX_PRIZE_AMOUNT = 100_000_000;
export const MAX_PRIZE_PLAYERS = 10;

export const currencyFractionDigits = (currency: string): number =>
  new Intl.NumberFormat("en", { style: "currency", currency }).resolvedOptions()
    .maximumFractionDigits ?? 2;
