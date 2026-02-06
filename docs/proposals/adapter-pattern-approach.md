# Proposal: Adapter Pattern for Vendor Independence

**Status:** Draft

---

## Context

This project uses the adapter pattern to avoid vendor lock-in. APIs are defined as contracts, and adapters translate between those contracts and vendor-specific systems. This proposal describes how to define contracts for two types of APIs, using examples from this project.

## API Types

### Object APIs

Object APIs are CRUD operations on resources — create, read, update, delete, list, search. Every domain has these. The contract is an OpenAPI spec that defines the resource schemas, endpoints, and query parameters.

**Examples:**
- `GET /persons`, `POST /persons`, `GET /persons/:id`
- `GET /applications`, `POST /applications`
- `GET /workflow/tasks`, `GET /workflow/queues`

Object APIs are straightforward to make portable. A `Person` looks the same regardless of whether it's stored in PostgreSQL, Salesforce, or a legacy system. The adapter maps between the OpenAPI contract and the vendor's data model.

Some domains only need Object APIs — persons, applications, households, income, documents. The data model is the value, and CRUD is the full interface.

### Action APIs

Action APIs are behavioral operations on resources — they trigger state transitions, enforce business rules, and produce side effects. Some domains need these in addition to Object APIs.

**Examples:**
- `POST /workflow/tasks/:id/claim` — transitions a task from `pending` to `in_progress`, enforces assignment rules
- `POST /workflow/tasks/:id/escalate` — transitions to `escalated`, creates audit event, may trigger notifications
- `POST /workflow/tasks/:id/complete` — validates the caller is the assignee, transitions to `completed`

Action APIs are harder to make portable because the value is in orchestration and enforcement, not just data. A workflow engine provides state machine enforcement, task routing, SLA tracking, auto-escalation, audit trails, and event-driven triggers. A rules engine provides evaluation, conflict resolution, and explanation capabilities. A notification system provides multi-channel orchestration, retry logic, and delivery tracking.

A generic CRUD adapter loses most of this value. The adapter pattern still applies, but the contract needs to be richer than just an OpenAPI spec.

### Contracts by API type

**Object APIs** need one contract artifact:
- **OpenAPI spec** — resource schemas, endpoints, query parameters

**Action APIs** need three contract artifacts:
- **OpenAPI spec** — same resource schemas used by the Object APIs
- **Behavioral contract** (state machine YAML) — valid states, transitions, guards, timeouts, SLA behavior
- **Event catalog** (inline in state machine) — domain events the system must emit on specific transitions

```
Object APIs only:              Object + Action APIs:

  OpenAPI Spec                   OpenAPI Spec
  ┌────────────┐                 ┌────────────┐
  │ Schemas    │                 │ Schemas    │
  │ Endpoints  │                 │ Endpoints  │
  │ Parameters │                 │ Parameters │
  └────────────┘                 └────────────┘
                                       +
                                 State Machine YAML
                                 ┌────────────────┐
                                 │ States         │
                                 │ Transitions    │
                                 │ Guards         │
                                 │ Events         │
                                 │ SLA behavior   │
                                 └────────────────┘
```

---

## How the Adapter Works

### For Object APIs

The adapter wraps a vendor's data store with a standard interface defined by the OpenAPI spec. Swap vendors by reimplementing the adapter.

```
[Frontend] → [Adapter] → [Vendor/DB]
                 ↑
           OpenAPI contract
```

A `Person` or `Application` adapter translates between the OpenAPI contract and the vendor's data model. The frontend sees the same API regardless of what's behind the adapter.

### For Action APIs

The adapter wraps a vendor system (workflow engine, rules engine) and exposes both Object APIs and Action APIs. The adapter is validated against the full contract — OpenAPI spec, state machine, and event catalog.

```
[Frontend] → [Adapter] → [Vendor System]
                 ↑              ↑
           Object APIs    Action APIs validated
          (OpenAPI spec)  against behavioral contract
```

