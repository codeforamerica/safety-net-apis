#!/usr/bin/env node
/**
 * Export schema data for the FigJam Schema Explorer widget.
 *
 * Unlike the Figma plugin export (which flattens data for populating designs),
 * this produces a structural view of schemas with field types, enums,
 * descriptions, and cross-schema relationships.
 *
 * Output: design-export/figjam-widget/schema-bundle.json
 *
 * Usage: npm run figjam:export
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import yaml from 'js-yaml';
import $RefParser from '@apidevtools/json-schema-ref-parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Convert camelCase to Title Case
 */
function toTitleCase(str) {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
    .trim();
}

/**
 * Determine the field type string
 */
function getFieldType(propSchema) {
  if (propSchema.type === 'array') return 'array';
  if (propSchema.type === 'object') return 'object';
  if (propSchema.type === 'boolean') return 'boolean';
  if (propSchema.type === 'integer') return 'integer';
  if (propSchema.type === 'number') return 'number';
  if (propSchema.format === 'date' || propSchema.format === 'date-time') return 'string';
  return propSchema.type || 'string';
}

/**
 * Extract fields from a schema, tracking $ref relationships
 */
function extractFields(schema, relationships, schemaName, parentPath = '') {
  const fields = [];
  const properties = {};

  // Merge allOf properties
  if (schema.allOf) {
    for (const part of schema.allOf) {
      if (part.properties) Object.assign(properties, part.properties);
    }
  }
  if (schema.properties) {
    Object.assign(properties, schema.properties);
  }

  const required = new Set(schema.required || []);

  for (const [propName, propSchema] of Object.entries(properties)) {
    const fieldPath = parentPath ? `${parentPath}.${propName}` : propName;

    const field = {
      name: fieldPath,
      type: getFieldType(propSchema),
      required: required.has(propName),
    };

    if (propSchema.format) field.format = propSchema.format;
    if (propSchema.description) field.description = propSchema.description;
    if (propSchema.enum) field.enum = propSchema.enum;

    // Track $ref relationships
    if (propSchema.$ref) {
      const refName = propSchema.$ref.split('/').pop();
      field.ref = refName;
      relationships.push({
        from: schemaName,
        to: refName,
        field: fieldPath,
        type: 'references',
      });
    }

    // Nested objects: recurse one level
    if (propSchema.type === 'object' && propSchema.properties) {
      const nested = extractFields(propSchema, relationships, schemaName, fieldPath);
      fields.push(...nested);
      continue;
    }

    // Array items with $ref
    if (propSchema.type === 'array' && propSchema.items) {
      if (propSchema.items.$ref) {
        const refName = propSchema.items.$ref.split('/').pop();
        field.ref = refName;
        relationships.push({
          from: schemaName,
          to: refName,
          field: fieldPath,
          type: 'contains',
        });
      }
    }

    fields.push(field);
  }

  return fields;
}

/**
 * Process a component file and extract all schemas
 */
async function processComponentFile(filePath, sourceRelative) {
  const schemas = {};
  const relationships = [];

  try {
    const dereferenced = await $RefParser.dereference(filePath, {
      dereference: { circular: 'ignore' },
    });

    for (const [schemaName, schema] of Object.entries(dereferenced)) {
      if (typeof schema !== 'object' || !schema) continue;
      // Skip non-schema entries (like openapi version strings)
      if (typeof schema === 'string') continue;

      const fields = extractFields(schema, relationships, schemaName);

      // Only include schemas that have fields
      if (fields.length === 0) continue;

      schemas[schemaName] = {
        name: schemaName,
        source: sourceRelative,
        description: schema.description || '',
        fields,
      };
    }
  } catch (err) {
    console.warn(`  Warning: Could not process ${sourceRelative}: ${err.message}`);
  }

  return { schemas, relationships };
}

async function main() {
  console.log('Exporting FigJam Widget Schema Data...\n');

  const componentsDir = join(__dirname, '../openapi/components');
  const componentFiles = [
    { file: 'application.yaml', source: 'openapi/components/application.yaml' },
    { file: 'person.yaml', source: 'openapi/components/person.yaml' },
    { file: 'household.yaml', source: 'openapi/components/household.yaml' },
    { file: 'income.yaml', source: 'openapi/components/income.yaml' },
    { file: 'common.yaml', source: 'openapi/components/common.yaml' },
  ];

  const allSchemas = {};
  const allRelationships = [];

  for (const { file, source } of componentFiles) {
    const filePath = join(componentsDir, file);
    if (!existsSync(filePath)) {
      console.warn(`  Skipping ${file} (not found)`);
      continue;
    }

    console.log(`  Processing: ${file}`);
    const { schemas, relationships } = await processComponentFile(filePath, source);

    Object.assign(allSchemas, schemas);
    allRelationships.push(...relationships);

    const schemaNames = Object.keys(schemas);
    console.log(`    Found ${schemaNames.length} schemas: ${schemaNames.join(', ')}`);
  }

  // Deduplicate relationships
  const seen = new Set();
  const uniqueRelationships = allRelationships.filter(r => {
    const key = `${r.from}->${r.to}:${r.field}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Filter relationships to only include schemas we have
  const validRelationships = uniqueRelationships.filter(
    r => allSchemas[r.from] && allSchemas[r.to]
  );

  const bundle = {
    schemas: allSchemas,
    relationships: validRelationships,
    exportedAt: new Date().toISOString(),
  };

  // Write output
  const outputDir = join(__dirname, '../design-export/figjam-widget');
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const outputPath = join(outputDir, 'schema-bundle.json');
  writeFileSync(outputPath, JSON.stringify(bundle, null, 2), 'utf8');

  console.log(`\nGenerated: ${outputPath}`);
  console.log(`  ${Object.keys(allSchemas).length} schemas`);
  console.log(`  ${validRelationships.length} relationships`);
  console.log('\nLoad this file into the FigJam Schema Explorer widget.');
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
