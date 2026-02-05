# Safety Net Schema Explorer - FigJam Widget

A FigJam widget for collaboratively exploring, annotating, and proposing changes to the Safety Net API data models. Unlike the existing Figma plugin (which populates designs with example data), this widget enables **bidirectional** collaboration: teams explore schemas on a FigJam board and export structured proposals that can drive schema changes.

## How It Works

```
OpenAPI YAML --> [figjam:export] --> schema-bundle.json --> FigJam Widget --> [export] --> proposals.json
```

1. **Export** your schemas to a JSON bundle (`npm run figjam:export`)
2. **Load** the bundle into the widget on a FigJam board
3. **Explore** schema cards showing fields, types, enums, required markers
4. **Propose** structured changes (add/remove/rename fields, change types, add enum values, ask questions, leave notes)
5. **Export** proposals as JSON for downstream processing (GitHub issues, draft PRs, review checklists)

## Quick Start

### 1. Install and build

```bash
cd packages/schemas/figjam-widget
npm install
npm run build
```

### 2. Generate schema data

```bash
npm run figjam:export       # from repo root
# or
npm run figjam:export       # from packages/schemas
```

This creates `design-export/figjam-widget/schema-bundle.json`.

### 3. Load in FigJam

1. Open a FigJam board
2. Go to **Widgets** > **Development** > **Import widget from manifest...**
3. Select `packages/schemas/figjam-widget/manifest.json`
4. Drop the widget onto the board
5. Click **Load Schema Data** and drag in `schema-bundle.json`
6. Pick a schema to display

### 4. Collaborate

- **Click a field** to open the proposal panel
- **Right-click the widget** for Load Data, Add Proposal, Export, Switch Schema
- **Multiple users** can annotate simultaneously (proposals use synced state)
- **Drop multiple widget instances** on the board, one per schema, to see the full model

### 5. Export proposals

Click **Export** to get structured JSON like:

```json
{
  "source": "figjam-schema-explorer",
  "exportedAt": "2026-02-05T...",
  "proposals": [
    {
      "action": "addField",
      "schemaName": "HouseholdMember",
      "proposedName": "primaryLanguage",
      "proposedType": "string",
      "description": "Needed for scheduling bilingual caseworkers",
      "author": "Maria S.",
      "votes": 3,
      "replies": []
    }
  ]
}
```

## Proposal Actions

| Action | Use Case | Captured Data |
|--------|----------|---------------|
| **Add Field** | New field needed | name, type, rationale |
| **Remove Field** | Field is unused/wrong | field path, rationale |
| **Change Type** | Wrong type | field path, new type |
| **Rename** | Better name exists | field path, new name |
| **Add Enum Value** | Missing option | field path, new value |
| **Question** | Needs discussion | field path, question text |
| **Note** | Context/background | field path, note text |

## Project Structure

```
figjam-widget/
├── manifest.json      # FigJam widget manifest (editorType: figjam)
├── package.json
├── tsconfig.json      # JSX configured for figma.widget.h
├── build.js           # esbuild bundler
└── src/
    ├── types.ts       # TypeScript types (SchemaBundle, Proposal, etc.)
    ├── widget.tsx      # Widget rendering (schema cards, fields, proposals)
    └── ui.html        # UI panel (load data, add proposals, export)
```

Related files outside this directory:
- `scripts/export-figjam-widget-data.js` - Schema export script
- `design-export/figjam-widget/schema-bundle.json` - Generated data (gitignored)

## Architecture Notes

- **Widget API** (not Plugin API): Widgets are persistent, interactive objects on the FigJam board. Multiple users interact with the same widget instance simultaneously.
- **`useSyncedState`** stores schema data and UI state, shared across all viewers.
- **`useSyncedMap`** stores proposals, allowing concurrent additions without conflicts.
- **UI iframe** (`ui.html`) handles complex interactions (file loading, forms, export). The widget opens it via `figma.showUI()` and communicates through `postMessage`.

## Open Items / TODO

### High Priority

- [ ] **Relationship detection in export script**: `$RefParser.dereference()` resolves `$ref`s before we can detect them. Need a second pass using `yaml.load()` on raw files to find `$ref` links, then map them to relationship entries in the bundle. This would enable drawing connector lines between schema cards.
- [ ] **Install and verify build**: Run `npm install && npm run build` and confirm the widget loads in FigJam without errors. The widget code compiles against `@figma/widget-typings` but hasn't been tested in FigJam yet.
- [ ] **Test proposal round-trip**: Load schemas, add a few proposals, export, and verify the JSON structure matches what downstream scripts would expect.

### Medium Priority

- [ ] **Proposal import script** (`scripts/import-figjam-proposals.js`): Read exported proposals JSON and generate GitHub issues (one per proposal, labeled by schema and action type). This closes the feedback loop.
- [ ] **Draft PR generation**: For `addField`/`removeField`/`rename` proposals, generate actual YAML diffs that could be applied to the OpenAPI specs.
- [ ] **Spawn all schemas**: A "Create Board" action that drops one widget instance per schema, auto-arranged on the FigJam board, instead of manually adding each one.
- [ ] **Voting in widget**: Let users upvote proposals directly on the card (currently `votes` is in the data model but not wired to a UI action).
- [ ] **Field search/filter**: Add a search input to the widget card for large schemas (Application has 100+ fields).

### Low Priority / Nice to Have

- [ ] **Schema diffing**: Compare two versions of the schema bundle and highlight what changed since the last session.
- [ ] **Connector lines**: Use FigJam connector API to draw relationship lines between widget instances when relationships are detected.
- [ ] **Proposal comments/replies**: The `replies` array is in the data model but reply UI isn't built yet.
- [ ] **Custom color themes**: Let users pick header colors per schema domain for visual grouping.
- [ ] **Read-only mode**: A view-only version of the widget for stakeholders who shouldn't add proposals.

## Relationship to Existing Figma Plugin

| | Figma Plugin (`figma-plugin/`) | FigJam Widget (`figjam-widget/`) |
|---|---|---|
| **Editor** | Figma (design files) | FigJam (whiteboards) |
| **Purpose** | Populate designs with example data | Explore schemas and propose changes |
| **Direction** | One-way (data into Figma) | Bidirectional (explore + export proposals) |
| **Interaction** | Run once, fills text layers | Persistent on board, real-time collaboration |
| **Data format** | Flat field/value pairs | Structured schema hierarchy |
