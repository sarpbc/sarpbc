const COUNTRY_CODE = /^[A-Z]{2}$/;

export function countryCode(value: string | null | undefined): string | null {
  const code = value?.trim().toUpperCase();

  return code && COUNTRY_CODE.test(code) ? code : null;
}
