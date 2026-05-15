const cacheService = require('./cacheService');

const CACHE_TTL = {
  OPENAPI_SPEC: 3600,
  MARKDOWN_DOCS: 3600,
};

class ApiDocsGenerator {
  constructor() {
    this.specVersion = '1.0.0';
    this.apiVersion = 'v1';
    this.baseUrl = process.env.API_GATEWAY_URL || 'http://localhost:3000';
    this.stats = {
      specsGenerated: 0,
      docsGenerated: 0,
      errors: 0,
    };
  }

  generateOpenAPISpec() {
    try {
      const spec = {
        openapi: '3.0.3',
        info: {
          title: 'HJTPX API Platform',
          description: this.generateDescription(),
          version: this.specVersion,
          contact: {
            name: 'API Support',
            email: 'api-support@hjtpx.com',
            url: 'https://hjtpx.com/support',
          },
          license: {
            name: 'MIT',
            url: 'https://opensource.org/licenses/MIT',
          },
        },
        servers: [
          {
            url: this.baseUrl,
            description: 'Production Server',
          },
          {
            url: `${this.baseUrl}/staging`,
            description: 'Staging Server',
          },
        ],
        tags: this.generateTags(),
        paths: this.generatePaths(),
        components: this.generateComponents(),
        security: this.generateSecurity(),
      };

      this.stats.specsGenerated++;
      return spec;
    } catch (error) {
      this.stats.errors++;
      console.error('Generate OpenAPI Spec Error:', error);
      throw error;
    }
  }

  generateDescription() {
    return `
# HJTPX API Platform

Welcome to the HJTPX API Platform documentation. This API provides programmatic access to our services.

## Features

- **API Key Authentication**: Secure access with API keys
- **Rate Limiting**: Configurable rate limits per API key
- **Real-time Analytics**: Track your API usage in real-time
- **Webhook Support**: Receive notifications for events
- **Comprehensive Documentation**: OpenAPI 3.0 and Markdown formats

## Getting Started

1. Sign up for an account
2. Generate an API key
3. Start making requests

## Rate Limits

| Plan | Requests/Minute | Monthly Quota |
|------|----------------|---------------|
| Free | 10 | 1,000 |
| Starter | 50 | 10,000 |
| Professional | 200 | 100,000 |
| Enterprise | Custom | Unlimited |

## Support

For support, please contact api-support@hjtpx.com
    `.trim();
  }

  generateTags() {
    return [
      {
        name: 'Authentication',
        description: 'API key management and authentication',
      },
      {
        name: 'Usage',
        description: 'API usage statistics and analytics',
      },
      {
        name: 'Billing',
        description: 'Billing information and plan management',
      },
      {
        name: 'Webhooks',
        description: 'Webhook configuration and management',
      },
      {
        name: 'Health',
        description: 'Service health and readiness checks',
      },
    ];
  }

  generatePaths() {
    return {
      '/health': this.generateHealthPath(),
      '/ready': this.generateReadyPath(),
      '/api-keys': this.generateApiKeysPaths(),
      '/usage/stats': this.generateUsageStatsPath(),
      '/usage/billing': this.generateUsageBillingPath(),
      '/webhooks': this.generateWebhooksPaths(),
      '/docs/openapi.json': this.generateDocsPath(),
      '/docs/markdown': this.generateMarkdownPath(),
    };
  }

