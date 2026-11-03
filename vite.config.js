import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base so the same build works on GitHub Pages (/payshield-app/) and inside the Android app.
// `--mode app` builds the Android bundle, which opens straight into the mobile app.
export default defineConfig(({ mode }) => ({
  base: './',
  plugins: [react()],
  define: { __TARGET__: JSON.stringify(mode === 'app' ? 'app' : 'web') },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1200
  }
}));
