import { useCallback } from 'react';
import { useApiData } from './useApiData';

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:1080';

export interface ApiEndpoint {
  path: string;
  method: string;
  operationId: string;
  summary: string;
  parameters: unknown[];
  requestSchema: Record<string, unknown> | null;
  responseSchema: Record<string, unknown> | null;
}

export interface ApiSpec {
  name: string;
  title: string;
  version: string;
  baseResource: string;
  endpoints: ApiEndpoint[];
  schemas: Record<string, Record<string, unknown>>;
  pagination: { limitDefault: number; limitMax: number; offsetDefault: number };
}

interface ManifestResponse {
  apis: ApiSpec[];
}

async function fetchManifest(): Promise<ApiSpec[]> {
  const res = await fetch(`${BASE_URL}/_manifest`);
  if (!res.ok) throw new Error(`Failed to fetch manifest: HTTP ${res.status}`);
  const data: ManifestResponse = await res.json();
  return data.apis;
}

export function useManifest() {
  const fetcher = useCallback(() => fetchManifest(), []);
  const { data, loading, error } = useApiData(fetcher);
  return { apis: data ?? [], loading, error };
}
