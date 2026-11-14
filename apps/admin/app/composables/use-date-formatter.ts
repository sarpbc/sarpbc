import { parseLocale } from "@sarpbc/utils";

export const useDateFormatter = (options: Intl.DateTimeFormatOptions) => {
  const { locale } = useI18n();

  return computed(() => new Intl.DateTimeFormat(parseLocale(locale.value), options));
};
