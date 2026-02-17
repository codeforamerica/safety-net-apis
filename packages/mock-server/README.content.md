## What It Does

An Express-based mock API server that auto-discovers OpenAPI specs, creates SQLite databases, and seeds them from example files. Use it for frontend development without a production backend.

- Auto-discovers all `*-openapi.yaml` specs
- Creates per-spec SQLite databases with full CRUD support
- Seeds databases from `*-openapi-examples.yaml` files
- Supports search, pagination, and filtering
- Includes Swagger UI for interactive API exploration

## CLI Commands

### `safety-net-mock`

Start the mock API server.

```bash
safety-net-mock --specs=./resolved
```

### `safety-net-swagger`

Start the Swagger UI server.

```bash
safety-net-swagger --specs=./resolved
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `MOCK_SERVER_HOST` | `localhost` | Server bind address |
| `MOCK_SERVER_PORT` | `1080` | Server port |
| `SKIP_VALIDATION` | `false` | Skip spec validation on startup |
