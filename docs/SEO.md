# Verify search indexing

Deploy the front and backend together. IndexNow uses the backend's existing `front_url` configuration and runs only when `production` is true.

1. Open `https://sarpbc.org/indexnow-key.txt`. It must return the key from `packages/utils/src/indexnow.ts` as plain text.
2. Submit `https://sarpbc.org/sitemap_index.xml` under **Sitemaps** in Bing Webmaster Tools if it is not already registered.
3. Publish or update an article through the staff application. Check **IndexNow** in Bing Webmaster Tools for its English and French URLs.
4. Inspect an English page and its French translation in Bing. Each page must declare its own canonical URL.
5. Run `pnpm --filter front test:seo https://sarpbc.org` after deployment. For local verification, start the front and pass its base URL instead.

The verification key is public ownership evidence, not a secret. The front serves the same shared key that the backend sends to `https://api.indexnow.org/indexnow`. No Bing account API token or extra environment variable is required. Replace the shared key if ownership verification must change.

IndexNow receives notifications after published article edits, publication, withdrawal, and deletion. A slug change submits both the old and new URLs. Draft edits and draft deletion do not send notifications. Requests time out after five seconds. Rejected requests and network failures are logged without failing the content operation. Failed notifications are not automatically retried. Sitemaps remain available for discovery.

HTTP `200` means the notification was received. HTTP `202` means key verification is pending. Neither response guarantees indexing. See the [IndexNow protocol](https://www.indexnow.org/documentation) and [Bing setup instructions](https://www.bing.com/indexnow/getstarted).

## Follow up on Bing's SEO report

The 17 October 2026 summary contains categories and counts, without affected URLs. Export the URL details for the image ALT warning before changing images. Empty ALT text is valid for decorative images, including a logo whose link already has an accessible name. The HTML parser in `test:seo` checks attribute presence, including abbreviated empty attributes.

Prioritize informative titles and descriptions on the homepage, match lists, tournament lists, player and team directories, forum, and games. Keep French and English canonicals separate. Login and registration use `noindex` and stay outside the sitemap. The public sitemap lists each locale URL and its reciprocal language alternates.

The inbound-link warning needs editorial work. Potential actions are:

- Publish original tournament summaries and clearly sourced statistics that other Rocket League publications can cite.
- Maintain stable team, player, and tournament pages that organizers can reference.
- Offer the existing brand assets and contact page to partners when there is a relevant collaboration.

Do not buy links or create automated backlinks. No external outreach is part of this code change.
