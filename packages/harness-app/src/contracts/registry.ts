import type { FormContract, PermissionsPolicy } from '@harness/src/engine';
import type { ZodSchema } from 'zod';

import intakeContract from '@harness/authored/contracts/application/intake.form.yaml';
import caseworkerReviewContract from '@harness/authored/contracts/application/caseworker-review.form.yaml';
import caseListContract from '@harness/authored/contracts/application/case-list.form.yaml';

import { applicationCreateSchema } from '@harness/generated/schemas/application-california';

import applicantPerms from '@harness/authored/permissions/applicant.yaml';
import caseworkerPerms from '@harness/authored/permissions/caseworker.yaml';
import reviewerPerms from '@harness/authored/permissions/reviewer.yaml';

export interface ContractRegistryEntry {
  contract: FormContract;
  schema: ZodSchema;
  permissions: Record<string, PermissionsPolicy>;
}

const registry: Record<string, ContractRegistryEntry> = {
  'application-intake': {
    contract: intakeContract as unknown as FormContract,
    schema: applicationCreateSchema,
    permissions: {
      applicant: applicantPerms as unknown as PermissionsPolicy,
      caseworker: caseworkerPerms as unknown as PermissionsPolicy,
      reviewer: reviewerPerms as unknown as PermissionsPolicy,
    },
  },
  'application-caseworker-review': {
    contract: caseworkerReviewContract as unknown as FormContract,
    schema: applicationCreateSchema,
    permissions: {
      applicant: applicantPerms as unknown as PermissionsPolicy,
      caseworker: caseworkerPerms as unknown as PermissionsPolicy,
      reviewer: reviewerPerms as unknown as PermissionsPolicy,
    },
  },
  'application-case-list': {
    contract: caseListContract as unknown as FormContract,
    schema: applicationCreateSchema,
    permissions: {
      applicant: applicantPerms as unknown as PermissionsPolicy,
      caseworker: caseworkerPerms as unknown as PermissionsPolicy,
      reviewer: reviewerPerms as unknown as PermissionsPolicy,
    },
  },
};

export function getContractEntry(contractId: string): ContractRegistryEntry | undefined {
  return registry[contractId];
}

export default registry;
