# Domain Diagram Research

> **Status: In progress** — Research for the future-state domain diagram (`domain-diagram.md`). Do not publish.

This file captures vendor/standard comparisons for the domain model before the diagram is created.

---

## Vendors and Standards Reviewed

| Source | Type | Notes |
|--------|------|-------|
| IBM Curam SPM 8 | Vendor platform | Standalone module architecture; most mature domain model in the space |
| Salesforce Public Sector Solutions | Vendor platform | Object-oriented; Benefit Management merges Intake + Eligibility |
| Beam / Nava Strata | Vendor platform | Beam acquired by Nava (2025), folded into Strata open-source SDK; focused on intake → payment pipeline |
| FHIR R4 | Standard (HL7) | Healthcare-oriented but widely used for Medicaid; strong on clinical/coverage domains |
| WIC FReD v2.0 | Federal requirements doc | USDA FNS Functional Requirements Document for a Model WIC System; 12 functional areas |
| Alabama STIS RFP (2022) | State procurement | SNAP/TANF only; Alabama DHR; explicit Provider Management module |
| Indiana IEDSS RFP 12-113 (2012) | State procurement | SNAP, TANF, Medicaid, CHIP; multi-program integrated; separated eligibility from case management and MMIS |
| New York IES RFP C000540 (2023) | State procurement | SNAP, Medicaid, TANF, Child Support; modular lot structure; explicit Benefits Issuance and Fair Hearings lots |
| California CalSAWS | State procurement | CalFresh, Medi-Cal, CalWORKs; county-administered; provider management in DHCS MMIS |
| Colorado CBMS | State procurement | Medicaid, SNAP, CHIP, TANF; migrated to Salesforce 2019; provider management in MMIS |

---

## WIC FReD — 12 Functional Areas

The USDA FNS Functional Requirements Document for a Model WIC System (FReD v2.0) defines these functional areas:

1. Management and organization
2. Nutrition services and breastfeeding support
3. Food delivery and food instrument accountability (Benefits Issuance)
4. Vendor / retailer management (Provider Management)
5. Management information systems
6. Caseload management and outreach (Case Management)
7. Coordination of services / Referrals
8. Civil rights (compliance / cross-cutting)
9. Certification and eligibility (Eligibility)
10. Monitoring and QA (Reporting/Observability)
11. Fiscal management and data quality analysis
12. Reporting

Source: https://www.fns.usda.gov/sso/wic/functional-requirements-mis

---

## Vendor Comparison Table

Legend: ✓ = standalone domain/module | ➔ = nested inside another domain | ~ = cross-cutting or platform-level | — = not present

| Domain | Our Blueprint | IBM Curam SPM | Salesforce PSS | Beam / Nava Strata | FHIR R4 | WIC FReD | AL STIS | IN IEDSS | NY IES | CA CalSAWS | CO CBMS |
|--------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Client Management | ✓ | ✓ Person | ✓ Constituent | ~ applicant only | ✓ Patient | ✓ Certification | ✓ | ✓ | ✓ | ✓ | ✓ |
| Intake / Application | ✓ | ✓ Universal Access | ➔ Benefit Mgmt | ✓ | — | ✓ | ✓ §3.9.3–4 | ✓ | ✓ | ✓ | ✓ |
| Eligibility | ✓ | ✓ Income Support | ➔ Benefit Mgmt | ✓ | ✓ CoverageEligibilityRequest | ✓ Certification | ✓ §3.9.5 | ✓ | ✓ Lot 1 | ✓ | ✓ |
| Program / Product | proposed | ✓ Product Catalog | ✓ standalone | ~ implicit | ✓ InsurancePlan | ~ | ~ | ~ | ~ | ~ | ~ |
| Case Management | ✓ | ✓ | ✓ | ✓ | — | ✓ Caseload Mgmt | ✓ §3.9.5 | ✓ | ✓ Lot 1 | ✓ | ✓ |
| Workflow / Tasks | ✓ | ~ platform | ~ Flow | ✓ | ✓ Task | — | ~ | ~ | ~ | ~ | ~ |
| Scheduling | ✓ | ✓ | ✓ | — | ✓ Schedule/Slot | ~ appointments | — | — | — | — | — |
| Document Management | ✓ | ✓ | ✓ | ✓ | ✓ DocumentReference | — | ✓ §3.9.7 | ✓ | ✓ | ✓ | ✓ |
| Communication / Notices | ~ | ✓ | ✓ | — | ✓ Communication | ~ | ~ | ✓ | ✓ | ✓ | ✓ |
| Appeals / Fair Hearings | proposed | ✓ standalone module | ✓ Investigative CM | — | — | — | — | ✓ | ✓ Lot 4 | ✓ | ✓ |
| Benefits Issuance | — | ➔ Income Support | ➔ Benefit Mgmt | ✓ Payments | ✓ Claim | ✓ Food Instrument | ✓ §3.9.8/12 | ➔ SNAP EBT | ✓ BI Module | ✓ EBT | ✓ EBT |
| Provider Management | — | ✓ standalone | ✓ standalone | — | ✓ Organization | ✓ Vendor Mgmt | ✓ §3.9.9 | — MMIS | ✓ Lot 3 | — MMIS | — MMIS |
| Outcomes Management | — | ✓ standalone | ✓ Care Plan | — | ✓ Goal/CarePlan | — | — | — ICMS | — | — | — |
| Reporting / Analytics | ~ | ✓ BI & Analytics | ~ | ✓ | — | ✓ | ✓ §3.9.16 | ✓ | ✓ Lot 2 | ✓ | ✓ |
| Referrals | — | ➔ Case Mgmt | ~ | — | ✓ ServiceRequest | ✓ standalone | — | — | — | — | — |
| Search | ✓ | — | ~ | — | — | — | — | — | — | — | — |

