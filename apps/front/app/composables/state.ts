import type { User } from "~/types/user";

export const useUser = () => useState<User | null>("user", () => null);
