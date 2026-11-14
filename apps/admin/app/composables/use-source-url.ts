import { isAcceptedDataSourceUrl } from "@sarpbc/utils";

const normalizeSourceUrl = (value: string): string | null => value.trim() || null;

export const useSourceUrl = () => {
  const { t } = useI18n();

  const sourceUrlError = (value: string): string | undefined => {
    const url = normalizeSourceUrl(value);

    return url === null || isAcceptedDataSourceUrl(url) ? undefined : t("common.sourceUrlInvalid");
  };

  return { normalizeSourceUrl, sourceUrlError };
};
