import { isAcceptedDataSourceUrl } from "@sarpbc/utils";

export function useSourceUrl() {
  const { t } = useI18n();

  function normalizeSourceUrl(value: string): string | null {
    return value.trim() || null;
  }

  function sourceUrlError(value: string): string | undefined {
    const url = normalizeSourceUrl(value);
    return url === null || isAcceptedDataSourceUrl(url) ? undefined : t("common.sourceUrlInvalid");
  }

  return { normalizeSourceUrl, sourceUrlError };
}
