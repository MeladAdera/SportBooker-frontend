import { defineConfig } from 'orval';

export default defineConfig({
  sportbooker: {
    input:
      process.env.OPENAPI_SPEC_PATH ?? 'http://localhost:3000/api/docs-json',
    output: {
      mode: 'tags-split',
      target: 'src/api/generated/endpoints.ts',
      schemas: 'src/api/generated/models',
      client: 'react-query',
      mock: false,
    },
  },
});
