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

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={isApp ? <Navigate to="/app" replace /> : <Landing />} />
          <Route path="/app/*" element={<MobileApp />} />
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="/demo" element={<DemoWall />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </ToastProvider>
  </React.StrictMode>
);

if (!isApp && 'serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