The frontend calls Object APIs for data reads (`GET /workflow/tasks`) and Action APIs for behavioral operations (`POST /workflow/tasks/:id/claim`). The adapter translates both to the vendor's system.

When you switch vendors, the behavioral contract tells you exactly what the new adapter must do — including state transitions, guard conditions, SLA behavior, and event triggers that an OpenAPI spec alone can't express.

---

## Mock Server Extensibility

Both API types are designed so that adding a new domain to the mock server is declarative — you define artifacts, not code.

**Object APIs:** Add an OpenAPI spec with schemas and example data. The mock server auto-discovers the spec and generates CRUD endpoints (list, get, create, update, delete) with an in-memory database seeded from examples. No handler code required.

**Action APIs:** Add a state machine YAML, OpenAPI data schemas, and example data. The mock server auto-discovers the state machine and generates:
- Object API endpoints for the data schemas (same as above)
- Action API endpoints derived from named transition triggers (e.g., a `claim` trigger on a `Task` resource in the `workflow` domain becomes `POST /workflow/tasks/:id/claim`)
- State machine enforcement — the engine validates transitions and guards automatically
- Event emission on successful transitions

The state machine engine is domain-agnostic. Adding a second domain with Action APIs (e.g., notification campaigns with states like `draft`, `scheduled`, `sending`, `delivered`) follows the same pattern: define the state machine YAML and data schemas, and the mock server generates the endpoints with enforcement. No new handler code is needed.

## Production Adapter Reusability

The same auto-discovery pattern extends to production. The production adapter splits into a shared framework and per-domain vendor modules:

```
Shared Adapter Framework (reusable across all domains)
  ├── Object API endpoint generation from OpenAPI specs
  ├── Pagination, filtering, error handling
  ├── Data schema validation
  ├── Action API endpoint generation from state machine YAML
  ├── State machine enforcement and guard evaluation
  └── Event emission

Per-domain vendor modules
  ├── persons/        → PostgreSQL queries
  ├── applications/   → Salesforce API calls
  ├── documents/      → S3 translation
  ├── workflow/       → Camunda translation
  └── notifications/  → Twilio translation
```

Adding a new domain means writing a vendor translation module. The framework handles endpoint routing, schema validation, and (for domains with Action APIs) state machine enforcement. If multiple domains use the same vendor, more of the translation layer (auth, API client, error handling) carries over.

---

## Behavioral Contract Details

### State machine format

The behavioral contract is written as custom YAML with a JSON Schema defining the format.

| Format | Strengths | Weaknesses for this use case |
|--------|-----------|------------------------------|
| **XState JSON/YAML** | Large ecosystem, visual editor (Stately.ai), executable for testing | Doesn't natively express SLA clocks, actor-based guards, or event payload schema references. Custom extensions wouldn't benefit from XState tooling. |
| **SCXML** | W3C standard | XML-based, verbose, less accessible to domain experts |
| **OpenAPI extensions** | Same ecosystem as data schemas | Can't express transitions, guards, timeouts, or SLA behavior |
| **Custom YAML** | Expresses domain concerns as first-class fields. JSON Schema provides validation and editor autocompletion. | No existing ecosystem — we build the validator ourselves |

Custom YAML follows statechart semantics (states, transitions, guards, entry/exit actions) and adds domain-specific fields (SLA clock behavior, actor restrictions, event payloads with schema references) as first-class concepts. If visualization becomes valuable, a script can translate the YAML to XState format for Stately.ai's visual editor.

### How the contracts connect

The state machine references OpenAPI data schemas for event payloads and guard context. A validation script ensures consistency: state machine states match the resource's status enum, referenced events have valid payload schemas, and guard conditions reference real schema fields.

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

### Extensibility

Because the contract is declarative (YAML + OpenAPI), all changes are diffable and reviewable in PRs.

**Non-breaking changes:**

| Change | Why it's safe |
|--------|---------------|
| Add a new state | Existing consumers never encounter it until the new state is used |
| Add a new transition between existing states | Enables a new path without affecting existing ones |
| Add a new event | Consumers that don't listen are unaffected |
| Add an optional field to an event payload | Existing listeners ignore it |
| Add a new guard (on a new transition) | New transitions don't affect existing paths |

