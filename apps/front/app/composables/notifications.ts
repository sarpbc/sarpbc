import type { AppNotification } from "~/types/notification";
import { apiFetch } from "~/utils/apiFetch";

export async function getNotifications(limit = 30): Promise<AppNotification[]> {
  try {
    const res = await apiFetch<{ notifications: AppNotification[] }>("/notifications", {
      method: "GET",
      query: { limit },
    });
    return res.notifications ?? [];
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
}

export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const res = await apiFetch<{ count: number }>("/notifications/unread-count", {
      method: "GET",
    });
    return res.count ?? 0;
  } catch (error) {
    console.error("Error fetching unread notification count:", error);
    return 0;
  }
}

export async function markNotificationsRead(ids?: string[]): Promise<number> {
  try {
    const res = await apiFetch<{ marked: number }>("/notifications/read", {
      method: "PATCH",
      body: ids?.length ? { ids } : {},
    });
    return res.marked ?? 0;
  } catch (error) {
    console.error("Error marking notifications read:", error);
    return 0;
  }
}

export function useUnreadNotificationCount() {
  const user = useUser();
  const count = useState<number>("unread-notification-count", () => 0);

  async function refresh() {
    if (!user.value) {
      count.value = 0;
      return;
    }
    count.value = await getUnreadNotificationCount();
  }

  if (import.meta.client) {
    watch(
      user,
      () => {
        void refresh();
      },
      { immediate: true },
    );
  }

  return {
    count,
    refresh,
  };
}
