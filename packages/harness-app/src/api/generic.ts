const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:1080';

export interface ListResponse {
  items: Record<string, unknown>[];
  total: number;
  limit: number;
  offset: number;
  hasNext: boolean;
}

export interface ListParams {
  limit?: number;
  offset?: number;
}

export interface GenericApi {
  list(params?: ListParams): Promise<ListResponse>;
  get(id: string): Promise<Record<string, unknown>>;
  create(body: Record<string, unknown>): Promise<Record<string, unknown>>;
  update(id: string, body: Record<string, unknown>): Promise<Record<string, unknown>>;
}

async function request(url: string, options?: RequestInit): Promise<unknown> {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    const message = (body as { message?: string })?.message ?? `HTTP ${res.status}`;
    throw new Error(message);
  }
  return res.json();
}

export function genericApi(basePath: string): GenericApi {
  const url = `${BASE_URL}${basePath}`;
  return {
    list: (params) => {
      const qs = new URLSearchParams();
      if (params?.limit != null) qs.set('limit', String(params.limit));
      if (params?.offset != null) qs.set('offset', String(params.offset));
      const query = qs.toString();
      return request(query ? `${url}?${query}` : url) as Promise<ListResponse>;
    },
    get: (id) => request(`${url}/${id}`) as Promise<Record<string, unknown>>,
    create: (body) => request(url, { method: 'POST', body: JSON.stringify(body) }) as Promise<Record<string, unknown>>,
    update: (id, body) => request(`${url}/${id}`, { method: 'PATCH', body: JSON.stringify(body) }) as Promise<Record<string, unknown>>,
  };
}
