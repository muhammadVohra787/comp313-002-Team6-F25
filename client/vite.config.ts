import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        popup: fileURLToPath(new URL('index.html', import.meta.url)),
        contentScript: fileURLToPath(new URL('src/scripts/contentScript.ts', import.meta.url)),
        background: fileURLToPath(new URL('src/scripts/background.ts', import.meta.url))
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'contentScript') return 'contentScript.js';
          if (chunk.name === "background") return 'background.js'
          return 'assets/[name]-[hash].js';
        },
      },
    },
  },
  server: {
    watch: {
      usePolling: true,
    },
  },
});
