import type { CaptureResult } from "posthog-js";
import * as z from "zod/mini";

const urlPropertySchema = z.string();
const heatmapSchema = z.record(z.string(), z.array(z.looseObject({})));

const webVitalSchema = z.looseObject({
  $current_url: z.optional(z.string()),
  attribution: z.optional(z.looseObject({ url: z.optional(z.string()) })),
  navigationURL: z.optional(z.string()),
});

const personPropertiesSchema = z.object({ username: z.optional(z.string()) });

export const sanitizePostHogUrl = (value: string): string => {
  try {
    const url = new URL(value);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return "";
    }

    return `${url.origin}${url.pathname}`;
  } catch {
    return "";
  }
};

export const sanitizePostHogEvent = (event: CaptureResult): CaptureResult => {
  const { properties } = event;

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
      Reflect.deleteProperty(properties, key);
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
    Reflect.deleteProperty(properties, "$heatmap_data");
  }

  for (const [key, value] of Object.entries(properties)) {
    if (!/^\$web_vitals_[A-Z]+_event$/u.test(key)) {
      continue;
    }

    const vital = webVitalSchema.safeParse(value);

    if (!vital.success) {
      Reflect.deleteProperty(properties, key);
      continue;
    }

    const { attribution, navigationURL } = vital.data;
    vital.data.$current_url = sanitizePostHogUrl(vital.data.$current_url ?? "");

    if (navigationURL !== undefined) {
      vital.data.navigationURL = sanitizePostHogUrl(navigationURL);
    }

    if (attribution?.url !== undefined) {
      attribution.url = sanitizePostHogUrl(attribution.url);
    }

    properties[key] = vital.data;
  }

  for (const key of ["$title", "$set_once", "email", "userName", "userId", "user_id"]) {
    Reflect.deleteProperty(properties, key);
  }

  // Only the public username may reach the person profile of a signed-in visitor.
  for (const target of [properties, event]) {
    const personProperties = personPropertiesSchema.safeParse(target.$set);

    if (personProperties.success) {
      target.$set = personProperties.data;
    } else {
      Reflect.deleteProperty(target, "$set");
    }
  }

  Reflect.deleteProperty(event, "$set_once");

  return event;
};
