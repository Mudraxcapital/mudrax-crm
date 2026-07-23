# 0001 — Modular Monolith with Clean Architecture

| | |
| --- | --- |
| **Status** | Accepted |
| **Date** | 2026-07-23 |

## Context

Mudrax CRM is a production system for a Loan DSA business, expected to grow from a handful of modules (leads, customers, loan applications) to a much larger set (loan products, banks, disbursements, loan accounts, documents, telephony, notifications, AI, and more), and to remain maintainable for roughly a decade across multiple engineers.

Two broad options were considered for the system's shape:

1. A microservices architecture, with each business capability as an independently deployed service.
2. A single deployable application, internally organized so that business capabilities remain independent of each other.

## Decision

Build Mudrax CRM as a **modular monolith**: one deployable Next.js application, internally partitioned into independent business modules under `src/modules/*`, each following **Clean Architecture** layering (`domain -> application -> infrastructure -> presentation`), with dependencies pointing inward only.

Modules communicate with each other exclusively through a public `index.ts` barrel — never by importing another module's internal folders. This boundary is intended to be enforced with lint rules (`eslint-plugin-boundaries` or equivalent) once a second module exists.

## Consequences

- Single deployment, single database connection pool, simpler operations on the company's own Linux server — appropriate for the team size and infrastructure available today.
- Module boundaries are a discipline enforced by convention and tooling, not by network/process isolation — this requires ongoing vigilance (lint rules, code review) to avoid becoming a "big ball of mud."
- If a specific module (e.g. `telephony` or `ai`) ever needs independent scaling or a different deployment cadence, the module boundary already in place makes extraction into its own service a bounded, well-defined change rather than a full rewrite.

## Alternatives Considered

- **Microservices from day one**: rejected as premature for the current team size and operational maturity; the operational overhead (service discovery, distributed transactions, multiple deployments) was judged not worth it before the product and team have grown.
- **Unstructured monolith (no module boundaries)**: rejected — this is the default failure mode for large Next.js applications and was the primary "beginner mistake" this architecture is designed to avoid.
