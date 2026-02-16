// Auto-generated scenario story. Run `npm run generate:stories` to regenerate.
import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FormRenderer } from '../../engine/FormRenderer';
import { ContractPreview, type EditorTab } from '../../engine/ContractPreview';
import { personCreateSchema } from '../../schemas/person';
import type { FormContract, Role, PermissionsPolicy } from '../../engine/types';

// Scenario: all three files are co-located in this directory
import scenarioLayout from './layout.yaml';
import scenarioLayoutYaml from './layout.yaml?raw';
import scenarioFixtures from './test-data.yaml';
import scenarioFixturesYaml from './test-data.yaml?raw';
import scenarioPerms from './permissions.yaml';
import scenarioPermsYaml from './permissions.yaml?raw';
// Schema (read-only, from contracts package)
import schemaYaml from '../../../../contracts/persons-openapi.yaml?raw';

const typedContract = scenarioLayout as unknown as FormContract;
const typedFixtures = scenarioFixtures as unknown as Record<string, unknown>;
const typedPerms = scenarioPerms as unknown as PermissionsPolicy;

const meta: Meta = {
  title: 'Scenarios/Person Intake: abc',
  parameters: { layout: 'fullscreen' },
};

export default meta;

const logSubmit = (data: Record<string, unknown>) => {
  console.log('Form submitted:', data);
  alert('Submitted! Check console for data.');
};

function StoryWrapper({
  initialPage = 0,
  role = 'applicant' as Role,
}: {
  initialPage?: number;
  role?: Role;
}) {
  const [activeContract, setActiveContract] = useState(typedContract);
  const [testData, setTestData] = useState(typedFixtures);
  const [perms, setPerms] = useState(typedPerms);

  const tabs: EditorTab[] = [
    { id: 'test-data', label: 'Test Data', filename: 'scenarios/person-intake.abc/test-data.yaml', source: scenarioFixturesYaml },
    { id: 'layout', label: 'Layout', filename: 'scenarios/person-intake.abc/layout.yaml', source: scenarioLayoutYaml },
    { id: 'permissions', label: 'Permissions', filename: 'scenarios/person-intake.abc/permissions.yaml', source: scenarioPermsYaml },
    { id: 'schema', label: 'Schema', filename: 'persons-openapi.yaml', source: schemaYaml, readOnly: true },
  ];

  return (
    <ContractPreview
      tabs={tabs}
      contractId="person-intake"
      formTitle="Person Intake"
      onLayoutChange={setActiveContract}
      onPermissionsChange={setPerms}
      onTestDataChange={setTestData}
    >
      <FormRenderer
        contract={activeContract}
        schema={personCreateSchema}
        role="applicant"
        initialPage={initialPage}
        defaultValues={testData}
        permissionsPolicy={perms}
        onSubmit={logSubmit}
      />
    </ContractPreview>
  );
}

export const Abc: StoryObj = {
  name: 'Person Intake: abc',
  render: () => <StoryWrapper />,
};
