import React, { useState, useMemo, useCallback } from 'react';
import { Table } from '@trussworks/react-uswds';
import type {
  FormContract,
  FieldDefinition,
  PermissionsPolicy,
  ReferenceColumn,
} from './types';
import { labelFromRef, stripIndices } from './field-utils';
import { resolvePermission } from './PermissionsResolver';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AnnotationLayer {
  name: string;
  data: Record<string, unknown>;
}

interface ReferenceRendererProps {
  contract: FormContract;
  annotationLayers?: AnnotationLayer[];
  permissionsPolicies?: PermissionsPolicy[];
  schemaSpec?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Schema resolution
// ---------------------------------------------------------------------------

interface SchemaProperty {
  type?: string;
  format?: string;
  enum?: string[];
  description?: string;
}

function resolveSchemaProperty(
  spec: Record<string, unknown>,
  dotPath: string,
): SchemaProperty | null {
  if (!spec) return null;
  const schemas = (spec as any)?.components?.schemas;
  if (!schemas) return null;

  const segments = stripIndices(dotPath).split('.');
  let current: any = schemas.Application;

  for (let i = 0; i < segments.length; i++) {
    if (!current?.properties) return null;
    const prop = current.properties[segments[i]];
    if (!prop) return null;

    if (i === segments.length - 1) return prop as SchemaProperty;

    if (prop.$ref) {
      current = schemas[prop.$ref.split('/').pop()!];
      continue;
    }
    if (prop.items?.$ref) {
      current = schemas[prop.items.$ref.split('/').pop()!];
      continue;
    }
    if (prop.type === 'object' && prop.properties) {
      current = prop;
      continue;
    }
    return null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Annotation resolution
// ---------------------------------------------------------------------------

interface AnnotationEntry {
  label?: string;
  source?: string;
  statute?: string;
  notes?: string;
  programs?: Record<string, string>;
  [key: string]: unknown;
}

function resolveAnnotation(
  layerData: Record<string, unknown> | undefined,
  fieldRef: string,
): AnnotationEntry | null {
  if (!layerData) return null;
  const fields = (layerData as any)?.fields;
  if (!fields) return null;
  const stripped = stripIndices(fieldRef);
  return (fields[stripped] ?? fields[fieldRef]) as AnnotationEntry | null;
}

// ---------------------------------------------------------------------------
// Column value resolution
// ---------------------------------------------------------------------------

function resolveAnnotationValue(
  annotation: AnnotationEntry | null,
  path: string,
): string {
  if (!annotation) return '';
  switch (path) {
    case 'label': return annotation.label ?? '';
    case 'source': return annotation.source ?? '';
    case 'statute': return annotation.statute ?? '';
    case 'notes': return annotation.notes ?? '';
    case 'programs': {
      const programs = annotation.programs;
      return programs ? Object.keys(programs).join(', ') : '';
    }
    default: {
      if (path.startsWith('programs.')) {
        return annotation.programs?.[path.slice('programs.'.length)] ?? '';
      }
      return String(annotation[path] ?? '');
    }
  }
}

function resolveColumnValue(
  column: ReferenceColumn,
  field: FieldDefinition,
  fullRef: string,
  annotationsByLayer: Record<string, AnnotationEntry | null>,
  schemaSpec: Record<string, unknown> | undefined,
  permissionsPolicies: PermissionsPolicy[],
): string {
  const [namespace, ...pathParts] = column.from.split('.');
  const path = pathParts.join('.');

  switch (namespace) {
    case 'field': {
      switch (path) {
        case 'ref': return stripIndices(fullRef);
        case 'component': return field.component;
        case 'label': return labelFromRef(fullRef);
        case 'hint': return field.hint ?? '';
        case 'width': return field.width ?? 'full';
        default: return '';
      }
    }
    case 'schema': {
      if (!schemaSpec) return '';
      const prop = resolveSchemaProperty(schemaSpec, stripIndices(fullRef));
      if (!prop) return '';
      switch (path) {
        case 'type': return prop.type ?? '';
        case 'format': return prop.format ?? '';
        case 'enum': return prop.enum?.join(', ') ?? '';
        case 'description': return prop.description ?? '';
        default: return '';
      }
    }
    case 'annotation': {
      const [layerName, ...restParts] = pathParts;
      if (!layerName) return '';
      const entry = annotationsByLayer[layerName];
      return resolveAnnotationValue(entry ?? null, restParts.join('.'));
    }
    case 'permissions': {
      const policy = permissionsPolicies.find((p) => p.role === path);
      if (!policy) return '';
      return resolvePermission(field, path as any, policy);
    }
    default: return '';
  }
}

// ---------------------------------------------------------------------------
// Field flattening
// ---------------------------------------------------------------------------

function flattenFields(
  fields: FieldDefinition[],
  parentRef?: string,
): { field: FieldDefinition; fullRef: string }[] {
  const result: { field: FieldDefinition; fullRef: string }[] = [];
  for (const field of fields) {
    const fullRef = parentRef ? `${parentRef}.${field.ref}` : field.ref;
    if (field.component === 'field-array' && field.fields) {
      result.push({ field, fullRef });
      result.push(...flattenFields(field.fields, fullRef));
    } else {
      result.push({ field, fullRef });
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// Resolved row — fully pre-computed, keyed by stable index
// ---------------------------------------------------------------------------

interface ResolvedRow {
  idx: number;
  field: FieldDefinition;
  fullRef: string;
  pageId: string;
  pageTitle: string;
  values: Record<string, string>; // keyed by column.from
}

type SortDirection = 'asc' | 'desc';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ReferenceRenderer({
  contract,
  annotationLayers = [],
  permissionsPolicies = [],
  schemaSpec,
}: ReferenceRendererProps) {
  const { pages, columns = [], title } = contract.form;
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  // Pre-resolve every row with all column values
  const allRows = useMemo<ResolvedRow[]>(() => {
    const rows: ResolvedRow[] = [];
    let idx = 0;
    for (const page of pages) {
      for (const { field, fullRef } of flattenFields(page.fields)) {
        // Build annotation lookup for this field
        const byLayer: Record<string, AnnotationEntry | null> = {};
        for (const layer of annotationLayers) {
          byLayer[layer.name] = resolveAnnotation(layer.data, fullRef);
        }

        const values: Record<string, string> = {};
        for (const col of columns) {
          values[col.from] = resolveColumnValue(col, field, fullRef, byLayer, schemaSpec, permissionsPolicies);
        }

        rows.push({ idx: idx++, field, fullRef, pageId: page.id, pageTitle: page.title, values });
      }
    }
    return rows;
  }, [pages, columns, annotationLayers, schemaSpec, permissionsPolicies]);

  // Global sorted view (null = no sort, use page grouping)
  const displayRows = useMemo<ResolvedRow[] | null>(() => {
    if (!sortCol) return null;
    return [...allRows].sort((a, b) => {
      const va = a.values[sortCol] ?? '';
      const vb = b.values[sortCol] ?? '';
      if (va === '' && vb !== '') return 1;
      if (va !== '' && vb === '') return -1;
      const cmp = va.localeCompare(vb, undefined, { sensitivity: 'base' });
      return sortDir === 'desc' ? -cmp : cmp;
    });
  }, [allRows, sortCol, sortDir]);

  const handleSort = useCallback((colFrom: string) => {
    setSortCol((prev) => {
      if (prev === colFrom) {
        // Same column — toggle direction
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      // New column — start ascending
      setSortDir('asc');
      return colFrom;
    });
  }, []);

  const clearSort = useCallback(() => {
    setSortCol(null);
    setSortDir('asc');
  }, []);

  if (columns.length === 0) {
    return <p>No columns configured in this reference contract.</p>;
  }

  const fieldCount = allRows.length;

  return (
    <div className="grid-container" style={{ maxWidth: '100%', padding: '1rem' }}>
      <h1 style={{ marginBottom: '0.5rem' }}>{title}</h1>
      <p style={{ color: '#71767a', marginTop: 0, marginBottom: '1.5rem' }}>
        {fieldCount} fields across {pages.length} sections
        {sortCol && (
          <button
            onClick={clearSort}
            style={{
              marginLeft: '1rem',
              background: 'transparent',
              border: '1px solid #71767a',
              borderRadius: '4px',
              color: '#71767a',
              fontSize: '12px',
              padding: '2px 8px',
              cursor: 'pointer',
            }}
          >
            Clear sort
          </button>
        )}
      </p>

      <Table bordered striped compact className="font-sans-2xs">
        <thead>
          <tr>
            {columns.map((col) => {
              const active = sortCol === col.from;
              const arrow = active ? (sortDir === 'asc' ? ' \u25B2' : ' \u25BC') : '';
              return (
                <th
                  key={col.from}
                  role="columnheader"
                  aria-sort={active ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  onClick={() => handleSort(col.from)}
                  style={{
                    whiteSpace: 'nowrap',
                    padding: '8px 10px',
                    cursor: 'pointer',
                    userSelect: 'none',
                  }}
                >
                  {col.label}{arrow}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {displayRows
            ? displayRows.map((row) => (
                <FieldRow key={row.idx} row={row} columns={columns} />
              ))
            : pages.map((page) => (
                <React.Fragment key={page.id}>
                  <tr>
                    <td
                      colSpan={columns.length}
                      style={{
                        background: '#1b1b1b',
                        color: '#fff',
                        fontWeight: 700,
                        padding: '8px 10px',
                        fontSize: '14px',
                      }}
                    >
                      {page.title}
                    </td>
                  </tr>
                  {allRows
                    .filter((r) => r.pageId === page.id)
                    .map((row) => (
                      <FieldRow key={row.idx} row={row} columns={columns} />
                    ))}
                </React.Fragment>
              ))
          }
        </tbody>
      </Table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Row rendering
// ---------------------------------------------------------------------------

function FieldRow({ row, columns }: { row: ResolvedRow; columns: ReferenceColumn[] }) {
  const isFieldArray = row.field.component === 'field-array';

  return (
    <tr style={isFieldArray ? { background: '#f0f0f0', fontWeight: 600 } : undefined}>
      {columns.map((col) => {
        const value = row.values[col.from] ?? '';
        const parts = col.from.split('.');
        const isProgram = parts[0] === 'annotation' && parts.length >= 4 && parts[2] === 'programs';

        return (
          <td
            key={col.from}
            style={{
              padding: '6px 10px',
              whiteSpace: isProgram ? 'nowrap' : undefined,
            }}
          >
            {value}
          </td>
        );
      })}
    </tr>
  );
}
