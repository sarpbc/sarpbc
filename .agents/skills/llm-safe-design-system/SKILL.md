---
name: llm-safe-design-system
description: >-
  Design-system constraints that keep LLM-generated UI on-brand: intent tokens,
  typed props over string classNames, CI as contract, closed primitives, no
  escape hatches. Use when building or hardening a design system for agentic
  coding, reviewing UI drift, choosing tokens vs raw Tailwind, banning arbitrary
  values, writing style lint rules, or applying Polar Orbit-style LLM-safe UI
  patterns.
metadata:
  author: sarpbc
  version: "1.0.0"
  sources:
    - https://polar.sh/blog/orbit-llm-safe-design-system
---

# LLM-Safe Design System

Principles from [Polar's Orbit](https://polar.sh/blog/orbit-llm-safe-design-system): when most UI is written with an LLM in the loop, a design system must make off-brand choices **hard to express**—ideally impossible to merge.

**Core bet:** If a value isn't a design decision you've actually made, it should not pass CI.

## When to Apply

- Designing or migrating a design system used by agents
- Reviewing LLM/agent UI diffs for style drift (wrong gray, spacing, forgotten dark mode)
- Choosing between open utility CSS and constrained token APIs
- Adding lint/type gates for styling
- Deciding whether to add a token vs allow an escape hatch

Pair with `geist-design` for sarpbc visual/copy rules; this skill is about **enforceability**, not aesthetics.

## The Problem

LLMs write CSS/Tailwind fluently. They do **not** know your decisions.

```
p-4 rounded-lg bg-gray-100 dark:bg-zinc-900 text-gray-500
```

Every class is reasonable. None is necessarily yours. Across generations, the UI drifts into a thousand slightly different grays—even if CLAUDE.md says otherwise.

Open string surfaces (`className="…"`) give infinite room to be slightly wrong:

| Hazard | Why it slips through |
|--------|----------------------|
| `p-4` / `p-5` / `p-[17px]` | All valid, all different spacing |
| `bg-gray-100` / `bg-zinc-100` / `bg-neutral-100` | All valid, none canonical |
| `dark:` variants | Easy to forget; half wrong |
| `text-[#3b82f6]` | Bypasses palette entirely |
| Raw `className` / inline `style` | Escape hatch LLMs prefer (training data) |

None are syntax errors. All pass weak lint. All are **off-system**.

## Decisions, Not Values

A design system is a set of **decisions**, not a pile of values.

| Values (bad authoring surface) | Decisions (good) |
|--------------------------------|------------------|
| `p-4` → "16px padding" | `padding="l"` → same spacing role as siblings |
| `bg-gray-100` → one gray | `backgroundColor="background-card"` → card surface |
| `--color-gray-100` | Still a value with a nicer name—not intent |

Name tokens for **intent**, not appearance. The hex/light-dark mapping lives behind the name. Two call sites using `padding="l"` declare the **same decision**, not a coincidence of 16px.

Don't ask the model for taste. Ask it to **name what it's building** from a short menu you wrote.

## Docs Are Probability. CI Is Contract.

| Mechanism | Strength |
|-----------|----------|
| CLAUDE.md / skill prose / style guide | Suggestion—followed most of the time |
| Typed token props + ESLint/oxlint in CI | Contract—merge is green or not |

Rules that matter are encoded as **checks**, not English. If something off slips through, that's a **gap in the rules**, not an author failure.

Flip the burden: the LLM may write anything; only shippable expressions pass CI.

## Make Tokens the Only Vocabulary

Mechanism is secondary (StyleX, Restyle-like props, Nuxt UI semantic classes, CSS variables + lint). The point:

1. **One (or few) layout/text primitives** that accept design tokens as typed/enumerated props—not free strings.
2. Prop types come **from token definitions**—autocomplete shows valid options; typos are type/lint errors.
3. Prefer props over class strings: props are easy to lint; string classNames are a regex arms race.

Illustrative API (Polar Orbit / Restyle-shaped):

```tsx
<Box
  flexDirection="column"
  gap="l"
  padding="m"
  backgroundColor="background-card"
  borderRadius="m"
  borderColor="border-primary"
  boxShadow="m"
>
  <Text variant="heading-xs" color="text-primary">Card title</Text>
  <Text color="text-secondary">Description</Text>
</Box>
```

```ts
// Tokens = closed sets of decisions
spacing: none | xs | s | m | l | xl | 2xl | …
backgroundColors: 'background-primary' | 'background-card' | …
```

### sarpbc adaptation (Nuxt UI + Tailwind)

You may not adopt StyleX. Apply the same constraints:

- Prefer `@nuxt/ui` / shared `app/components/ui/` primitives over ad-hoc markup
- Use **semantic** tokens (`bg-default`, `text-muted`, `border-default`)—not `bg-gray-100` / arbitrary hex
- Ban or lint: arbitrary values (`p-[17px]`, `text-[#…]`), one-off palette families, raw layout `div`s when a shared primitive exists
- Missing need → **add a token or component**, don't invent a local gray

## Close Escape Hatches

Constraining `Box` props does nothing if `<div className="…">` sits beside it.

| Do | Don't |
|----|-------|
| Polymorphic primitive: `<Box as="nav">`, `<Box as="ul">` | Ban semantics—keep real elements via `as` |
| Lint: no raw layout elements where the primitive applies | "Please don't use div" in a doc only |
| Treat `eslint-disable` / `oxlint-disable` growth as a **design-system bug** | Normalize bypasses |

Wrong path must **fail the build**. Soft instructions do not survive a fresh LLM context window.

If a value isn't in the system, add it to the system—or reject the PR. Legitimate escape hatches are rare; audit them.

## Theme So the Model Can't Forget

Encode light and dark in the **token** (e.g. CSS `light-dark()`, or paired semantic vars), not as a second class pass (`dark:bg-zinc-900`).

Write `backgroundColor="background-card"` once. Both themes resolve. Forgotten dark mode becomes **inexpressible**.

## Migration Stance

- Migrate **file by file** as you touch code—not a big-bang rewrite
- Legacy open utilities can coexist temporarily; new code uses the closed vocabulary
- Grow the token set when real UI needs it; watch for when constraint costs more than it saves—then add tokens, don't reopen the floodgates

## Agent Workflow

When building or reviewing UI under this skill:

1. **Identify the decision** — surface, text role, spacing role, elevation—not a pixel/hex guess
2. **Map to existing tokens/primitives** — search the design system / Nuxt UI / `ui/` first
3. **If missing** — propose a named token or shared component; do not bypass with arbitrary classes
4. **Avoid escape hatches** — no raw `className` piles, inline styles, or one-off dark variants when tokens exist
5. **Enforce** — prefer types + lint over prose; if drift is possible, add a rule
6. **Review for drift** — wrong palette family, inconsistent spacing scale, forgotten theme, `*-disable` to dodge the system

### Review checklist

```
- [ ] Intent tokens (background-card), not value classes (bg-gray-100)
- [ ] Closed primitive / design-system component where layout would be a raw div
- [ ] No arbitrary Tailwind/CSS values unless explicitly approved escape hatch
- [ ] Theme covered by token (no separate dark: pass to remember)
- [ ] New one-off need → new token, not local invention
- [ ] No new lint/type suppressions without fixing the system
```

## Anti-Patterns

| Anti-pattern | Fix |
|--------------|-----|
| "Use our gray" in AGENTS.md only | Lint/type rule that fails CI |
| `className` as the main styling API for new UI | Token props or semantic utility allowlist |
| Parallel unconstrained `div` next to `Box` | Ban raw layout elements; polymorphic `as` |
| Grepping `bg-gray-100` to restyle cards | Rename to intent tokens so decisions are editable |
| Growing `eslint-disable` list | Treat as signal the token set is incomplete |

## Additional Resources

- Source essay: [Building an LLM safe design system (Polar)](https://polar.sh/blog/orbit-llm-safe-design-system)
- Enforcement patterns: [references/enforcement.md](references/enforcement.md)
- sarpbc visual rules: `geist-design`
- sarpbc hub row-height CI guardrail: [apps/front/DESIGN.md](../../../apps/front/DESIGN.md) + `apps/front/scripts/lint-hub-row-heights.mjs`
