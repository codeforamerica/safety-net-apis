#!/usr/bin/env node
/**
 * Pipeline Orchestrator
 *
 * Runs the full CSV-to-overlay-to-storybook pipeline:
 *   1. Federal CSV → OpenAPI schema
 *   2. Federal CSV → federal annotation overlay
 *   3. California CSV → state overlay
 *   4. Apply overlays → resolved spec
 *   5. Resolved spec → Zod schemas (→ src/schemas/)
 *   6. Resolved spec → annotations YAML (→ src/contracts/)
 *
 * Usage: node scripts/pipeline/generate-pipeline.js
 */

import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import { generateOpenAPISchema } from './step1-csv-to-openapi.js';
import { generateFederalOverlay } from './step2-csv-to-federal-overlay.js';
import { generateStateOverlay } from './step3-csv-to-state-overlay.js';
import { applyOverlays } from './step4-apply-overlays.js';
import { generateZodSchemas } from './step5-openapi-to-zod.js';
import { generateAnnotations } from './step6-openapi-to-annotations.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..', '..');

// ─── Paths ───────────────────────────────────────────────────────────────────

const FEDERAL_CSV   = join(ROOT, 'data', 'federal-benefits-data-model.csv');
const CA_CSV        = join(ROOT, 'data', 'states', 'california-benefits-overlay.csv');

const BASE_SCHEMA   = join(ROOT, 'generated', 'openapi', 'federal-benefits-schema.yaml');
const FED_OVERLAY   = join(ROOT, 'generated', 'overlays', 'federal-annotations.overlay.yaml');
const CA_OVERLAY    = join(ROOT, 'generated', 'overlays', 'california.overlay.yaml');
const RESOLVED_SPEC = join(ROOT, 'generated', 'resolved', 'california-benefits-schema.yaml');

const ZOD_OUT       = join(ROOT, 'src', 'schemas', 'application.ts');
const ANNOTATIONS   = join(ROOT, 'src', 'contracts', 'application', 'annotations.yaml');

// ─── Run ─────────────────────────────────────────────────────────────────────

function main() {
  console.log('=== CSV-to-Overlay Pipeline ===\n');

  console.log('Step 1: Federal CSV → OpenAPI schema');
  generateOpenAPISchema(FEDERAL_CSV, BASE_SCHEMA);
  console.log(`  → ${BASE_SCHEMA}\n`);

  console.log('Step 2: Federal CSV → federal annotation overlay');
  generateFederalOverlay(FEDERAL_CSV, FED_OVERLAY);
  console.log(`  → ${FED_OVERLAY}\n`);

  console.log('Step 3: California CSV → state overlay');
  generateStateOverlay(CA_CSV, CA_OVERLAY);
  console.log(`  → ${CA_OVERLAY}\n`);

  console.log('Step 4: Apply overlays → resolved spec');
  applyOverlays(BASE_SCHEMA, [FED_OVERLAY, CA_OVERLAY], RESOLVED_SPEC);
  console.log(`  → ${RESOLVED_SPEC}\n`);

  console.log('Step 5: Resolved spec → Zod schemas');
  generateZodSchemas(RESOLVED_SPEC, ZOD_OUT);
  console.log(`  → ${ZOD_OUT}\n`);

  console.log('Step 6: Resolved spec → annotations YAML');
  generateAnnotations(RESOLVED_SPEC, ANNOTATIONS);
  console.log(`  → ${ANNOTATIONS}\n`);

  console.log('=== Pipeline complete ===');
}

main();
