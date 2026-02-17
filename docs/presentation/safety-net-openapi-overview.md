---
marp: true
theme: default
paginate: true
---

<style>
.columns { display: flex; gap: 1.5em; }
.columns > div { flex: 1; }
</style>

# Safety Net Blueprint

## Turning principles into code for safety net programs

---

# The Blueprint for a Human-Centered Safety Net

Code for America's [Blueprint for a Human-Centered Safety Net](https://codeforamerica.org/explore/safety-net-blueprint) lays out five principles for how benefits systems should work for people: many welcoming doors, easy to understand, informed decisions, simple actions, and responsive to changing needs.

**This project is the technical foundation for that work.** It turns the Blueprint's principles into code — shared data models, portable business rules, and development tools that states can adopt, customize, and own.

---

# Built for the Safety Net, Not Built from Scratch

**Purpose-built for benefits programs.** Entities like persons, households, applications, and income already reflect how safety net programs work. States don't reinvent the wheel — they start from a shared foundation and move faster.

**Opinionated based on CfA's principles.** Accessibility, plain language, multi-program support, and program-specific guidance are built into the definitions — not bolted on later.

**Shaped by real-world delivery.** A decade of working with states on tools like GetCalFresh and the Safety Net Innovation Lab means these definitions come from practice, not theory.

---

# Where States Are Today

States face two compounding problems:

**Locked in.** Your team spent years building custom workflows, business rules, and state-specific terminology — but all of it lives inside your vendor's system. When the contract ends, you lose it.

**Slow to build.** New systems take years. Every state designs data models from scratch, writes the same integration code, and builds the same testing infrastructure — with no foundation to start from.

---

# Where States Could Be Tomorrow

The Blueprint gives your state a shared starting point — and a way to keep what you build.

**No more vendor lock-in.** Everything your team defines is portable. When vendors change, your definitions stay.

**No more starting from scratch.** Baseline definitions for common benefits data, business rules, and forms are ready to customize.

---

# How They Get There

**The Blueprint** — portable contracts your state owns:

- **Data** — what information exists and how it's structured
- **Behavior** — what the system must enforce, decide, and measure
- **Forms** — what users see, organized by role and program

```
 ┌──────────────┐   ┌─────────────┐   ┌──────────────┐
 │  Contracts   │──>│  Connector  │──>│  Any Vendor  │
 │  (you own)   │   │ (translates)│   │              │
 └──────────────┘   └─────────────┘   └──────────────┘
```

**The Safety Harness** — the Safety Net catches people. The Safety Harness lets your team test the net before it's live. Interactive form previews, simulated servers, code libraries, and automated checks — all generated from your contracts.

---

# Stage 1: Review the Baseline Data Model

> A **program analyst** and/or **developer** review the Blueprint's baseline data model - entities (persons, households, income, assets, expenses) and field-level context (program requirements, verification needs, regulatory citations).

<div class="columns"><div>

**What the analyst sees:**

| Field | Values |
|-------|--------|
| Application.programsAppliedFor | SNAP, Medicaid, TANF... |
| Household.preferredLanguage | English, Spanish, Chinese... |

</div><div>

**What the developer sees:**

```yaml
Application:
  programsAppliedFor:
    label: Programs Applied For
    values: [SNAP, Medicaid, TANF, ...]
Household:
  preferredLanguage:
    label: Preferred Language
    values: [English, Spanish, ...]
```

</div></div>

Every change is validated, versioned, and trackable.

---

# Stage 2: Customize for Your State

> A **program analyst** and/or **developer** review the baseline, identify what's different for their state, and make changes in whichever tool suits them best.

<div class="columns"><div>

**What the analyst sees:**

| Action | Field | Change |
|--------|-------|--------|
| rename | Programs | SNAP → CalFresh |
| add | Preferred Language | Armenian, Farsi, Hmong |

</div><div>

**What the developer sees:**

```yaml
programs:
  SNAP: CalFresh
Household:
  preferredLanguage:
    add: [Armenian, Farsi, Hmong]
```

</div></div>

Improvements to the base benefit all states. State customizations stay isolated.

