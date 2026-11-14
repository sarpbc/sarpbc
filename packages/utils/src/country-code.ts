import { isNonEmptyString } from "./text";

const COUNTRY_CODE = /^[A-Z]{2}$/u;

export const countryCode = (value: string | null | undefined): string | null => {
  const code = value?.trim().toUpperCase();

  return isNonEmptyString(code) && COUNTRY_CODE.test(code) ? code : null;
};
