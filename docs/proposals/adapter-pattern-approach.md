# Proposal: Adapter Pattern for Vendor Independence

**Status:** Draft

---

## Context

Safety net program implementations depend on a range of backend systems. Some are **data-shaped** — databases, document stores, identity providers — where the value is in the data model and operations are primarily CRUD. Others are **behavior-shaped** — workflow engines, rules engines, notification platforms — where the value is in orchestration, enforcement, and side effects.

This project uses the adapter pattern to avoid vendor lock-in across both types. APIs are defined as contracts, and adapters translate between those contracts and vendor-specific systems. The contract approach differs by system type: data-shaped systems need only an API interface (OpenAPI spec), while behavior-shaped systems need a richer contract that captures behavioral requirements.

This proposal describes how to define contracts for both, organized around two API types: **Object APIs** and **Action APIs**.

A **domain** in this context refers to a functional area of the system — workflow management, eligibility, persons, documents, etc. Each domain may have one or both API types.

## API Types

### Object APIs

Object APIs are CRUD operations on objects — create, read, update, delete, list, search. Every domain has these. The contract is an OpenAPI spec that defines the object schemas, endpoints, and query parameters.

**Examples:**
- `GET /persons`, `POST /persons`, `GET /persons/:id`
- `GET /applications`, `POST /applications`
- `GET /workflow/tasks`, `GET /workflow/queues`

Object APIs are straightforward to make portable. A `Person` looks the same regardless of whether it's stored in PostgreSQL, Salesforce, or a legacy system. The adapter maps between the OpenAPI contract and the vendor's data model.

Some domains only need Object APIs — persons, applications, households, income, documents. The data model is the value, and CRUD is the full interface.

### Action APIs

Action APIs are behavioral operations on objects — they trigger state transitions, enforce business rules, and produce side effects. Some domains need these in addition to Object APIs.

**Examples:**
- `POST /workflow/tasks/:id/claim` — transitions a task from `pending` to `in_progress`, enforces assignment rules
- `POST /workflow/tasks/:id/escalate` — transitions to `escalated`, creates audit event, may trigger notifications
- `POST /workflow/tasks/:id/complete` — validates the caller is the assignee, transitions to `completed`

Action APIs are harder to make portable because the value is in orchestration and enforcement, not just data. A workflow engine provides state machine enforcement, task routing, SLA tracking, auto-escalation, audit trails, and event-driven triggers. A rules engine provides evaluation, conflict resolution, and explanation capabilities. A notification system provides multi-channel orchestration, retry logic, and delivery tracking.

A generic CRUD adapter loses most of this value. The adapter pattern still applies, but the contract needs to be richer than just an OpenAPI spec.

### Contracts by API type

**Object APIs** need one contract artifact:
- **OpenAPI spec** — object schemas, endpoints, query parameters

**Action APIs** need three contract artifacts:
- **OpenAPI spec** — same object schemas used by the Object APIs
- **Behavioral contract** (state machine YAML) — valid states, transitions, guards, timeouts, SLA behavior
- **Event catalog** (inline in state machine) — domain events the system must emit on specific transitions

**State machine terminology:**
- **State** — a status an object can be in (e.g., `pending`, `in_progress`, `completed`)
- **Transition** — a valid move from one state to another (e.g., `pending` → `in_progress`)
- **Guard** — a condition that must be true for a transition to be allowed (e.g., "task must be unassigned" or "caller must be a supervisor")
- **Event** — a notification emitted when a transition occurs (e.g., `task.claimed`), with a defined payload shape
- **Timeout** — a deadline-based trigger that fires if an object stays in a state too long (e.g., auto-escalate after 3 days)
- **SLA behavior** — whether a service-level clock is running, paused, or stopped in a given state

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

The adapter wraps a vendor's data store with a standard interface defined by the OpenAPI spec. Swap vendors by reimplementing the adapter. The frontend sees the same API regardless of what's behind the adapter.

```
[Frontend] → [Adapter] → [Vendor/DB]
                 ↑
              Object APIs (GET /tasks, POST /tasks)

```

The adapter must satisfy one contract:
- **OpenAPI spec** — defines the Object API surface (schemas, endpoints, parameters)


### For Action APIs

