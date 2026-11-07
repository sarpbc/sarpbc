import { CONTRACT_ROLES } from "@sarpbc/types";

export function useContractRoleOptions() {
  const { t } = useI18n();
  return computed(() =>
    CONTRACT_ROLES.map((role) => ({ label: t(`common.contractRole.${role}`), value: role })),
  );
}
