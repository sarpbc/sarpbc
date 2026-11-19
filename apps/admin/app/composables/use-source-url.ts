import { isAcceptedDataSourceUrl } from "@sarpbc/utils";

const normalizeSourceUrl = (value: string) => value.trim() || null;

export const useSourceUrl = () => {
  const { t } = useI18n();

  const sourceUrlError = (value: string) => {
    const url = normalizeSourceUrl(value);

    return url === null || isAcceptedDataSourceUrl(url) ? undefined : t("common.sourceUrlInvalid");
  };

  return { normalizeSourceUrl, sourceUrlError };
};
