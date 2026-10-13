import type { CaptureResult } from "posthog-js";
import { describe, expect, it } from "vitest";
import { sanitizePostHogEvent, sanitizePostHogUrl } from "./posthog-privacy";

describe("PostHog privacy", () => {
  it("removes credentials, search parameters and fragments from URLs", () => {
    expect(sanitizePostHogUrl("https://name:password@sarpbc.org/login?token=secret#private")).toBe(
      "https://sarpbc.org/login",
    );
    expect(sanitizePostHogUrl("not a URL")).toBe("");
    expect(sanitizePostHogUrl("")).toBe("");
  });

  it("removes identifying properties without breaking session correlation or custom events", () => {
    const event: CaptureResult = {
      uuid: "event-1",
      event: "match_row_clicked",
      $set: { email: "private@example.com" },
      $set_once: { userName: "private" },
      properties: {
        token: "project-token",
        distinct_id: "random-visitor",
        $session_id: "session-1",
        match_id: "match-1",
        $current_url: "https://sarpbc.org/matches?email=private@example.com#private",
        $session_entry_url: "https://sarpbc.org/login?token=private",
        $session_entry_referrer: "https://example.com/?secret=private",
        $referrer: "https://example.com/?secret=private",
        $title: "Profile of private@example.com",
        email: "private@example.com",
        userName: "private",
        userId: "account-1",
        user_id: "account-1",
        $set: { email: "private@example.com" },
        $set_once: { userName: "private" },
      },
    };
    expect(sanitizePostHogEvent(event)).toEqual({
      uuid: "event-1",
      event: "match_row_clicked",
      properties: {
        token: "project-token",
        distinct_id: "random-visitor",
        $session_id: "session-1",
        match_id: "match-1",
        $current_url: "https://sarpbc.org/matches",
        $session_entry_url: "https://sarpbc.org/login",
        $session_entry_referrer: "https://example.com/",
        $referrer: "https://example.com/",
      },
    });
  });

  it("sanitizes URL keys inside heatmap batches without losing points for the same page", () => {
    const event: CaptureResult = {
      uuid: "event-1",
      event: "$$heatmap",
      properties: {
        $heatmap_data: {
          "https://sarpbc.org/matches?search=private": [{ x: 1, y: 2 }],
          "https://sarpbc.org/matches?token=private": [{ x: 3, y: 4 }],
          invalid: [{ x: 5, y: 6 }],
        },
      },
    };
    expect(sanitizePostHogEvent(event).properties.$heatmap_data).toEqual({
      "https://sarpbc.org/matches": [
        { x: 1, y: 2 },
        { x: 3, y: 4 },
      ],
    });
  });
});
