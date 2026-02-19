import React, { useState, useMemo, useCallback } from 'react';
import { Table } from '@trussworks/react-uswds';
import type {
  Page,
  ReferenceColumn,
  PermissionsPolicy,
  AnnotationLayer,
  DataTableSource,
} from './types';
import {
  resolveContractRows,
  sortRows,
  type ResolvedRow,
  type SortDirection,
} from './data-table-resolvers';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface DataTableRendererProps {
  pages: Page[];
  columns: ReferenceColumn[];
  title?: string;
  source?: DataTableSource;
  // source: contract props
  annotationLayers?: AnnotationLayer[];
  permissionsPolicies?: PermissionsPolicy[];
  schemaSpec?: Record<string, unknown>;
  // source: api props (future — #79)
  data?: Record<string, unknown>[];
  /** Callback when a row is clicked (used by master-detail navigation). */
  onRowClick?: (row: ResolvedRow) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function DataTableRenderer({
  pages,
  columns,
  title,
  source = 'contract',
  annotationLayers = [],
  permissionsPolicies = [],
  schemaSpec,
  data,
  onRowClick,
}: DataTableRendererProps) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  // Pre-resolve every row with all column values
  const allRows = useMemo<ResolvedRow[]>(() => {
    if (source === 'api' && data) {
      // API source: map data rows directly to column values by key
      return data.map((row, idx) => ({
        idx,
        field: { ref: String(idx), component: 'text-input' as const },
        fullRef: String(idx),
        pageId: '',
        pageTitle: '',
        values: Object.fromEntries(
          columns.map((col) => [col.from, String(row[col.from] ?? '')]),
        ),
      }));
    }
    return resolveContractRows(pages, columns, annotationLayers, permissionsPolicies, schemaSpec);
  }, [source, pages, columns, annotationLayers, schemaSpec, permissionsPolicies, data]);

  // Global sorted view (null = no sort, use page grouping)
  const displayRows = useMemo<ResolvedRow[] | null>(() => {
    if (!sortCol) return null;
    return sortRows(allRows, sortCol, sortDir);
  }, [allRows, sortCol, sortDir]);

  const handleSort = useCallback((colFrom: string) => {
    setSortCol((prev) => {
      if (prev === colFrom) {
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
        return prev;
      }
      setSortDir('asc');
      return colFrom;
    });
  }, []);

  const clearSort = useCallback(() => {
    setSortCol(null);
    setSortDir('asc');
  }, []);

  if (columns.length === 0) {
    return <p>No columns configured in this data table.</p>;
  }

  const fieldCount = allRows.length;

  return (
    <div className="grid-container" style={{ maxWidth: '100%', padding: '1rem' }}>
      {title && <h1 style={{ marginBottom: '0.5rem' }}>{title}</h1>}
      <p style={{ color: '#71767a', marginTop: 0, marginBottom: '1.5rem' }}>
        {source === 'api' ? `${fieldCount} records` : `${fieldCount} fields across ${pages.length} sections`}
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
          {displayRows || source === 'api'
            ? (displayRows ?? allRows).map((row) => (
                <FieldRow key={row.idx} row={row} columns={columns} onClick={onRowClick} />
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
                      <FieldRow key={row.idx} row={row} columns={columns} onClick={onRowClick} />
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

function FieldRow({
  row,
  columns,
  onClick,
}: {
  row: ResolvedRow;
  columns: ReferenceColumn[];
  onClick?: (row: ResolvedRow) => void;
}) {
  const isFieldArray = row.field.component === 'field-array';
  const clickable = !!onClick;

  const handleKeyDown = clickable
    ? (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(row);
        }
      }
    : undefined;

  return (
    <tr
      style={{
        ...(isFieldArray ? { background: '#f0f0f0', fontWeight: 600 } : undefined),
        ...(clickable ? { cursor: 'pointer' } : undefined),
      }}
      onClick={clickable ? () => onClick(row) : undefined}
      onKeyDown={handleKeyDown}
      tabIndex={clickable ? 0 : undefined}
      role={clickable ? 'link' : undefined}
      aria-label={clickable ? `View details for ${row.values[columns[0]?.from] ?? `row ${row.idx}`}` : undefined}
    >
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
