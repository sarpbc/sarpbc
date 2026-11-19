import type { AppNotification } from "@sarpbc/types";

export const getNotifications = async (limit = 30) => {
  try {
    const res = await apiFetch<{ notifications: AppNotification[] }>("/notifications", {
      method: "GET",
      query: { limit },
    });

    return res.notifications;
  } catch (error) {
    console.error("Error fetching notifications:", error);

    return [];
  }
};

const getUnreadNotificationCount = async () => {
  try {
    const res = await apiFetch<{ count: number }>("/notifications/unread-count", {
      method: "GET",
    });

    return res.count;
  } catch (error) {
    console.error("Error fetching unread notification count:", error);

    return 0;
  }
};

export const markNotificationsRead = async (ids?: string[]) => {
  try {
    const res = await apiFetch<{ marked: number }>("/notifications/read", {
      body: ids !== undefined && ids.length > 0 ? { ids } : {},
      method: "PATCH",
    });

    return res.marked;
  } catch (error) {
    console.error("Error marking notifications read:", error);

    return 0;
  }
};

export const useUnreadNotificationCount = function useUnreadNotificationCount() {
  const user = useUser();
  const count = useState<number>("unread-notification-count", () => 0);

  const refresh = async () => {
    if (!user.value) {
      count.value = 0;

      return;
    }

    count.value = await getUnreadNotificationCount();
  };

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
};
