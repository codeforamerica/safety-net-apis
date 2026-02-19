import {
  listApplications,
  getApplication,
  createApplication,
  updateApplication,
} from '../generated/api/applications/sdk.gen';

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
const sdkMap: Record<string, Record<string, Function>> = {
  applications: {
    listApplications,
    getApplication,
    createApplication,
    updateApplication,
  },
};

export function getSdkFunction(domain: string, operation: string) {
  return sdkMap[domain]?.[operation];
}