---

# Stage 3: Capture Your Business Rules

> A **program analyst** capture how cases are routed and processed in tables. A **developer** helps translate complex logic into the contract format.

<div class="columns"><div>

**What the analyst sees:**

| Rule | Condition | Action |
|------|-----------|--------|
| Processing deadline | SNAP application | 30 days |
| Expedited routing | income below limit | priority queue |
| Denial approval | any denial | supervisor review |

</div><div>

**What the developer sees:**

```yaml
rules:
  processing_deadline:
    when: "program = snap"
    deadline: 30 days
  expedited_routing:
    when: "income < threshold"
    action: priority_queue
```

</div></div>

Update one definition, and every system picks up the change.

---

# Stage 4: Design the Forms

> A **designer** uses the Storybook feature built into the Safety Harness to preview and design  forms — arranging fields, on-screen hints, and program-specific guidance for the best user experience.

<div class="columns"><div>

**What the designer sees (live preview):**

```
┌─ Income Review ─────────────┐
│                             │
│ Amount: $2,400/month        │
│  CalFresh: gross monthly    │
│  Medi-Cal: net for MAGI     │
│                             │
│ Verify: pay stub, employer  │
└─────────────────────────────┘
```

</div><div>

**What the developer sees:**

```yaml
pages:
  - id: income-review
    title: Income Review
    fields:
      - ref: incomes.grossAmount
        component: text-input
        context:
          CalFresh: gross monthly
          Medi-Cal: net for MAGI
        verification: pay stub, employer
```

</div></div>

Forms render through the U.S. Web Design System — accessibility is built in.

---

# Stage 5: Build Without Waiting

> **Developers** start building on day one using the Safety Harness — no need to wait for the real system to be ready.

**The simulated server** acts like the real system but runs entirely from your contracts. Teams building the user-facing screens can work against it immediately, then switch to the real system later.

**Pre-built code libraries** know the shape of your data. They catch errors as developers write code — before anything is deployed.

**The result:** teams that build the screens and teams that build the backend work at the same time, not one after the other.

---

# Stage 6: Prove It Works

> The Safety Harness runs automated checks against your contracts — catching problems before they reach production.

**Does the system match the contract?** If your contract says a field is required, the check confirms the system enforces it.

**Are the contracts consistent?** If two contracts contradict each other, the check flags it before anyone builds the wrong thing.

**Evaluating a vendor?** Hand them your contracts. If their system passes the checks, they can do the job. If not, you know before you buy — not after.

---

# When the Vendor Changes

> An **IT leader** gets the news: the vendor agreement ends in 18 months. But this time, the state owns its definitions.

| You Replace | You Keep |
|---|---|
| The connector to the old vendor | Your data definitions and business rules |
| Vendor-specific settings | Your form definitions and state customizations |
| | Your applications, tests, and quality checks |

The new vendor builds a connector. You run your test suite. When tests pass, you swap.

**Vendor transitions affect the plumbing, not the product.**

---

# Policy Changes Are Accelerating

> A **program analyst** learns that H.R. 1 requires new work verification for SNAP. Instead of filing a change request with the vendor, they update a table.

**H.R. 1** introduced sweeping changes: expanded SNAP work requirements (ages 18-65, 80 hours/month), Medicaid redetermination every 6 months (down from 12), and narrowed noncitizen eligibility.

**With contract-driven systems:**
- Adding a work requirement verification step is a new row in a table
- Changing redetermination frequency updates a single deadline definition
- New eligibility restrictions are configuration changes, not code rewrites

**Your state responds in weeks, not months.**

---

# Get Started

```bash
git clone https://github.com/codeforamerica/safety-net-blueprint.git
npm install
```

**Launch the Safety Harness** with `npm run storybook`

**Browse contracts** in `packages/harness/authored/`

**Run the conversion** with `npm run generate` to see how spreadsheets become contracts

**Start the simulated server** with `npm start`

**Resources:** [Blueprint for a Human-Centered Safety Net](https://codeforamerica.org/explore/safety-net-blueprint) | `docs/architecture/contract-driven-architecture.md`
