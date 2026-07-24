import type { User } from "@sarpbc/types";

/** `undefined` = not loaded yet, `null` = guest, `User` = authenticated */
export const useUser = () => useState<User | null | undefined>("user", () => undefined);
