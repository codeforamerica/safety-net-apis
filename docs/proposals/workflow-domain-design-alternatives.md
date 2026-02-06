# Proposal: Workflow Domain — Semantic Contract + Mock Implementation

**Status:** Draft

---

## Context

### Why not the adapter pattern?

The adapter pattern works well for **data-shaped** APIs (CRUD operations on resources like persons, applications, households) but poorly for **behavior-shaped** systems like workflow management.

A workflow management system provides far more than state storage: state machine enforcement, task routing and assignment via rules engines, SLA tracking with timers and auto-escalation, audit trails with causal context, event-driven triggers, and integration hooks. Abstracting this behind a generic adapter leads to one of two outcomes:

1. **Thin adapter** (`createTask()`, `updateStatus()`, `assignUser()`) — loses 80% of the system's value. The application layer must reimplement workflow orchestration without the primitives the engine provides.
2. **Thick adapter** that exposes all vendor capabilities — but the interface becomes so vendor-shaped that swapping vendors requires rewriting all calling code anyway. The abstraction provides no real portability.

This is the **least common denominator problem**: the generic interface can only expose what every vendor supports, which for workflow systems is basically CRUD. Everything that makes a workflow engine valuable is vendor-specific.

When you abstract away a system-level API, you don't eliminate the complexity — you move it into your own process layer. You end up building a workflow engine on top of a workflow engine, maintaining custom orchestration code that duplicates what the vendor already provides, and losing vendor-specific optimizations, monitoring, and tooling. The total cost of ownership often exceeds the cost of a future vendor migration, which may never happen.

### When the adapter pattern works

These are genuinely portable because the interface is data-centric:

- **Data access APIs** (persons, applications, households, incomes) — CRUD-shaped, the data model is ours
- **Identity/auth** — standard protocols (OAuth2, SAML) already provide the abstraction
- **Document storage** — simple put/get/list semantics transfer across vendors

| Question | If Yes | If No |
|----------|--------|-------|
| Is the value primarily in the data model? | Adapter works | Don't abstract |
| Are the operations simple CRUD? | Adapter works | Don't abstract |
| Do standard protocols exist (OAuth2, S3, SMTP)? | Adapter works | Don't abstract |
| Does the system's value come from orchestration/behavior? | Don't abstract | Adapter works |
| Would the generic interface lose >50% of capabilities? | Don't abstract | Adapter works |

### Contract at the semantic level instead

Rather than abstracting the workflow engine behind a generic API, this proposal defines **domain events and state transitions** as the contract:

- The specs describe the **what** — a task moves from `pending` to `in_progress`, a task is assigned, an SLA warning fires
- The workflow engine is the **how** — it enforces transitions, routes tasks, manages SLAs
- States choose their workflow system and configure it to emit the agreed-upon events and enforce the defined transitions

This gives portability at the **semantic level** (states agree on what the workflow steps and outcomes are) without pretending you can swap workflow engines through a code adapter.

---

## Goal

Create a semantic-level contract for the workflow management domain that:

1. Defines the task lifecycle as a state machine (transitions, guards, events, timeouts)
2. Provides a data model for workflow resources (Task, Queue, WorkflowRule, etc.) as OpenAPI schemas
3. Provides a mock server reference implementation for frontend development and integration testing
4. Serves as a vendor evaluation checklist and conformance verification tool

---

## Contract Layers

The contract is three artifacts. Together they define what any workflow implementation must satisfy — without prescribing how.

### 1. State Machine (behavioral contract)

The primary artifact. Defines valid states, transitions, guards, domain events, SLA behavior, and timeout triggers. Written as YAML with a JSON Schema defining the format.

A vendor translates this to their engine's native configuration (BPMN for Camunda, workflow definitions for Temporal, state config for ServiceNow, etc.). The state machine is the requirements document — it says "your system must support these transitions with these guards and emit these events."

### 2. Data Schemas (data contract)

