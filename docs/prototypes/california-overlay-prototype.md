# Proposal: California Applications Overlay Prototype

**Status:** Draft

**Depends on:** [Contracts package restructure](../decisions/contracts-package-restructure.md) merged first (independent of fast-food order prototype)

**Sections:**

1. **[California Overlay](#california-overlay)** — The use case, what overlays do, walkthrough
2. **[Prototype Scope](#prototype-scope)** — What's covered, what's deferred
3. **[Example Design](#example-design)** — Overlay modifications, how they apply
4. **[Deliverables](#deliverables)** — Files and directory structure

---

## California Overlay

States customize federal benefit programs. California uses different terminology, adds state-specific fields, and extends enum values. Today, these customizations are hardcoded per deployment — changing a term means changing code. There's no way to see all California-specific changes in one place or validate that they produce a valid API spec.

An **overlay** is a declarative document that modifies a base OpenAPI spec without forking it. The base spec represents the federal/generic API. The overlay specifies targeted modifications — rename a field, add an enum value, extend a schema — and a resolution script applies them to produce a California-specific spec. The base spec stays clean. The overlay captures all state customizations in one place. The resolved spec is validated like any other OpenAPI spec.

### Purpose

A runnable example demonstrating how states customize base contracts using overlays. Uses the existing applications domain (real data from the project's OpenAPI specs) with California-specific modifications.

### What the system does

| Capability | Example |
|-----------|---------|
| **Renames terminology** | Federal "citizenship status" values become California-specific terms (e.g., `citizen` → `us_citizen`, adding `prucol` status). The overlay replaces the enum — the resolved spec uses California terminology throughout. |
| **Adds enum values** | California adds state-specific program types beyond the federal base (e.g., `general_assistance`). The overlay extends the enum list. |
| **Produces a valid resolved spec** | `npm run overlay:resolve` applies the overlay to the base spec and outputs a resolved YAML file. The resolved spec passes `npm run validate` — it's a valid OpenAPI spec with California's modifications applied. |

### Walkthrough

**Setup:**
1. Base OpenAPI specs exist at their standard locations (after the contracts package restructure)
2. The California overlay YAML file specifies modifications targeting the base specs
3. The overlay resolver script exists and is functional

**1. Inspect the base spec** — look at the citizenship status enum in the persons OpenAPI spec

*What you see:*
- Standard federal values: `citizen`, `permanent_resident`, `qualified_non_citizen`, `undocumented`, `other`
- Generic program names

**2. Apply the overlay** — `npm run overlay:resolve` with the California overlay

*What happens:*
- Overlay resolver reads the base spec and the overlay YAML
- Each overlay action is applied: enum replacements, property additions
- Resolved spec is written to output

**3. Inspect the resolved spec** — compare the resolved output to the base

*What you see:*
- Citizenship status enum now uses California terms: `us_citizen`, `lawful_permanent_resident`, `qualified_alien`, `prucol`, `undocumented`, `other`
- Program enum includes California-specific entries like `general_assistance`
- All other parts of the spec are unchanged

**4. Validate the resolved spec** — `npm run validate` against the resolved output

*What happens:*
- Resolved spec passes OpenAPI validation — it's a complete, valid spec
- Demonstrates that overlays produce correct output

### What this proves

| What | How |
|------|-----|
| Overlays modify base specs without forking | Base spec is unchanged; overlay is a separate file |
| Terminology customization works | Citizenship status enum is replaced with California terms |
| Enum extension works | Program enum gets additional California-specific values |
| Resolved specs are valid | `npm run validate` passes on the resolved output |
| All changes are visible in one place | The overlay file lists every California modification |
| Overlay resolution is repeatable | Running the resolver again produces the same output |

---

## Prototype Scope

This is the simplest of the three behavioral contract prototypes. It proves a single concept — **overlay-based state customization** — using real data from the project's existing OpenAPI specs.

The [existing overlay example](../../packages/schemas/openapi/overlays/example/modifications.yaml) is the starting point. This prototype relocates it to the examples directory (per the contracts package restructure) and enhances the documentation to serve as a standalone runnable example.

### Architecture concepts exercised

| Concept | Exercised by |
|---------|-------------|
| Overlay specification (OpenAPI Overlay 1.0) | `overlay-modifications.yaml` with targeted actions |
| Enum replacement | Citizenship status values |
| Enum extension | Program types |
| Overlay resolution | `npm run overlay:resolve` produces valid output |
| State customization without forking | Base spec unchanged, California spec derived |

### What's not in the prototype

- **Property additions** — adding California-specific fields to schemas. The existing example overlay demonstrates this (adding `regionCode`/`regionName` to Person); this prototype may include it depending on scope.
- **Multiple overlays** — composing overlays from different sources (county + state). Would require overlay ordering/merging logic.
- **Behavioral contract overlays** — modifying state machines, rules, or metrics per state. Would follow the same overlay mechanism applied to different artifact types.
- **Overlay validation** — checking that overlay targets reference real paths in the base spec before resolution. Would prevent typos in JSONPath targets.
- **Per-environment overlays** — different overlays for dev/staging/production.

---

## Example Design

Based on the existing `overlays/example/modifications.yaml`, relocated and enhanced.

### Overlay modifications

The overlay file demonstrates two core customization patterns:

**1. Terminology replacement — citizenship status**

Replace the federal citizenship status enum with California-specific values:

| Base value | California value |
|-----------|-----------------|
| citizen | us_citizen |
| permanent_resident | lawful_permanent_resident |
| qualified_non_citizen | qualified_alien |
| *(new)* | prucol |
| undocumented | undocumented |
| other | other |

Target: `$.components.schemas.CitizenshipInfo.properties.status.enum` in the persons spec.

**2. Enum extension — program types**

Replace generic program names with California-branded names and add state-specific programs:

| Base value | California value |
|-----------|-----------------|
| snap | snap_state |
| tanf | tanf_state |
| medicaid | medicaid_state |
| *(new)* | general_assistance |

Target: `$.Program.enum` in `components/common.yaml`.

### How `npm run overlay:resolve` applies the overlay

1. Reads the base OpenAPI spec(s)
2. Reads the overlay YAML — a list of actions, each with a JSONPath `target` and an `update` value
3. For each action, locates the target in the base spec and applies the update (replace, merge, or extend)
4. Writes the resolved spec to output
5. The resolved spec is a complete, valid OpenAPI document

---

## Deliverables

All files live under `packages/contracts/examples/california-applications/`:

```
examples/california-applications/
  README.md                                 # what this demonstrates, how to apply
  overlay-modifications.yaml                # California-specific overlay
```

### Verification

1. `npm run overlay:resolve` with the example overlay produces a valid resolved spec
2. Resolved spec passes `npm run validate`
3. Changes are visible in the resolved output (enum replaced, enum extended)
