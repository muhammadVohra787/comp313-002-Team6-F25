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
          if (chunk.name === 'background') return 'background.js';
          return 'assets/[name]-[hash].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
        format: 'esm',
        globals: {
          'react': 'React',
          'react-dom': 'ReactDOM'
        }
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    watch: {
      usePolling: true,
    },
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
});
