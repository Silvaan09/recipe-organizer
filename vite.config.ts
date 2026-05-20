import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

declare const process: {
  env: Record<string, string | undefined>;
};

export default defineConfig({
  base: process.env.VITE_BASE_PATH ?? '/',
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
  },
});
