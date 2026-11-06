import { getApiErrorMessage } from "@sarpbc/utils";

export function useReportError() {
  const toast = useToast();
  const { t } = useI18n();

  return (error: unknown, title: string = t("common.requestFailed")) => {
    toast.add({ title, description: getApiErrorMessage(error), color: "error" });
  };
}
