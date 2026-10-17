# SARPBC design context

Design guidance is scoped to the application being changed. Read [AGENTS.md](AGENTS.md) for architecture, conventions and verification.

| Scope                           | Guidance                                                                                                                                                                                                                                                                            |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Public site, `apps/front`       | [Public design](apps/front/DESIGN.md) is authoritative for layout, tokens, interaction and copy.                                                                                                                                                                                    |
| Supporting public conventions   | [Interface](apps/front/design/INTERFACE.md), [tokens](apps/front/design/TOKENS.md) and [Nuxt patterns](apps/front/design/NUXT.md) retain the project's detailed references. When an older example differs, the public design document and actual shared components take precedence. |
| Staff application, `apps/admin` | Follow its existing `@nuxt/ui` components, app configuration and workflows. The public site's hub columns, row density and marketing layout do not automatically apply to staff screens.                                                                                            |
| API messages shown in the UI    | Preserve the response contracts in [backend architecture](apps/back/ARCHITECTURE.md). Explain the failure and useful next action in the appropriate language.                                                                                                                       |
| News articles                   | Follow the [editorial playbook](docs/playbooks/roster-change-news.md#4-drafting) for tone, attribution and bilingual copy.                                                                                                                                                          |

Reuse the affected application's semantic tokens, components and supported locales. Inspect representative existing screens before introducing a new pattern. A personal skill's preferred palette, framework or component library does not override these decisions.

If a scope has no design guide for the requested interaction, use its existing components and state the narrow assumption. Record a new durable product decision here or in the applicable application guide when the task includes making that decision.
