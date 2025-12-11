# Testing Guide

## Quick Start

```bash
npm test                 # Unit tests (fast, no server)
npm run test:integration # Integration tests (auto-starts server)
npm run test:all         # Both unit and integration
```

## Test Types

### Unit Tests

Fast, isolated tests of core functionality.

```bash
npm test
```

**What's tested:** OpenAPI loading, validation, database operations, search/pagination, schema resolution.

**Location:** `tests/mock-server/unit/`

### Integration Tests

End-to-end tests against a live mock server.

```bash
npm run test:integration
```

The server starts automatically if not running.

**What's tested:** Full CRUD lifecycle, request validation, error responses (404, 422), pagination.

### Writing Tests

```javascript
// tests/mock-server/unit/my-feature.test.js
import { test } from 'node:test';
import assert from 'node:assert';

test('My Feature', async (t) => {
  await t.test('should work', () => {
    assert.strictEqual(result, expected);
  });
});
```

---

## Swagger UI

Interactive browser-based API testing.

```bash
npm run swagger:start   # Start Swagger UI (port 3000)
npm run mock:start      # Start mock server (port 1080)
```

Visit `http://localhost:3000` to:
- Browse API documentation
- Click "Try it out" on any endpoint
- Execute requests against the mock server

**Auto-discovery:** All specs in `/openapi/` appear automatically.

---

## Postman

Generate and run automated API tests.

### Setup

```bash
npm run postman:generate   # Generate collection
```

Import `generated/postman-collection.json` into Postman.

### What's Generated

- Requests for every endpoint
- Automated test scripts on each request
- Example data from your YAML files
- Environment variables with IDs from examples

### Test Scripts

Each request includes tests based on HTTP method:

| Method | Tests |
|--------|-------|
| GET (list) | Status 200, has items/total/limit/offset |
| GET (by ID) | Status 200, has id |
| POST | Status 201, has id/timestamps, Location header |
| PATCH | Status 200, has updatedAt |
| DELETE | Status 204 |
| 404 | Status 404, has code/message |

### Running Tests

**In Postman:**
1. Click collection name → Run
2. View results in Run Results panel

**In CI/CD (Newman):**
```bash
npm install -g newman
newman run generated/postman-collection.json
```

### Regenerating

Regenerate when specs or examples change:
```bash
npm run postman:generate
```

Re-import in Postman to see changes.

---

## curl Examples

```bash
# List
curl http://localhost:1080/persons

# Get by ID
curl http://localhost:1080/persons/{id}

# Search
curl "http://localhost:1080/persons?q=status:active"

# Create
curl -X POST http://localhost:1080/persons \
  -H "Content-Type: application/json" \
  -d '{"name": {"firstName": "Test", "lastName": "User"}, ...}'

# Update
curl -X PATCH http://localhost:1080/persons/{id} \
  -H "Content-Type: application/json" \
  -d '{"monthlyIncome": 5000}'

# Delete
curl -X DELETE http://localhost:1080/persons/{id}
```

---

## CI/CD Integration

### GitHub Actions

```yaml
- name: Run tests
  run: |
    npm install
    npm run validate
    npm test
```

### With Newman (Postman)

```yaml
- name: Run Postman tests
  run: |
    npm run postman:generate
    npm run mock:start &
    sleep 5
    npx newman run generated/postman-collection.json
```

---

## Troubleshooting

**Tests fail to connect:** Check port 1080 isn't in use (`lsof -i :1080`)

**Invalid responses:** Reset database (`npm run mock:reset`)

**Swagger "Try it out" fails:** Ensure mock server is running
