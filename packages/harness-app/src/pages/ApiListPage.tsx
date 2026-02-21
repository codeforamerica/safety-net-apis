import { useCallback, useMemo, useState } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import { Table, Alert, Button } from '@trussworks/react-uswds';
import { useApiData } from '../hooks/useApiData';
import { genericApi } from '../api/generic';
import type { ListResponse } from '../api/generic';
import type { ApiSpec } from '../hooks/useManifest';

const PAGE_SIZE = 25;

/** Pick a reasonable subset of columns from the schema's top-level properties. */
function deriveColumns(
  schema: Record<string, unknown> | undefined,
): { key: string; label: string }[] {
  if (!schema) return [{ key: 'id', label: 'ID' }];

  const props = (schema as { properties?: Record<string, unknown> }).properties;
  if (!props) return [{ key: 'id', label: 'ID' }];

  const columns: { key: string; label: string }[] = [];
  for (const key of Object.keys(props)) {
    const prop = props[key] as { type?: string; format?: string };
    if (prop.type === 'object' || prop.type === 'array') continue;
    if (prop.format === 'date-time') continue;
    columns.push({
      key,
      label: key
        .replace(/([A-Z])/g, ' $1')
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim(),
    });
    if (columns.length >= 5) break;
  }
  return columns.length > 0 ? columns : [{ key: 'id', label: 'ID' }];
}

function getCellValue(item: Record<string, unknown>, key: string): string {
  const val = item[key];
  if (val == null) return '';
  if (typeof val === 'object') return JSON.stringify(val);
  return String(val);
}

export function ApiListPage() {
  const { apiName } = useParams<{ apiName: string }>();
  const navigate = useNavigate();
  const { apis } = useOutletContext<{ apis: ApiSpec[] }>();
  const [offset, setOffset] = useState(0);

  const api = apis.find((a) => a.name === apiName);
  const basePath = api?.baseResource ?? `/${apiName}`;

  const fetcher = useCallback(
    () => genericApi(basePath).list({ limit: PAGE_SIZE, offset }),
    [basePath, offset],
  );
  const { data, loading, error } = useApiData<ListResponse>(fetcher);

  const resourceSchema = useMemo(() => {
    if (!api?.schemas) return undefined;
    const names = Object.keys(api.schemas);
    const primary = names.find(
      (n) =>
        !n.includes('List') &&
        !n.includes('Create') &&
        !n.includes('Update') &&
        !n.includes('Error') &&
        !n.includes('Pagination'),
    );
    return primary ? (api.schemas[primary] as Record<string, unknown>) : undefined;
  }, [api?.schemas]);

  const columns = useMemo(() => deriveColumns(resourceSchema), [resourceSchema]);

  const hasCreate = api?.endpoints?.some(
    (e) => e.method === 'POST' && !e.path.includes('{'),
  );

  if (loading) {
    return <p className="usa-prose">Loading {api?.title ?? apiName}...</p>;
  }

  if (error) {
    return (
      <Alert type="error" headingLevel="h3" heading={`Error loading ${api?.title ?? apiName}`}>
        {error}
      </Alert>
    );
  }

  const items = (data?.items ?? []) as Record<string, unknown>[];
  const total = data?.total ?? 0;
  const hasNext = data?.hasNext ?? false;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div>
      <h2>{api?.title ?? apiName}</h2>

      {items.length === 0 ? (
        <p className="usa-prose">No records found.</p>
      ) : (
        <>
          <Table bordered fullWidth>
            <thead>
              <tr>
                {columns.map((col) => (
                  <th key={col.key} scope="col">
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr
                  key={(item.id as string) ?? idx}
                  onClick={() => navigate(`/explore/${apiName}/${item.id}`)}
                  style={{ cursor: 'pointer' }}
                  className="hover:bg-base-lightest"
                >
                  {columns.map((col) => (
                    <td key={col.key}>{getCellValue(item, col.key)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>

          <div className="display-flex flex-justify flex-align-center margin-top-2">
            <div>
              <Button
                type="button"
                outline
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
              >
                Previous
              </Button>
              <span className="margin-x-1 font-sans-xs">
                Page {currentPage} of {totalPages} ({total} records)
              </span>
              <Button
                type="button"
                outline
                disabled={!hasNext}
                onClick={() => setOffset(offset + PAGE_SIZE)}
              >
                Next
              </Button>
            </div>

            {hasCreate && (
              <Button
                type="button"
                onClick={() => navigate(`/explore/${apiName}/new`)}
              >
                Create
              </Button>
            )}
          </div>
        </>
      )}

      {items.length === 0 && hasCreate && (
        <Button
          type="button"
          className="margin-top-2"
          onClick={() => navigate(`/explore/${apiName}/new`)}
        >
          Create
        </Button>
      )}
    </div>
  );
}
