# Verify search indexing

Set a new random IndexNow key in the deployment environment before deploying the front and backend together. Use `INDEXNOW_KEY` for the backend and the same value as `NUXT_INDEXNOW_KEY` for the front. Keep both values out of Git, client runtime configuration, build arguments, and diagnostic output. IndexNow uses the backend's existing `front_url` configuration and runs only when `production` is true and a key is configured.

1. Verify `https://sarpbc.org/{configured-key}.txt` from a trusted environment. It must return the configured key as plain text. The previous fixed `/indexnow-key.txt` endpoint must return 404.
2. Submit `https://sarpbc.org/sitemap_index.xml` under **Sitemaps** in Bing Webmaster Tools if it is not already registered.
3. Publish or update an article through the staff application. Check **IndexNow** in Bing Webmaster Tools for its English and French URLs.
4. Inspect an English page and its French translation in Bing. Each page must declare its own canonical URL.
5. Run `pnpm --filter front test:seo https://sarpbc.org` after deployment with `INDEXNOW_KEY` set privately in the command environment. Do not pass the value on the command line. For local verification, start the front and pass its base URL instead.

The verification file must be publicly readable for the IndexNow protocol. Knowing its key and location allows third parties to submit notifications for that host, so avoid publishing them elsewhere. The key grants no access to the application or Bing account. The frontend runtime setting is server-only. Missing configuration disables notifications and makes the verification route return 404.

To rotate a disclosed key, replace both deployment values, restart both applications, and confirm that the old key file and the old fixed endpoint return 404. New submissions use only the replacement key and its new location. Search engines can cache ownership checks, so file removal is not proof of immediate invalidation at every engine. Rotation does not erase existing Git history, forks, logs, or caches. Follow the [IndexNow rotation instructions](https://www.indexnow.org/faq#api-key-and-verification).

IndexNow receives notifications after published article edits, publication, withdrawal, and deletion. A slug change submits both the old and new URLs. Draft edits and draft deletion do not send notifications. Requests time out after five seconds. Rejected requests and network failures are logged without failing the content operation. Failed notifications are not automatically retried. Sitemaps remain available for discovery.

HTTP `200` means the notification was received. HTTP `202` means key verification is pending. Neither response guarantees indexing. See the [IndexNow protocol](https://www.indexnow.org/documentation) and [Bing setup instructions](https://www.bing.com/indexnow/getstarted).

## Follow up on Bing's SEO report

The homepage description is the brand tagline: "Bringing the competitive Rocket League ecosystem into one place." Keep it and its French translation. A description-length warning alone does not justify replacing brand copy. The homepage title stays "Rocket League news & matches | sarpbc.org", with the literal separator escaped for vue-i18n.

The 17 October 2026 summary contains categories and counts, without affected URLs. Export the URL details for the image ALT warning before changing images. Empty ALT text is valid for decorative images, including a logo whose link already has an accessible name. The HTML parser in `test:seo` checks attribute presence, including abbreviated empty attributes.

Prioritize informative titles and descriptions on the homepage, match lists, tournament lists, player and team directories, forum, and games. Keep French and English canonicals separate. Login and registration use `noindex` and stay outside the sitemap. The public sitemap lists each locale URL and its reciprocal language alternates.

The inbound-link warning needs editorial work. Potential actions are:

- Publish original tournament summaries and clearly sourced statistics that other Rocket League publications can cite.
- Maintain stable team, player, and tournament pages that organizers can reference.
- Offer the existing brand assets and contact page to partners when there is a relevant collaboration.

Do not buy links or create automated backlinks. No external outreach is part of this code change.
