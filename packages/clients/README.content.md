## What It Does

Generates TypeScript SDK clients and JSON Schema files from resolved OpenAPI specs. Uses `@hey-api/openapi-ts` for TypeScript generation with Zod validation schemas.

## CLI Commands

### `safety-net-generate-clients`

Generate a TypeScript SDK with Zod schemas from resolved OpenAPI specs.

```bash
safety-net-generate-clients --specs=./resolved --out=./src/api
```

### `safety-net-generate-json-schema`

Convert OpenAPI component schemas to standalone JSON Schema files.

```bash
safety-net-generate-json-schema --specs=./resolved --out=./json-schemas
```

## Usage Example

```bash
# Resolve overlays, then generate clients
safety-net-resolve --base=./node_modules/@codeforamerica/safety-net-blueprint-contracts --overlays=./overlays --out=./resolved
safety-net-generate-clients --specs=./resolved --out=./src/api
```