---

## Key Findings

### Appeals / Fair Hearings
- **IBM Curam**: Standalone module, separate from Case Management and Eligibility. Handles full fair hearing lifecycle: intake, scheduling, decisions, multi-level reviews, judicial review.
- **Salesforce PSS**: Handled via Case Proceeding objects (court action, mediation, tribunal, appeal) within Investigative Case Management module — distinct from case management but not fully standalone.
- **WIC FReD**: Not explicitly included (WIC appeals process is handled administratively).
- **State RFPs**: Present in Indiana IEDSS (in scope), New York IES (explicit Lot 4), CalSAWS, Colorado CBMS. Alabama STIS does not name it as an explicit module — notable gap or handled via legacy system.
- **Decision**: Add as own domain. Federal fair hearing regulations (SNAP 7 CFR 273.15, Medicaid 42 CFR 431.200) make this a distinct regulated process. Consistent with Curam, Salesforce, NY IES, IN IEDSS.

### Program / Product
- **Salesforce PSS**: `Program` is a first-class top-level entity — not a cross-cutting concern.
- **IBM Curam**: Product Catalog is a platform-level concept; programs (Income Support products) are defined there.
- **FHIR**: `InsurancePlan` is a top-level resource.
- **State RFPs**: Not named as a distinct module in any RFP reviewed — typically implicit in the eligibility configuration.
- **Decision**: Elevate from cross-cutting concern to its own domain, consistent with Curam and Salesforce.

### Benefits Issuance
- Present in all vendors (Curam, Salesforce, Beam, FHIR) and all state RFPs reviewed (Alabama §3.9.8/12, Indiana SNAP EBT, New York explicit BI Module, CalSAWS EBT, Colorado EBT).
- Medicaid payment/claims processing consistently lands in the MMIS (separate system), not the eligibility system. SNAP EBT and cash assistance issuance are universally in scope.
- **Decision**: Add as own domain covering SNAP EBT, TANF cash issuance, benefit calculation, and issuance records. Medicaid claims/payments are out of scope (MMIS boundary).

### Provider Management
- Present in Curam (standalone), Salesforce (standalone), FHIR (Organization), WIC FReD (Vendor Mgmt).
- **State RFPs**: Present in Alabama STIS (§3.9.9 + Provider Portal) and New York IES (Lot 3). Absent from Indiana IEDSS, CalSAWS, and Colorado CBMS — where it lives in the MMIS (separate procurement). The split tracks with program scope: SNAP/TANF vendor management tends to be in scope; Medicaid provider enrollment is not.
- **Decision**: Out of scope for the initial blueprint. The blueprint targets eligibility/case management; Medicaid provider management belongs in the MMIS. States using the blueprint for SNAP/TANF vendor relationships can overlay this. Mark as a future/out-of-scope domain in the diagram.

