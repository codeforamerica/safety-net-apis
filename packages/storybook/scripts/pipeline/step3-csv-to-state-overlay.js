/**
 * Step 3: California CSV → state overlay YAML
 *
 * Parses the California benefits overlay CSV and generates an OpenAPI overlay
 * with actions based on OverlayAction (update, remove, add, add_program).
 *
 * Output: generated/overlays/california.overlay.yaml
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import yaml from 'js-yaml';
import { parseCSV } from './csv-parser.js';
import {
  INCLUDED_ENTITIES,
  CA_PROGRAM_MAP,
  CA_PROGRAM_COLUMNS,
  openapiFieldPath,
  csvTypeToOpenAPI,
} from './entity-map.js';

/**
 * @param {string} csvPath - Path to California CSV
 * @param {string} outPath - Path for output YAML
 */
export function generateStateOverlay(csvPath, outPath) {
  const text = readFileSync(csvPath, 'utf-8');
  const rows = parseCSV(text);

  const actions = [];
  let updateCount = 0, removeCount = 0, addCount = 0, addProgramCount = 0, skippedCount = 0;

  for (const row of rows) {
    const action = row.OverlayAction;
    const entity = row.Entity;

    // Skip add_program rows (they define CA-only programs, not field changes)
    if (action === 'add_program') {
      addProgramCount++;
      continue;
    }

    // Skip entities not in scope
    if (!INCLUDED_ENTITIES.includes(entity)) {
      skippedCount++;
      continue;
    }

    if (!row.Field) continue;

    if (action === 'update') {
      const update = {};

      // CA-specific metadata
      const statute = row['CA Policy/Statute'];
      if (statute) update['x-ca-statute'] = statute;

      const notes = row['CA Notes'];
      if (notes) update['x-ca-notes'] = notes;

      // CA program columns
      for (const col of CA_PROGRAM_COLUMNS) {
        const value = row[col];
        if (value) {
          const key = CA_PROGRAM_MAP[col];
          update[key] = value;
        }
      }

      // Enum override (e.g., preferredLanguage with additional CA languages)
      if (row['CA EnumValues']) {
        const values = row['CA EnumValues'].split('|').map(v => v.trim()).filter(Boolean);
        update.enum = values;
      }

      if (Object.keys(update).length === 0) continue;

      const target = openapiFieldPath(entity, row.Field);
      actions.push({
        target,
        description: `CA update: ${entity}.${row.Field}`,
        update,
      });
      updateCount++;

    } else if (action === 'remove') {
      const target = openapiFieldPath(entity, row.Field);
      actions.push({
        target,
        description: `CA remove: ${entity}.${row.Field}`,
        remove: true,
      });
      removeCount++;

    } else if (action === 'add') {
      // Add a new field to the entity
      const typeInfo = csvTypeToOpenAPI(row['CA DataType'], row['CA EnumValues']);

      if (row['CA Label']) {
        typeInfo.description = row['CA Label'];
      }

      // CA-specific metadata on the new field
      const statute = row['CA Policy/Statute'];
      if (statute) typeInfo['x-ca-statute'] = statute;

      const notes = row['CA Notes'];
      if (notes) typeInfo['x-ca-notes'] = notes;

      const source = row['CA Source'];
      if (source) typeInfo['x-source'] = source;

      // CA program columns
      for (const col of CA_PROGRAM_COLUMNS) {
        const value = row[col];
        if (value) {
          const key = CA_PROGRAM_MAP[col];
          typeInfo[key] = value;
        }
      }

      const target = `$.components.schemas.${entity}.properties`;
      actions.push({
        target,
        description: `CA add: ${entity}.${row.Field}`,
        update: { [row.Field]: typeInfo },
      });
      addCount++;
    }
  }

  const overlay = {
    overlay: '1.0.0',
    info: {
      title: 'California Benefits Overlay',
      version: '1.0.0',
    },
    actions,
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, yaml.dump(overlay, { lineWidth: 120, noRefs: true }));

  console.log(`  ${actions.length} actions: ${updateCount} update, ${removeCount} remove, ${addCount} add`);
  console.log(`  ${addProgramCount} add_program rows (CA-only programs, metadata only)`);
  if (skippedCount) console.log(`  ${skippedCount} rows skipped (entities not in scope)`);

  return overlay;
}
