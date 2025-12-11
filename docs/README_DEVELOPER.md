# Developer Guide

Guide for developers working on or extending the Safety Net OpenAPI toolkit.

## Installation

**Requirements:** Node.js >= 18.0.0

```bash
# Check Node version
node --version

# Install dependencies
npm install

# Verify installation
npm test
```

**Native module issues (better-sqlite3):** Install build tools:
- macOS: `xcode-select --install`
- Ubuntu: `sudo apt-get install build-essential python3`

## Project Structure

```
openapi/                    # Source of truth
├── *.yaml                  # API specs (auto-discovered)
├── components/             # Shared schemas, parameters, responses
├── examples/               # Example data for seeding
└── patterns/               # API design patterns (naming, CRUD, search)

generated/                  # Auto-generated artifacts
├── clients/zodios/         # TypeScript clients (committed)
├── postman-collection.json # Postman collection (committed)
└── mock-data/*.db          # SQLite databases (gitignored)

scripts/                    # CLI tools
├── mock-server/            # Server management
├── swagger/                # Documentation server
├── generate-api.js         # API template generator
├── generate-clients.js     # Zodios client generator
└── validate-*.js           # Validation scripts

tests/mock-server/
├── unit/                   # Unit tests (no server needed)
└── integration/            # Integration tests (need server)
```

## Adding New APIs

### Option 1: Use the Generator (Recommended)

```bash
npm run api:new -- --name "benefits" --resource "Benefit"
```

This creates:
- `openapi/benefits.yaml` - Main spec
- `openapi/components/benefits.yaml` - Schema
- `openapi/examples/benefits.yaml` - Example data

Then customize and validate:
```bash
npm run validate
```

### Option 2: Manual Creation

See [Creating APIs Guide](./README_CREATING_APIS.md) for detailed patterns.

**Required files:**
1. `openapi/{name}.yaml` - API spec with paths
2. `openapi/components/{name}.yaml` - Resource schema
3. `openapi/examples/{name}.yaml` - Example data

**Required schema fields:**
```yaml
id:
  type: string
  format: uuid
  readOnly: true
createdAt:
  type: string
  format: date-time
  readOnly: true
updatedAt:
  type: string
  format: date-time
  readOnly: true
```

## Development Workflow

```bash
# 1. Edit spec or examples
# 2. Validate changes
npm run validate

# 3. Regenerate clients (if spec changed)
npm run clients:generate

# 4. Reset database (if examples changed)
npm run mock:reset

# 5. Test
npm test

# 6. Commit (including generated files)
git add openapi/ generated/clients/ generated/postman-collection.json
```

## Generated Files

**Committed to git:**
- `generated/clients/zodios/*.ts` - TypeScript clients
- `generated/postman-collection.json` - Postman collection

**Gitignored:**
- `generated/mock-data/*.db` - SQLite databases

**When to regenerate:**
- Spec changes: `npm run clients:generate && npm run postman:generate`
- Example changes: `npm run mock:reset`

## Extending the Mock Server

### Custom Handlers

Create handlers in `src/mock-server/handlers/`:

```javascript
export function handleCustomOperation(req, res, db, schema) {
  const result = db.prepare('SELECT * FROM table').all();
  res.json({ data: result });
}
```

### Custom Middleware

Edit `scripts/mock-server/server.js`:

```javascript
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});
```

## Code Conventions

- **OpenAPI specs:** YAML, external `$ref` for reusable components
- **Examples:** 3+ per resource, realistic data, unique UUIDs
- **JavaScript:** ES modules, async/await, JSDoc comments
- **Commits:** Conventional commits (`feat:`, `fix:`, `docs:`)

## Troubleshooting

### Port in use
```bash
lsof -i :1080        # Find process
kill -9 <PID>        # Kill it
```

### Database issues
```bash
npm run mock:reset   # Reset to example data
```

### Client generation fails
```bash
npm run validate     # Check for spec errors
```

### Node version issues
```bash
nvm install 18
nvm use 18
```
