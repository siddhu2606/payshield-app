import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Security headers for the website. GitHub Pages can't send custom HTTP headers, so the policy is set in the page.
// Scripts only from this site, live sync only to the two relay brokers over WSS (plus a local broker for testing).
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' wss://broker.emqx.io:8084 wss://broker.hivemq.com:8884 ws://localhost:* ws://127.0.0.1:*",
  "worker-src 'self' blob:", // the MQTT client runs its keep-alive timers in a small blob worker
  "manifest-src 'self'",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join('; ');

const securityHeaders = (mode) => ({
  name: 'payshield-security-headers',
  apply: 'build',
  transformIndexHtml(html) {
    // The Android app injects its native bridge as an inline script, so the CSP is for the website build only.
    if (mode === 'app') return html;
    return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />\n    <meta name="referrer" content="no-referrer" />`);
  }
});

// Relative base so the same build works on GitHub Pages (/payshield-app/) and inside the Android app.
// `--mode app` builds the Android bundle, which opens straight into the mobile app.
export default defineConfig(({ mode, command }) => ({
  base: './',
  plugins: [react(), securityHeaders(mode)],
  define: { __TARGET__: JSON.stringify(mode === 'app' ? 'app' : 'web') },
  // Production builds: no source maps, no console output or debugger statements.
  esbuild: command === 'build' ? { drop: ['console', 'debugger'], legalComments: 'none' } : undefined,
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1200
  }
}));