### Outcomes Management
- Present in Curam (standalone) and Salesforce (Care Plan); FHIR has Goal/CarePlan.
- **State RFPs**: Absent from all five RFPs reviewed. Indiana explicitly separated case plans/goals into a distinct ICMS procurement (RFP #11-72). No eligibility system RFP uses "Outcomes Management" as a required module.
- **Decision**: Out of scope for the initial blueprint. Belongs to care coordination / wrap-around services, a different system category. Mark as a future/out-of-scope domain in the diagram.

### Intake vs. Eligibility separation
- Our blueprint separates these; Salesforce merges them under Benefit Management.
- Our separation is deliberate: "what the client told us" (Intake) vs. "program interpretation" (Eligibility). Defensible and matches how Curam structures it. All state RFPs reviewed maintain this separation in practice (Application Registration vs. Eligibility Determination are distinct functional areas in Alabama, Indiana, and New York).

---

---

## Entity Research by Domain

Research covers IBM Curam SPM 8, Salesforce Public Sector Solutions (PSS), FHIR R4, and state systems (Alabama STIS, Indiana IEDSS, New York IES where documented). State system entity names are inferred from RFPs and published architecture descriptions — technical data dictionaries are not publicly available.

Legend: ✓ = standalone entity | ➔ = nested within / attribute of another entity | ~ = implicit or cross-cutting | — = not present

### Naming convention observations

**IBM Curam SPM** centers on two foundational concepts: **Participant** (typed person/org model) and **Evidence** (fact model). Cases are typed containers (`Integrated Case`, `Product Delivery Case`, `Application Case`). Benefits flow through **Financial Instructions** with typed line items. The word "Product" is used for what other systems call a "Program."

**Salesforce PSS** uses standard CRM naming (`Account`, `Contact`, `Case`) extended with domain-specific objects. Benefit delivery uses an explicit pipeline: `IndividualApplication` → `Assessment` → `BenefitAssignment` → `BenefitDisbursement`. Cases use composable `Case`/`CaseEpisode`/`CaseProceeding` objects rather than typed hierarchies.

**FHIR R4** uses clinical vocabulary (`Patient`, `Encounter`, `EpisodeOfCare`, `Coverage`) that maps awkwardly to benefits. The `Coverage`/`CoverageEligibilityRequest` pattern is the closest analog to program enrollment. Financial objects (`Claim`, `ExplanationOfBenefit`) are healthcare billing-oriented, not EBT-oriented.

**State systems** share a common conceptual model inherited from federal policy: `Application` → `Case` → `Eligibility Determination` → `Benefit Calculation` → `Issuance`. They use regulatory/policy vocabulary (`Allotment`, `Standard of Need`, `Budget Unit`, `Recoupment`) reflecting the federal rules they implement.

---

### Client Management

| Entity | Our Blueprint | IBM Curam SPM | Salesforce PSS | FHIR R4 | State Systems |
|--------|:---:|:---:|:---:|:---:|:---:|
| `Client` | ✓ | ✓ Person | ✓ Person Account | ✓ Patient | ✓ Individual / Client |
| `Household` | ✓ *(new)* | ✓ ConcernRole group | ✓ Party Relationship Group | ✓ Group | ✓ Household |
| `Relationship` | ✓ | ➔ Person Evidence | ➔ Party Relationship Group | ✓ RelatedPerson | ➔ Client record |
| `LivingArrangement` | ✓ | ➔ Person Evidence (Address) | — | — | ➔ Household composition |
| `ContactInfo` | ✓ | ➔ Person Evidence | ➔ Person Account fields | ➔ Patient fields | ➔ Client record |
| `IncomeSource` | ✓ | ➔ Person Evidence (Income) | ✓ Party Income | — | ➔ Client financial data |
| `Employer` | ✓ | ➔ Person Evidence (Employment) | ➔ Business Account | — | ➔ Employment record |

---

### Intake

| Entity | Our Blueprint | IBM Curam SPM | Salesforce PSS | FHIR R4 | State Systems |
|--------|:---:|:---:|:---:|:---:|:---:|
| `Application` | ✓ | ✓ Application Case | ✓ Individual Application | — | ✓ Application |
| `ApplicationMember` | ✓ | ➔ Case Participant | ✓ Public Application Participant | — | ➔ Application Header |
| `Income` (reported) | ✓ | ➔ Dynamic Evidence | ➔ Assessment responses | — | ➔ Budget data |
| `Expense` | ✓ | ➔ Dynamic Evidence | ➔ Party Expense | — | ➔ Budget data |
| `Resource` | ✓ | ➔ Dynamic Evidence | — | — | ➔ Budget data |

---

### Eligibility

| Entity | Our Blueprint | IBM Curam SPM | Salesforce PSS | FHIR R4 | State Systems |
|--------|:---:|:---:|:---:|:---:|:---:|
| `EligibilityRequest` | ✓ | ✓ Determination | ✓ Assessment | ✓ CoverageEligibilityRequest | ✓ Eligibility Determination |
| `EligibilityUnit` | ✓ | ~ Budget grouping | ~ Benefit scope | — | ✓ Budget Unit |
| `Determination` | ✓ | ✓ Decision | ➔ Benefit Assignment | ✓ CoverageEligibilityResponse | ✓ Eligibility Determination |
| `VerificationRequirement` | ✓ | ✓ Verification Record | ✓ DocumentChecklistItem | — | ✓ Verification Record |

---

### Program

| Entity | Our Blueprint | IBM Curam SPM | Salesforce PSS | FHIR R4 | State Systems |
|--------|:---:|:---:|:---:|:---:|:---:|
| `Program` | ✓ *(new domain)* | ✓ Product | ✓ Program | ✓ InsurancePlan | ✓ Program Type |
| `Benefit` | ✓ *(new)* | ✓ Benefit Product | ✓ Benefit / Benefit Type | ✓ ActivityDefinition | ~ benefit type config |

---

### Case Management

| Entity | Our Blueprint | IBM Curam SPM | Salesforce PSS | FHIR R4 | State Systems |
|--------|:---:|:---:|:---:|:---:|:---:|
| `Case` | ✓ | ✓ Integrated Case | ✓ Case | ✓ EpisodeOfCare | ✓ Case |
| `CaseWorker` | ✓ | ✓ Case Owner | ✓ Case owner | ✓ CareTeam member | ✓ Case Worker |
| `Supervisor` | ✓ | ✓ Case Supervisor | ~ hierarchy | — | ✓ Supervisor |
| `Office` | ✓ | ~ Org unit | ✓ ServiceTerritory | ✓ Location | ✓ Office / County |
| `Assignment` | ✓ | ✓ Case Owner / Participant | ➔ Case fields | — | ✓ Case Assignment |
| `Caseload` | ✓ | ~ Work Queue | — | — | ✓ Caseload |
| `Team` | ✓ | ✓ Org unit | ✓ Queue / Team | ✓ CareTeam | ✓ Work unit |

---

### Workflow

| Entity | Our Blueprint | IBM Curam SPM | Salesforce PSS | FHIR R4 | State Systems |
|--------|:---:|:---:|:---:|:---:|:---:|
| `Task` | ✓ | ✓ Task | ✓ Task / ActionPlanItem | ✓ Task | ✓ Work Item |
| `Queue` | ✓ | ✓ Work Queue | ✓ Queue | — | ✓ Workload Queue |
| `SLAType` | ✓ | ~ Process Definition | — | — | ~ Policy config |
| `TaskType` | ✓ | ✓ Process Definition | ✓ ActionPlanTemplate | — | ~ Work item type |
| `TaskAuditEvent` | ✓ | ~ Case History | ➔ Case activity | — | ✓ Case History |
| `VerificationTask` | ~~removed~~ | ✓ Task (verification type) | ✓ ActionPlanItem | ✓ Task | ✓ Verification work item |
| `VerificationSource` | ~~removed~~ | ~ External interface | — | — | ~ Data exchange |

---

### Scheduling

| Entity | Our Blueprint | IBM Curam SPM | Salesforce PSS | FHIR R4 | State Systems |
|--------|:---:|:---:|:---:|:---:|:---:|
| `Appointment` | ✓ | ✓ Calendar Activity | ✓ ServiceAppointment | ✓ Appointment | ✓ Appointment |
| `Schedule` | ✓ *(future)* | — | ✓ ServiceResource availability | ✓ Schedule | — |
| `Slot` | ✓ *(future)* | — | ✓ Slot | ✓ Slot | — |

---

### Document Management

| Entity | Our Blueprint | IBM Curam SPM | Salesforce PSS | FHIR R4 | State Systems |
|--------|:---:|:---:|:---:|:---:|:---:|
| `Document` | ✓ | ✓ Attachment | ✓ ContentDocument | ✓ DocumentReference | ✓ Document |
| `Upload` | ✓ | ➔ Attachment (file) | ✓ ContentVersion | ✓ Binary | ➔ Document |
| `DocumentRequest` | ✓ *(new)* | ✓ Verification Record | ✓ DocumentChecklistItem | — | ✓ Document Request |

---

### Communication (cross-cutting)

| Entity | Our Blueprint | IBM Curam SPM | Salesforce PSS | FHIR R4 | State Systems |
|--------|:---:|:---:|:---:|:---:|:---:|
| `Notice` | ✓ | ✓ Correspondence | — | ✓ Communication | ✓ Notice / Letter |
| `Correspondence` | ✓ | ✓ Communication | ✓ Interaction Summary | ✓ Communication | ✓ Correspondence Log |
| `DeliveryRecord` | ✓ | ~ Communication Exception | — | — | ~ Notice tracking |

---

### Appeals / Fair Hearings

| Entity | Our Blueprint | IBM Curam SPM | Salesforce PSS | FHIR R4 | State Systems |
|--------|:---:|:---:|:---:|:---:|:---:|
| `Appeal` | ✓ *(new domain)* | ✓ Appeal | ✓ Public Complaint | — | ✓ Appeal Request |
| `Hearing` | ✓ *(new)* | ✓ Hearing | ✓ Case Proceeding | — | ✓ Hearing Record |
| `HearingDecision` | ✓ *(new)* | ✓ Appeal Determination | ✓ Case Proceeding Result | — | ✓ Hearing Decision |

---

### Benefits Issuance

| Entity | Our Blueprint | IBM Curam SPM | Salesforce PSS | FHIR R4 | State Systems |
|--------|:---:|:---:|:---:|:---:|:---:|
| `Enrollment` | ✓ *(new domain)* | ✓ Product Delivery Case | ✓ Program Enrollment / Benefit Assignment | ✓ Coverage | ✓ Active benefit record |
| `Issuance` | ✓ *(new)* | ✓ Financial Instruction (Payment) | ✓ Benefit Disbursement | ✓ PaymentNotice | ✓ Issuance Record |
| `PaymentInstrument` | ✓ *(new)* | ✓ Payment Instrument | — | — | ✓ EBT Account / Warrant |
| `Overpayment` | ✓ *(new)* | ✓ Overpayment / Liability | — | — | ✓ Overpayment |

---

---

---

## Benefits Lifecycle

How entities work together over the life of a benefits case. This narrative is the basis for relationships shown in the domain diagram.

---

### Phase 1 — Application

A client arrives (in person, online, or by phone) to apply for benefits.

- A `Client` record is created or matched in Client Management. If this is a new household, a `Household` is created and the client is linked to it.
- An `Application` is created in Intake. `ApplicationMember` records are added for each person on the application, each specifying which programs they're applying for.
- A `Case` is created in Case Management and routed to a `CaseWorker` via a `Queue`.
- `DocumentRequest` records are created in Document Management for each document the programs require (proof of income, identity, residency, etc.).
- `Task` records are created in Workflow for the worker to review the application. The case enters an `awaiting_client` or `in_progress` state.

**Evidence:** SNAP applications must be accepted the same day requested (7 CFR 273.2(c)). All five state RFPs have explicit application registration and processing sections: Alabama STIS §3.9.3–4, Indiana IEDSS application intake, New York IES Application Registration Module. Curam models this as `Application Case` → `Integrated Case`. Salesforce models it as `Individual Application` → `Assessment` pipeline. Queue-based task routing present in Curam `Work Queue`, Salesforce Queue, and all state systems.

---

### Phase 2 — Verification

The worker reviews intake data and collects supporting evidence.

- The client submits documents. Each `Document` and `Upload` is linked to the relevant `DocumentRequest`, moving it from `pending` to `received`.
- The worker verifies each document. `DocumentRequest` moves to `verified` (or `waived` if a program allows). Tasks with `awaiting_verification` state resolve.
- If a document is missing or insufficient, a `Notice` (Request for Information) is generated in Communication and a `DocumentRequest` deadline is extended. A new `Task` tracks the follow-up.
- `VerificationRequirement` records in Eligibility track which program requirements have been satisfied — fed by the `DocumentRequest` lifecycle.

**Evidence:** SNAP verification requirements are defined at 7 CFR 273.2(f) — mandatory verification of identity, residency, and gross income. Alabama STIS §3.9.7 (Electronic Record/Document Storage) and §3.9.8. Indiana IEDSS includes document management as an in-scope function. Curam models this via `Evidence` + `Verification Record`. Salesforce uses `DocumentChecklistItem`. All five state RFPs include document management.

---

### Phase 3 — Eligibility Determination

The worker (or automated system for MAGI Medicaid) evaluates eligibility.

- For SNAP and TANF, an `Appointment` is scheduled for the required eligibility interview. The `CaseWorker` conducts the interview; the `Appointment` record is linked to the `Case`.
- An `EligibilityRequest` is created for each client + program combination.
- An `EligibilityUnit` is composed — the program-specific grouping of household members (SNAP "household" ≠ Medicaid "tax unit"). This draws from `Household` and `ApplicationMember` but is interpreted through `Program` rules.
- The rules engine evaluates the `EligibilityRequest` against intake evidence and `VerificationRequirement` status.
- A `Determination` is produced — eligible or ineligible — with benefit amount and effective dates.
- A `Notice` is generated (approval letter or denial notice with reason and appeal rights).

**Evidence:** Federal processing timelines: SNAP 30-day standard (7 CFR 273.2(g)(1)), SNAP expedited 7-day (7 CFR 273.2(i)), Medicaid 45-day (42 CFR 435.912), CHIP 45-day (42 CFR 457.340). MAGI Medicaid automated path is established by 42 CFR 435.911 and ACA §1413. SNAP interview requirement at 7 CFR 273.2(e) — required for most households; may be waived for households with elderly/disabled members. All five state RFPs include eligibility determination as a core function. Curam and Salesforce both model this as the central pipeline of their platforms.

---

### Phase 4 — Enrollment and Issuance

A positive determination authorizes benefit delivery.

- An `Enrollment` is created in Benefits Issuance, referencing the `Determination`, the `Program`, and the specific `Benefit` (e.g., SNAP maximum allotment). This is the authorization record — it carries the effective dates, benefit level, and certification period.
- If this is the client's first issuance, a `PaymentInstrument` is linked to their `Household` (EBT card issued, direct deposit set up, or check warrant configured).
- `Issuance` records are generated on each payment cycle, drawing from `Enrollment` to determine amount and method. Each is immutable once generated — corrections create reversal and adjustment records.

**Evidence:** SNAP EBT issuance governed by 7 CFR 274 (EBT). TANF cash assistance delivery varies by state. Benefits Issuance present in all five state RFPs: Alabama STIS §3.9.8 (Budget Management) and §3.9.12 (Funds Management); Indiana IEDSS SNAP EBT in scope; New York IES explicit Benefit Issuance Module. Curam `Financial Instruction` pipeline; Salesforce `BenefitAssignment` → `BenefitDisbursement`; WIC FReD food instrument issuance.

---

### Phase 5 — Ongoing Case Management

The case remains open through the certification period.

- The `CaseWorker` manages the `Case` via `Task` assignments — periodic reviews, client contacts, inter-agency referrals.
- If the client reports a change (new job, household composition change, address change), a new `Application` is recorded and a new `EligibilityRequest` is triggered. The resulting `Determination` updates `Enrollment` (and therefore future `Issuance` amounts).
- `Notice` and `Correspondence` records accumulate on the `Case` and `Client` throughout.

**Evidence:** Mid-certification change reporting required by 7 CFR 273.12. Indiana IEDSS explicitly includes "case maintenance and redeterminations" as an in-scope function. All five state RFPs include ongoing case maintenance modules.

---

### Phase 5a — Recertification

Before the certification period ends, the client must reapply to continue receiving benefits.

- A `Notice` is sent to the client in advance of the certification end date, prompting them to recertify (timing varies by program — SNAP requires notice at least 30 days before expiration).
- A new `EligibilityRequest` (type: recertification) is created, linked to the prior `Determination` to maintain a history chain. The client submits updated income, household, and resource information.
- `DocumentRequest` records are created for any re-verification required. A new `Determination` is produced.
- If approved, `Enrollment` is extended with new effective dates and benefit level. `Issuance` continues uninterrupted.
- If the client does not respond, `Enrollment` is terminated at the certification end date and a `Notice` is generated. This triggers an adverse action flow (Phase 6) if benefits were still active.

**Evidence:** SNAP recertification at 7 CFR 273.14 — states must send notice at least 30 days before expiration; if client responds timely and is found eligible, benefits must not be interrupted. Medicaid annual redetermination at 42 CFR 435.916; ex parte renewal (using existing data) required before requesting client action (42 CFR 435.916(b)). All five state RFPs include recertification/redetermination as an in-scope function. Indiana IEDSS explicitly names it. Curam models it as a new `Determination` linked to prior via case history.

---

### Phase 6 — Adverse Action

A determination reduces or terminates benefits.

- A new `Determination` is produced (ineligible, or reduced benefit level).
- `Enrollment` is updated — new benefit amount, or end-dated for termination.
- Federal regulations require advance notice before adverse action takes effect. A `Notice` is generated with the reason and the client's appeal rights.
- If the client requests Aid Paid Pending (continues receiving benefits while appealing), the `Enrollment` is flagged — benefits continue at the prior level until the hearing decision.

**Evidence:** SNAP adverse action advance notice: 10 days (7 CFR 273.13). Medicaid advance notice: timely notice required (42 CFR 431.211). Aid Paid Pending during SNAP appeal at 7 CFR 273.15(k); Medicaid at 42 CFR 431.230. Notice content requirements for SNAP at 7 CFR 273.13(b). All state systems generate adverse action notices.

---

### Phase 7 — Appeal

The client disputes an adverse action.

- An `Appeal` is created, referencing the `Determination` or action being challenged and the `Case`.
- A `Hearing` is scheduled. A `Notice` goes to all parties with the date, time, and location.
- The hearing officer presides. The `Hearing` record tracks continuances and any procedural events.
- A `HearingDecision` is issued — affirmed, reversed, or modified.
  - **Reversed**: `Enrollment` is reinstated or corrected; any missed `Issuance` becomes an underpayment to be made whole; a `Notice` informs the client.
  - **Affirmed**: `Enrollment` termination stands; a `Notice` informs the client of further appeal options (state court).

**Evidence:** SNAP fair hearing rights at 7 CFR 273.15 (right to hearing, timelines, Aid Paid Pending, decision requirements). Medicaid hearing rights at 42 CFR 431.200–250. Every state RFP reviewed requires hearing support: Indiana IEDSS (in-scope function), New York IES (explicit Lot 4), California, Colorado. Curam has a standalone Appeals module. Salesforce models via `Case Proceeding` + `Case Proceeding Result`.

---

### Phase 8 — Overpayment

Excess benefits are identified and recovered.

- An `Overpayment` record is created, referencing the `Enrollment` and `Issuance` records that generated the excess.
- A recovery method is determined (voluntary repayment, recoupment from future benefits, referral for collection).
- If recouped from future benefits, future `Issuance` amounts are reduced accordingly until the `Overpayment` balance reaches zero.
- A `Notice` informs the client of the overpayment, the amount, and their repayment options and appeal rights.

**Evidence:** SNAP claims management (overpayment recovery) at 7 CFR 273.18 — states are required to establish and collect claims. Alabama STIS §3.9.14 (Claims Processing) and "Benefit Payment Accuracy" section. All state systems include overpayment tracking. Curam models this via `Overpayment` + `Liability` + `Deduction`. The client's right to notice and appeal of an overpayment determination flows from the same fair hearing regulations as Phase 7.

---

## Recommended Entity List

This section synthesizes the vendor research above into the blueprint's recommended entity model — one table per domain covering all in-scope domains. For existing domains, changes from the current `domain-design.md` are noted explicitly.

**Legend:** `(existing)` = already in domain-design.md | `(new)` = proposed addition | `(removed)` = proposed removal | `(no change)` = confirmed by research, keep as-is

---

### Client Management

| Entity | Purpose | Status | Supporting Evidence |
|--------|---------|--------|---------------------|
| `Client` | Persistent identity — name, DOB, SSN, demographics | (existing, no change) | Universal across all vendors and state systems |
| `Household` | Persistent benefit unit grouping clients across applications and redeterminations. | **(new)** | Curam `ConcernRole` group; Salesforce `Party Relationship Group`; all 5 state RFPs have a persistent household/case group. Without it, issuance has no stable grouping to issue to across applications. |

---

### Intake

| Entity | Purpose | Status | Supporting Evidence |
|--------|---------|--------|---------------------|
| `Application` | The submission requesting benefits, with programs applied for | (existing, no change) | Curam `Application Case`; Salesforce `IndividualApplication`; universal in state systems |
| `ApplicationMember` | People on the application — relationship, programs applying for, citizenship, tax filing info | (existing, no change) | Salesforce `Public Application Participant`; state systems' `Application Header` + member records |

---

### Eligibility

| Entity | Purpose | Status | Supporting Evidence |
|--------|---------|--------|---------------------|
| `EligibilityRequest` | An evaluation of a client + program (initial, recertification, or change) | (existing, no change) | Curam `Determination`; Salesforce `Assessment`; state systems' `Eligibility Determination` |
| `Determination` | The outcome for a client + program — eligible/ineligible, amount, effective dates | (existing, no change) | Curam `Determination` + `Decision`; Salesforce `Benefit Assignment`; state systems' `Eligibility Determination` |

---

### Program

| Entity | Purpose | Status | Supporting Evidence |
|--------|---------|--------|---------------------|
| `Program` | The umbrella definition of a benefit program (SNAP, Medicaid, TANF, WIC) — identity, eligibility rules reference, certification period, and the programs a state offers. States extend via overlays. | **(new domain)** | Salesforce PSS `Program` is a first-class top-level object; Curam `Product Catalog`; FHIR `InsurancePlan`. Previously a cross-cutting concern with no dedicated domain — no clear place to define, reference, or overlay programs. |
| `Benefit` | A specific form of assistance within a program — type, amount parameters, delivery method, and frequency. A Program can have multiple Benefits. `Enrollment` and `Issuance` attach to a `Benefit`, not directly to a `Program`. | **(new)** | Curam `Benefit Product`; Salesforce `Benefit` / `Benefit Type`; FHIR `ActivityDefinition`. Needed to avoid overloading `Program` with issuance-level config and to support programs that deliver multiple benefit types (e.g., SNAP allotment vs. emergency allotment). |

---

### Case Management

| Entity | Purpose | Status | Supporting Evidence |
|--------|---------|--------|---------------------|
| `Case` | The ongoing relationship with a client/household | (existing, no change) | Curam `Integrated Case`; Salesforce `Case`; universal in state systems |
| `CaseWorker` | Staff member who processes cases | (existing, no change) | Universal |

---

### Workflow

| Entity | Purpose | Status | Supporting Evidence |
|--------|---------|--------|---------------------|
| `Task` | A work item requiring action | (existing, no change) | Curam `Task`; Salesforce `Task`/`ActionPlanItem`; FHIR `Task`; all state systems |
| `Queue` | Organizes tasks by team, county, program, or skill | (existing, no change) | Curam `Work Queue`; Salesforce Queue; state systems workload queues |

---

### Scheduling

| Entity | Purpose | Status | Supporting Evidence |
|--------|---------|--------|---------------------|
| `Appointment` | Scheduled interaction between a staff member and a person | (existing, no change) | FHIR `Appointment`; Salesforce `ServiceAppointment`; universal in state systems |

---

### Document Management

| Entity | Purpose | Status | Supporting Evidence |
|--------|---------|--------|---------------------|
| `Document` | Metadata about a document | (existing, no change) | Curam `Attachment`; Salesforce `ContentDocument`; FHIR `DocumentReference`; universal |
| `DocumentRequest` | A client-facing obligation to submit a specific document by a deadline. Lifecycle: pending → received → verified → waived. | **(new)** | Curam `Verification Record`; Salesforce `DocumentChecklistItem`; state systems `Document Request`. Gap created by removing `VerificationTask` — the client-facing obligation had no home. |

---

### Communication (cross-cutting)

| Entity | Purpose | Status | Supporting Evidence |
|--------|---------|--------|---------------------|
| `Notice` | Official communication — approval, denial, RFI | (existing, no change) | Regulated by federal notice requirements; Curam `Correspondence`; state systems `Notice` |
| `Correspondence` | Other communications | (existing, no change) | Curam `Communication`; state systems `Correspondence Log` |

---

### Appeals / Fair Hearings

| Entity | Purpose | Status | Supporting Evidence |
|--------|---------|--------|---------------------|
| `Appeal` | A formal request for review of an adverse action — appellant, decision being appealed, programs at issue, status | **(new domain)** | Curam standalone `Appeal` module; Salesforce `Public Complaint` + `Case Proceeding`; NY IES Lot 4; IN IEDSS in-scope function. Required by 7 CFR 273.15 (SNAP) and 42 CFR 431.200 (Medicaid). |
| `Hearing` | A scheduled hearing event — date, officer, location, continuances | **(new)** | Curam `Hearing`; Salesforce `Case Proceeding`; state systems `Hearing Record` |
| `HearingDecision` | The written outcome — affirmed, reversed, or modified — with effective date | **(new)** | Curam `Appeal Determination`; Salesforce `Case Proceeding Result`; state systems `Hearing Decision`. A reversal may update `Enrollment` and trigger a `Notice`. |

> Continuances, withdrawals, and adjournments are states/events on `Appeal` or `Hearing`, not separate entities. Appellant and respondent are roles on `Appeal`.

---

### Benefits Issuance

| Entity | Purpose | Status | Supporting Evidence |
|--------|---------|--------|---------------------|
| `Enrollment` | The active authorization for a client to receive a program's benefits — program, benefit level, effective dates, frequency. Created or updated by a `Determination`. Drives what gets issued. Terminates on adverse action or end of certification period. | **(new domain)** | Curam `Product Delivery Case`; Salesforce `ProgramEnrollment` + `BenefitAssignment`; all state systems' active benefit record. Lives in Benefits Issuance (not Eligibility or Client Management) because its primary consumers are issuance and recoupment. |
| `Issuance` | A record of a specific benefit payment event — amount, date, method, status. One per payment cycle per enrollment. | **(new)** | Curam `Financial Instruction (Payment Instruction)`; Salesforce `BenefitDisbursement`; state systems `Issuance Record`. Immutable once generated; corrections are reversals, not edits. |
| `PaymentInstrument` | The delivery vehicle for issued benefits — EBT account, direct deposit, or check. Linked to a household, not individual issuance records. | **(new)** | Curam `Payment Instrument`; state systems `EBT Account`, `Warrant`. Scope: SNAP EBT and TANF cash. Medicaid claims/payments are out of scope (MMIS boundary). |
| `Overpayment` | An excess benefit issued to a client, with recovery method and recoupment schedule. | **(new)** | Curam `Overpayment` + `Liability`; Alabama STIS "Benefit Payment Accuracy"; all state systems. Recoupment plan is an attribute of `Overpayment`, not a separate entity. |

---

## Finalized Domain List

Based on vendor research, federal standards, and state RFP review:

**In scope (include in diagram):**
- Client Management
- Intake / Application
- Eligibility
- Program / Product *(elevate from cross-cutting)*
- Case Management
- Workflow / Tasks
- Scheduling
- Document Management
- Appeals / Fair Hearings *(add)*
- Benefits Issuance *(add; SNAP/TANF scope; Medicaid claims excluded)*

**Cross-cutting concerns (shown separately in diagram):**
- Communication / Notices
- Search
- Reporting / Analytics
- Configuration Management
- Observability

**Out of scope / future:**
- Provider Management *(future; states can overlay for SNAP vendor mgmt)*
- Outcomes Management *(future; belongs to care coordination systems)*
- Referrals *(future; states can overlay)*

## Next Steps

1. Review and approve recommended entity list above
2. Update `docs/architecture/domain-design.md` with approved changes
3. Create Mermaid diagram in `docs/architecture/domain-diagram.md`
