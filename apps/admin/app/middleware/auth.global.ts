import { getProfile } from "~/composables/user";

export default defineNuxtRouteMiddleware(async () => {
  const user = useUser();

  if (user.value !== undefined) {
    return;
  }

  user.value = await getProfile();
});
