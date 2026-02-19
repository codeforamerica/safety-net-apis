import { useParams } from 'react-router-dom';
import { FormRenderer } from '@harness/src/engine';
import { useRole } from '../context/RoleContext';
import { getContractEntry } from '../contracts/registry';
import type { RouteDefinition } from '../config/routes';

interface ContractPageProps {
  route: RouteDefinition;
}

export function ContractPage({ route }: ContractPageProps) {
  const { role } = useRole();
  const params = useParams();
  const entry = getContractEntry(route.contract);

  if (!entry) {
    return (
      <div className="usa-alert usa-alert--error">
        <div className="usa-alert__body">
          <p className="usa-alert__text">
            Contract "{route.contract}" not found in registry.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2>{route.contract}</h2>
      <p className="usa-hint">
        Role: <strong>{role}</strong> | Route: <code>{route.path}</code>
        {params.applicationId && <> | ID: <code>{params.applicationId}</code></>}
      </p>
      <FormRenderer
        contract={entry.contract}
        schema={entry.schema}
        permissionsPolicy={entry.permissions[role]}
        role={role}
        onSubmit={(data) => console.log('Submit:', data)}
      />
    </div>
  );
}
