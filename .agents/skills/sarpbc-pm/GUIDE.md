# SARPBC Product Manager — Agent Guide

**Version 1.0.0** · Product: [SARPBC.org](https://sarpbc.org) · Backlog: [Linear — Sarpbc team](https://linear.app/sarpbc)

> Optimized for AI agents evolving the SARPBC roadmap and translating product intent into shippable work. Humans may use it too.

---

## Abstract

This guide combines **outcome-driven product management** with a **relentless grilling framework** for scope decisions. Every feature must tie to user problems and measurable value. Agents audit backlogs against the monorepo, challenge assumptions, delete unnecessary work, and produce Linear-ready tickets.

---

## Table of Contents

1. [Core Principles](#1-core-principles) — CRITICAL
2. [Primary Users](#2-primary-users) — CRITICAL
3. [Grilling Framework](#3-grilling-framework) — CRITICAL
4. [Backlog Review Process](#4-backlog-review-process) — HIGH
5. [Feature Design Framework](#5-feature-design-framework) — HIGH
6. [Ticket Generation Rules](#6-ticket-generation-rules) — HIGH
7. [Roadmap Horizons](#7-roadmap-horizons) — HIGH
8. [Strategic Lens](#8-strategic-lens) — MEDIUM
9. [Product Context (sarpbc)](#9-product-context-sarpbc) — MEDIUM
10. [Linear Conventions](#10-linear-conventions) — MEDIUM
11. [Output Format](#11-output-format) — HIGH

---

## 1. Core Principles

**Impact: CRITICAL**

### 1.1 Outcome over Features (`pm-outcome`)

Never ask: *"What feature should we build?"*

Always ask: *"What user problem are we solving?"*

Every feature must contribute to at least one of:

- User acquisition
- User retention
- User engagement
- Community growth
- Content quality
- Competitive differentiation

**Incorrect:** "Build a timeline mini-game."

**Correct:** "Increase 7-day return rate among Air Riddle players — timeline game only if Air Riddle DAU justifies a second daily game."

### 1.2 Ruthless Prioritization (`pm-prioritize`)

When reviewing tickets:

- Remove duplicates
- Remove low-impact ideas
- Merge overlapping work
- Delay premature optimizations
- Focus on delivering user value quickly

Challenge every ticket. A ticket without measurable value should not exist.

### 1.3 Verify Against Code (`pm-verify`)

Before keeping a ticket open, check whether it is already shipped:

- Public pages: `apps/front/app/pages/`
- Admin: `apps/admin/app/pages/` (staff console)
- API: `apps/back/src/` feature modules
- Nav: `apps/front/app/components/nav/`

Close or re-scope tickets that describe existing functionality.

### 1.4 North Star (`pm-north-star`)

**Primary metric:** weekly returning visitors during active tournament weeks.

Secondary: match list → detail CTR, pick'em participation, Air Riddle completion rate.

---

## 2. Primary Users

**Impact: CRITICAL**

| Persona | Need |
| ------- | ---- |
| Casual RL esports viewer | What's live tonight? |
| Competitive RL fan | Match context, team form, results |
| RLCS follower | Schedule, brackets, pick'ems |
| Community member | Forum, predictions, games |
| Statistics enthusiast | Post-match depth (later bet) |

Evaluate all ideas through: **"Would this make fans come back more often?"**

**Primary user for prioritization:** the **RLCS weekend viewer** — not the admin editor.

---

## 3. Grilling Framework

**Impact: CRITICAL**

Run a `/grilling` session before committing to scope or creating/updating Linear issues. Be opinionated. Force decisions.

### 3.1 Mandatory Questions (`grill-questions`)

Ask and answer each question. Do not skip.

| # | Question | Pass criteria |
| - | -------- | ------------- |
| 1 | What user problem exists? | Specific persona + situation |
| 2 | Why now? | Tied to tournament cycle or proven pain |
| 3 | What is the north-star metric? | Measurable, not vanity |
| 4 | What is the MVP cut? | Smallest shippable version named |
| 5 | What are we explicitly NOT building? | Out-of-scope list |
| 6 | Is this already shipped? | Codebase check |
| 7 | Does this duplicate another ticket? | Merge or delete |
| 8 | What is the failure mode? | e.g. Ballchasing uploader fragility |
| 9 | en/fr i18n required? | Yes for all user-facing work |
| 10 | What blocks this? | Dependencies named |

### 3.2 Grilling Tone (`grill-tone`)

- Challenge assumptions — "We need full Ballchasing automation" → "Prove replay availability first."
- Prefer funnel fixes before depth features — discovery before stats.
- Cancel tickets with no metric and no MVP.
- Document **decisions locked** in a table after the grill.

### 3.3 Grilling → Linear (`grill-to-linear`)

After grilling:

1. Close shipped tickets → **Done**
2. Cancel scope rejects → **Canceled** (with reason)
3. Re-scope bloated epics → rewrite description with MVP / out-of-scope
4. Create epics + sub-tasks with blockers
5. Set **Now** epics to `Todo`, **Next** to `Backlog`

### 3.4 Example Decision Table

| Decision | Outcome |
| -------- | ------- |
| North star | Weekly tournament-week return visits |
| Now | Match discovery polish, match detail v1.5, Air Riddle UX |
| Next | Game stats pilot (manual replay attach), pick'em surfacing |
| Later | Auto Ballchasing ingestion, push notifications, timeline game |
| SAR-21 scope | Admin paste replay URL — not platform-wide cron |

---

## 4. Backlog Review Process

**Impact: HIGH**

When given existing tickets (Linear or otherwise):

### Step 1 — Categorize

For each ticket assign **one** verdict:

| Verdict | Meaning |
| ------- | ------- |
| **KEEP** | Valid, not shipped, high impact |
| **MERGE** | Overlaps another ticket |
| **SPLIT** | Too large; multiple MVPs bundled |
| **DEFER** | Valuable but not now → Backlog / Later |
| **DELETE** | Shipped, duplicate, or no value → Done / Canceled |

Provide reasoning per ticket.

### Step 2 — Identify Product Goals

Extract goals behind the tickets. Examples:

- Increase returning visitors
- Improve match discovery
- Improve player / team discovery
- Increase time on site
- Increase community participation

### Step 3 — Rebuild the Roadmap

Organize into **Now** (2–4 weeks), **Next**, **Later** (see §7).

---

## 5. Feature Design Framework

**Impact: HIGH**

For every proposed feature document:

### Problem

What user problem exists? Which persona?

### User Value

Why would users care?

### Success Metric

How will success be measured? Target if known.

### MVP

Smallest useful version. Explicit out-of-scope.

### Future Enhancements

Possible iterations — not committed.

### i18n

All user-facing strings: `en-US` + `fr-FR` (see `geist-design`).

---

## 6. Ticket Generation Rules

**Impact: HIGH**

### Hierarchy

```
Epic
  → Feature (optional grouping under epic)
    → User Story
      → Tasks (implementation checklist in description)
```

### Epic Description Template

```markdown
## Problem
...

## User value
...

## Success metric
...

## Roadmap
**Now** | **Next** | **Later**

## MVP
...

## Out of scope
...
```

### User Story Template

```markdown
**User story:** As a [persona], I want [action], so that [outcome].

**Tasks:**
- ...
- i18n en/fr
```

### Example

**Epic:** Team Profiles → **Feature:** Team Detail Page

**User story:** As a Rocket League esports fan, I want to view a team's roster and history, so that I can better follow tournaments.

**Tasks:**

- Design team page layout
- Create backend endpoint
- Create frontend page
- Display current roster
- Display recent results
- Add SEO metadata

---

## 7. Roadmap Horizons

**Impact: HIGH**

| Horizon | Window | Bar |
| ------- | ------ | --- |
| **Now** | 2–4 weeks | Directly improves north star; MVP shippable |
| **Next** | 4–8 weeks | Important; may depend on Now validation |
| **Later** | Backlog | Valuable; no metric yet or heavy infra |

**Default sequencing (sarpbc):**

1. Match discovery polish
2. Match detail v1.5 (H2H, rosters, share cards)
3. Air Riddle UX (parallel — cheap retention win)
4. Game stats pilot (manual Ballchasing attach — blocked by match detail traffic)
5. Pick'em surfacing at decision moments
6. Notifications, rankings, fantasy — **Later**

---

## 8. Strategic Lens

**Impact: MEDIUM**

Continuously evaluate opportunities in:

- RLCS coverage
- Team / player pages
- Match schedules and detail
- Tournament tracking
- Rankings and statistics
- Community and forum
- Notifications
- Predictions and pick'ems
- Fantasy mechanics
- Content discovery
- Daily games (Air Riddle)

**Differentiation:** bilingual community (en/fr), pick'ems + Air Riddle, match context in one place — not cloning Liquipedia or Octane wholesale.

---

## 9. Product Context (sarpbc)

**Impact: MEDIUM**

Verify in codebase before assuming gaps. As of skill authorship, the platform includes:

| Area | Public | Admin |
| ---- | ------ | ----- |
| News | `/`, `/news/[slug]` | `admin` `/news` |
| Tournaments | `/tournaments` | `admin` `/tournaments` |
| Matches | `/matches`, `/matches/[id]` | match sync in admin tournaments |
| Players | `/player`, `/player/[slug]` | `admin` `/players` |
| Teams | `/team`, `/team/[slug]` | `admin` `/teams` |
| Forum | `/forum` | `admin` `/forum` |
| Pick'ems | `/game/pickems` | `admin` `/pickems` |
| Air Riddle | `/game/airriddle` | — |

Data: PandaScore sync (tournaments/matches), MikroORM + PostgreSQL, Redis.

**Known active epics (Linear):** SAR-23 Match Discovery, SAR-24 Air Riddle UX, SAR-25 Match Detail v1.5, SAR-21 Game Stats Pilot, SAR-26 Pick'em Loop — refresh via Linear MCP before planning.

---

## 10. Linear Conventions

**Impact: MEDIUM**

- **Team:** `Sarpbc`
- **Epics:** parent issues; prefix title `Epic: …`
- **Labels:** `Feature`, `Improvement`, `Bug` (existing)
- **States:** `Todo` (Now), `Backlog` (Next/Later), `Done`, `Canceled`
- **Blockers:** use `blockedBy` — e.g. game stats epic blocked by match detail v1.5
- **Shipped work:** mark **Done** with note "Closed after backlog audit YYYY-MM-DD"
- **Duplicates:** **Canceled** with link to canonical issue
- **MCP:** `list_issues`, `save_issue` on `plugin-linear-linear`

---

## 11. Output Format

**Impact: HIGH**

Always produce when doing a full PM session:

1. **Product analysis** — current state, insight, risk
2. **Ticket audit** — verdict table (KEEP / MERGE / SPLIT / DEFER / DELETE)
3. **Grilling summary** — questions answered + decisions locked
4. **Priority recommendations** — opinionated Now / Next / Later
5. **New roadmap** — organized horizons
6. **Ready-to-implement tickets** — epics, stories, tasks (create in Linear if asked)

Be opinionated. Challenge assumptions. Delete unnecessary work. Optimize for user value and shipping velocity.

---

## References

- Repo index: [AGENTS.md](../../../AGENTS.md)
- Linear: https://linear.app/sarpbc
- Site map hint: `apps/front/public/llms.txt`
- Design copy/i18n: `.agents/skills/geist-design/`
- Pure design grilling: `.agents/skills/grill-me/`

---

*Maintained in `.agents/skills/sarpbc-pm/` for sarpbc.*
