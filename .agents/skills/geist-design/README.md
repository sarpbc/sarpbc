# Geist Design (sarpbc)

Skill unifié pour Cursor : [Geist](https://vercel.com/design) + [Design Engineer](https://vercel.com/design/engineer) + [Web Interface Guidelines](https://vercel.com/design/guidelines), adapté au monorepo **Nuxt** (`apps/front`) + **NestJS** (`apps/back`).

## Fichiers

| Fichier | Rôle |
|---------|------|
| `SKILL.md` | Point d'entrée — quand l'utiliser, checklist, liens |
| `AGENTS.md` | Guide complet pour les agents (règles + exemples) |
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

### À la demande

Mentionnez le skill explicitement : « utilise geist-design pour cette page ».

### Ancienne config à retirer (si présente)

Si une règle workspace charge **en entier** `.agents/skills/nestjs-best-practices/AGENTS.md` en permanence, vous pouvez la **désactiver** : le backend est couvert par `backend-nestjs.mdc` (fichiers `apps/back/**` seulement), ce qui évite de charger ~40 règles NestJS lors d’un travail UI.

## Skills complémentaires

- `nuxt` — APIs framework, SSR, data fetching
- `nestjs-best-practices` — backend, validation, exceptions

## Sources

- https://vercel.com/design
- https://vercel.com/design/engineer
- https://vercel.com/design/guidelines
