# Admin design

Scope: `apps/admin`, the staff console. The public site's hub layout does not apply. Use `@nuxt/ui` components, semantic tokens and the existing `header` layout (breadcrumb, command palette, actions).

## Navigation

- Desktop (`lg` and up): hover-reveal sidebar stays as is.
- Below `lg`: a burger button in the header opens a `USlideover` (left) holding the same link list as the sidebar. Touch only, no hover. It closes on link click, on outside click and on `Escape`.
- The link list lives in one composable (`useAdminNavLinks`), shared by the sidebar and the drawer, so permission filtering is defined once.
- The header needs the burger on small screens; the breadcrumb and the palette must not overflow at 375 px.

## Home dashboard

Replaces the logo and shortcut-button page. Sections render only when the user holds the permission; a staff member with no tool keeps the `noTools` message.

| Section                 | Permission                          | Source                           |
| ----------------------- | ----------------------------------- | -------------------------------- |
| Pending queues (counts) | per queue                           | below                            |
| Recent articles         | `news.manage`                       | `GET /news/admin?page=0&limit=5` |
| Upcoming matches        | `tournaments.manage`                | `GET /matches/upcoming`          |
| Shortcuts               | any, filtered by `meetsRequirement` | same links as the navigation     |

Queues: roster proposals (`GET /roster-proposals?status=pending`, `players.manage` or `teams.manage`) and latest replies to moderate (`GET /moderation/replies`, `forum.moderate`). Each queue card links to its page; an empty queue says so. Verified-account queues (SAR-166) join later.

Every section has loading, empty and error states. No pageviews, DAU or charts.

## Users

- Page `/users`, admin-only (`ROLE` check via a new `users.manage` permission, granted to `admin` only).
- Table: user name, email, role, created date. Search by email or name, server-side pagination (25 per page).
- Role change inline (`USelect`: `member`, `journalist`, `moderator`, `admin`), with a confirmation modal for any change to or from `admin`. `member` stores `role = null`.
- An admin cannot change their own role (prevents locking out the last admin).
- Out of scope: impersonation, password reset, ban or deletion.
- Backend: `GET /users?search=&limit=&offset=` and `PATCH /users/:id/role`, both guarded by `users.manage`. Follows `apps/back/ARCHITECTURE.md`: query and command on `UserService`, port methods on `IUserRepository`, DTO validation in infrastructure.

## Lists

- Paginated lists use `useAdminList` (fetch, page, refresh). It keeps the previous page visible while the next one loads.
- Row deletion goes through `ConfirmDeleteModal`: bind the row to delete with `v-model:target`, pass the message and the delete call, refresh on `deleted`.
- Teams, players and forum posts use both. The users page keeps its own fetch for now because of search and its error state.
