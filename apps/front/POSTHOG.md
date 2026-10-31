# PostHog visit tracking

PostHog runs only in production, with a project key and the visitor's explicit consent. The consent banner covers analytics and session replay. Visitors with the old `cookieConsent` choice are asked again because that choice did not cover replay.

## Project settings

The project key is read at runtime from `NUXT_PUBLIC_POSTHOG_PUBLIC_KEY` and the proxy host from `NUXT_PUBLIC_POSTHOG_HOST` (default `https://t.sarpbc.org`), so set them on the running container, not as build arguments. The dev server never loads PostHog. An empty key skips initialization.

Before deploying, configure the EU PostHog project used by `NUXT_PUBLIC_POSTHOG_PUBLIC_KEY`:

- Session Replay and Heatmaps are already enabled on project `192444` (`sarpbc.org`), as verified through the connected PostHog MCP. Its project token matches the production site.
- Recording retention is currently 30 days. Keep the project's retention settings and the privacy policy aligned when changing retention for recordings or events.
- Ensure the tracking proxy serves ingestion, flags and SDK assets. The configured host is `https://t.sarpbc.org`.

The client requests recordings for every consenting session, overriding sampling and URL/event/feature-flag triggers. Browser protections, network failures and project limits can still prevent delivery. This does not recover activity from before consent.

## Captured data

- Initial pageview, including acceptance on an already open page, and subsequent successful SPA navigation.
- Clicks, field changes, form submissions, repeated and unresponsive clicks.
- Page departure, including the SDK's page-duration and scroll metrics.
- Heatmaps and masked session replay, including mouse, touch and scroll interactions.
- Existing domain events such as match discovery, Pick'ems, Airriddle and authentication outcomes.

An account-independent random ID in session storage groups events within the visit. Authentication and logout do not identify the visitor or split the visit. Backend events reuse the browser's tracing headers and session ID without creating person profiles.

Text, inputs and element attributes are masked. URL query parameters and fragments are removed, including replay URLs and heatmap URL keys. Console logs, automatic exceptions, network bodies/headers, canvas recording and cross-origin iframe recording are disabled.

## Consent lifecycle

The `analyticsConsent` cookie remembers the choice for 180 days. Preferences can be changed from the cookie policy page. Withdrawal blocks new captures, stops replay and automatic capture, removes API tracing headers and resets the analytics identity. It does not delete events previously transmitted.

## Verification

Run the frontend tests, formatting and linting. The PostHog tests cover consent changes during asynchronous SDK loading, pageview deduplication, aborted navigation, withdrawal and URL redaction.

After deploying, verify with a browser visit that declining sends no PostHog events, acceptance captures the current page once, internal navigation and interactions share a session ID, replay content is masked, and withdrawal stops new tracking. Verify an actual recording in PostHog after enabling Session Replay.
