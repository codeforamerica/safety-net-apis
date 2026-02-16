// Auto-generated from contracts/person-caseworker-review.yaml. Run `npm run generate:stories` to regenerate.
import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FormRenderer } from '../engine/FormRenderer';
import { ContractPreview, type EditorTab } from '../engine/ContractPreview';
import { personUpdateSchema } from '../schemas/person';
import type { FormContract, PermissionsPolicy } from '../engine/types';

// Layout
import contract from '../contracts/person-caseworker-review.yaml';
import layoutYaml from '../contracts/person-caseworker-review.yaml?raw';
// Test data
import fixtures from '../fixtures/person-caseworker-review.yaml';
import fixturesYaml from '../fixtures/person-caseworker-review.yaml?raw';
// Permissions
import permsData from '../permissions/caseworker.yaml';
import permsYaml from '../permissions/caseworker.yaml?raw';
// Schema (read-only, from contracts package)
import schemaYaml from '../../../contracts/persons-openapi.yaml?raw';

const typedContract = contract as unknown as FormContract;
const typedFixtures = fixtures as unknown as Record<string, unknown>;
const typedPerms = permsData as unknown as PermissionsPolicy;

const meta: Meta = {
  title: 'Forms/Person Review',
  parameters: { layout: 'fullscreen' },
};

export default meta;

const logSubmit = (data: Record<string, unknown>) => {
  console.log('Form submitted:', data);
  alert('Submitted! Check console for data.');
};

function StoryWrapper() {
  const [activeContract, setActiveContract] = useState(typedContract);
  const [testData, setTestData] = useState(typedFixtures);
  const [perms, setPerms] = useState(typedPerms);

  const tabs: EditorTab[] = [
    { id: 'test-data', label: 'Test Data', filename: 'fixtures/person-caseworker-review.yaml', source: fixturesYaml },
    { id: 'layout', label: 'Layout', filename: 'person-caseworker-review.yaml', source: layoutYaml },
    { id: 'permissions', label: 'Permissions', filename: 'permissions/caseworker.yaml', source: permsYaml },
    { id: 'schema', label: 'Schema', filename: 'persons-openapi.yaml', source: schemaYaml, readOnly: true },
  ];

  return (
    <ContractPreview
      tabs={tabs}
      contractId="person-caseworker-review"
      formTitle="Person Review"
      onLayoutChange={setActiveContract}
      onPermissionsChange={setPerms}
      onTestDataChange={setTestData}
    >
      <FormRenderer
        contract={activeContract}
        schema={personUpdateSchema}
        role="caseworker"
        defaultValues={testData}
        permissionsPolicy={perms}
        onSubmit={logSubmit}
      />
    </ContractPreview>
  );
}

export const PersonCaseworkerReview: StoryObj = {
  name: 'Person Review',
  render: () => <StoryWrapper />,
};
