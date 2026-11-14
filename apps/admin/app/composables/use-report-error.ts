import { getApiErrorMessage } from "@sarpbc/utils";

export const useReportError = () => {
  const toast = useToast();
  const { t } = useI18n();

  return (cause: unknown, title: string = t("common.requestFailed")) => {
    toast.add({ title, description: getApiErrorMessage(cause), color: "error" });
  };
};
