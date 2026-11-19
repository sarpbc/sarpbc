export type SyncState = "idle" | "success" | "error";

export const syncIcon = (state: SyncState) => {
  switch (state) {
    case "success": {
      return "i-fluent-checkmark-24-regular";
    }

    case "error": {
      return "i-fluent-dismiss-circle-24-regular";
    }

    case "idle": {
      return "i-fluent-arrow-sync-24-regular";
    }

    default: {
      const _exhaustive: never = state;

      return _exhaustive;
    }
  }
};

export const useTournamentSyncFeedback = () => {
  const syncingId = ref<string | null>(null);
  const states = ref(new Map<string, SyncState>());

  const stateOf = (id: string) => states.value.get(id) ?? "idle";

  const setState = (id: string, state: SyncState) => {
    states.value = new Map(states.value).set(id, state);
  };

  const run = async (id: string, afterSuccess?: () => Promise<void>) => {
    syncingId.value = id;

    try {
      await syncTournament(id);
    } catch (error) {
      setState(id, "error");
      throw error;
    } finally {
      syncingId.value = null;
    }

    setState(id, "success");
    await afterSuccess?.();
  };

  return {
    failedFor: (id: string) => stateOf(id) === "error",
    iconFor: (id: string) => syncIcon(stateOf(id)),
    run,
    syncingId,
  };
};
