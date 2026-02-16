export const REFERENCE_CONTENT = `\
# ── Form Contract Layout ─────────────────────────────────
# The layout tab defines pages, fields, and visibility rules.

form:
  id: my-form
  title: My Form
  schema: persons/PersonCreate    # domain/SchemaName from OpenAPI
  layout: wizard                  # wizard (multi-page) | review (accordion)
  pages:
    - id: basic-info
      title: Basic Information
      expanded: true              # review layout only: start open (default: true)
      fields: [...]

# ── Field Definition ──────────────────────────────────────

- ref: name.firstName             # dot-path into the data model
  component: text-input           # text-input | date-input | radio | select | checkbox-group
  width: half                     # full (default) | half | third | two-thirds
  hint: Legal first name          # helper text below the label

# ── Custom Labels (radio / select / checkbox-group) ───────
# Override the display text for enum values from the schema.
# Keys are the raw enum values; values are what the user sees.

- ref: citizenshipInfo.status
  component: select
  labels:                           # works with any enum values
    citizen: U.S. Citizen
    permanent_resident: Permanent Resident
    non_citizen: Non-Citizen

- ref: demographicInfo.isHispanicOrLatino
  component: radio
  labels:
    "true": "Yes"                   # quotes required — without them YAML
    "false": "No"                   # parses true/false as booleans, not strings

# ── Inline Permissions (per-field, per-role) ──────────────

- ref: socialSecurityNumber
  component: text-input
  permissions:
    applicant: editable           # editable | read-only | masked | hidden
    caseworker: editable
    reviewer: masked

# ── Conditional Visibility: Simple ────────────────────────

- ref: citizenshipInfo.immigrationInfo.documentType
  component: text-input
  show_when:
    field: citizenshipInfo.status
    not_equals: citizen           # equals | not_equals

# ── Conditional Visibility: JSON Logic (compound) ─────────

- ref: citizenshipInfo.immigrationInfo.sponsor.name.firstName
  component: text-input
  show_when:
    jsonlogic:
      and:
        - "!=":
            - var: citizenshipInfo.status
            - citizen
        - "==":
            - var: citizenshipInfo.immigrationInfo.hasSponsor
            - "true"

# ── Permissions Policy ────────────────────────────────────
# (Permissions tab)

role: caseworker                  # applicant | caseworker | reviewer
defaults: editable                # default permission for all fields
fields:                           # per-field overrides
  socialSecurityNumber: masked

# ── Test Data ─────────────────────────────────────────────
# (Test Data tab — mirrors the data model)

name:
  firstName: Jane
  lastName: Doe
dateOfBirth: "1990-01-15"         # ISO 8601: YYYY-MM-DD
socialSecurityNumber: "123-45-6789"
demographicInfo:
  sex: female                     # from OpenAPI enum
  race:                           # array for checkbox-group
    - white
    - asian
`;
