export const PANDASCORE_SYNC_CURSOR_KEY = "pandascore:sync:additions:cursor";

export interface SyncCursorRepository {
  getLastSyncAt(): Promise<Date | null>;
  setLastSyncAt(date: Date): Promise<void>;
}

export const SYNC_CURSOR_REPOSITORY = Symbol("SYNC_CURSOR_REPOSITORY");
