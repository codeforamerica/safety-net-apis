/**
 * Swagger UI Server
 * Auto-discovers and serves OpenAPI specifications with Swagger UI
 */

import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import $RefParser from '@apidevtools/json-schema-ref-parser';
import { discoverApiSpecs } from '../../src/mock-server/openapi-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const HOST = process.env.SWAGGER_HOST || 'localhost';
const PORT = parseInt(process.env.SWAGGER_PORT || '3000', 10);
const MOCK_SERVER_URL = process.env.MOCK_SERVER_URL || 'http://localhost:1080';

/**
 * Load and prepare an OpenAPI spec for Swagger UI
 * @param {string} specPath - Path to the OpenAPI spec file
 * @param {string} apiName - Name of the API
 * @returns {Promise<Object>} Dereferenced and modified OpenAPI spec
 */
async function loadAndPrepareSpec(specPath, apiName) {
  try {
    // Dereference all $refs
    const spec = await $RefParser.dereference(specPath, {
      dereference: {
        circular: 'ignore'
      }
    });
    
    // Override servers array to point to mock server (in-memory only)
    spec.servers = [
      {
        url: MOCK_SERVER_URL,
        description: 'Mock Server'
      },
      ...(spec.servers || [])
    ];
    
    return spec;
  } catch (error) {
    console.error(`Error loading spec for ${apiName}:`, error.message);
    throw error;
  }
}

/**
 * Create a landing page HTML with links to all APIs
 * @param {Array} apis - Array of API info objects
 * @returns {string} HTML content
 */