The adapter wraps a vendor system (workflow engine, rules engine) and exposes both Object APIs and Action APIs. The frontend calls Object APIs for data reads (`GET /workflow/tasks`) and Action APIs for behavioral operations (`POST /workflow/tasks/:id/claim`). The adapter translates both to the vendor's system.

```
[Frontend] ──────► [Adapter] ──────► [Vendor System]
                      ↑
                    Object APIs (GET /tasks, POST /tasks)
                    Action APIs (POST /tasks/:id/claim)
```

The adapter must satisfy two contracts:
- **OpenAPI spec** — defines the Object API surface (schemas, endpoints, parameters)
- **Behavioral contract** (state machine + event catalog) — defines valid state transitions, guards, and events for Action APIs

A validation script verifies that the contract artifacts are internally consistent (state machine states match OpenAPI enums, event references resolve, etc.). Conformance testing (verifying the production backend actually satisfies the contracts) is done via integration test suites. When you switch vendors, the behavioral contract tells you exactly what the new backend must do, including state transitions, guard conditions, SLA behavior, and event triggers that an OpenAPI spec alone can't express.

---

## Mock Server Extensibility

Both API types are designed so that adding a new domain to the mock server is declarative — you define artifacts, not code.

**Object APIs:** Add an OpenAPI spec with schemas and example data. The mock server auto-discovers the spec and generates CRUD endpoints (list, get, create, update, delete) with an in-memory database seeded from examples. No handler code required.

**Action APIs:** Add a state machine YAML, OpenAPI data schemas, and example data. The mock server auto-discovers the state machine and generates:
- Object API endpoints for the data schemas (same as above)
- Action API endpoints derived from named transition triggers (e.g., a `claim` trigger on a `Task` object in the `workflow` domain becomes `POST /workflow/tasks/:id/claim`)
- State machine enforcement — the engine validates transitions and guards automatically
- Event emission on successful transitions

The state machine engine is domain-agnostic. Adding a second domain with Action APIs (e.g., notification campaigns with states like `draft`, `scheduled`, `sending`, `delivered`) follows the same pattern: define the state machine YAML and data schemas, and the mock server generates the endpoints with enforcement. No new handler code is needed.

## What States Get From This Project

This project provides contracts and development tooling. States build their own production backends — in whatever language or framework they use — that satisfy those contracts.

**What this project provides:**

| Artifact | Purpose | Used in production? |
|----------|---------|---------------------|
| OpenAPI specs | Define the Object API surface (schemas, endpoints, parameters) | Yes — as the contract the backend must satisfy |
| State machine YAML | Define the Action API surface (states, transitions, guards, events) | Yes — as behavioral requirements |
| Mock server | Frontend development and integration testing before a real backend exists | No — replaced by the state's production backend |
| Validation script | Verify that the contract artifacts are internally consistent (state machine ↔ OpenAPI schemas) | Yes — run in CI to catch contract mismatches |
| Example data | Seed the mock server; useful for testing production backends | Partially |

**How a state uses this:**

1. Install the contracts as a dependency (npm package, git submodule, or downloaded release)
2. Develop frontends against the mock server
3. Build a production backend (the adapter) that exposes the same Object and Action API surface, translating to their vendor systems
4. Write conformance tests (e.g., Postman/Newman suites) to verify the backend satisfies the contracts
5. Swap the frontend from mock server to production backend

The state's production backend is the adapter (sometimes called a backend-for-frontend or BFF) — it sits between the frontend and the vendor system(s). A Node.js team might use Express; a Python team might use FastAPI; a Java team might use Spring. The contracts tell them what to build, the mock server serves as a working reference implementation, and conformance tests verify the backend got it right.

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

The state machine references OpenAPI data schemas for event payloads and guard context. A validation script ensures consistency: state machine states match the enum on the object's `stateField`, referenced events have valid payload schemas, and guard conditions reference real schema fields.

