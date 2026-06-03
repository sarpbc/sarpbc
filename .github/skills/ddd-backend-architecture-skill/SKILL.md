---
name: DDD Backend Architecture Skill
description: Defines how AI agents must generate and modify backend code following a pragmatic DDD approach using NestJS with a feature-based structure.
---

# Backend Architecture Skill — Pragmatic DDD (NestJS)

This document defines how AI agents must generate and modify backend code.

The backend follows a pragmatic Domain-Driven Design (DDD) approach using NestJS with a feature-based structure.

---

## 1. Architecture Principles

- Use feature-based folders (e.g., /user, /movie, /skill).
- Each feature must clearly separate responsibilities.
- Avoid over-engineering.
- Respect separation of concerns strictly.
- Business logic must be protected from infrastructure details.

---

## 2. Feature Structure

Each feature must follow this structure:

/feature-name
feature.controller.ts
feature.service.ts
feature.repository.ts
feature.module.ts
/domain
feature.entity.ts
feature.repository.interface.ts

---

## 3. Domain Layer Rules

The domain layer:

- Contains entities and repository interfaces only.
- Must NOT depend on NestJS.
- Must NOT use decorators.
- Must NOT use ORM libraries.
- Must NOT import infrastructure code.

Entities:

- Contain business rules.
- Enforce invariants.
- Validate internal consistency.
- Use factory methods when appropriate.
- Should be persistence-agnostic.

---

## 4. Service Layer Rules (Application Layer)

Services:

- Orchestrate use cases.
- Call repository interfaces (never ORM directly).
- Contain application logic only.
- Must NOT contain raw SQL or ORM queries.
- Must NOT duplicate business rules already defined in entities.
- Should remain cohesive and reasonably small.

Do NOT create one class per use case unless complexity requires it.

---

## 5. Repository Rules

Repositories:

- Implement persistence logic only.
- May use ORM (Prisma, TypeORM, etc.).
- Must implement the repository interface defined in the domain.
- Must map ORM models to domain entities.
- Must NOT contain business rules.

Repositories work with aggregates, not database tables.

---

## 6. Controller Rules

Controllers:

- Are thin.
- Handle HTTP concerns only.
- Perform DTO validation.
- Delegate all logic to services.
- Must NOT contain business rules.
- Must NOT access the database directly.

---

## 7. Code Quality Requirements

- Use clean TypeScript.
- Follow SOLID principles.
- Use dependency injection properly.
- Prefer explicit mapping over leaking ORM models.
- Avoid "God services".
- Avoid mixing layers.
- Avoid over-abstraction.

---

## 8. What to Avoid

❌ Putting business logic in controllers  
❌ Putting business logic in repositories  
❌ Accessing ORM directly inside services  
❌ Leaking ORM models outside infrastructure  
❌ Creating unnecessary layers  
❌ Creating one service per CRUD operation without need

---

## 9. Pragmatic Philosophy

Architecture must match complexity.

- For simple CRUD → keep services grouped.
- For complex business workflows → extract dedicated use-case services.
- Do not introduce CQRS or Clean Architecture unless justified.

Clarity > Purity  
Maintainability > Ceremony  
Separation of concerns > Folder aesthetics

---

AI agents must strictly follow this document when generating or modifying backend code.
