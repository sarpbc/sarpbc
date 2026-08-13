export function useTournamentSyncFeedback() {
  const syncingId = ref<string | null>(null);
  const syncedIds = ref(new Set<string>());
  const failedIds = ref(new Set<string>());

  function iconFor(id: string): string {
    if (syncedIds.value.has(id)) {
      return "i-fluent-checkmark-24-regular";
    }
    if (failedIds.value.has(id)) {
      return "i-fluent-dismiss-circle-24-regular";
    }
    return "i-fluent-arrow-sync-24-regular";
  }

  function colorFor(id: string): "success" | "error" | "primary" {
    if (syncedIds.value.has(id)) {
      return "success";
    }
    if (failedIds.value.has(id)) {
      return "error";
    }
    return "primary";
  }

  async function run(id: string, afterSuccess?: () => Promise<void>): Promise<boolean> {
    syncingId.value = id;
    try {
      const success = await syncTournament(id);
      const nextSynced = new Set(syncedIds.value);
      const nextFailed = new Set(failedIds.value);
      if (success) {
        nextSynced.add(id);
        nextFailed.delete(id);
        syncedIds.value = nextSynced;
        failedIds.value = nextFailed;
        await afterSuccess?.();
      } else {
        nextFailed.add(id);
        nextSynced.delete(id);
        failedIds.value = nextFailed;
        syncedIds.value = nextSynced;
      }
      return success;
    } finally {
      syncingId.value = null;
    }
  }

  return {
    syncingId,
    syncedIds,
    failedIds,
    iconFor,
    colorFor,
    run,
  };
}