```
State Machine YAML                    OpenAPI Schemas
┌──────────────────────┐             ┌──────────────────────┐
│ object: Task         │             │ Task:                │
│ stateField: status   │  references │   status: enum       │◄── states must match
│                      │────────────►│   assignedToId: uuid │
│ states:              │             │   ...                │
│   pending:           │             │                      │
│     sla: running     │             │ TaskClaimedEvent:    │
│     transitions:     │  references │   taskId: uuid       │
│       - to: in_progress────────────►│   claimedById: uuid │◄── payload schema
│         trigger: claim│            │   claimedAt: datetime│
│         event:       │             │                      │
│           name: task.claimed       │ TaskSLAWarningEvent: │
│           payload: TaskClaimedEvent│   taskId: uuid       │
│         guard: ...   │             │   elapsedMs: integer │
│     onTimeout:       │             └──────────────────────┘
│       - after: warningThresholdDays
│         event:
│           name: task.sla_warning
│           payload: TaskSLAWarningEvent
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
2. **Data schemas** — "objects look like this"
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

## Adding a Behavior-Shaped Domain

This section walks through adding Action APIs for any domain. The example uses a simplified 3-state approval process, but the same steps apply to workflow management, notification campaigns, eligibility evaluations, or any domain with state transitions.

### Step 1: Define the objects (OpenAPI schemas)

Create the data contract — the objects that both Object APIs and Action APIs will operate on. This follows the same pattern as any data-shaped domain.

```yaml
# openapi/domains/approvals/components/schemas.yaml
ApprovalRequest:
  type: object
  required: [id, status, submittedById, createdAt, updatedAt]
  properties:
    id:
      type: string
      format: uuid
    status:
      type: string
      enum: [pending, approved, rejected]    # ← must match state machine states (linked via stateField)
    submittedById:
      type: string
      format: uuid
    reviewedById:
      type: string
      format: uuid
    reviewNote:
      type: string
    createdAt:
      type: string
      format: date-time
    updatedAt:
      type: string
      format: date-time

# Event payload schemas — separate from the object schema
ApprovalDecisionEvent:
  type: object
  required: [requestId, decision, decidedById, decidedAt]
  properties:
    requestId:
      type: string
      format: uuid
    decision:
      type: string
      enum: [approved, rejected]
    decidedById:
      type: string
      format: uuid
    reviewNote:
      type: string
    decidedAt:
      type: string
      format: date-time

ApprovalResubmittedEvent:
  type: object
  required: [requestId, resubmittedById, resubmittedAt]
  properties:
    requestId:
      type: string
      format: uuid
    resubmittedById:
      type: string
      format: uuid
    resubmittedAt:
      type: string
      format: date-time

ApprovalOverdueEvent:
  type: object
  required: [requestId, submittedById, pendingSince]
  properties:
    requestId:
      type: string
      format: uuid
    submittedById:
      type: string
      format: uuid
    pendingSince:
      type: string
      format: date-time
```

Event payload schemas are defined alongside the object schema but are independent — they carry the information relevant to the event, which may differ from the object's shape.

The mock server auto-discovers this spec and generates Object APIs: `GET /approvals/approval-requests`, `POST /approvals/approval-requests`, etc.

### Step 2: Define the state machine (behavioral contract)

Create the state machine YAML. This declares the domain and object it governs, the valid states, and the transitions between them.

```yaml
# state-machines/approval-lifecycle.yaml
domain: approvals
object: ApprovalRequest
stateField: status              # which field on the object holds the current state
version: "1.0.0"

# Actors are identified by role from the auth context (JWT claims, API key, etc.).
# The mock server reads the X-User-Id and X-User-Role headers to simulate this.
actors:
  reviewer:
    description: Can approve or reject requests they didn't submit
  submitter:
    description: Can create and resubmit requests

states:
  pending:
    sla: running                   # SLA clock runs while pending
    transitions:
      - to: approved
        trigger: approve
        actors: [reviewer]
        guard: callerIsNotSubmitter
        event:
          name: approval.approved
          payload: ApprovalDecisionEvent

      - to: rejected
        trigger: reject
        actors: [reviewer]
        guard: callerIsNotSubmitter
        event:
          name: approval.rejected
          payload: ApprovalDecisionEvent

    onTimeout:
      - after: reviewDeadlineDays
        event:
          name: approval.overdue
          payload: ApprovalOverdueEvent

  approved:
    sla: stopped                   # SLA clock stops
    transitions: []                # terminal state — no transitions out

  rejected:
    sla: stopped
    transitions:
      - to: pending
        trigger: resubmit
        actors: [submitter]
        event:
          name: approval.resubmitted
          payload: ApprovalResubmittedEvent