**Breaking changes:**

| Change | Impact |
|--------|--------|
| Remove a state or transition | Consumers depending on it fail |
| Add a guard to an existing transition | Transitions that previously succeeded might now be rejected |
| Remove an event | Listeners depending on it break |
| Remove or rename a field in an event payload | Listeners expecting the field break |
| Change SLA behavior for a state | Runtime behavior changes; doesn't break structure but affects outcomes |

The state machine YAML includes a `version` field. The validation script can diff two versions and report breaking vs. non-breaking changes.

---

## Vendor Handoff

### What we provide to the vendor

1. **Behavioral contract** — "your system must enforce these states, transitions, and guards"
2. **Data schemas** — "resources look like this"
3. **Event catalog** — "emit these events with these payloads on these transitions"
4. **JSON Schema for the contract format** — so the vendor can validate their configuration
5. **Validation script** — conformance verification
6. **Example data** — for setup and testing

The contract doubles as a **vendor evaluation checklist**: can this system support these transitions? These SLA behaviors? These event triggers? If a vendor can't satisfy the contract, you know before you buy.

### How the transition works

During development, the frontend talks to the mock server. In production, it talks to the production adapter:

```
Development:
  [Frontend] → [Mock Server] → [State Machine Engine + In-memory DB]

Production:
  [Frontend] → [Adapter] → [Vendor System]
                   ↑
           Validated against contract
```

The mock server is the development adapter. It exposes the same API surface the production adapter will — same Object API endpoints, same Action API endpoints, same request/response shapes. Swapping from mock to production changes the adapter internals, not the frontend code.

### Transition steps

1. **Evaluate** vendors against the behavioral contract
2. **Select** vendor and configure their engine to match the contract
3. **Build** a vendor-specific adapter module that exposes the same API surface as the mock server
4. **Validate** — run the validation script against adapter + vendor to verify conformance
5. **Swap** — point frontend to production adapter instead of mock server
6. **Retire** mock server for that domain

**What changes:** adapter internals (vendor-specific translation module).
**What doesn't change:** frontend code (same API surface), event handlers (same event catalog), data types (same schemas).

### What survives vendor selection

| Artifact | Survives | Role after vendor selection |
|----------|----------|----------------------------|
| Behavioral contract (state machine) | Yes | Requirements doc, vendor evaluation, conformance verification |
| JSON Schema for contract format | Yes | Format validation for future changes |
| Data schemas (OpenAPI) | Yes | Data contract — the adapter maps vendor data to these schemas |
| Event catalog | Yes | Integration contract — vendor must emit these events |
| Validation script | Yes | Verifies vendor + adapter conform to the contract |
| Mock server | Retired | Replaced by vendor-specific adapter |
| Example data | Partially | Useful for testing; may need vendor-specific seed format |

---

## Worked Example: Workflow Management

The remainder of this document applies the pattern to the workflow management domain.

### File organization

```
state-machines/
  task-lifecycle.yaml               # Behavioral contract (primary artifact)
  task-lifecycle.schema.json        # JSON Schema for the format
  verification-lifecycle.yaml       # Verification state machine (simpler)

openapi/
  domains/
    workflow/
      components/
        schemas.yaml                # Data contract (Task, Queue, WorkflowRule, etc.)

openapi/examples/
  workflow/
    tasks.json                      # Example data for seeding
    queues.json
    workflow-rules.json
    task-types.json
    sla-types.json

packages/mock-server/src/
  state-machine-engine.js           # Validates transitions against contract
  handlers/
    workflow.js                     # Mock adapter (claim, complete, etc.)

scripts/
  validate-state-machine.js         # Ensures contract <-> schema consistency
```

### Implementation steps

**Step 1: State Machine Format + JSON Schema**

Define the JSON Schema for the state machine YAML format:

