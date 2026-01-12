# @codeforamerica/safety-net-{{STATE}}

TypeScript/JavaScript API client for {{STATE_TITLE}} Safety Net APIs. Generated from OpenAPI specifications with Zod validation schemas and Zodios type-safe HTTP client.

## Installation

```bash
npm install @codeforamerica/safety-net-{{STATE}}
```

## Usage

```typescript
import { createApiClient } from '@codeforamerica/safety-net-{{STATE}}/applications';

const client = createApiClient('https://api.example.com');

// Make API calls - validated at runtime by Zod schemas
const applications = await client.listApplications({ limit: 10 });
```

## Type Safety Limitation

Due to the complexity of the safety net schemas (especially after the Person/HouseholdMember restructure), TypeScript cannot infer types for the API client exports. The `api` and `createApiClient` exports are typed as `any` to allow compilation.

**However:**
- ✅ **Runtime validation is fully preserved** - All requests and responses are validated using Zod schemas
- ✅ **Schema exports are available** - Import individual schemas for manual typing
- ✅ **Source TypeScript files included** - Reference `src/` for full type information

### Workaround: Manual Typing with Schemas

```typescript
import { createApiClient, schemas } from '@codeforamerica/safety-net-{{STATE}}/applications';
import type { z } from 'zod';

const client = createApiClient('https://api.example.com');

// Manually type using exported schemas
type Application = z.infer<typeof schemas.Application>;
const app: Application = await client.getApplication({ id: '123' });
```

### Advanced: Reference Source Files Directly

The package includes TypeScript source files in `src/` for consumers who want full type inference:

```typescript
// In your tsconfig.json, you can reference the source files
import { createApiClient } from '@codeforamerica/safety-net-{{STATE}}/src/applications';
// Full type inference available (if your TypeScript can handle the complexity)
```

## Available APIs

- `applications` - Application management
- `persons` - Person records
- `households` - Household management
- `incomes` - Income tracking

## Search Helpers

```typescript
import { q, search } from '@codeforamerica/safety-net-{{STATE}}';

// Build complex search queries
const query = q().and('status', 'approved').or('priority', 'high').toString();
const results = await client.listApplications({ q: query });
```

## Development

This package is auto-generated from OpenAPI specifications with state-specific overlays applied for {{STATE_TITLE}}.

## License

MIT
