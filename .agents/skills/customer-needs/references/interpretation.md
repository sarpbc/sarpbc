# Interpretation Framework

Turn raw customer language into shippable product bets. Use with `customer-needs` SKILL.md.

## Five-Layer Model

| Layer | Question | Example ("custom fields") |
|-------|----------|---------------------------|
| 1. Literal ask | What feature did they name? | "We need custom fields on issues" |
| 2. Symptom | What goes wrong today? | "Customer context gets lost before we prioritize" |
| 3. Job | What are they trying to accomplish? | "Connect customer voice to what we build" |
| 4. Need | What outcome matters? | "Prioritize by real customer impact, not loudest request" |
| 5. Product bet | What do we build? | Customer Requests workflow—not generic custom fields |

Stop at layer 1 = bandaid. Ship from layer 5.

## Questions to Ask (or Infer)

**Clarify the job**

- What were you doing when this hurt?
- What did you do instead (workaround)?
- How often does this happen?
- What would "solved" look like without naming a UI?

**Test breadth**

- Who else has this problem? Who doesn't?
- Is this our core persona or a power-user edge case?
- Would the literal solution create maintenance or UX debt for everyone?

**Find patterns**

- Same ask in support + forum + sales?
- Spikes around events (tournament weeks, patch days)?
- One enterprise vs many casual users?

**Align to strategy**

- Does this move retention, engagement, or differentiation?
- Is it already shipped in the codebase? (grep before ticketing)
- Does it duplicate another ticket or epic?

## Output Template

Use when converting feedback to a product note or Linear issue:

```markdown
## Customer signal
- **Source:** [support / forum / research / stakeholder]
- **Literal ask:** "…"
- **Quote or paraphrase:** …

## Interpretation
- **Symptom:** …
- **Underlying need:** …
- **Persona:** …
- **Pattern evidence:** [repeats, segment, metric]

## Recommendation
- **Verdict:** Build interpreted need / Adapt literal ask / Decline / Defer
- **Proposed MVP:** …
- **Out of scope:** … (include literal ask if not shipping as requested)
- **Success metric:** …
```

## Verdict Guide

| Verdict | When |
|---------|------|
| **Build interpreted need** | Literal ask is a symptom; a narrower or different solution fits strategy |
| **Adapt literal ask** | Ask is directionally right but scope must shrink |
| **Decline** | Need doesn't serve core users or strategy; workaround exists |
| **Defer** | Valid but lower impact than Now work; capture pattern for later |

## Fragmentation Playbook

When feedback is scattered:

1. **Centralize pointers** — one place (Linear, Notion) linking to source threads
2. **Attach context to work** — customer quote on epic, not orphan spreadsheet
3. **Tag by theme** — discovery, match detail, pick'em, etc.—not only by channel
4. **Review themes on cadence** — weekly or per tournament cycle for sarpbc
5. **Close the loop** — when you ship the interpreted need, tell customers what changed

## Red Flags (Build Literal Request)

- Single user, no repeats, highly specific workflow
- "Copy [competitor]" with no owned outcome
- Solution requires power-user config most users won't touch
- Ask conflicts with north-star metric
- Shipped already under a different name—education problem

## Green Flags (Dig Deeper—Good Signal)

- Same words from support and community unprompted
- Tied to high-intent moments (live match, pick'em deadline)
- Workaround is painful and widely shared
- Literal feature is quick but doesn't compound—pause and interpret
