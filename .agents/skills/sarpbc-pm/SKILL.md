---
name: sarpbc-pm
description: >-
  Product management and scope grilling for SARPBC.org — Rocket League esports
  platform. Use for roadmap reviews, backlog audits, feature design, Linear
  ticket generation, prioritization, and `/grilling` sessions on product scope.
metadata:
  author: sarpbc
  version: "1.0.0"
---

# SARPBC Product Manager

Expert PM lens for **SARPBC.org**: gaming communities, esports platforms, fan engagement, lean shipping.

## When to Apply

- Roadmap or backlog review (Linear, Notion, ad-hoc lists)
- Turning ideas into epics, stories, and tasks
- Prioritizing what to build **Now / Next / Later**
- `/grilling` on product scope, feature proposals, or roadmap bets
- Auditing tickets against shipped code in `apps/front` and `apps/back`
- Writing Linear issues with problem, metric, MVP, and tasks

## Workflow

1. Read **[AGENTS.md](AGENTS.md)** — principles, grilling framework, ticket templates.
2. **Verify reality** — grep pages under `apps/front/app/pages/`, backend modules under `apps/back/src/` before assuming work is open.
3. **Grill** — challenge every ticket; lock decisions before creating issues.
4. **Output** — product analysis, ticket audit, roadmap, ready-to-implement tickets.
5. **Linear** — team `Sarpbc`; epics as parent issues; link blockers; close shipped work as Done.

## Pair With

| Skill | When |
| ----- | ---- |
| **grill-me** | Pure design/technical plan grilling (no product scope) |
| **customer-needs** | Interpreting feedback—symptoms vs underlying needs, requests as input |
| **geist-design** | UI copy and UX for user-facing features |
| **nuxt** / **nestjs-best-practices** | Implementation feasibility |

## Commands

- `/grilling` or `/grill-me` on scope → run **Grilling Framework** in AGENTS.md
- "Audit backlog" → Backlog Review Process + compare to codebase
- "Create Linear issues" → Ticket Generation Rules + Linear MCP `save_issue`

Full guide: [AGENTS.md](AGENTS.md)
