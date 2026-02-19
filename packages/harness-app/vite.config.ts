import { defineConfig } from 'vite';
import { resolve } from 'path';
import yaml from '@modyfi/vite-plugin-yaml';

export default defineConfig({
  plugins: [yaml()],
  resolve: {
    alias: {
      '@harness': resolve(__dirname, '../harness-designer'),
    },
  },
  server: {
    port: 5173,
    open: true,
  },
});
