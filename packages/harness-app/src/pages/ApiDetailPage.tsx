import { useCallback, useMemo, useState } from 'react';
import { useParams, useOutletContext, useNavigate } from 'react-router-dom';
import { Alert, Button } from '@trussworks/react-uswds';
import { FormRenderer, ActionBar } from '@harness/src/engine';
import type { ActionDefinition } from '@harness/src/engine';
import { useApiData } from '../hooks/useApiData';
import { useRole } from '../context/RoleContext';
import { genericApi } from '../api/generic';
import { generateContract } from '../contracts/generateContract';
import type { ApiSpec } from '../hooks/useManifest';

/** Resolve the allOf composition to find a schema with properties. */
function resolveSchema(schema: Record<string, unknown>): Record<string, unknown> {
  if (schema.allOf) {
    const merged: Record<string, unknown> = { type: 'object', properties: {}, required: [] };
    for (const part of schema.allOf as Record<string, unknown>[]) {
      const resolved = resolveSchema(part);
      if (resolved.properties) {
        (merged.properties as Record<string, unknown>) = {
          ...(merged.properties as Record<string, unknown>),
          ...(resolved.properties as Record<string, unknown>),
        };
      }
      if (resolved.required) {
        (merged.required as unknown[]) = [
          ...(merged.required as unknown[]),
          ...(resolved.required as unknown[]),
        ];
      }
    }
    return merged;
  }
  return schema;
}

export function ApiDetailPage() {
  const { apiName, id } = useParams<{ apiName: string; id: string }>();
  const navigate = useNavigate();
  const { role } = useRole();
  const { apis } = useOutletContext<{ apis: ApiSpec[] }>();

  const api = apis.find((a) => a.name === apiName);
  const basePath = api?.baseResource ?? `/${apiName}`;

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const fetcher = useCallback(
    () => genericApi(basePath).get(id!),
    [basePath, id],
  );
  const { data, loading, error } = useApiData(fetcher);

  // Find the primary resource schema and generate contract
  const generated = useMemo(() => {
    if (!api?.schemas) return null;
    const names = Object.keys(api.schemas);
    const primaryName = names.find(
      (n) =>
        !n.includes('List') &&
        !n.includes('Create') &&
        !n.includes('Update') &&
        !n.includes('Error') &&
        !n.includes('Pagination'),
    );
    if (!primaryName) return null;
    const rawSchema = api.schemas[primaryName] as Record<string, unknown>;
    const resolved = resolveSchema(rawSchema);
    return generateContract(
      api.name,
      api.title,
      resolved,
      api.baseResource,
      api.endpoints as { path: string; method: string; operationId: string; summary: string }[],
    );
  }, [api]);

  if (loading) {
    return <p className="usa-prose">Loading record...</p>;
  }

  if (error) {
    return (
      <Alert type="error" headingLevel="h3" heading="Error loading record">
        {error}
      </Alert>
    );
  }

  if (!generated) {
    return (
      <Alert type="warning" headingLevel="h3" heading="No schema available">
        Could not generate a form contract for this API.
      </Alert>
    );
  }

  const actions = generated.contract.form.actions ?? [];
  // The Save/PATCH action is handled by the form's own submit button
  const saveAction = actions.find((a) => a.method === 'PATCH' || a.method === 'PUT');

  const handleSubmit = async (formData: Record<string, unknown>) => {
    setSubmitError(null);
    setSubmitSuccess(null);
    try {
      await genericApi(basePath).update(id!, formData);
      setSubmitSuccess('Record updated successfully.');
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleAction = (action: ActionDefinition) => {
    setSubmitError(null);
    setSubmitSuccess(null);

    const run = async () => {
      try {
        const client = genericApi(basePath);
        if (action.method === 'DELETE') {
          // TODO: add delete to generic client
          throw new Error('Delete not yet implemented');
        } else if (action.method === 'POST') {
          await client.create({});
        }
        if (action.navigate) {
          navigate(action.navigate.replace('{id}', id!));
        }
      } catch (err: unknown) {
        setSubmitError(err instanceof Error ? err.message : String(err));
      }
    };
    void run();
  };

  return (
    <div>
      <Button
        type="button"
        unstyled
        className="margin-bottom-2"
        onClick={() => navigate(`/explore/${apiName}`)}
      >
        &larr; Back to {api?.title ?? apiName}
      </Button>

      <h2>{api?.title ?? apiName}</h2>
      <p className="usa-hint">
        ID: <code>{id}</code>
      </p>

      {submitError && (
        <Alert type="error" headingLevel="h3" heading="Action failed" slim>
          {submitError}
        </Alert>
      )}
      {submitSuccess && (
        <Alert type="success" headingLevel="h3" heading="Success" slim>
          {submitSuccess}
        </Alert>
      )}

      <FormRenderer
        contract={generated.contract}
        schema={generated.schema}
        permissionsPolicy={generated.permissions[role]}
        role={role}
        defaultValues={data as Record<string, unknown> | undefined}
        onSubmit={(formData) => void handleSubmit(formData)}
      />

      <ActionBar
        actions={actions}
        role={role}
        data={data as Record<string, unknown> | undefined}
        onAction={handleAction}
        primaryActionId={saveAction?.id}
      />
    </div>
  );
}
