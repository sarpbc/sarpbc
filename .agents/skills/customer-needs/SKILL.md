---
name: customer-needs
description: >-
  Interpret customer feedback to find underlying needs, not feature requests.
  Use when triaging user requests, support tickets, forum posts, backlog items,
  or feature ideas; when someone asks for a specific feature; when feedback is
  fragmented across tools; or when deciding whether to build what was asked vs
  what solves the real problem. Applies Linear's "requests as input, not
  instructions" product philosophy.
metadata:
  author: sarpbc
  version: "1.0.0"
  sources:
    - https://linear.app/now/building-what-customers-need
---

# Building What Customers Need

Principles from [Linear's product team](https://linear.app/now/building-what-customers-need): the best products come from **strong opinions informed by customer reality**. Feedback sharpens intuition—it is not the source of vision.

**Core stance:** Treat customer requests as **input, not instructions**.

## When to Apply

- A user, stakeholder, or ticket asks for a specific feature
- Triaging support, forum, Discord, or sales feedback into product work
- Backlog items that read like solutions ("add custom fields", "copy X from competitor")
- Deciding whether a request deserves a ticket, a re-scope, or a decline
- Feedback feels noisy or contradictory at scale

Pair with `sarpbc-pm` for sarpbc roadmap, grilling, and Linear tickets; this skill is about **interpretation**, not repo-specific prioritization.

## The Feedback Paradox

| Extreme | Risk |
|---------|------|
| Build only what customers ask for | Mediocrity—incremental copies of others |
| Ignore feedback entirely | Irrelevance—vision with no market fit |

Breakthrough products often arrived **without** explicit requests (iPhone, Figma). Failed startups often had vision **nobody wanted**. Product work lives in the tension.

## Feedback Sharpens Intuition

Users rarely state core problems directly. They typically:

- Describe **symptoms** ("I can't find last night's match")
- Request **features they've seen elsewhere** ("add a timeline like Liquipedia")
- Suggest **solutions** tuned to their workflow, not the broader user base

A request for "custom fields" is not a spec—it is a signal that needs interpretation. More feature votes do not replace diagnosis.

| Role | Analogy |
|------|---------|
| Customer | Describes symptoms and proposed cures |
| Product | Diagnoses underlying need and prescribes fit-for-many treatment |

The valuable skill is understanding what remains **unsaid**.

## Fragmentation at Scale

Small teams absorb customer context by proximity—engineers talk to users, support spots repeats, everyone feels priorities.

At scale, signal buries in noise:

- Email, support tickets, Slack, app reviews, research calls, sales notes
- Feedback captured in tools product can't access (Gong, Intercom, CRM)
- Hours spent stitching context across systems

**Capturing** feedback is rarely the bottleneck. **Using** it coherently is.

When product lacks deep customer understanding, engineering explores paths that miss core problems—shipping features nobody needed while urgent problems stay unsolved.

## Interpret, Don't Implement Literally

### Case pattern: "Custom fields"

Linear users asked for custom fields. Deeper conversations showed ~40% wanted them **to track customer needs**—not generic metadata. A custom-field toggle would be a bandaid. They built **Customer Requests**: customer context beside engineering work, patterns over vote tallies.

**Lesson:** The ask pointed at a workflow gap. The product was the interpreted need, not the requested surface.

### sarpbc examples (illustrative)

| Request (surface) | Possible underlying need | Build literal request? |
|-------------------|--------------------------|------------------------|
| "Export match data to CSV" | Offline analysis / fantasy league tooling | Maybe a narrower stats export or API |
| "Dark mode toggle on every page" | Comfortable night viewing during long streams | Semantic theme tokens + one toggle (likely shipped) |
| "Clone Octane's player page" | Richer match context at decision time | Match detail v1.5, not a clone |
| "More forum categories" | Hard to find relevant threads | Discovery/navigation, not taxonomy sprawl |

Always verify with users or data before committing—patterns, not one loud voice.

## Agent Workflow

When a feature request or feedback item appears:

1. **Quote the ask** — what did they literally request?
2. **Identify the symptom** — what pain or job are they describing?
3. **Hypothesize the need** — what outcome do they want? Who else shares it?
4. **Check breadth** — does the literal solution serve the many or only this workflow?
5. **Look for patterns** — repeats across channels, tiers, or tournament weeks?
6. **Propose the interpreted bet** — problem statement + MVP, not the requested widget
7. **State what you're NOT building** — the literal ask if it doesn't fit

### Interpretation checklist

```
- [ ] Underlying problem stated (not just the requested feature)
- [ ] Persona + situation named (who, when, why now)
- [ ] Evidence: repeats, metric, or qualitative depth—not one anecdote
- [ ] Literal request evaluated: ship, adapt, or decline with reason
- [ ] MVP serves the need without copying a competitor surface
- [ ] Customer context linked to engineering work (ticket, epic, quote)
```

## Requests as Input, Not Instructions

| Input (what they said) | Instruction (what you must do) |
|------------------------|--------------------------------|
| "Add X" | Investigate job-to-be-done behind X |
| "We need it like site Y" | Extract the capability, not the UI clone |
| "Everyone wants this" | Verify pattern; filter by segment and impact |
| High vote count | Prioritization signal, not automatic build |

Strong vision **plus** deep customer understanding beats pure customer-led development **or** isolated visionary thinking.

## Prioritization Signals (Beyond Votes)

When feedback is organized thoughtfully:

- **Recurrence** — same need across support, forum, research
- **Segment weight** — core persona vs edge case (for sarpbc: RLCS weekend viewer)
- **Business context** — retention, engagement, differentiation—not vanity
- **Cost of wrong path** — engineering waste if the literal feature misses the need

AI and tooling can help find signal in noise; interpretation stays a human (or agent) responsibility.

## Anti-Patterns

| Anti-pattern | Instead |
|--------------|---------|
| Ticket = verbatim user quote as title | Ticket = problem + success metric |
| Vote tally decides the roadmap | Patterns + strategy decide; votes inform |
| Build competitor parity because one user asked | Name the user outcome you own |
| No customer context on engineering issues | Link quote, segment, or support thread |
| Dismiss feedback as "they don't get vision" | Use feedback to sharpen the vision |

## Additional Resources

- Source essay: [Building what customers need (Linear)](https://linear.app/now/building-what-customers-need)
- Interpretation drills: [references/interpretation.md](references/interpretation.md)
- sarpbc roadmap / grilling / Linear: `sarpbc-pm`
