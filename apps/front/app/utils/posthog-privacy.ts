import type { CaptureResult } from "posthog-js";
import { z } from "zod";

const urlPropertySchema = z.string();
const heatmapSchema = z.record(z.string(), z.array(z.object({}).loose()));

export function sanitizePostHogUrl(value: string): string {
  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "";
    }
    return `${url.origin}${url.pathname}`;
  } catch {
    return "";
  }
}

export function sanitizePostHogEvent(event: CaptureResult): CaptureResult {
  const properties = event.properties;
  for (const key of [
    "$current_url",
    "$referrer",
    "$initial_current_url",
    "$initial_referrer",
    "$session_entry_url",
    "$session_entry_referrer",
    "$session_exit_url",
  ]) {
    const value = urlPropertySchema.safeParse(properties[key]);
    if (value.success) {
      properties[key] = sanitizePostHogUrl(value.data);
    } else {
      delete properties[key];
    }
  }

  const heatmap = heatmapSchema.safeParse(properties.$heatmap_data);
  if (heatmap.success) {
    const sanitized: z.infer<typeof heatmapSchema> = {};
    for (const [url, points] of Object.entries(heatmap.data)) {
      const path = sanitizePostHogUrl(url);
      if (path) {
        sanitized[path] = [...(sanitized[path] ?? []), ...points];
      }
    }
    properties.$heatmap_data = sanitized;
  } else {
    delete properties.$heatmap_data;
  }
  for (const key of ["$title", "$set", "$set_once", "email", "userName", "userId", "user_id"]) {
    delete properties[key];
  }
  delete event.$set;
  delete event.$set_once;
  return event;
}
