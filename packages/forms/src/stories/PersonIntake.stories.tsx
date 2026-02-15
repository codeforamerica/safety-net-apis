import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import { FormRenderer } from '../engine/FormRenderer';
import { personCreateSchema } from '../schemas/person';
import type { FormContract } from '../engine/types';

// Inline contract to avoid YAML loading in Storybook.
// This matches src/contracts/person-intake.yaml exactly.
const personIntakeContract: FormContract = {
  form: {
    id: 'person-intake',
    title: 'Person Intake',
    schema: 'persons/PersonCreate',
    pages: [
      {
        id: 'personal-info',
        title: 'Personal Information',
        fields: [
          {
            ref: 'name.firstName',
            component: 'text-input',
            width: 'half',
            hint: 'Legal first name',
          },
          {
            ref: 'name.lastName',
            component: 'text-input',
            width: 'half',
            hint: 'Legal last name',
          },
          {
            ref: 'dateOfBirth',
            component: 'date-input',
            hint: 'For example: 4 28 1986',
          },
          {
            ref: 'socialSecurityNumber',
            component: 'text-input',
            hint: 'XXX-XX-XXXX',
            permissions: {
              reviewer: 'masked',
              applicant: 'editable',
              caseworker: 'editable',
            },
          },
          { ref: 'phoneNumber', component: 'text-input' },
          { ref: 'email', component: 'text-input' },
        ],
      },
      {
        id: 'demographics',
        title: 'Demographics',
        fields: [
          { ref: 'demographicInfo.sex', component: 'radio' },
          { ref: 'demographicInfo.maritalStatus', component: 'select' },
          {
            ref: 'demographicInfo.isHispanicOrLatino',
            component: 'radio',
            labels: { true: 'Yes', false: 'No' },
          },
          { ref: 'demographicInfo.race', component: 'checkbox-group' },
        ],
      },
      {
        id: 'citizenship',
        title: 'Citizenship',
        fields: [
          { ref: 'citizenshipInfo.status', component: 'select' },
          {
            ref: 'citizenshipInfo.immigrationInfo.documentType',
            component: 'text-input',
            show_when: { field: 'citizenshipInfo.status', not_equals: 'citizen' },
          },
          {
            ref: 'citizenshipInfo.immigrationInfo.documentNumber',
            component: 'text-input',
            show_when: { field: 'citizenshipInfo.status', not_equals: 'citizen' },
          },
          {
            ref: 'citizenshipInfo.immigrationInfo.alienOrI94Number',
            component: 'text-input',
            show_when: { field: 'citizenshipInfo.status', not_equals: 'citizen' },
          },
          {
            ref: 'citizenshipInfo.immigrationInfo.documentExpirationDate',
            component: 'date-input',
            show_when: { field: 'citizenshipInfo.status', not_equals: 'citizen' },
          },
        ],
      },
    ],
  },
};

const meta: Meta<typeof FormRenderer> = {
  title: 'Forms/Person Intake',
  component: FormRenderer,
  parameters: {
    layout: 'padded',
  },
};

export default meta;
type Story = StoryObj<typeof FormRenderer>;

const defaultSubmit = (data: Record<string, unknown>) => {
  console.log('Form submitted:', data);
  alert('Form submitted! Check console for data.');
};

export const Page1PersonalInfo: Story = {
  name: 'Page 1 - Personal Info',
  args: {
    contract: personIntakeContract,
    schema: personCreateSchema,
    role: 'applicant',
    initialPage: 0,
    onSubmit: defaultSubmit,
  },
};

export const Page2Demographics: Story = {
  name: 'Page 2 - Demographics',
  args: {
    contract: personIntakeContract,
    schema: personCreateSchema,
    role: 'applicant',
    initialPage: 1,
    onSubmit: defaultSubmit,
  },
};

export const Page3CitizenshipCitizen: Story = {
  name: 'Page 3 - Citizenship (Citizen)',
  args: {
    contract: personIntakeContract,
    schema: personCreateSchema,
    role: 'applicant',
    initialPage: 2,
    onSubmit: defaultSubmit,
  },
};

export const Page3CitizenshipNonCitizen: Story = {
  name: 'Page 3 - Citizenship (Non-Citizen)',
  args: {
    contract: personIntakeContract,
    schema: personCreateSchema,
    role: 'applicant',
    initialPage: 2,
    onSubmit: defaultSubmit,
  },
};

export const CaseworkerView: Story = {
  name: 'Caseworker View',
  args: {
    contract: personIntakeContract,
    schema: personCreateSchema,
    role: 'caseworker',
    initialPage: 0,
    onSubmit: defaultSubmit,
  },
};

export const ReviewerView: Story = {
  name: 'Reviewer View',
  args: {
    contract: personIntakeContract,
    schema: personCreateSchema,
    role: 'reviewer',
    initialPage: 0,
    onSubmit: defaultSubmit,
  },
};

export const FullWizard: Story = {
  name: 'Full Wizard',
  args: {
    contract: personIntakeContract,
    schema: personCreateSchema,
    role: 'applicant',
    initialPage: 0,
    onSubmit: defaultSubmit,
  },
};