OpenAPI schemas for workflow resources: Task, Queue, WorkflowRule, TaskAuditEvent, VerificationTask, VerificationSource, and configuration schemas (TaskType, SLAType). These define what the data looks like regardless of vendor.

Data schemas are CRUD-shaped, so the adapter pattern works here. A vendor maps their internal data model to these schemas. The CRUD API surface (read/write tasks, list queues) is straightforwardly portable.

### 3. Event Catalog (integration contract)

Domain events with payload schemas, defined inline with the state machine transitions that emit them. Event payloads reference the OpenAPI data schemas by name.

Any workflow implementation must emit these events on the defined transitions. The mechanism (webhooks, event bus, polling) is vendor-specific; the event names and payload shapes are the contract.

### How the layers connect

The state machine references data schemas for event payloads and guard context. The validation script ensures consistency: state machine states match the Task status enum, referenced events have valid payload schemas, and guard conditions reference real schema fields.

```
State Machine YAML                    OpenAPI Schemas
┌──────────────────────┐             ┌──────────────────────┐
│ states:              │             │ Task:                │
│   pending:           │  references │   status: enum       │◄── states must match
│     transitions:     │────────────►│   assignedToId: uuid │
│       - to: in_progress           │   ...                │
│         event:       │             │                      │
│           name: task.claimed       │ TaskAuditEvent:      │
│           payload:   │────────────►│   eventType: enum    │◄── events must match
│             task: Task│            │   ...                │
│             assignment: ...        └──────────────────────┘
│         guard:       │
│           taskIsUnassigned: true
│         actors: [caseworker]
│     sla: running     │
│     onTimeout:       │
│       - after: warningThresholdDays
│         event: task.sla_warning
└──────────────────────┘
```

---

## Format Decisions

### State machine: Custom YAML with JSON Schema

**Why not XState, SCXML, or OpenAPI extensions?**

| Format | Strengths | Weaknesses for this use case |
|--------|-----------|------------------------------|
| **XState JSON/YAML** | Large ecosystem, visual editor (Stately.ai), executable for testing, well-documented statechart semantics. Format is separate from runtime — you don't need the XState library to use it. | Doesn't natively express SLA clock behavior (running/paused/stopped), actor-based guards (caseworker vs. supervisor vs. system), or domain events with payload schema references. We'd need custom extensions, and those extensions wouldn't benefit from the XState tooling. |
| **SCXML** | W3C standard, many implementations | XML-based, verbose, less accessible to domain experts |
| **OpenAPI extensions** | Same ecosystem as data schemas | Can't express transitions, guards, timeouts, or SLA behavior. Extensions would be so extensive that the OpenAPI wrapper adds no value. |
| **Custom YAML** | Can express SLA/actor/event concerns exactly as needed. Matches project's YAML-centric tooling. JSON Schema provides validation, editor autocompletion, and format documentation. | No existing ecosystem — no visualization tools, no execution engine. We build the validator ourselves. |

The tradeoff is ecosystem vs. expressiveness. XState has the best tooling but can't natively express the domain-specific concerns (SLA clocks, actor guards, event payloads with schema references) that are central to the contract. We'd end up with XState plus custom extensions that the tooling ignores.

Custom YAML with a JSON Schema strikes the right balance:

- **Follows statechart semantics** — states, transitions, guards, entry/exit actions are well-understood concepts from Harel statecharts. Anyone familiar with state machines can read the format.
- **Adds domain-specific fields** — SLA clock behavior, actor restrictions, event payloads with schema references, timeout triggers. These are first-class, not extensions.
- **JSON Schema provides tooling** — validation, editor autocompletion (VS Code YAML extension), and format documentation in a single artifact. Adding a new field to the format is a reviewable change to the JSON Schema.
- **Readable by domain experts** — program managers and policy staff can review the state machine without learning a runtime-specific format.

If visualization becomes valuable, a script can translate the YAML to XState format for use with Stately.ai's visual editor. The custom format doesn't preclude this — it just doesn't depend on it.

### Data schemas: OpenAPI

