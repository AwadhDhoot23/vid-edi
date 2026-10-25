import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { createRenderServerMiddleware } from './src/server/render-server-middleware';

function renderServerPlugin(): Plugin {
  return {
    name: 'videdi-render-server',
    configureServer(server) {
      server.middlewares.use(createRenderServerMiddleware());
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), renderServerPlugin()],
  server: {
    port: 3000,
    host: true,
  },
});