guards:
  callerIsNotSubmitter:
    description: The reviewer cannot be the same person who submitted the request
    condition:
      field: submittedById        # field on the ApprovalRequest object
      operator: notEquals
      value: $caller.id           # $caller is resolved from auth context
```

**How this translates to APIs:**

Each `trigger` becomes an Action API endpoint. The trigger name is appended to the Object API path:

| Trigger | Generated endpoint |
|---------|-------------------|
| `approve` | `POST /approvals/approval-requests/:id/approve` |
| `reject` | `POST /approvals/approval-requests/:id/reject` |
| `resubmit` | `POST /approvals/approval-requests/:id/resubmit` |

**How guards are enforced:**

When `POST /approvals/approval-requests/:id/approve` is called, the engine:
1. Looks up the `ApprovalRequest` by `:id`
2. Checks the current state is `pending` (the state this transition is defined on)
3. Checks the caller's role matches `actors: [reviewer]` (from auth context)
4. Evaluates the `callerIsNotSubmitter` guard — compares `submittedById` on the object to `$caller.id` from auth context
5. If all checks pass: updates status to `approved`, emits the `approval.approved` event
6. If any check fails: returns 409 Conflict with an explanation (e.g., "cannot approve your own request" or "caller role 'submitter' is not in allowed actors [reviewer]")

**How actors are identified:**

In production, the caller's identity and role come from the auth system (JWT claims, OAuth scopes, etc.). The mock server simulates this with headers:

```bash
# Approve a request as a reviewer
curl -X POST /approvals/approval-requests/a1b2c3d4/approve \
  -H "X-User-Id: user-3" \
  -H "X-User-Role: reviewer"

# This would fail — submitter can't approve their own request
curl -X POST /approvals/approval-requests/a1b2c3d4/approve \
  -H "X-User-Id: user-1" \
  -H "X-User-Role: reviewer"
# → 409 Conflict: guard 'callerIsNotSubmitter' failed — submittedById (user-1) equals caller.id (user-1)
```

### Step 3: Events, timeouts, and SLA tracking

#### Event delivery

Events are emitted when transitions occur. The contract defines the event names and payload schemas; the delivery mechanism is an implementation concern.

**In the mock server**, events are delivered two ways:

1. **Stored events** — every event is persisted and queryable via Object APIs:
   ```
   GET /approvals/events                              → all events
   GET /approvals/events?type=approval.approved        → filtered by type
   GET /approvals/events?objectId=a1b2c3d4             → events for a specific object
   ```

2. **Real-time stream** — the mock server exposes a Server-Sent Events (SSE) endpoint for frontends that need to react immediately (e.g., updating a queue when someone else claims a task):
   ```
   GET /events/stream                                  → all domain events
   GET /events/stream?domain=approvals                 → filtered by domain
   GET /events/stream?type=approval.approved            → filtered by type
   ```

   ```javascript
   // Frontend subscribing to events
   const events = new EventSource('/events/stream?domain=approvals');
   events.addEventListener('approval.approved', (e) => {
     const payload = JSON.parse(e.data);  // ApprovalDecisionEvent shape
     refreshQueue();
   });
   ```

**In production**, the adapter must deliver events through the same two interfaces — stored events via Object APIs and real-time events via SSE — so the frontend works the same way regardless of what's behind the adapter. The adapter translates vendor-specific event mechanisms (webhooks, event bus, vendor APIs) into these interfaces.

#### Timeout emulation

Real calendar-based timeouts (fire after 3 days) don't make sense during development. The mock server provides a manual trigger:

```bash
# Evaluate all objects against their timeout thresholds
POST /mock/trigger-timeouts

