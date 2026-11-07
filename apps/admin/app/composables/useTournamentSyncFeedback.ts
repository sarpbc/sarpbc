export type SyncState = "idle" | "success" | "error";

export function syncIcon(state: SyncState): string {
  switch (state) {
    case "success":
      return "i-fluent-checkmark-24-regular";
    case "error":
      return "i-fluent-dismiss-circle-24-regular";
    case "idle":
      return "i-fluent-arrow-sync-24-regular";
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

function syncColor(state: SyncState): "success" | "error" | "primary" {
  switch (state) {
    case "success":
      return "success";
    case "error":
      return "error";
    case "idle":
      return "primary";
    default: {
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}

export function useTournamentSyncFeedback() {
  const syncingId = ref<string | null>(null);
  const states = ref(new Map<string, SyncState>());

  function stateOf(id: string): SyncState {
    return states.value.get(id) ?? "idle";
  }

  function setState(id: string, state: SyncState) {
    states.value = new Map(states.value).set(id, state);
  }

  async function run(id: string, afterSuccess?: () => Promise<void>) {
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
  }

  return {
    syncingId,
    iconFor: (id: string) => syncIcon(stateOf(id)),
    colorFor: (id: string) => syncColor(stateOf(id)),
    run,
  };
}