function createLandingPage(apis) {
  const apiLinks = apis.map(api =>
    `<li><a href="/${api.name}">${api.title}</a></li>`
  ).join('\n          ');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>API Documentation</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      max-width: 800px;
      margin: 50px auto;
      padding: 20px;
      background: #fafafa;
    }
    h1 {
      color: #333;
      border-bottom: 2px solid #49cc90;
      padding-bottom: 10px;
    }
    h2 {
      color: #333;
      margin-top: 30px;
      border-bottom: 2px solid #e535ab;
      padding-bottom: 10px;
    }
    .container {
      background: white;
      padding: 30px;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    ul {
      list-style: none;
      padding: 0;
    }
    li {
      margin: 15px 0;
    }
    a {
      color: #49cc90;
      text-decoration: none;
      font-size: 18px;
      padding: 10px 15px;
      display: block;
      background: #f5f5f5;
      border-radius: 4px;
      transition: all 0.3s;
    }
    a:hover {
      background: #49cc90;
      color: white;
      transform: translateX(5px);
    }
    a.graphql {
      color: #e535ab;
    }
    a.graphql:hover {
      background: #e535ab;
      color: white;
    }
    .info {
      background: #e3f2fd;
      padding: 15px;
      border-radius: 4px;
      margin-top: 20px;
      border-left: 4px solid #2196f3;
    }
    .info strong {
      color: #1976d2;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>REST API Documentation</h1>
    <p>Select an API to view its documentation and try out endpoints:</p>
    <ul>
${apiLinks}
    </ul>
    <h2>GraphQL API</h2>
    <p>Explore the unified GraphQL API with an interactive playground:</p>
    <ul>
      <li><a href="/graphql" class="graphql">GraphQL Playground</a></li>
    </ul>
    <div class="info">
      <strong>Mock Server:</strong> ${MOCK_SERVER_URL}<br>
      <strong>Note:</strong> Make sure the mock server is running before using "Try it out" buttons or the GraphQL playground.
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Create GraphQL Playground HTML page
 * Uses GraphiQL - the official GraphQL IDE
 * @returns {string} HTML content
 */
function createGraphQLPlayground() {
  const defaultQuery = `# Welcome to GraphQL Playground
#
# This playground connects to the mock server's GraphQL endpoint.
# Make sure the mock server is running (npm run mock:start).
#
# Example queries:

# List all persons with pagination
query ListPersons {
  persons(limit: 10, offset: 0) {
    items {
      id
      email
      name {
        firstName
        lastName
      }
      monthlyIncome
    }
    total
    hasNext
  }
}

# Get a single person by ID
# query GetPerson {
#   person(id: "4d1f13f0-3e26-4c50-b2fb-8d140f7ec1c2") {
#     id
#     email
#     name {
#       firstName
#       lastName
#     }
#   }
# }

# Search across all resources
# query Search {
#   search(query: "Avery", limit: 10) {
#     persons {
#       id
#       email
#     }
#     households {
#       id
#     }
#     applications {
#       id
#       status
#     }
#     totalCount
#   }
# }
`;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GraphQL Playground</title>
  <link rel="stylesheet" href="https://unpkg.com/graphiql@3.0.10/graphiql.min.css" />
  <style>
    html, body {
      height: 100%;
      margin: 0;
      overflow: hidden;
    }
    #graphiql {
      height: 100vh;
    }
    .graphiql-container {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
    }
  </style>
</head>
<body>
  <div id="graphiql"></div>
  <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
  <script crossorigin src="https://unpkg.com/graphiql@3.0.10/graphiql.min.js"></script>
  <script>
    const fetcher = GraphiQL.createFetcher({
      url: '${MOCK_SERVER_URL}/graphql',
    });

    const defaultQuery = ${JSON.stringify(defaultQuery)};

    ReactDOM.createRoot(document.getElementById('graphiql')).render(
      React.createElement(GraphiQL, {
        fetcher,
        defaultQuery,
        defaultEditorToolsVisibility: true,
      })
    );
  </script>
</body>
</html>
  `;
}

/**
 * Start the Swagger UI server
 */
async function startSwaggerServer() {
  console.log('='.repeat(70));
  console.log('📚 Starting Swagger UI Server');
  console.log('='.repeat(70));
  
  try {
    // Discover all API specs
    const apiSpecs = discoverApiSpecs();
    
    if (apiSpecs.length === 0) {
      console.error('\n❌ No API specifications found in /openapi directory');
      process.exit(1);
    }
    
    console.log(`\nFound ${apiSpecs.length} API specification(s):`);
    apiSpecs.forEach(api => console.log(`  - ${api.name}`));
    
    // Load all specs
    const loadedApis = [];
    for (const apiSpec of apiSpecs) {
      try {
        const spec = await loadAndPrepareSpec(apiSpec.specPath, apiSpec.name);
        loadedApis.push({
          name: apiSpec.name,
          title: spec.info?.title || apiSpec.name,
          spec: spec
        });
        console.log(`  ✓ Loaded ${apiSpec.name}`);
      } catch (error) {
        console.error(`  ✗ Failed to load ${apiSpec.name}:`, error.message);
      }
    }
    
    if (loadedApis.length === 0) {
      console.error('\n❌ Failed to load any API specifications');
      process.exit(1);
    }
    
    // Create Express app
    const app = express();
    
    // Serve landing page at root
    app.get('/', (req, res) => {
      res.send(createLandingPage(loadedApis));
    });

    // Serve GraphQL Playground
    app.get('/graphql', (req, res) => {
      res.send(createGraphQLPlayground());
    });

    // Serve Swagger UI for each API
    for (const api of loadedApis) {
      const swaggerOptions = {
        swaggerOptions: {
          url: `/${api.name}/spec.json`,
          displayRequestDuration: true,
          persistAuthorization: true,
          tryItOutEnabled: true
        }
      };
      
      // Serve the spec as JSON
      app.get(`/${api.name}/spec.json`, (req, res) => {
        res.json(api.spec);
      });
      
      // Serve Swagger UI
      app.use(`/${api.name}`, swaggerUi.serveFiles(api.spec, swaggerOptions), swaggerUi.setup(api.spec, swaggerOptions));
    }
    
    // Start server
    app.listen(PORT, HOST, () => {
      console.log('\n' + '='.repeat(70));
      console.log('✓ Swagger UI Server Started Successfully!');
      console.log('='.repeat(70));
      console.log(`\n📚 Documentation:  http://${HOST}:${PORT}`);
      console.log(`📡 Mock Server:    ${MOCK_SERVER_URL}`);
      console.log('\n' + '='.repeat(70));
      console.log('REST API Documentation:');
      console.log('='.repeat(70));

      for (const api of loadedApis) {
        console.log(`  ${api.title.padEnd(30)} http://${HOST}:${PORT}/${api.name}`);
      }

      console.log('\n' + '='.repeat(70));
      console.log('GraphQL API:');
      console.log('='.repeat(70));
      console.log(`  ${'GraphQL Playground'.padEnd(30)} http://${HOST}:${PORT}/graphql`);

      console.log('\n' + '='.repeat(70));
      console.log('\n💡 Tip: Start the mock server first with: npm run mock:start');
      console.log('    Then use "Try it out" buttons in Swagger UI or the GraphQL Playground.\n');
    });
    
  } catch (error) {
    console.error('\n❌ Failed to start Swagger UI server:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\nStopping Swagger UI server...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n\nStopping Swagger UI server...');
  process.exit(0);
});

// Start the server
startSwaggerServer();