- `states` — map of state name to state definition
- `states.*.transitions` — array of transitions with `to`, `trigger`, `guard`, `actors`, `event`
- `states.*.onEnter` / `states.*.onExit` — events emitted on state entry/exit
- `states.*.onTimeout` — deadline-based triggers with `after` and `event`
- `states.*.sla` — SLA clock behavior (`running`, `paused`, `stopped`)
- `events.*.payload` — map of field name to schema reference
- `guards` — named guard definitions with descriptions
- `version` — contract version for change tracking

**Step 2: Task Lifecycle State Machine**

States: `pending`, `in_progress`, `awaiting_client`, `awaiting_verification`, `awaiting_review`, `returned_to_queue`, `completed`, `cancelled`, `escalated`

Each state defines transitions, events, SLA behavior, and timeout triggers. Guards reference actor roles and task field conditions.

Verification lifecycle (simpler): `pending` -> `awaiting_verification` -> `completed` / `not_verified` / `discrepancy_found` / `waived`.

**Step 3: Workflow Data Schemas**

OpenAPI component schemas: Task, Queue, WorkflowRule, TaskSLAInfo, TaskAuditEvent, VerificationTask, VerificationSource, TaskType, SLAType, TaskSourceInfo, TaskOutcomeInfo.

Follow existing patterns: `id`, `createdAt`, `updatedAt` on all resources. Use `$ref` to shared components.

**Step 4: Validation Script**

- Validates state machine YAML against JSON Schema
- Validates states match Task status enum
- Validates event payload schema references resolve
- Validates guard conditions reference real schema fields
- Can diff two versions and report breaking vs. non-breaking changes
- Add to `npm run validate` pipeline

**Step 5: Example Data**

Seed data: tasks in various states, queues (by program, office, skill), workflow rules (JSON Logic conditions), TaskType and SLAType configuration records.

**Step 6: State Machine Engine (mock)**

Lightweight engine for the mock server:

- Loads state machine YAML at startup
- Exposes `canTransition(currentState, targetState, context)` and `getValidTransitions(currentState)`
- Validates transition guards against request context
- Returns events to emit on successful transition
- Tracks SLA clock state

This is the mock's enforcement layer. A real vendor's engine replaces it entirely.

**Step 7: Mock Adapter Handlers**

Express route handlers that serve as the development adapter:

**Object APIs:**
- **`GET /workflow/tasks`**, **`GET /workflow/queues`**, etc. — CRUD reads
- **`POST /workflow/tasks`** — create task, calculate SLA, apply routing rules

**Action APIs:**
- **`POST /workflow/tasks/:id/claim`** — validate unassigned, transition pending -> in_progress
- **`POST /workflow/tasks/:id/complete`** — validate assigned to caller, transition to completed
- **`POST /workflow/tasks/:id/release`** — transition to returned_to_queue, clear assignment
- **`POST /workflow/tasks/:id/reassign`** — update assignment
- **`POST /workflow/tasks/:id/escalate`** — transition to escalated
- **`POST /workflow/tasks/:id/route`** — evaluate WorkflowRules (JSON Logic), assign queue/worker

Each Action API handler calls the state machine engine for transition validation. Invalid transitions return 409 Conflict with valid transitions listed.

**Step 8: Testing**

- Unit tests for state machine engine (valid transitions, rejected transitions, guard evaluation, SLA clock behavior)
- Integration tests for mock adapter (claim flow, complete flow, escalation flow, full task lifecycle)
- Validation script runs as part of `npm run validate`

---

## Verification

After implementation:

1. `npm run validate` passes — state machine validates against JSON Schema, states match Task status enum, event references resolve
2. `npm run mock:start` starts with workflow routes available
3. Can create a task via `POST /workflow/tasks`
4. Can claim -> complete a task via mock adapter
5. Invalid transitions return 409 Conflict with explanation of valid transitions
6. Audit events are created automatically on state transitions
7. SLA tracking updates on state transitions
8. Validation script catches mismatches (e.g., adding a state to the YAML without updating the OpenAPI enum)
