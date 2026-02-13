# Proposal: Fast-Food Order Prototype

**Status:** Draft

**Depends on:** [Contracts package restructure](../decisions/contracts-package-restructure.md) merged first

**Sections:**

1. **[Fast-Food Order](#fast-food-order)** — The use case, what the system does, walkthrough
2. **[Prototype Scope](#prototype-scope)** — What's covered, what's deferred
3. **[OpenAPI Schemas](#openapi-schemas)** — Order, MenuItem, Station, OrderEvent, OrderReadyEvent
4. **[State Transition Table](#state-transition-table)** — Order lifecycle, guards, effects, request bodies
5. **[Decision Tables](#decision-tables)** — Routing and priority rules
6. **[Metrics Summary](#metrics-summary)** — What to measure, source types, targets
7. **[Deliverables](#deliverables)** — Files and directory structure

---

## Fast-Food Order

A cook works a station at a fast-food restaurant. Orders arrive from the counter and drive-through. Each order needs routing to the right station, state tracking through its lifecycle, and operational metrics for the manager. Building this as imperative code means each endpoint manually checks state, updates fields, creates audit records, and fires events. Adding a transition means writing a new endpoint with all its orchestration logic.

This prototype takes a different approach: the system reads **behavioral contracts** — a state machine that declares valid transitions, guards, and effects, plus rules that declare routing and priority decisions. The mock server auto-generates RPC API endpoints from the state machine. Adding a transition is a row in a table, not a new endpoint.

### Purpose

A runnable example demonstrating every behavioral contract concept with a single domain (fast-food orders). Serves as:
- Developer demo of the contract-driven architecture
- Test fixture for conversion scripts, validation, and mock server behavioral engine
- Reference implementation for authoring behavioral contracts

### What the system does

| Capability | Example |
|-----------|---------|
| **Routes orders based on configuration** | A drive-through order routes to the drive-through station. A counter order goes to the counter station. Routing rules are defined in a decision table — adding a station is a table row, not a code change. |
| **Enforces valid state transitions** | An order in `placed` can be started but not picked up. An order in `preparing` can be finished or released. The state machine rejects invalid transitions automatically — no per-endpoint validation code. |
| **Checks guards before allowing actions** | A cook can only start an unassigned order. Only the assigned cook can finish or release. Guards are declared in the state machine, not coded in each endpoint. |
| **Produces audit records on every action** | Place, start, finish, release, pickup, cancel — each transition creates an audit event with who did it, when, and the state change. |
| **Tracks operational metrics from configuration** | Prep time, orders waiting, cancellation rate — each metric is defined in a table with its source type. |
| **Supports conditional follow-up orders** | Picking up an order with `addDessert: true` automatically creates a follow-up dessert order. Conditional effects fire only when their `when` clause is true. |

### Walkthrough

**Setup:**
1. The tables from this document are in spreadsheet format (CSV)
2. Conversion scripts generate the state machine YAML, rules YAML, and metrics YAML from the tables
3. Validation script confirms the generated YAML is internally consistent (states match OpenAPI enums, effect targets reference real schemas, rule context variables resolve)
4. Mock server loads the generated YAML and seed data (MenuItem records, two stations: counter and drive-through)

Steps 1-3 prove the authoring pipeline. Steps 4+ prove the runtime behavior.

**1. Place a drive-through order** — `POST /fast-food/orders` with `orderType: "drive_through"`, items referencing MenuItems

*What happens (onCreate effects):*
- `lookup`: MenuItem records loaded to get prep times
- `evaluate-rules`: routing rule #1 matches (drive_through → drive-through station), priority rule #1 matches (drive_through → express)
- `create`: OrderEvent with eventType `placed`
- Order appears in `placed` state, `express` priority, routed to drive-through station

**2. Start preparing** — `POST /fast-food/orders/:id/start` as a cook

*What happens:*
- Guards checked: `assignedCookId` is null (pass) OR caller is already the assigned cook (pass)
- `set`: `assignedCookId` = caller
- `create`: OrderEvent with eventType `started`
- Order moves to `preparing`

**3. Try to start again as a different cook** — `POST /fast-food/orders/:id/start` as another cook

*What happens:*
- Guard rejects: order already has an assigned cook and caller is not that cook — 409 response
- Demonstrates guard enforcement

**4. Finish preparing** — `POST /fast-food/orders/:id/finish` as the assigned cook

*What happens:*
- Guard passes (caller is assigned cook)
- `create`: OrderEvent with eventType `ready`
- `event`: `order.ready` emitted with OrderReadyEvent payload
- Order moves to `ready`

**5. Release an order** — start a new order, then `POST /fast-food/orders/:id/release` as the assigned cook with `reason: "station overloaded"`

*What happens:*
- Guard passes (caller is assigned cook)
- `set`: `assignedCookId` = null
- `create`: OrderEvent with eventType `released`
- `evaluate-rules`: routing rules re-evaluated
- Order returns to `placed`, unassigned

**6. Pick up with a dessert add-on** — `POST /fast-food/orders/:id/pickup` with `addDessert: true`

*What happens:*
- `create`: OrderEvent with eventType `picked_up`
- `when`: `$request.addDessert` is true → new Order created in `placed` state
- Original order moves to `picked_up`, follow-up dessert order appears in queue
- Demonstrates conditional `when` effect

**7. Cancel an order** — `POST /fast-food/orders/:id/cancel` on a `placed` or `preparing` order

*What happens:*
- `create`: OrderEvent with eventType `cancelled`
- Order moves to `cancelled`

**8. Check metrics** — `GET /metrics`

*What happens:*
- `order_prep_time`: shows duration from `preparing` to `ready`
- `orders_waiting`: shows current count in `placed` state
- `cancellation_rate`: shows cancel transitions / total transitions
- Demonstrates all three metric source types

### What this proves

| What | How |
|------|-----|
| Tables → YAML conversion works | Setup: conversion scripts generate valid YAML from spreadsheet tables |
| Validation catches inconsistencies | Setup: validation script confirms generated YAML is internally consistent |
| REST APIs work | Order list, station list, menu items, order events |
| RPC APIs are auto-generated from triggers | start, finish, release, pickup, cancel endpoints exist without handler code |
| State machine enforces valid transitions | Step 3: start on `preparing` with wrong cook → 409 |
| Guards enforce preconditions | Step 3: wrong caller → 409 |
| Effects execute on transitions | Audit events created, fields updated, events emitted, rules evaluated |
| `onCreate` runs on creation | Prep time lookup, rules evaluated, audit created before first transition |
| Conditional effects work | Step 6: follow-up order only created when requested |
| Rules evaluate correctly | Drive-through routes to drive-through station, gets express priority |
| Events stream to frontend | Step 4: order.ready appears in event stream |
| Metrics are queryable | Step 8: all three source types return data |
| Mock server replaces process API layer | Entire walkthrough runs against mock with no hand-written orchestration code |

---

## Prototype Scope

This document follows the **steel thread** approach — the thinnest end-to-end slice needed to prove the [contract-driven architecture](../architecture/contract-driven-architecture.md). This prototype proves every behavioral contract concept using a single, easy-to-understand domain (fast-food orders) that has no prerequisite domain knowledge.

> **Authoring note:** The tables in this document are the authoring format. Conversion scripts read them and generate the state machine YAML, rules YAML, and metrics YAML — the YAML is a build artifact that nobody edits by hand. In a spreadsheet, each table would be a separate sheet (transitions, guards, effects, rules, metrics), and the conversion script joins them by trigger or guard name.

### Architecture concepts exercised

Each row is a concept from the [contract-driven architecture](../architecture/contract-driven-architecture.md). The right column shows where this prototype exercises it.

| Concept | Exercised by |
|---------|-------------|
| REST APIs (OpenAPI schemas → CRUD) | Order, MenuItem, Station, OrderEvent |
| RPC APIs (triggers → endpoints) | `start`, `finish`, `release`, `pickup`, `cancel` |
| State machine (states, transitions, initial state) | 5 states, 6 transitions + `onCreate` |
| Guard: null check | "order is unassigned" on start |
| Guard: caller identity | "caller is assigned cook" on finish, release |
| Effect: `set` | `assignedCookId` on start, release |
| Effect: `create` | OrderEvent on every transition |
| Effect: `lookup` | MenuItem prep times on create |
| Effect: `evaluate-rules` | onCreate + release |
| Effect: `event` | `order.ready` on finish |
| Effect: conditional `when` clause | Follow-up order on pickup |
| `onCreate` lifecycle hook | Lookup + rules + audit on order creation |
| Rules: routing (assignment type) | 2 rules (drive-through match + catch-all) |
| Rules: priority type | 1 rule (drive-through → express) |
| Metrics: duration source | order_prep_time |
| Metrics: state count source | orders_waiting |
| Metrics: transition count source | cancellation_rate |
| Audit trail | OrderEvent on every transition |
| Request bodies | Defined for each action |
| Event payload schema | OrderReadyEvent |
| Authored tables → generated YAML | CSVs → state machine, rules, metrics YAML |

### What's not in the prototype

- **Additional order types** — dine-in, delivery, catering. More rows in the routing rules table, not new concepts.
- **Kitchen display system** — real-time order board. Would use the same event stream proven by `order.ready`.
- **Multi-station routing** — orders requiring prep at multiple stations (drinks + food). Would extend the routing rules.
- **Inventory tracking** — decrementing ingredient counts on order creation. Would add a `decrement` effect type.
- **Form definitions** — not exercised here. See the [application review prototype](application-review-prototype.md) for form definition coverage.

---

## OpenAPI Schemas

The adapter exposes standard CRUD endpoints for each (`GET /fast-food/orders`, `POST /fast-food/orders`, `GET /fast-food/orders/:id`, etc.).

### Order

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Unique identifier |
| status | enum | `placed`, `preparing`, `ready`, `picked_up`, `cancelled` |
| orderType | enum | `counter`, `drive_through` |
| priority | enum | `express`, `normal` |
| items | array | References to MenuItem records with quantities |
| stationId | uuid | Reference to Station (set by routing rules) |
| assignedCookId | uuid | Reference to assigned cook (null when unassigned) |
| estimatedPrepTime | integer | Minutes (computed from MenuItem prep times on creation) |
| createdAt | datetime | Creation timestamp |
| updatedAt | datetime | Last update timestamp |

### MenuItem

Configuration record — seed data loaded at startup.

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Unique identifier |
| name | string | Display name (e.g., "Cheeseburger") |
| category | enum | `burger`, `chicken`, `sides`, `drinks`, `dessert` |
| prepTimeMinutes | integer | Prep time in minutes |
| available | boolean | Whether currently available |

### Station

Routing target — seed data loaded at startup.

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Unique identifier |
| name | string | Display name (e.g., "Drive-Through", "Counter") |
| stationType | enum | `counter`, `drive_through` |
| status | enum | `active`, `inactive` |

### OrderEvent

Audit trail — one record per state change.

| Field | Type | Description |
|-------|------|-------------|
| id | uuid | Unique identifier |
| orderId | uuid | Reference to Order |
| eventType | string | `placed`, `started`, `ready`, `released`, `picked_up`, `cancelled` |
| previousStatus | string | Previous order status |
| newStatus | string | New order status |
| performedById | uuid | Who performed the action |
| reason | string | Why the action was taken (optional — e.g., release reason) |
| occurredAt | datetime | When the event occurred |

### OrderReadyEvent

Event payload emitted when an order is ready for pickup.

| Field | Type | Description |
|-------|------|-------------|
| orderId | uuid | The ready order |
| stationId | uuid | The station that prepared it |
| orderType | enum | `counter`, `drive_through` |
| readyAt | datetime | When the order became ready |

---

## State Transition Table

Each row is a valid transition — the trigger becomes an RPC API endpoint (e.g., `start` → `POST /fast-food/orders/:id/start`). The adapter rejects transitions from invalid states with a 409 response.

| From State | To State | Trigger | Guard | Key Effects |
|------------|----------|---------|-------|-------------|
| *(creation)* | placed | — | — | Lookup MenuItem prep times, evaluate routing rules, create OrderEvent |
| placed | preparing | start | Unassigned OR caller is assigned | Assign cook, create OrderEvent |
| preparing | ready | finish | Caller is assigned cook | Create OrderEvent, emit order.ready |
| preparing | placed | release | Caller is assigned cook | Clear assignment, re-evaluate routing, create OrderEvent |
| ready | picked_up | pickup | — | Create OrderEvent; if addDessert, create follow-up order |
| placed | cancelled | cancel | — | Create OrderEvent |
| preparing | cancelled | cancel | — | Create OrderEvent |

5 states, 6 transitions + onCreate. Exercises: null check guard, caller identity guard, set/create/lookup/evaluate-rules/event effects, conditional when clause, onCreate lifecycle hook.

### Guards

| Guard (from table) | Field | Operator | Value |
|---------------------|-------|----------|-------|
| Unassigned | `assignedCookId` | is null | — |
| Caller is assigned | `assignedCookId` | equals | `$caller.id` |

The `start` transition uses an OR guard: either the order is unassigned, or the caller is already the assigned cook. This allows a cook to re-start prep if they need to.

### Effects

**Effect types used in this prototype:**

| Effect type | What it does | Example |
|-------------|-------------|---------|
| `set` | Update fields on the order | Set `assignedCookId` to `$caller.id` on start |
| `create` | Create a record in another collection | Create an `OrderEvent` with orderId, eventType, performedById, occurredAt |
| `lookup` | Retrieve values from another entity | Look up `MenuItem` prep times to compute `estimatedPrepTime` |
| `evaluate-rules` | Invoke the rules engine | Evaluate routing and priority rules on create and release |
| `event` | Emit a domain event with a typed payload | Emit `order.ready` with `OrderReadyEvent` payload on finish |

Any effect can include a **`when` clause** to make it conditional. Example: `create: Order` with `when: $request.addDessert == true` only creates the follow-up order when the caller requests it.

**How effects map to each transition:**

| Trigger | set | create | lookup | evaluate-rules | event |
|---------|-----|--------|--------|----------------|-------|
| *(creation)* | `estimatedPrepTime` (from lookup) | OrderEvent (`placed`) | MenuItem (for prep times) | Routing + priority rules | — |
| start | `assignedCookId` = `$caller.id` | OrderEvent (`started`) | — | — | — |
| finish | — | OrderEvent (`ready`) | — | — | `order.ready` → OrderReadyEvent |
| release | `assignedCookId` = null | OrderEvent (`released`, reason: `$request.reason`) | — | Re-evaluate routing rules | — |
| pickup | — | OrderEvent (`picked_up`); Order (`when: $request.addDessert`) | — | — | — |
| cancel | — | OrderEvent (`cancelled`) | — | — | — |

### Request bodies

| Trigger | Endpoint | Request body fields |
|---------|----------|-------------------|
| start | `POST /fast-food/orders/:id/start` | *(none — caller identity comes from auth context)* |
| finish | `POST /fast-food/orders/:id/finish` | *(none)* |
| release | `POST /fast-food/orders/:id/release` | `reason` (string) |
| pickup | `POST /fast-food/orders/:id/pickup` | `addDessert` (boolean, optional) |
| cancel | `POST /fast-food/orders/:id/cancel` | `reason` (string, optional) |

---

## Decision Tables

### Context variables

- `order.*` — Order fields (`orderType`, `priority`, etc.). The state machine binds the governed entity as the context object.

### Routing Rules

Rules that determine which station an order is routed to. Evaluated in order — first match wins.

| # | order.orderType | Action | Target Station |
|---|-----------------|--------|----------------|
| 1 | drive_through | Route to station | drive-through |
| 2 | any | Route to station | counter |

### Priority Rules

Rules that set order priority. Evaluated in order — first match wins.

| # | Condition | Priority |
|---|-----------|----------|
| 1 | `order.orderType` == drive_through | express |

---

## Metrics Summary

| Metric | What It Measures | Source type | Source | Target |
|--------|-----------------|-------------|--------|--------|
| order_prep_time | Time from start to ready | Duration (from/to) | `preparing` → `ready` (finish trigger) | p95 < 5 minutes |
| orders_waiting | Orders waiting for a cook | State count | Count of orders in `placed` state | Trend down |
| cancellation_rate | Rate of cancelled orders | Transition count | `cancel` transition count / total transitions | < 5% |

---

## Deliverables

All files live under `packages/contracts/examples/fast-food-order/`:

```
examples/fast-food-order/
  README.md                                 # what this demonstrates, how to run it
  fast-food-order-openapi.yaml              # Order, MenuItem, Station, OrderEvent schemas + REST CRUD
  fast-food-order-openapi-examples.yaml     # seed data
  fast-food-order-state-machine.yaml        # order lifecycle (generated, version controlled)
  fast-food-order-rules.yaml                # routing and priority rules (generated, version controlled)
  fast-food-order-metrics.yaml              # operational metrics (generated, version controlled)
  authored/
    fast-food-order-state-machine.csv       # source: state transitions, guards, effects
    fast-food-order-rules.csv               # source: routing and priority decision tables
    fast-food-order-metrics.csv             # source: metric definitions
```

### Verification

1. Authored CSVs are parseable and well-formed
2. Generated YAML matches authored tables (manual check until conversion scripts exist)
3. OpenAPI spec passes `npm run validate`
4. Example data validates against schemas
5. All cross-artifact references are consistent (state machine states match OpenAPI status enum, effect targets reference existing schemas)
