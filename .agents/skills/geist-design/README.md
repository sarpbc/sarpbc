# Geist Design (sarpbc)

Skill unifié pour Cursor : [Geist](https://vercel.com/design) + [Design Engineer](https://vercel.com/design/engineer) + [Web Interface Guidelines](https://vercel.com/design/guidelines), adapté au monorepo **Nuxt** (`apps/front`) + **NestJS** (`apps/back`).

## Fichiers

| Fichier | Rôle |
|---------|------|
| `SKILL.md` | Point d'entrée — quand l'utiliser, checklist, liens |
| `GUIDE.md` | Guide complet pour les agents (règles + exemples) — **on demand** (Cursor auto-injecte `AGENTS.md` dans les skills) |
| `references/tokens.md` | Geist → Tailwind / Nuxt UI |
| `references/nuxt-sarpbc.md` | Conventions du repo front |

## Activer dans Cursor

### Automatique (configuré dans le repo)

| Fichier | Portée |
|---------|--------|
| [AGENTS.md](../../../AGENTS.md) (racine) | Index projet + tableau des skills |
| `.cursor/rules/project-hub.mdc` | Toujours actif — renvoie vers `AGENTS.md` |
| `.cursor/rules/frontend-ui.mdc` | Fichiers `apps/front/**` → geist-design + nuxt |
| `.cursor/rules/backend-nestjs.mdc` | Fichiers `apps/back/**` → nestjs-best-practices |

### Contexte Cursor (tokens)

Cursor injecte automatiquement tout fichier nommé `AGENTS.md` sous `.agents/skills/` à **chaque** session (~50k+ tokens). Les guides complets sont donc nommés **`GUIDE.md`** et chargés via `SKILL.md` ou les règles `.mdc` scoped (`backend-nestjs`, `frontend-ui`) uniquement quand nécessaire.

### À la demande

Mentionnez le skill explicitement : « utilise geist-design pour cette page ».

## Skills complémentaires

- `nuxt` — APIs framework, SSR, data fetching
- `nestjs-best-practices` — backend, validation, exceptions

## Sources

- https://vercel.com/design
- https://vercel.com/design/engineer
- https://vercel.com/design/guidelines