The project's existing tooling chain (validation, mock server, client generation, Postman) consumes OpenAPI. Data schemas are CRUD-shaped, which is exactly what OpenAPI handles well. No reason to introduce a different format for the data layer.

### Events: Inline in state machine YAML, payloads reference OpenAPI schemas

Events are defined where they're triggered — in the state machine transitions. This keeps cause and effect together. Event payload schemas reference the OpenAPI data schemas by name (e.g., `payload.task: Task`), and the validation script verifies those references resolve.

---

## Extensibility

Because the contract is declarative (YAML + OpenAPI), all changes are diffable and reviewable in PRs. The extensibility model mirrors API versioning:

### Non-breaking changes

| Change | Why it's safe |
|--------|---------------|
| Add a new state | Existing consumers never encounter it until the new state is used |
| Add a new transition between existing states | Enables a new path without affecting existing ones |
| Add a new event | Consumers that don't listen are unaffected |
| Add an optional field to an event payload | Existing listeners ignore it |
| Add a new guard (on a new transition) | New transitions don't affect existing paths |

### Breaking changes

| Change | Impact |
|--------|--------|
| Remove a state or transition | Consumers depending on it fail |
| Add a guard to an existing transition | Transitions that previously succeeded might now be rejected |
| Remove an event | Listeners depending on it break |
| Remove or rename a field in an event payload | Listeners expecting the field break |
| Change SLA behavior for a state | Runtime behavior changes; doesn't break structure but affects outcomes |

### Versioning

The state machine YAML includes a `version` field. The validation script can diff two versions and report breaking vs. non-breaking changes. The JSON Schema for the YAML format is also versioned — when a new concept is needed (e.g., parallel states, compensation logic), it's added to the schema as a reviewable change. Existing state machine files that don't use the new concept remain valid.

---

## Vendor Handoff and Transition

### What we provide to the vendor

1. **State machine YAML** — behavioral requirements. "Your system must enforce these states, transitions, and guards."
2. **Data schemas (OpenAPI)** — data model requirements. "A Task looks like this. A Queue looks like this."
3. **Event catalog (in state machine YAML)** — integration requirements. "Emit these events with these payloads on these transitions."
4. **JSON Schema for state machine format** — so the vendor can validate their configuration against the format.
5. **Validation script** — conformance verification. The vendor runs this against their implementation.
6. **Example data** — for setup and testing.

The contract doubles as a **vendor evaluation checklist**: can this system support these transitions? These SLA behaviors? These event triggers? If a vendor can't satisfy the contract, you know before you buy.

### How the transition works

During development, the frontend talks to the mock server. In production, it talks to a **BFF (backend for frontend)** that translates between the contract's API surface and the vendor's system:

```
Development:
  [Frontend] → [Mock Server] → [State Machine Engine + In-memory DB]

Production:
  [Frontend] → [BFF] → [Vendor Workflow System]
                 ↑
         Validated against contract
```

The mock server IS the development BFF. It exposes convenient REST endpoints (claim a task, complete a task, list queues) that the frontend codes against. The mock server enforces the state machine contract internally.

The production BFF:
- Exposes the **same API surface** the mock server did (same endpoints, same request/response shapes)
- Translates internally to the **vendor's API calls**
- Translates **vendor events** into the event catalog format
- Is **explicitly vendor-specific** — no pretense of being a generic adapter

### Transition steps

1. **Evaluate** vendors against the state machine contract
2. **Select** vendor and configure their engine to match the state machine
3. **Build** a vendor-specific BFF that exposes the same API surface as the mock server
4. **Validate** — run the validation script against BFF + vendor to verify conformance
5. **Swap** — point frontend to BFF instead of mock server
6. **Retire** mock server for workflow domain

**What changes:** BFF internals (vendor-specific translation layer).
**What doesn't change:** Frontend code (same API surface), event handlers (same event catalog), data types (same schemas).

### How this differs from the adapter pattern

The adapter pattern says "write one generic interface, implement it per vendor." The interface is an API contract — swap the implementation, calling code doesn't change.