# Response shows which timeouts fired
{
  "triggered": [
    {
      "domain": "approvals",
      "objectId": "a1b2c3d4",
      "event": "approval.overdue",
      "reason": "pending for 5 days, threshold is reviewDeadlineDays (3)"
    }
  ]
}
```

The mock server uses the object's `updatedAt` timestamp and the current clock to determine if a timeout threshold has been exceeded. Timeout thresholds (like `reviewDeadlineDays`) are defined in example configuration data.

In production, the vendor system handles timeouts natively (timers, schedulers, cron jobs). The adapter translates vendor timeout events into the contract's event format and delivers them through the same event interfaces.

#### SLA tracking

Each state in the YAML declares whether the SLA clock is `running`, `paused`, or `stopped`. The mock server tracks this automatically:

- When an object enters a state with `sla: running`, the clock starts (or resumes)
- When it enters a state with `sla: paused`, the clock pauses (elapsed time is preserved)
- When it enters a state with `sla: stopped`, the clock stops (final elapsed time is recorded)

The mock server exposes SLA status on each object via an `_sla` field:

```json
{
  "id": "a1b2c3d4",
  "status": "pending",
  "submittedById": "user-1",
  "_sla": {
    "clock": "running",
    "elapsedMs": 172800000,
    "stateEnteredAt": "2025-01-15T10:00:00Z"
  }
}
```

In production, the vendor system typically provides its own SLA tracking. The adapter maps vendor SLA data to this same `_sla` shape so the frontend can display SLA status consistently.

### Step 4: Add example data

```json
// openapi/examples/approvals/approval-requests.json
[
  {
    "id": "a1b2c3d4-...",
    "status": "pending",
    "submittedById": "user-1",
    "createdAt": "2025-01-15T10:00:00Z",
    "updatedAt": "2025-01-15T10:00:00Z"
  },
  {
    "id": "e5f6g7h8-...",
    "status": "approved",
    "submittedById": "user-2",
    "reviewedById": "user-3",
    "reviewNote": "Looks good",
    "createdAt": "2025-01-10T09:00:00Z",
    "updatedAt": "2025-01-12T14:30:00Z"
  }
]
```

### Step 4: Validate and run

```bash
# Validate contract consistency
npm run validate
# ✓ approval-lifecycle.yaml validates against JSON Schema
# ✓ States [pending, approved, rejected] match ApprovalRequest.status enum
# ✓ Event payload schemas resolve (ApprovalDecisionEvent, ApprovalResubmittedEvent, ApprovalOverdueEvent)
# ✓ Guard field references are valid (submittedById exists on ApprovalRequest)

# Start mock server — all API types auto-generate
npm run mock:start
# Object APIs:
#   GET  /approvals/approval-requests
#   GET  /approvals/approval-requests/:id
#   POST /approvals/approval-requests
#   GET  /approvals/events
#   ...
# Action APIs (from state machine triggers):
#   POST /approvals/approval-requests/:id/approve
#   POST /approvals/approval-requests/:id/reject
#   POST /approvals/approval-requests/:id/resubmit
# Event stream:
#   GET  /events/stream
# Mock utilities:
#   POST /mock/trigger-timeouts
```

### File structure

The resulting files follow a consistent pattern. Adding another behavior-shaped domain means creating the same three artifacts in the same locations:

```
state-machines/
  approval-lifecycle.yaml           # Behavioral contract
  approval-lifecycle.schema.json    # JSON Schema for the format (shared across all domains)

openapi/
  domains/
    approvals/
      components/
        schemas.yaml                # Data contract (ApprovalRequest)

openapi/examples/
  approvals/
    approval-requests.json          # Example data for seeding
```

No domain-specific handler code, no changes to the mock server. The same pattern applies to workflow management (Task, Queue, WorkflowRule with 9 states), notification campaigns (Campaign with states like `draft`, `scheduled`, `sending`, `delivered`), or any other domain with state transitions.

---

## Implementation Roadmap

The generic infrastructure must be built before any specific domain can use it.

**Phase 1: State machine format + tooling**
- Define the JSON Schema for the state machine YAML format
- Build the validation script (contract ↔ schema consistency checks)
- Build the state machine engine for the mock server (auto-discovery, route generation, guard evaluation)
- Build event infrastructure (stored events via Object APIs, real-time delivery via SSE)
- Build SLA tracking (clock state per object, `_sla` field on responses)
- Build timeout trigger endpoint (`POST /mock/trigger-timeouts`)
- Add to `npm run validate` and `npm run mock:start` pipelines

**Phase 2: First domain (workflow management)**
- Define workflow state machines (task lifecycle, verification lifecycle)
- Define workflow OpenAPI schemas (Task, Queue, WorkflowRule, etc.)
- Add example data
- Validate and test end-to-end

Phase 1 is the investment. Phase 2 and every domain after it is just defining artifacts.
