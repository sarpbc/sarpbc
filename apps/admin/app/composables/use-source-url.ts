import { isAcceptedDataSourceUrl } from "@sarpbc/utils";

function normalizeSourceUrl(value: string): string | null {
  return value.trim() || null;
}

export function useSourceUrl() {
  const { t } = useI18n();

  function sourceUrlError(value: string): string | undefined {
    const url = normalizeSourceUrl(value);

    return url === null || isAcceptedDataSourceUrl(url) ? undefined : t("common.sourceUrlInvalid");
  }

  return { normalizeSourceUrl, sourceUrlError };
}
