export function formatDateForInput(date: Date | string | null | undefined): string {
  if (!date) {
    return "";
  }
  return new Date(date).toISOString().substring(0, 10);
}