This approach says "here's a behavioral contract (state machine + events + schemas) that your BFF must satisfy." The contract is richer — it includes transition rules, guards, SLA behavior, and event triggers that an API interface alone can't express.

If you switch vendors, you rewrite the BFF. But the contract tells you exactly what the new BFF must do, including behavioral requirements. The CRUD parts (task read/write, queue listing) are straightforward adapter-shaped translations. The behavioral parts (claim, complete, escalate, route) are where the BFF calls the vendor's workflow engine — which handles the actual behavior — and translates the request/response.

---

## What Survives Vendor Selection

| Artifact | Survives | Role after vendor selection |
|----------|----------|----------------------------|
| State machine YAML | Yes | Requirements doc, vendor evaluation checklist, conformance verification |
| JSON Schema for state machine format | Yes | Format validation for any future state machine changes |
| Data schemas (OpenAPI) | Yes | Data contract — the BFF maps vendor data to these schemas |
| Event catalog | Yes | Integration contract — vendor must emit these events |
| Validation script | Yes | Verifies vendor + BFF conform to the contract |
| Mock server | Retired | Replaced by vendor-specific BFF |
| State machine engine (mock) | Retired | Replaced by vendor's workflow engine |
| Example data | Partially | Useful for testing; may need vendor-specific seed format |

---

## File Organization

```
state-machines/
  task-lifecycle.yaml               # State machine contract (primary artifact)
  task-lifecycle.schema.json        # JSON Schema for the state machine format
  verification-lifecycle.yaml       # Verification state machine (simpler)

openapi/
  domains/
    workflow/
      components/
        schemas.yaml                # Canonical schemas (Task, Queue, WorkflowRule, etc.)

openapi/examples/
  workflow/
    tasks.json                      # Example task data for seeding
    queues.json
    workflow-rules.json
    task-types.json                  # TaskType config data
    sla-types.json                   # SLAType config data

packages/mock-server/src/
  state-machine-engine.js           # Validates transitions against YAML contract
  handlers/
    workflow.js                     # Mock API handlers (claim, complete, etc.)

scripts/
  validate-state-machine.js         # Ensures YAML <-> OpenAPI consistency
```

Note: No separate System API or Process API OpenAPI specs for workflow behavior. The state machine YAML is the behavioral contract. The mock server exposes convenient REST endpoints for development, but those endpoints are the mock's API surface — not a vendor contract. The data schemas in OpenAPI define the portable data model.

---

## Implementation Steps

### Step 1: State Machine Format + JSON Schema

Define the JSON Schema for the state machine YAML format. This establishes the vocabulary:

- `states` — map of state name to state definition
- `states.*.transitions` — array of transitions with `to`, `trigger`, `guard`, `actors`, `event`
- `states.*.onEnter` / `states.*.onExit` — events emitted on state entry/exit
- `states.*.onTimeout` — deadline-based triggers with `after` and `event`
- `states.*.sla` — SLA clock behavior (`running`, `paused`, `stopped`)
- `events.*.payload` — map of field name to schema reference
- `guards` — named guard definitions with descriptions
- `version` — contract version for change tracking

### Step 2: Task Lifecycle State Machine (state-machines/task-lifecycle.yaml)

Create the task lifecycle based on the Task status enum and capabilities from `docs/architecture/domains/workflow.md`.

States: `pending`, `in_progress`, `awaiting_client`, `awaiting_verification`, `awaiting_review`, `returned_to_queue`, `completed`, `cancelled`, `escalated`

Each state defines transitions, events, SLA behavior, and timeout triggers. Guards reference actor roles and task field conditions. Events include payload definitions referencing the OpenAPI schemas.

Create `state-machines/verification-lifecycle.yaml` for the simpler verification flow: `pending` -> `awaiting_verification` -> `completed` / `not_verified` / `discrepancy_found` / `waived`.

### Step 3: Workflow Data Schemas (openapi/domains/workflow/components/schemas.yaml)

Formalize the pseudo-YAML schemas from `docs/architecture/domains/workflow.md` into proper OpenAPI component schemas:

- Task, Queue, WorkflowRule, TaskSLAInfo, TaskAuditEvent, VerificationTask, VerificationSource
- TaskType, SLAType (configuration schemas)
- Supporting schemas: TaskSourceInfo, TaskOutcomeInfo

Follow existing patterns: `id`, `createdAt`, `updatedAt` on all resources. Use `$ref` to shared components.

### Step 4: Validation Script (scripts/validate-state-machine.js)

Node script that:

- Reads state machine YAML files and validates against the JSON Schema
- Reads OpenAPI schemas
- Validates that state machine states match the Task status enum
- Validates that event payload schema references resolve to real OpenAPI schemas
- Validates that guard conditions reference real schema fields
- Can diff two state machine versions and report breaking vs. non-breaking changes
- Reports mismatches with clear error messages

Add to `npm run validate` pipeline.

### Step 5: Example Data (openapi/examples/workflow/)

Seed data for mock server:

- Tasks in various states (pending, in_progress, completed, escalated)
- Queues (by program, office, skill)
- WorkflowRules (assignment and priority rules with JSON Logic conditions)
- TaskType and SLAType configuration records

### Step 6: State Machine Engine (packages/mock-server/src/state-machine-engine.js)

Lightweight engine that:

- Loads state machine YAML at startup
- Exposes `canTransition(currentState, targetState, context)` and `getValidTransitions(currentState)`
- Validates transition guards against request context (actor role, task fields)
- Returns events to emit on successful transition
- Tracks SLA clock state (running, paused, stopped)

This is the mock's enforcement layer. A real vendor's engine replaces it entirely.

### Step 7: Mock API Handlers (packages/mock-server/src/handlers/workflow.js)

Express route handlers that serve as the development BFF:

- **`POST /workflow/tasks`** — Create task, calculate SLA, apply routing rules
- **`POST /workflow/tasks/:id/claim`** — Validate unassigned, transition pending -> in_progress, create audit event
- **`POST /workflow/tasks/:id/complete`** — Validate assigned to caller, transition to completed, create audit event
- **`POST /workflow/tasks/:id/release`** — Transition to returned_to_queue, clear assignment, create audit event
- **`POST /workflow/tasks/:id/reassign`** — Update assignment, create audit event
- **`POST /workflow/tasks/:id/escalate`** — Transition to escalated, create audit event
- **`POST /workflow/tasks/:id/route`** — Evaluate WorkflowRules (JSON Logic), assign queue/worker
- **`GET /workflow/tasks`**, **`GET /workflow/queues`**, etc. — CRUD reads from mock DB

Each handler calls the state machine engine for transition validation. Invalid transitions return 409 Conflict with an explanation of what transitions are valid from the current state. CRUD operations use the existing `database-manager.js`.

These endpoints are the mock's API surface — the same surface a production BFF would expose. They are not formal OpenAPI specs because the behavioral contract lives in the state machine, not in endpoint definitions.

### Step 8: Mock Server Integration

Wire up handlers in mock server setup:

- Register workflow routes alongside auto-discovered routes
- State machine engine initializes from YAML files at startup
- Handlers use existing `database-manager.js` for persistence

### Step 9: Testing

- Unit tests for state machine engine (valid transitions, rejected transitions, guard evaluation, SLA clock behavior)
- Integration tests for mock API handlers (claim flow, complete flow, escalation flow, full task lifecycle)
- Validation script runs as part of `npm run validate`

---

## Verification

After implementation:

1. `npm run validate` passes — state machine YAML validates against JSON Schema, states match Task status enum, event references resolve
2. `npm run mock:start` starts with workflow routes available
3. Can create a task via `POST /workflow/tasks`
4. Can claim -> complete a task via mock API handlers
5. Invalid transitions return 409 Conflict with explanation of valid transitions
6. Audit events are created automatically on state transitions
7. SLA tracking updates on state transitions (clock runs, pauses, stops per state definition)
8. Validation script catches intentional mismatches (e.g., adding a state to the YAML without updating the OpenAPI enum)
