# Proposal: Adapter Pattern for Vendor Independence

**Status:** Draft

**Sections:**

1. **[Context](#context)** — Data-shaped vs. behavior-shaped systems and why the contract approach differs
2. **[API Types](#api-types)** — Object APIs (CRUD) and Action APIs (state transitions), contract artifacts for each
3. **[How the Adapter Works](#how-the-adapter-works)** — Adapter pattern for both API types
4. **[Mock Server Extensibility](#mock-server-extensibility)** — Declarative domain addition, no handler code
5. **[What States Get From This Project](#what-states-get-from-this-project)** — Contracts and tooling, not a runtime framework
6. **[Behavioral Contract Details](#behavioral-contract-details)** — State machine format, effects, rules, metrics, extensibility
7. **[Vendor Handoff](#vendor-handoff)** — What we provide, what survives vendor selection
8. **[Adding a Behavior-Shaped Domain](#adding-a-behavior-shaped-domain)** — Step-by-step tutorial with worked example
9. **[Known Extensions Needed](#known-extensions-needed)** — Five bounded format additions for full workflow coverage
10. **[Domains with Complex Calculation Logic](#domains-with-complex-calculation-logic)** — Eligibility, tax, risk scoring — where the contract wraps an external engine
11. **[Authoring Experience](#authoring-experience)** — Decision tables and spreadsheets for business users
12. **[Implementation Roadmap](#implementation-roadmap)** — Phase 1 (infrastructure) and Phase 2 (first domain)

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

**Action APIs** need two or more contract artifacts:
- **OpenAPI spec** — same object schemas used by the Object APIs
- **State machine YAML** (required) — valid states, transitions, guards, effects, timeouts, SLA behavior, and event catalog
- **Rules YAML** (optional) — declarative rules with JSON Logic conditions and actions. Rule types include assignment, priority, eligibility, escalation, alert, and more. Only needed when the domain involves condition-based decisions beyond what guards express (e.g., routing objects to queues based on context, setting priority based on application data, alert thresholds for operational monitoring).
- **Metrics YAML** (optional) — defines what to measure for operational monitoring. Metric names, labels, and targets — not implementation details (Prometheus vs. Datadog is a deployment concern).

Every behavior-shaped domain needs a state machine — that's what makes it behavior-shaped. Rules are an additional artifact for domains that need condition-based decisions evaluated against broader context. Metrics are an additional artifact for domains that need operational monitoring. For example, workflow management needs all three (state machine + rules + metrics). A simple approval process may only need the state machine.

**Contract terminology:**
- **State** — a status an object can be in (e.g., `pending`, `in_progress`, `completed`)
- **Transition** — a valid move from one state to another (e.g., `pending` → `in_progress`)
- **Guard** — a condition that must be true for a transition to be allowed (e.g., "task must be unassigned" or "caller must be a supervisor")
- **Effect** — a side effect that must occur when a transition fires (e.g., create an Assignment record, update a Caseload count, validate cross-domain data)
- **Event** — a notification emitted when a transition occurs (e.g., `task.claimed`), with a defined payload shape
- **Timeout** — a deadline-based trigger that fires if an object stays in a state too long (e.g., auto-escalate after 3 days)
- **SLA behavior** — whether a service-level clock is running, paused, or stopped in a given state
- **Rule** — a declarative condition (JSON Logic) paired with an action. The `ruleType` field determines what kind of decision the rule makes (assignment, priority, eligibility, escalation, etc.)

```
Object APIs only:              Object + Action APIs:

  OpenAPI Spec                   OpenAPI Spec
  ┌────────────┐                 ┌────────────┐
  │ Schemas    │                 │ Schemas    │
  │ Endpoints  │                 │ Endpoints  │
  │ Parameters │                 │ Parameters │
  └────────────┘                 └────────────┘
                                       +
                                 State Machine YAML (required)
                                 ┌────────────────┐
                                 │ States         │
                                 │ Transitions    │
                                 │ Guards         │
                                 │ Effects        │
                                 │ Events         │
                                 │ SLA behavior   │
                                 └────────────────┘
                                       +
                                 Rules YAML (optional)
                                 ┌────────────────┐
                                 │ JSON Logic     │
                                 │ conditions     │
                                 │ Actions        │
                                 │ (by ruleType)  │
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

The adapter must satisfy two or three contracts:
- **OpenAPI spec** — defines the Object API surface (schemas, endpoints, parameters)
- **State machine YAML** — defines valid state transitions, guards, effects, and events for Action APIs
- **Rules YAML** (if the domain uses rules) — defines condition-based decisions (routing, assignment, priority, etc.)

A validation script verifies that the contract artifacts are internally consistent (state machine states match OpenAPI enums, effect targets reference real schemas, event payloads resolve, rule context variables exist, etc.). Conformance testing (verifying the production backend actually satisfies the contracts) is done via integration test suites. When you switch vendors, the contracts tell you exactly what the new backend must do — state transitions, guard conditions, orchestration effects, SLA behavior, event triggers, and rule-based decisions — that an OpenAPI spec alone can't express.

---

## Mock Server Extensibility

Both API types are designed so that adding a new domain to the mock server is declarative — you define artifacts, not code.

**Object APIs:** Add an OpenAPI spec with schemas and example data. The mock server auto-discovers the spec and generates CRUD endpoints (list, get, create, update, delete) with an in-memory database seeded from examples. No handler code required.

**Action APIs:** Add a state machine YAML, OpenAPI data schemas, and example data. Optionally add a rules YAML if the domain needs condition-based decisions. The mock server auto-discovers these artifacts and generates:
- Object API endpoints for the data schemas (same as above)
- Action API endpoints derived from named transition triggers (e.g., a `claim` trigger on a `Task` object in the `workflow` domain becomes `POST /workflow/tasks/:id/claim`)
- State machine enforcement — the engine validates transitions and guards automatically
- Effect execution — creates, updates, and validates records across all domains using the shared in-memory persistence layer (e.g., claiming a task creates an Assignment record, updates a Caseload count, and writes a TaskAuditEvent — all in one operation)
- Rule evaluation — if a rules artifact exists, the mock evaluates JSON Logic conditions and applies the matching rule's action (assign to queue, set priority, etc.)
- Event emission on successful transitions

The mock server's in-memory database is shared across all domains, so effects that reference entities from other domains (creating an Assignment when claiming a Task, updating a Caseload) work naturally — the mock has all the schemas loaded and can write to any collection.

The state machine engine is domain-agnostic. Adding a second domain with Action APIs (e.g., notification campaigns with states like `draft`, `scheduled`, `sending`, `delivered`) follows the same pattern: define the state machine YAML and data schemas, and the mock server generates the endpoints with enforcement. No new handler code is needed.

## What States Get From This Project

This project provides contracts and development tooling. States build their own production backends — in whatever language or framework they use — that satisfy those contracts.

**What this project provides:**

| Artifact | Purpose | Used in production? |
|----------|---------|---------------------|
| OpenAPI specs | Define the Object API surface (schemas, endpoints, parameters) | Yes — as the contract the backend must satisfy |
| State machine YAML | Define the Action API surface (states, transitions, guards, effects, events) | Yes — as behavioral requirements |
| Rules YAML | Define condition-based decisions: routing, assignment, priority, alerts (JSON Logic) | Yes — as behavioral requirements (if applicable) |
| Metrics YAML | Define what to measure: metric names, labels, targets | Yes — as monitoring requirements (if applicable) |
| Mock server | Frontend development and integration testing before a real backend exists | No — replaced by the state's production backend |
| Validation script | Verify that the contract artifacts are internally consistent (state machine ↔ OpenAPI schemas, effects ↔ entity schemas, rules ↔ context variables) | Yes — run in CI to catch contract mismatches |
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

The state machine references OpenAPI data schemas for event payloads, effect targets, and guard context. Rules reference context variables from object schemas. A validation script ensures consistency across all artifacts.

```
State Machine YAML                    OpenAPI Schemas
┌──────────────────────┐             ┌──────────────────────┐
│ object: Task         │             │ Task:                │
│ stateField: status   │  references │   status: enum       │◄── states must match
│                      │────────────►│   assignedToId: uuid │
│ states:              │             │   requiredSkills: [] │
│   pending:           │             │   ...                │
│     transitions:     │             │                      │
│       - to: in_progress            │ Assignment:          │◄── effect target
│         trigger: claim│            │   taskId: uuid       │
│         effects:     │  references │   workerId: uuid     │
│           - create: Assignment────►│   ...                │
│           - create: TaskAuditEvent │                      │
│         event:       │  references │ TaskClaimedEvent:    │
│           payload: ──────────────► │   taskId: uuid       │◄── payload schema
│              TaskClaimedEvent      │   claimedById: uuid  │
│                      │             └──────────────────────┘
└──────────────────────┘
          ▲
          │ states feed into
          │
Rules YAML (optional)
┌──────────────────────┐
│ rules:               │
│   - conditions:      │  references task.*, application.*
│       JSON Logic     │  from OpenAPI schemas
│     action:          │
│       strategy: ...  │
│       targetQueueId  │
└──────────────────────┘
```

### Effects format

Effects declare the side effects that must occur when a transition fires. They are listed on each transition and executed in order after the guard passes and the state change is applied.

**Effect types:**

| Type | Purpose | Mock executes? |
|------|---------|----------------|
| `validate` | Check a cross-domain condition before allowing the transition | Yes |
| `set` | Update fields on the current object (beyond the state change) | Yes |
| `create` | Create a record in any domain's collection | Yes |
| `update` | Update a record in another domain's collection | Yes |
| `increment` / `decrement` | Adjust a numeric field on another record | Yes |
| `lookup` | Retrieve a value from another entity and bind it to a variable for use in subsequent effects | Yes |
| `call` | Call an external service and bind the response to a variable | Yes (returns canned mock responses) |

Effects can also be **conditional** using a `when` clause. This allows effects to execute only when a condition is true — useful for optional side effects that depend on request body fields or object state.

The mock server executes all effect types using its shared in-memory persistence layer. Since the mock loads all domain schemas, it can create and update records across domains in a single operation. For `call` effects, the mock returns canned responses defined in example data rather than calling external services.

**Variable references in effects:**
- `$object` — the current object being transitioned
- `$caller` — the authenticated user (from JWT claims in production, `X-User-Id` / `X-User-Role` headers in mock)
- `$now` — current timestamp
- `$request` — the request body (for accessing fields sent with the action)
- `$lookup.*` — values bound by a preceding `lookup` effect
- `$call.*` — values bound by a preceding `call` effect

**Example (claiming a task):**

```yaml
transitions:
  - to: in_progress
    trigger: claim
    actors: [caseworker]
    guard: taskIsUnassigned
    effects:
      - validate: $caller.skills containsAll $object.requiredSkills
        description: Worker must have all required skills
      - set:
          assignedToId: $caller.id
        description: Assign task to claiming worker
      - create: Assignment
        fields:
          taskId: $object.id
          workerId: $caller.id
          assignedAt: $now
          status: active
        description: Create assignment record
      - create: TaskAuditEvent
        fields:
          taskId: $object.id
          eventType: assigned
          performedById: $caller.id
          occurredAt: $now
        description: Record assignment in audit trail
      - increment:
          entity: Caseload
          lookup: { workerId: $caller.id }
          field: activeTaskCount
        description: Update worker's caseload count
    event:
      name: task.claimed
      payload: TaskClaimedEvent
```

When `POST /workflow/tasks/:id/claim` is called, the mock engine:
1. Checks the guard (`taskIsUnassigned`)
2. Validates cross-domain condition (`$caller.skills containsAll $object.requiredSkills`)
3. Transitions the state (`pending` → `in_progress`)
4. Sets `assignedToId` on the Task
5. Creates an Assignment record in the assignments collection
6. Creates a TaskAuditEvent in the audit events collection
7. Increments `activeTaskCount` on the worker's Caseload record
8. Emits the `task.claimed` event

If any `validate` effect fails, the transition is rejected with a 409 response explaining what failed.

**Conditional effects (`when`):**

```yaml
# On the "complete" transition — only create a follow-up task if requested
effects:
  - create: Task
    when: $request.createFollowUp == true
    fields:
      taskTypeCode: $object.followUpTaskType
      applicationId: $object.applicationId
      caseId: $object.caseId
      status: pending
    description: Create follow-up task if requested
```

**Lookup effects (`lookup`):**

```yaml
# On the "create" transition — look up SLA configuration to calculate deadline
effects:
  - lookup:
      entity: SLAType
      where: { code: $object.slaTypeCode }
      bind: slaConfig
    description: Load SLA configuration for this task type
  - set:
      dueDate: $now + $lookup.slaConfig.durationDays
      slaInfo:
        slaDeadline: $now + $lookup.slaConfig.durationDays
        warningThresholdDays: $lookup.slaConfig.warningThresholdDays
        clockStartDate: $now
        slaStatus: on_track
    description: Calculate SLA deadline from configuration
```

**Call effects (`call`):**

```yaml
# On the "start-verification" transition — call an external verification API
effects:
  - call:
      service: $object.verificationSourceId
      method: verify
      payload:
        dataPath: $object.dataPath
        reportedValue: $object.reportedValue
      bind: verificationResult
    description: Call external verification source
  - set:
      sourceResult:
        matchStatus: $call.verificationResult.matchStatus
        sourceValue: $call.verificationResult.sourceValue
        confidence: $call.verificationResult.confidence
        retrievedAt: $now
    description: Record verification result on task
```

In the mock server, `call` effects return canned responses defined in example data (e.g., `examples/verification-sources/irs-income.json`). In production, the adapter translates `call` effects to actual external API calls.

### Rules artifact

Rules are a separate YAML artifact for domains that need condition-based decisions — routing, assignment, prioritization, escalation, eligibility, or any other logic that evaluates context and produces an action. Rules use [JSON Logic](https://jsonlogic.com/) for conditions, which the mock server can evaluate directly (lightweight JS implementations exist).

```yaml
# rules/workflow-rules.yaml
domain: workflow
version: "1.0.0"

# Context variables available in conditions
context:
  - task.*            # Task fields (taskTypeCode, programType, officeId, etc.)
  - application.*     # Application data (household, income, etc.)
  - case.*            # Case data (if case-level task)

rules:
  # Priority rules — evaluated first, set task priority
  - name: Expedite households with young children
    ruleType: priority
    evaluationOrder: 1
    conditions:
      "<": [{ "var": "application.household.youngestChildAge" }, 6]
    action:
      targetPriority: expedited

  - name: High priority when deadline within 5 days
    ruleType: priority
    evaluationOrder: 2
    conditions:
      "<=": [{ "var": "task.daysUntilDeadline" }, 5]
    action:
      targetPriority: high

  # Assignment rules — evaluated after priority, route to queue/worker
  - name: Route SNAP to County A queue
    ruleType: assignment
    evaluationOrder: 10
    conditions:
      and:
        - { "==": [{ "var": "task.programType" }, "snap"] }
        - { "==": [{ "var": "task.officeId" }, "county-a-id"] }
    action:
      strategy: specific_queue
      targetQueueId: snap-county-a-queue
      fallbackQueueId: general-intake-queue

  - name: Skill-based assignment for appeals
    ruleType: assignment
    evaluationOrder: 20
    conditions:
      in: [{ "var": "task.taskTypeCode" }, ["appeal_review", "hearing_preparation"]]
    action:
      strategy: skill_match
      fallbackQueueId: appeals-queue
```

**Assignment strategies:**

| Strategy | Behavior |
|----------|----------|
| `specific_queue` | Route to `targetQueueId` |
| `specific_worker` | Assign directly to `targetWorkerId` |
| `round_robin` | Distribute evenly across queue/team members |
| `least_loaded` | Assign to worker with lowest active caseload |
| `skill_match` | Match `task.requiredSkills` against worker skills, then apply `least_loaded` among qualified workers |

The mock server evaluates rules when `POST /workflow/tasks/:id/route` is called: it loads active rules in `evaluationOrder`, evaluates JSON Logic conditions against the task and its related context (application, case), and applies the first matching rule's action.

**Alert rules:**

Rules with `ruleType: alert` define operational alert thresholds. These use the same JSON Logic format but fire alerts instead of modifying objects:

```yaml
  - name: SLA breach imminent
    ruleType: alert
    conditions:
      ">": [{ "var": "queue.atRiskCount" }, 10]
    action:
      severity: high
      message: "More than 10 tasks at risk of SLA breach in queue"

  - name: Verification source degraded
    ruleType: alert
    conditions:
      "<": [{ "var": "verificationSource.availabilityPercent" }, 95]
    action:
      severity: medium
      message: "Verification source availability below 95%"
```

Alert rules are evaluated periodically (or on-demand via `POST /mock/evaluate-alerts` in the mock server) rather than on individual transitions. The mock server emits alert events through the same SSE stream; in production, the adapter maps these to the state's alerting system (PagerDuty, email, Slack, etc.).

### Metrics artifact

Metrics are a lightweight YAML artifact that defines what to measure for a domain. It specifies metric names, descriptions, labels, and targets — not how to collect or store them (that's a deployment concern).

```yaml
# metrics/workflow-metrics.yaml
domain: workflow
version: "1.0.0"

metrics:
  - name: task_completion_time_seconds
    description: Time from task creation to completion
    labels: [taskTypeCode, programType, priority]
    target: "p95 < SLA duration"

  - name: task_wait_time_seconds
    description: Time task spends unassigned in queue
    labels: [queueId, programType]
    target: "p95 < 4 hours"

  - name: tasks_in_queue
    description: Current tasks waiting in queue
    labels: [queueId, programType, priority]

  - name: sla_breach_rate
    description: Percentage of tasks that breach SLA
    labels: [slaTypeCode, programType]
    target: "< 5%"

  - name: reassignment_rate
    description: Rate of tasks being reassigned
    labels: [queueId]
    target: "< 10%"
```

This artifact serves three purposes:
1. **Vendor evaluation** — can this system expose these metrics?
2. **Cross-state consistency** — same metric names enable benchmarking across implementations
3. **Dashboard development** — frontends know what metrics to expect from the adapter

The mock server can compute basic metrics from its in-memory data (task counts by status, queue depths, SLA breach counts) and expose them via `GET /metrics`. Production adapters map vendor-specific monitoring to these metric definitions.

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
| Add a new effect to a transition | Side effects are backend concerns; frontend is unaffected |
| Add a new rule | New rules only affect newly evaluated objects |
| Add a new metric | Informational; doesn't affect behavior |
| Add an alert rule | Alerts are advisory; don't affect transitions |

**Breaking changes:**

| Change | Impact |
|--------|--------|
| Remove a state or transition | Consumers depending on it fail |
| Add a guard to an existing transition | Transitions that previously succeeded might now be rejected |
| Remove an event | Listeners depending on it break |
| Remove or rename a field in an event payload | Listeners expecting the field break |
| Change SLA behavior for a state | Runtime behavior changes; doesn't break structure but affects outcomes |
| Remove or reorder rules | Changes behavior for newly evaluated objects |

The state machine YAML and rules YAML each include a `version` field. The validation script can diff two versions and report breaking vs. non-breaking changes.

---

## Vendor Handoff

### What we provide to the vendor

1. **State machine YAML** — "your system must enforce these states, transitions, guards, and effects"
2. **Rules YAML** (if applicable) — "your system must evaluate these conditions and apply these actions"
3. **Metrics YAML** (if applicable) — "your system must expose these metrics"
4. **Data schemas** — "objects look like this"
5. **Event catalog** — "emit these events with these payloads on these transitions"
6. **JSON Schema for the contract formats** — so the vendor can validate their configuration
7. **Validation script** — conformance verification
8. **Example data** — for setup and testing

The contracts double as a **vendor evaluation checklist**: can this system support these transitions? These effects and cross-domain orchestration steps? These rule conditions and actions? These SLA behaviors? These event triggers? These operational metrics? If a vendor can't satisfy the contracts, you know before you buy.

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
| State machine YAML | Yes | Requirements doc, vendor evaluation, conformance verification |
| Rules YAML | Yes | Decision logic the vendor must implement |
| Metrics YAML | Yes | Monitoring requirements — vendor must expose these metrics |
| JSON Schema for contract formats | Yes | Format validation for future changes |
| Data schemas (OpenAPI) | Yes | Data contract — the adapter maps vendor data to these schemas |
| Event catalog | Yes | Integration contract — vendor must emit these events |
| Validation script | Yes | Verifies vendor + adapter conform to the contracts |
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

# Audit record created by effects (cross-domain write target)
ApprovalAuditEvent:
  type: object
  required: [id, requestId, action, performedById, occurredAt]
  properties:
    id:
      type: string
      format: uuid
    requestId:
      type: string
      format: uuid
    action:
      type: string
      enum: [approved, rejected, resubmitted]
    performedById:
      type: string
      format: uuid
    occurredAt:
      type: string
      format: date-time
```

Event payload schemas and effect target schemas are defined alongside the object schema. Event payloads carry information relevant to the event (which may differ from the object's shape). Effect targets like `ApprovalAuditEvent` are schemas for records that effects create — the mock server writes to these collections when effects fire.

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
        effects:
          - set:
              reviewedById: $caller.id
            description: Record who approved
          - create: ApprovalAuditEvent
            fields:
              requestId: $object.id
              action: approved
              performedById: $caller.id
              occurredAt: $now
            description: Record decision in audit trail
        event:
          name: approval.approved
          payload: ApprovalDecisionEvent

      - to: rejected
        trigger: reject
        actors: [reviewer]
        guard: callerIsNotSubmitter
        effects:
          - set:
              reviewedById: $caller.id
            description: Record who rejected
          - create: ApprovalAuditEvent
            fields:
              requestId: $object.id
              action: rejected
              performedById: $caller.id
              occurredAt: $now
            description: Record decision in audit trail
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
        effects:
          - set:
              reviewedById: null
            description: Clear previous reviewer
          - create: ApprovalAuditEvent
            fields:
              requestId: $object.id
              action: resubmitted
              performedById: $caller.id
              occurredAt: $now
            description: Record resubmission in audit trail
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

**How guards and effects are enforced:**

When `POST /approvals/approval-requests/:id/approve` is called, the engine:
1. Looks up the `ApprovalRequest` by `:id`
2. Checks the current state is `pending` (the state this transition is defined on)
3. Checks the caller's role matches `actors: [reviewer]` (from auth context)
4. Evaluates the `callerIsNotSubmitter` guard — compares `submittedById` on the object to `$caller.id` from auth context
5. If all checks pass: transitions status to `approved`
6. Executes effects: sets `reviewedById` on the object, creates an `ApprovalAuditEvent` record
7. Emits the `approval.approved` event
8. If any check fails: returns 409 Conflict with an explanation (e.g., "cannot approve your own request" or "caller role 'submitter' is not in allowed actors [reviewer]")

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

### Step 2b: Events, timeouts, and SLA tracking

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

### Step 3: Add example data (and optional rules)

If the domain needs condition-based decisions (routing, prioritization, etc.), add a rules YAML at this step. The approval example doesn't need rules, but a workflow domain would add `rules/workflow-rules.yaml` with priority and assignment rules (see [Rules artifact](#rules-artifact) for the format).

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
# ✓ Effect target schemas resolve (ApprovalAuditEvent)
# ✓ Effect field references are valid ($object.id, $caller.id exist in context)
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
# Metrics:
#   GET  /metrics
# Mock utilities:
#   POST /mock/trigger-timeouts
#   POST /mock/evaluate-alerts
```

### File structure

The resulting files follow a consistent pattern. Adding another behavior-shaped domain means creating the same artifacts in the same locations:

```
state-machines/
  approval-lifecycle.yaml           # State machine (required for behavior-shaped domains)
  state-machine.schema.json         # JSON Schema for state machine format (shared)

rules/
  workflow-rules.yaml               # Domain rules (optional, only if domain needs condition-based decisions)
  rules.schema.json                 # JSON Schema for rules format (shared)

metrics/
  workflow-metrics.yaml             # Metric definitions (optional, only if domain needs monitoring)
  metrics.schema.json               # JSON Schema for metrics format (shared)

openapi/
  domains/
    approvals/
      components/
        schemas.yaml                # Data contract (ApprovalRequest + event/effect schemas)

openapi/examples/
  approvals/
    approval-requests.json          # Example data for seeding
```

No domain-specific handler code, no changes to the mock server. A domain that only needs a state machine (like approvals) omits the rules artifact. A domain that needs both (like workflow management) adds a rules file. The same pattern applies to workflow management (Task with 9 states + rules), notification campaigns (Campaign with states like `draft`, `scheduled`, `sending`, `delivered`), or any other domain with state transitions.

---

## Known Extensions Needed

The current contract format covers ~90% of the workflow domain requirements. The remaining gaps are bounded extensions to the format, not changes to the approach.

### Object creation with orchestration

Creating a Task isn't a state transition on an existing object — the `create` Process API involves creating the object AND running effects (calculate SLA deadline, evaluate rules for routing, maybe assign a worker). The state machine currently only handles transitions on existing objects.

**Extension:** Add an `onCreate` block to the state machine that declares effects to run when an object is first created and enters its initial state. The mock server would run these effects after the Object API `POST` creates the record.

```yaml
initialState: pending
onCreate:
  effects:
    - lookup:
        entity: SLAType
        where: { code: $object.slaTypeCode }
        bind: slaConfig
    - set:
        dueDate: $now + $lookup.slaConfig.durationDays
    - evaluate-rules: workflow-rules    # trigger rule evaluation inline
```

### Bulk operations

`POST /processes/workflow/tasks/bulk-reassign` operates on multiple objects with distribution strategies (round_robin across N workers, least_loaded balancing). The state machine is per-object — it can't express "apply this transition to 50 tasks with load-balanced distribution."

**Extension:** Define bulk operations as additional Action API endpoints in the OpenAPI spec with their own request/response shapes. Add a `bulkActions` section to the state machine that references which transition each bulk action applies and what distribution strategies are available. The mock server handles bulk actions by iterating through the objects and applying the transition to each, using the strategy to determine target assignments.

```yaml
bulkActions:
  - trigger: bulk-reassign
    appliesTransition: reassign
    strategies: [to_worker, to_queue, distribute]
    endpoint: POST /workflow/tasks/bulk-reassign
```

### Evaluate rules as an effect

When a task is released, the architecture says "re-route using WorkflowRules." This means triggering rule evaluation as part of a transition's effects.

**Extension:** Add an `evaluate-rules` effect type that invokes the rules engine inline during a transition.

```yaml
effects:
  - evaluate-rules: workflow-rules
    description: Re-route task using workflow rules
```

### Aggregation queries in effects

"If all verifications for this application are complete, trigger next workflow step" requires querying across multiple objects and checking aggregate state.

**Extension:** Add a `query` effect type that can count or check conditions across a collection, binding the result for use in conditional effects.

```yaml
effects:
  - query:
      entity: VerificationTask
      where: { applicationId: $object.applicationId, status: { not: completed } }
      count: true
      bind: pendingVerifications
  - evaluate-rules: workflow-rules
    when: $query.pendingVerifications == 0
    description: If all verifications complete, trigger next workflow step
```

### Complex lookups

"Identify appropriate supervisor by team and escalation type" involves multi-field lookups with business logic. The current `lookup` format supports simple `where` clauses.

**Extension:** Extend `lookup` to support multi-field matching and ordering.

```yaml
effects:
  - lookup:
      entity: CaseWorker
      where:
        teamId: $object.teamId
        role: supervisor
        escalationTypes: { contains: $request.escalationType }
      orderBy: { field: activeCaseCount, direction: asc }
      bind: targetSupervisor
```

---

## Domains with Complex Calculation Logic

Some behavior-shaped domains involve **calculation logic** that goes beyond what the rules artifact is designed to express. Eligibility determination is the clearest example: determining SNAP, Medicaid, or TANF eligibility involves multi-step calculations (gross income tests, net income tests, deductions, benefit amount formulas), parameterized lookup tables (federal poverty levels by household size, maximum benefits by state), cross-program dependencies (categorical eligibility), rule explanation/reasoning traces for audits and appeals, and temporally versioned rules (January applications use January thresholds).

The rules artifact handles condition → action decisions well (route this task to that queue, set this priority). But eligibility calculation is closer to a formula engine than a condition evaluator. Trying to express SNAP benefit calculations in JSON Logic would be unreadable and would duplicate what purpose-built tools already do.

### What the architecture covers

The contract still defines the **determination lifecycle** and **input/output shape**:

- **State machine** — determination lifecycle (pending → in_review → approved / denied → appealed → redetermined), with guards (reviewer can't determine own application), SLA tracking (30-day SNAP, 45-day Medicaid, 7-day expedited), and audit trail effects
- **OpenAPI schemas** — EligibilityRequest (inputs: application data, household, income, requested programs) and EligibilityResult (outputs: determination per program, benefit amounts, reasoning trace)
- **Rules** — simple eligibility conditions can still use the rules artifact (age requirements, residency checks, categorical eligibility triggers)
- **Metrics** — determination processing time, approval rates, backlog counts

### What lives outside the contract

The **calculation logic** — how to compute net income, apply deductions, look up thresholds, calculate benefit amounts, and produce a reasoning trace — lives in a dedicated calculation engine. The contract references it via a `call` effect:

```yaml
# state-machines/eligibility-determination.yaml
states:
  in_review:
    transitions:
      - to: determined
        trigger: evaluate
        actors: [caseworker, system]
        effects:
          - call:
              service: eligibility-engine
              method: evaluate
              payload:
                applicationId: $object.applicationId
                householdId: $object.householdId
                programs: $object.requestedPrograms
                asOfDate: $object.applicationDate
              bind: determination
            description: Evaluate eligibility using program rules engine
          - set:
              results: $call.determination.results
              overallStatus: $call.determination.overallStatus
            description: Record determination results
          - create: EligibilityAuditEvent
            fields:
              requestId: $object.id
              action: evaluated
              performedById: $caller.id
              reasoningTrace: $call.determination.reasoning
              occurredAt: $now
            description: Record determination with full reasoning trace
        event:
          name: eligibility.determined
          payload: EligibilityDeterminedEvent
```

The contract defines:
- **What goes in** — the EligibilityRequest schema (application data, household, programs)
- **What comes out** — the EligibilityResult schema (per-program determination, benefit amounts, reasoning trace)
- **When it happens** — the state machine lifecycle and SLA requirements
- **How it's audited** — effects creating audit records with reasoning traces

The contract does NOT define:
- **How calculations work** — deduction formulas, income tests, benefit tables
- **What thresholds apply** — federal poverty levels, state-specific limits
- **How rules are versioned** — temporal rule management is the engine's concern

### Calculation engine options

| Engine | Strengths | Considerations |
|--------|-----------|----------------|
| [OpenFisca](https://openfisca.org/) | Purpose-built for benefit calculation, open source, used by governments internationally | Python-based, learning curve for rule authoring |
| State-maintained rules repository | Rules authored by policy staff, version-controlled | Must be built or procured |
| Spreadsheet model | Familiar to policy analysts, easy to audit | Harder to integrate programmatically |
| Commercial rules engine (Drools, etc.) | Enterprise features, explanation capabilities | Vendor dependency (the kind this project tries to avoid) |

The mock server handles `call` effects by returning canned responses from example data. For eligibility, this means pre-defined determination results for test scenarios:

```json
// examples/eligibility/determination-responses.json
{
  "scenario": "snap-eligible-household-of-4",
  "results": [
    {
      "program": "snap",
      "status": "approved",
      "monthlyBenefit": 493,
      "reasoning": [
        "Gross income test: $2,100/mo vs $2,430 threshold (185% FPL for HH of 4) — PASS",
        "Net income test: $1,600/mo vs $1,868 threshold (100% FPL for HH of 4) — PASS",
        "Benefit: $973 max - ($1,600 × 0.30) = $493/mo"
      ]
    }
  ]
}
```

This gives frontends realistic determination data during development without requiring the actual calculation engine.

### Where the boundary is

This pattern — contract defines lifecycle + inputs/outputs, external engine handles calculation — applies to any domain where the core logic is **computational** rather than **transitional**:

| Domain | State machine handles | External engine handles |
|--------|----------------------|------------------------|
| Eligibility determination | Determination lifecycle, SLA, audit trail | Benefit calculations, income tests, program rules |
| Tax calculation | Filing lifecycle, submission workflow | Tax computation, deduction logic, bracket lookups |
| Risk scoring | Assessment lifecycle, review workflow | Scoring models, factor weighting, threshold evaluation |

The contract architecture doesn't try to replace these engines. It wraps them — defining the lifecycle around the calculation and the shape of inputs/outputs so the frontend and adapter are portable even if the calculation engine changes.

---

## Authoring Experience

The YAML and JSON Logic formats are developer artifacts. Business users — policy analysts, program managers, supervisors — need to be able to define and review state machines and rules without writing YAML or JSON Logic directly.

### Decision tables for rules

Rules map naturally to a **decision table** format — a spreadsheet where each row is a rule, columns are conditions, and the last columns are actions. Decision tables are a well-established pattern in business rules management (used in DMN, Drools, and similar systems).

**Example: Workflow rules as a decision table**

| Rule | Program | Office | Task Type | Youngest Child Age | Days Until Deadline | Action | Target |
|------|---------|--------|-----------|-------------------|--------------------|---------|----- |
| Expedite young children | any | any | any | < 6 | any | Set priority | expedited |
| High priority near deadline | any | any | any | any | <= 5 | Set priority | high |
| Route SNAP County A | SNAP | County A | any | any | any | Assign to queue | snap-county-a-queue |
| Skill-based appeals | any | any | appeal_review, hearing_prep | any | any | Skill match | appeals-queue (fallback) |

A conversion script reads the spreadsheet (CSV or Excel) and generates the rules YAML with JSON Logic conditions. The YAML is the machine-readable artifact that goes into the repository; the spreadsheet is the business-readable source that policy analysts maintain.

**Workflow:**
1. Business analyst edits the decision table (Google Sheets, Excel, or a simple web form)
2. Conversion script generates rules YAML from the table
3. Validation script checks the generated YAML (context variables exist, actions are valid)
4. Generated YAML is committed to the repository via PR
5. Developer reviews the diff; business analyst reviews the spreadsheet

### State transition tables for state machines

State machines can also be authored as a table — each row is a transition:

| Current State | Action | Next State | Who Can Do It | Guard | Effects |
|--------------|--------|-----------|---------------|-------|---------|
| pending | claim | in_progress | caseworker | has required skills | assign to worker, create audit event, update caseload |
| pending | cancel | cancelled | supervisor | — | create audit event |
| in_progress | complete | completed | caseworker | must be assigned | record outcome, create audit event, update caseload |
| in_progress | release | returned_to_queue | caseworker | must be assigned | clear assignment, create audit event, re-route |
| in_progress | escalate | escalated | caseworker, supervisor | — | assign to supervisor, create audit event |

The "Effects" column uses plain English descriptions. The conversion script maps these to the structured YAML format — a developer defines the effect implementations once, and the business analyst references them by description.

### Recommended tooling

| Artifact | Business user authors via | Developer artifact |
|----------|--------------------------|-------------------|
| Rules | Decision table (spreadsheet) | Rules YAML (JSON Logic) |
| State machine (states, transitions) | State transition table (spreadsheet) | State machine YAML |
| Metrics | Metric table (spreadsheet: name, description, target) | Metrics YAML |
| Effects (orchestration details) | Plain English descriptions in transition table | Effect definitions in YAML (developer-authored) |
| Guards (conditions) | Plain English in transition table | Guard definitions in YAML (developer-authored) |
| Schemas (data model) | Review only | OpenAPI YAML |

The split is intentional: business users define **what** should happen (which transitions exist, which rules apply, who can do what) in spreadsheet format. Developers define **how** it's implemented (effect mechanics, guard logic, schema structure) in YAML. The conversion scripts bridge the two, and the validation script ensures they're consistent.

If a visual tool becomes valuable, the state machine YAML can be translated to XState format for [Stately.ai's visual editor](https://stately.ai/), which provides a drag-and-drop state machine designer. This would be a read/export capability rather than the primary authoring path, since the YAML includes domain-specific fields (SLA behavior, effects, actor restrictions) that XState doesn't natively support.

---

## Implementation Roadmap

The generic infrastructure must be built before any specific domain can use it.

**Phase 1: Contract format + tooling**
- Define the JSON Schema for the state machine YAML format (states, transitions, guards, effects, events, SLA, onCreate, bulkActions)
- Define the JSON Schema for the rules YAML format (JSON Logic conditions, rule types including alerts, actions)
- Define the JSON Schema for the metrics YAML format (metric names, labels, targets)
- Build the validation script (state machine ↔ OpenAPI schema consistency, effect target resolution, rules context variable validation, metric label validation)
- Build the state machine engine for the mock server (auto-discovery, route generation, guard evaluation, effect execution against shared persistence layer)
- Build the rules engine for the mock server (JSON Logic evaluation, action execution)
- Build event infrastructure (stored events via Object APIs, real-time delivery via SSE)
- Build SLA tracking (clock state per object, `_sla` field on responses)
- Build timeout trigger endpoint (`POST /mock/trigger-timeouts`)
- Build decision table → YAML conversion scripts (spreadsheet to rules YAML, spreadsheet to state machine YAML)
- Add to `npm run validate` and `npm run mock:start` pipelines

**Phase 2: First domain (workflow management)**
- Define workflow state machines (task lifecycle, verification lifecycle)
- Define workflow rules (priority, assignment, escalation, alert rules)
- Define workflow metrics (task completion time, queue depth, SLA breach rate, etc.)
- Define workflow OpenAPI schemas (Task, Queue, WorkflowRule, Assignment, Caseload, TaskAuditEvent, etc.)
- Create decision tables for workflow rules, state transitions, and metrics (business-readable source)
- Add example data (including configuration data like TaskType, SLAType)
- Validate and test end-to-end (transitions, effects, cross-domain writes, rule evaluation)

Phase 1 is the investment. Phase 2 and every domain after it is defining artifacts — ideally starting from decision tables authored by domain experts.
