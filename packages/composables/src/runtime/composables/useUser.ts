import type { User } from "@sarpbc/types";
import { useState } from "nuxt/app";

/** `undefined` = not loaded yet, `null` = guest, `User` = authenticated */
export const useUser = () => useState<User | null | undefined>("user");