  generateHealthPath() {
    return {
      get: {
        tags: ['Health'],
        summary: 'Health check',
        description: 'Check the health status of the API Gateway and its dependencies',
        operationId: 'getHealth',
        responses: {
          '200': {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'healthy' },
                    timestamp: { type: 'string', format: 'date-time' },
                    uptime: { type: 'number', example: 12345 },
                    services: {
                      type: 'object',
                      properties: {
                        redis: { type: 'boolean', example: true },
                        apiKey: { type: 'boolean', example: true },
                        usageTracking: { type: 'boolean', example: true },
                        webhook: { type: 'boolean', example: true },
                      },
                    },
                  },
                },
              },
            },
          },
          '503': {
            description: 'Service is unhealthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    };
  }

  generateReadyPath() {
    return {
      get: {
        tags: ['Health'],
        summary: 'Readiness check',
        description: 'Check if the service is ready to accept requests',
        operationId: 'getReady',
        responses: {
          '200': {
            description: 'Service is ready',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    ready: { type: 'boolean', example: true },
                    timestamp: { type: 'string', format: 'date-time' },
                  },
                },
              },
            },
          },
        },
      },
    };
  }

  generateApiKeysPaths() {
    return {
      post: {
        tags: ['Authentication'],
        summary: 'Create API key',
        description: 'Create a new API key for your account',
        operationId: 'createApiKey',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['name'],
                properties: {
                  name: { type: 'string', description: 'Name for the API key', example: 'Production Key' },
                  permissions: {
                    type: 'array',
                    items: { type: 'string', enum: ['read', 'write', 'admin'] },
                    description: 'Permissions for the API key',
                    example: ['read'],
                  },
                  rateLimit: { type: 'number', description: 'Rate limit per minute', example: 100 },
                  expiresAt: { type: 'string', format: 'date-time', description: 'Expiration date' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'API key created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/ApiKey' },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      get: {
        tags: ['Authentication'],
        summary: 'List API keys',
        description: 'List all API keys for your account',
        operationId: 'listApiKeys',
        security: [{ ApiKeyAuth: [] }],
        responses: {
          '200': {
            description: 'List of API keys',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/ApiKey' },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    };
  }

  generateUsageStatsPath() {
    return {
      get: {
        tags: ['Usage'],
        summary: 'Get usage statistics',
        description: 'Get detailed usage statistics for your API key',
        operationId: 'getUsageStats',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'startDate',
            in: 'query',
            description: 'Start date for statistics',
            schema: { type: 'string', format: 'date-time' },
          },
          {
            name: 'endDate',
            in: 'query',
            description: 'End date for statistics',
            schema: { type: 'string', format: 'date-time' },
          },
          {
            name: 'granularity',
            in: 'query',
            description: 'Data granularity',
            schema: { type: 'string', enum: ['minute', 'hour', 'day', 'week', 'month'], default: 'hour' },
          },
        ],
        responses: {
          '200': {
            description: 'Usage statistics',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/UsageStats' },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    };
  }

  generateUsageBillingPath() {
    return {
      get: {
        tags: ['Billing'],
        summary: 'Get billing information',
        description: 'Get billing information and current usage for your account',
        operationId: 'getBillingInfo',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'period',
            in: 'query',
            description: 'Billing period',
            schema: { type: 'string', enum: ['weekly', 'monthly', 'yearly'], default: 'monthly' },
          },
        ],
        responses: {
          '200': {
            description: 'Billing information',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/BillingInfo' },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    };
  }

  generateWebhooksPaths() {
    return {
      post: {
        tags: ['Webhooks'],
        summary: 'Create webhook',
        description: 'Create a new webhook for receiving event notifications',
        operationId: 'createWebhook',
        security: [{ ApiKeyAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['url', 'events'],
                properties: {
                  url: { type: 'string', format: 'uri', description: 'Webhook endpoint URL' },
                  events: {
                    type: 'array',
                    items: { type: 'string', enum: ['request.completed', 'request.failed', 'rate.limited', 'key.expired'] },
                    description: 'Events to subscribe to',
                  },
                  secret: { type: 'string', description: 'Secret for signature verification' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Webhook created successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: { $ref: '#/components/schemas/Webhook' },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '500': { description: 'Server error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      get: {
        tags: ['Webhooks'],
        summary: 'List webhooks',
        description: 'List all webhooks for your account',
        operationId: 'listWebhooks',
        security: [{ ApiKeyAuth: [] }],
        responses: {
          '200': {
            description: 'List of webhooks',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Webhook' },
                    },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
      delete: {
        tags: ['Webhooks'],
        summary: 'Delete webhook',
        description: 'Delete a webhook',
        operationId: 'deleteWebhook',
        security: [{ ApiKeyAuth: [] }],
        parameters: [
          {
            name: 'webhookId',
            in: 'path',
            required: true,
            schema: { type: 'string', format: 'uuid' },
          },
        ],
        responses: {
          '200': {
            description: 'Webhook deleted successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Webhook deleted successfully' },
                  },
                },
              },
            },
          },
          '401': { description: 'Unauthorized', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          '404': { description: 'Webhook not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
        },
      },
    };
  }

  generateDocsPath() {
    return {
      get: {
        tags: ['Documentation'],
        summary: 'Get OpenAPI specification',
        description: 'Get the OpenAPI 3.0 specification for this API',
        operationId: 'getOpenApiSpec',
        responses: {
          '200': {
            description: 'OpenAPI specification',
            content: {
              'application/json': {
                schema: { type: 'object' },
              },
            },
          },
        },
      },
    };
  }

  generateMarkdownPath() {
    return {
      get: {
        tags: ['Documentation'],
        summary: 'Get Markdown documentation',
        description: 'Get the API documentation in Markdown format',
        operationId: 'getMarkdownDocs',
        responses: {
          '200': {
            description: 'Markdown documentation',
            content: {
              'text/markdown': {
                schema: { type: 'string' },
              },
            },
          },
        },
      },
    };
  }

  generateComponents() {
    return {
      schemas: this.generateSchemas(),
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'X-API-Key',
          description: 'API key for authentication',
        },
      },
    };
  }

  generateSchemas() {
    return {
      ApiKey: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          name: { type: 'string', example: 'Production Key' },
          key: { type: 'string', description: 'The API key (only shown once on creation)' },
          permissions: {
            type: 'array',
            items: { type: 'string', enum: ['read', 'write', 'admin'] },
          },
          rateLimit: { type: 'number', example: 100 },
          expiresAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' },
          isActive: { type: 'boolean', example: true },
        },
      },
      UsageStats: {
        type: 'object',
        properties: {
          summary: {
            type: 'object',
            properties: {
              totalRequests: { type: 'number', example: 10000 },
              totalErrors: { type: 'number', example: 50 },
              avgResponseTime: { type: 'string', example: '120.5ms' },
              errorRate: { type: 'string', example: '0.5%' },
              uniqueEndpoints: { type: 'number', example: 15 },
            },
          },
          period: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                period: { type: 'string', format: 'date-time' },
                requests: { type: 'number' },
                errors: { type: 'number' },
                errorRate: { type: 'string' },
                avgResponseTime: { type: 'string' },
              },
            },
          },
        },
      },
      BillingInfo: {
        type: 'object',
        properties: {
          currentBilling: {
            type: 'object',
            properties: {
              period: {
                type: 'object',
                properties: {
                  start: { type: 'string', format: 'date-time' },
                  end: { type: 'string', format: 'date-time' },
                },
              },
              plan: {
                type: 'object',
                properties: {
                  name: { type: 'string', example: 'Professional' },
                  includedRequests: { type: 'number', example: 100000 },
                  price: { type: 'number', example: 49.99 },
                },
              },
              usage: {
                type: 'object',
                properties: {
                  totalRequests: { type: 'number' },
                  includedRequests: { type: 'number' },
                  overageRequests: { type: 'number' },
                },
              },
              billing: {
                type: 'object',
                properties: {
                  basePrice: { type: 'number' },
                  overageCost: { type: 'number' },
                  total: { type: 'number' },
                  currency: { type: 'string', example: 'USD' },
                },
              },
            },
          },
          availablePlans: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                price: { type: 'number' },
                monthlyRequests: { type: 'number' },
                features: { type: 'array', items: { type: 'string' } },
              },
            },
          },
        },
      },
      Webhook: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid' },
          url: { type: 'string', format: 'uri' },
          events: {
            type: 'array',
            items: { type: 'string' },
          },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          lastTriggeredAt: { type: 'string', format: 'date-time', nullable: true },
          successRate: { type: 'string', example: '98.5%' },
        },
      },
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'ERROR_CODE' },
              message: { type: 'string', example: 'Error message' },
              details: { type: 'object', nullable: true },
            },
          },
        },
      },
    };
  }

  generateSecurity() {
    return [
      {
        ApiKeyAuth: [],
      },
    ];
  }

  generateMarkdownDocs() {
    try {
      const spec = this.generateOpenAPISpec();
      let markdown = '';

      markdown += `# ${spec.info.title}\n\n`;
      markdown += `${spec.info.description}\n\n`;
      markdown += `**Version**: ${spec.info.version}\n\n`;
      markdown += `**Contact**: ${spec.info.contact.name} (${spec.info.contact.email})\n\n`;

      markdown += `## Table of Contents\n\n`;
      markdown += `- [Authentication](#authentication)\n`;
      markdown += `- [Usage](#usage)\n`;
      markdown += `- [Billing](#billing)\n`;
      markdown += `- [Webhooks](#webhooks)\n`;
      markdown += `- [Health](#health)\n`;
      markdown += `- [Documentation](#documentation)\n\n`;

      markdown += `## Base URL\n\n`;
      markdown += `\`\`\`\n${spec.servers[0].url}\n\`\`\`\n\n`;

      markdown += `## Authentication\n\n`;
      markdown += `All API requests require authentication using an API key. Include your API key in the \`X-API-Key\` header:\n\n`;
      markdown += `\`\`\`bash\ncurl -H "X-API-Key: your_api_key" ${spec.servers[0].url}/health\n\`\`\`\n\n`;

      markdown += `### Create API Key\n\n`;
      markdown += `**POST** \`/api-keys\`\n\n`;
      markdown += `Create a new API key for your account.\n\n`;
      markdown += `**Request Body**\n\n`;
      markdown += `| Field | Type | Required | Description |\n`;
      markdown += `|-------|------|----------|-------------|\n`;
      markdown += `| name | string | Yes | Name for the API key |\n`;
      markdown += `| permissions | array | No | Permissions (read, write, admin) |\n`;
      markdown += `| rateLimit | number | No | Rate limit per minute |\n`;
      markdown += `| expiresAt | datetime | No | Expiration date |\n\n`;
      markdown += `**Example**\n\n`;
      markdown += `\`\`\`bash\ncurl -X POST ${spec.servers[0].url}/api-keys \\\n  -H "X-API-Key: your_api_key" \\\n  -H "Content-Type: application/json" \\\n  -d '{"name": "Production Key", "permissions": ["read", "write"]}'\n\`\`\`\n\n`;

      markdown += `### List API Keys\n\n`;
      markdown += `**GET** \`/api-keys\`\n\n`;
      markdown += `List all API keys for your account.\n\n`;

      markdown += `## Usage\n\n`;
      markdown += `### Get Usage Statistics\n\n`;
      markdown += `**GET** \`/usage/stats\`\n\n`;
      markdown += `Get detailed usage statistics for your API key.\n\n`;
      markdown += `**Query Parameters**\n\n`;
      markdown += `| Parameter | Type | Default | Description |\n`;
      markdown += `|-----------|------|---------|-------------|\n`;
      markdown += `| startDate | datetime | 30 days ago | Start date |\n`;
      markdown += `| endDate | datetime | now | End date |\n`;
      markdown += `| granularity | string | hour | Data granularity |\n\n`;

      markdown += `**Response Fields**\n\n`;
      markdown += `| Field | Type | Description |\n`;
      markdown += `|-------|------|-------------|\n`;
      markdown += `| summary.totalRequests | number | Total number of requests |\n`;
      markdown += `| summary.totalErrors | number | Total number of errors |\n`;
      markdown += `| summary.avgResponseTime | string | Average response time |\n`;
      markdown += `| summary.errorRate | string | Error rate percentage |\n`;
      markdown += `| period | array | Usage data per time period |\n\n`;

      markdown += `## Billing\n\n`;
      markdown += `### Get Billing Information\n\n`;
      markdown += `**GET** \`/usage/billing\`\n\n`;
      markdown += `Get billing information and current usage for your account.\n\n`;
      markdown += `**Query Parameters**\n\n`;
      markdown += `| Parameter | Type | Default | Description |\n`;
      markdown += `|-----------|------|---------|-------------|\n`;
      markdown += `| period | string | monthly | Billing period (weekly, monthly, yearly) |\n\n`;

      markdown += `### Billing Plans\n\n`;
      markdown += `| Plan | Monthly Quota | Price | Price per 1000 overage |\n`;
      markdown += `|------|---------------|-------|-----------------------|\n`;
      markdown += `| Free | 1,000 | $0 | $0 |\n`;
      markdown += `| Starter | 10,000 | $9.99 | $0.50 |\n`;
      markdown += `| Professional | 100,000 | $49.99 | $0.30 |\n`;
      markdown += `| Enterprise | Unlimited | $199.99 | $0.20 |\n\n`;

      markdown += `## Webhooks\n\n`;
      markdown += `Webhooks allow you to receive real-time notifications when events occur.\n\n`;

      markdown += `### Create Webhook\n\n`;
      markdown += `**POST** \`/webhooks\`\n\n`;
      markdown += `Create a new webhook for receiving event notifications.\n\n`;
      markdown += `**Request Body**\n\n`;
      markdown += `| Field | Type | Required | Description |\n`;
      markdown += `|-------|------|----------|-------------|\n`;
      markdown += `| url | string | Yes | Webhook endpoint URL |\n`;
      markdown += `| events | array | Yes | Events to subscribe to |\n`;
      markdown += `| secret | string | No | Secret for signature verification |\n\n`;
      markdown += `**Supported Events**\n\n`;
      markdown += `- \`request.completed\` - A request completed successfully\n`;
      markdown += `- \`request.failed\` - A request failed\n`;
      markdown += `- \`rate.limited\` - Rate limit was exceeded\n`;
      markdown += `- \`key.expired\` - API key expired\n\n`;

      markdown += `### List Webhooks\n\n`;
      markdown += `**GET** \`/webhooks\`\n\n`;
      markdown += `List all webhooks for your account.\n\n`;

      markdown += `### Delete Webhook\n\n`;
      markdown += `**DELETE** \`/webhooks/:webhookId\`\n\n`;
      markdown += `Delete a webhook.\n\n`;

      markdown += `### Webhook Verification\n\n`;
      markdown += `Each webhook request includes a signature header \`X-Webhook-Signature\`. Verify it using:\n\n`;
      markdown += `\`\`\`javascript\nconst crypto = require('crypto');\n\nfunction verifyWebhookSignature(payload, signature, secret) {\n  const expectedSignature = crypto\n    .createHmac('sha256', secret)\n    .update(payload)\n    .digest('hex');\n  return crypto.timingSafeEqual(\n    Buffer.from(signature),\n    Buffer.from(expectedSignature)\n  );\n}\n\`\`\`\n\n`;

      markdown += `## Health\n\n`;
      markdown += `### Health Check\n\n`;
      markdown += `**GET** \`/health\`\n\n`;
      markdown += `Check the health status of the API Gateway and its dependencies.\n\n`;

      markdown += `### Readiness Check\n\n`;
      markdown += `**GET** \`/ready\`\n\n`;
      markdown += `Check if the service is ready to accept requests.\n\n`;

      markdown += `## Documentation\n\n`;
      markdown += `### OpenAPI Specification\n\n`;
      markdown += `**GET** \`/docs/openapi.json\`\n\n`;
      markdown += `Get the OpenAPI 3.0 specification in JSON format.\n\n`;

      markdown += `### Markdown Documentation\n\n`;
      markdown += `**GET** \`/docs/markdown\`\n\n`;
      markdown += `Get this documentation in Markdown format.\n\n`;

      markdown += `## Rate Limits\n\n`;
      markdown += `Rate limits are applied per API key:\n\n`;
      markdown += `- Headers are included in responses:\n`;
      markdown += `  - \`X-RateLimit-Remaining\`: Remaining requests\n`;
      markdown += `  - \`X-RateLimit-Reset\`: Unix timestamp when limit resets\n\n`;
      markdown += `When rate limit is exceeded, you'll receive a \`429\` response:\n\n`;
      markdown += `\`\`\`json\n{\n  "success": false,\n  "error": {\n    "code": "RATE_LIMIT_EXCEEDED",\n    "message": "API rate limit exceeded. Please slow down your requests.",\n    "retryAfter": 60\n  }\n}\n\`\`\`\n\n`;

      markdown += `## Error Codes\n\n`;
      markdown += `| HTTP Status | Code | Description |\n`;
      markdown += `|-------------|------|-------------|\n`;
      markdown += `| 400 | BAD_REQUEST | Invalid request parameters |\n`;
      markdown += `| 401 | MISSING_API_KEY | API key is required |\n`;
      markdown += `| 401 | INVALID_API_KEY | Invalid or expired API key |\n`;
      markdown += `| 403 | FORBIDDEN | Insufficient permissions |\n`;
      markdown += `| 404 | NOT_FOUND | Resource not found |\n`;
      markdown += `| 429 | RATE_LIMIT_EXCEEDED | Rate limit exceeded |\n`;
      markdown += `| 500 | INTERNAL_ERROR | Internal server error |\n\n`;

      markdown += `## SDKs and Libraries\n\n`;
      markdown += `Official SDKs are available for:\n\n`;
      markdown += `- [JavaScript/Node.js](https://github.com/hjtpx/sdk-js)\n`;
      markdown += `- [Python](https://github.com/hjtpx/sdk-python)\n`;
      markdown += `- [Go](https://github.com/hjtpx/sdk-go)\n`;
      markdown += `- [Java](https://github.com/hjtpx/sdk-java)\n`;
      markdown += `- [Ruby](https://github.com/hjtpx/sdk-ruby)\n`;
      markdown += `- [PHP](https://github.com/hjtpx/sdk-php)\n\n`;

      markdown += `---\n\n`;
      markdown += `*Documentation generated on ${new Date().toISOString()}*\n`;

      this.stats.docsGenerated++;
      return markdown;
    } catch (error) {
      this.stats.errors++;
      console.error('Generate Markdown Docs Error:', error);
      throw error;
    }
  }

  getStats() {
    return {
      ...this.stats,
      specVersion: this.specVersion,
      apiVersion: this.apiVersion,
    };
  }

  resetStats() {
    this.stats = {
      specsGenerated: 0,
      docsGenerated: 0,
      errors: 0,
    };
  }
}

const apiDocsGenerator = new ApiDocsGenerator();

module.exports = apiDocsGenerator;
