import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';


export default defineConfig({
  plugins: [react()],
  base: '',
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        background: "src/scripts/background.ts",
        content: "src/scripts/contentScript.ts",
        popup: "index.html"
      },
      output: {
        entryFileNames: "[name].js"
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom']
  }
});
