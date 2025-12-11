# API Client Generator

Generate type-safe Zodios/TypeScript clients from OpenAPI specs.

## Quick Start

```bash
npm run clients:generate
```

Output: `generated/clients/zodios/*.ts`

## Usage

```typescript
import { personsClient } from './generated/clients/zodios/persons';

// List
const persons = await personsClient.listPersons({ queries: { limit: 10 } });

// Get by ID
const person = await personsClient.getPerson({
  params: { personId: '123e4567-e89b-12d3-a456-426614174000' }
});

// Create
const newPerson = await personsClient.createPerson({
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane@example.com'
});

// Update
const updated = await personsClient.updatePerson({
  params: { personId: '...' },
  body: { monthlyIncome: 7500 }
});

// Delete
await personsClient.deletePerson({ params: { personId: '...' } });
```

## What's Generated

- Full TypeScript types from OpenAPI schemas
- Zod schemas for runtime validation
- Type-safe function parameters and return values
- All endpoints with proper HTTP methods

## Custom Configuration

```typescript
import { Zodios } from '@zodios/core';
import { personsApi } from './generated/clients/zodios/persons';

const client = new Zodios('https://api.example.com', personsApi, {
  axiosConfig: {
    headers: { 'Authorization': 'Bearer TOKEN' }
  }
});
```

## Requirements

Your OpenAPI spec needs:
- `operationId` on each endpoint (used for function names)
- Schemas for request/response bodies
- Parameters defined (path, query)

## Troubleshooting

**Generation fails:**
```bash
npm run validate   # Check for spec errors
```

**Type errors:** Regenerate clients after spec changes.
