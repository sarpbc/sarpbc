import type { StaffPermission } from "@sarpbc/types";
import { hasPermission } from "@sarpbc/utils";

const STAFF_MODE_COOKIE = "staffMode";

/** Hides staff actions on the public site until a staff member opts in; the API still checks every write. */
export const useStaffMode = () => {
  const user = useUser();

  const cookie = useCookie<boolean | null>(STAFF_MODE_COOKIE, {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  const enabled = useState<boolean>(STAFF_MODE_COOKIE, () => cookie.value === true);

  const setEnabled = (value: boolean) => {
    enabled.value = value;
    cookie.value = value ? true : null;
  };

  const can = (permission: StaffPermission): boolean =>
    enabled.value && hasPermission(user.value, permission);

  return { can, enabled: readonly(enabled), setEnabled };
};
