// Auto-generated from authored/contracts/application/intake.form.yaml. Run `npm run generate:stories` to regenerate.
import React, { useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FormRenderer } from '../../src/engine/FormRenderer';
import { ContractPreview, type EditorTab } from '../../src/engine/ContractPreview';
import { applicationCreateSchema } from '../../generated/schemas/application-california';
import type { FormContract, Role, PermissionsPolicy } from '../../src/engine/types';

// Layout
import contract from '../../authored/contracts/application/intake.form.yaml';
import layoutYaml from '../../authored/contracts/application/intake.form.yaml?raw';
// Test data
import fixtures from '../../authored/fixtures/application-intake.yaml';
import fixturesYaml from '../../authored/fixtures/application-intake.yaml?raw';
// Permissions
import permsData from '../../authored/permissions/applicant.yaml';
import permsYaml from '../../authored/permissions/applicant.yaml?raw';
// Schema (read-only Zod source)
import schemaSource from '../../generated/schemas/application-california.ts?raw';


const typedContract = contract as unknown as FormContract;
const typedFixtures = fixtures as unknown as Record<string, unknown>;
const typedPerms = permsData as unknown as PermissionsPolicy;


const meta: Meta = {
  title: 'Forms/Application Intake',
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
    { id: 'layout', label: 'Layout', filename: 'authored/contracts/application/intake.form.yaml', source: layoutYaml },
    { id: 'test-data', label: 'Test Data', filename: 'authored/fixtures/application-intake.yaml', source: fixturesYaml },
    { id: 'permissions', label: 'Permissions', filename: 'authored/permissions/applicant.yaml', source: permsYaml },
    { id: 'schema', label: 'Schema', filename: 'generated/schemas/application-california.ts', source: schemaSource, readOnly: true, group: 'reference' as const },
  ];

  return (
    <ContractPreview
      tabs={tabs}
      contractId="application-intake"
      formTitle="Application Intake"
      onLayoutChange={setActiveContract}
      onPermissionsChange={setPerms}
      onTestDataChange={setTestData}
    >
      <FormRenderer
        contract={activeContract}
        schema={applicationCreateSchema}
        role={'applicant' as Role}
        initialPage={0}
        defaultValues={testData}
        permissionsPolicy={perms}
        onSubmit={logSubmit}
      />
    </ContractPreview>
  );
}

export const ApplicationIntake: StoryObj = {
  name: 'Application Intake',
  render: () => <StoryWrapper />,
};
