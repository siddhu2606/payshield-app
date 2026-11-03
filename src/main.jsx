import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import '@fontsource/bricolage-grotesque/500.css';
import '@fontsource/bricolage-grotesque/700.css';
import '@fontsource/bricolage-grotesque/800.css';
import '@fontsource/instrument-sans/400.css';
import '@fontsource/instrument-sans/500.css';
import '@fontsource/instrument-sans/600.css';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/500.css';
import './styles.css';
import './mobile/mobile.css';
import './admin/admin.css';
import './pages/pages.css';
import { ToastProvider } from './ui.jsx';
import Landing from './pages/Landing.jsx';
import DemoWall from './pages/DemoWall.jsx';
import MobileApp from './mobile/MobileApp.jsx';
import AdminApp from './admin/AdminApp.jsx';
import { initNative } from './native.js';

const isApp = __TARGET__ === 'app';
initNative();

// Never show stack traces or error details to users: a plain message and a way back.
class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
        <div style={{ display: 'grid', gap: 12, maxWidth: 360 }}>
          <b style={{ font: '700 22px var(--display)' }}>Something went wrong</b>
          <span className="muted">No money moved. Reload to continue; your data on this device is safe.</span>
          <button className="btn" onClick={() => { location.hash = '#/'; location.reload(); }}>Reload PayShield</button>
        </div>
      </div>
    );
  }
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
    <ToastProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={isApp ? <Navigate to="/app" replace /> : <Landing />} />
          {/* Tabs, sidebars and redirects inside these use absolute paths (React Router 7 splat-path rules). */}
          <Route path="/app/*" element={<MobileApp />} />
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="/demo" element={<DemoWall />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </ToastProvider>
    </ErrorBoundary>
  </React.StrictMode>
);

if (!isApp && 'serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
