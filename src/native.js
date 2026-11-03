// Android-only behaviour: the hardware back button walks back through screens instead of closing the app.
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

// Payment links from a real SMS (https://siddhu2606.github.io/payshield-app/#/app/l/CODE or payshield://app/l/CODE)
// open inside the app when the user picks PayShield for them. Only our own app routes are accepted.
function openDeepLink(url) {
  if (!url) return;
  const m = String(url).match(/#\/app\/l\/([A-Z2-9]{6})(\?room=[a-z0-9-]{1,32})?$/) || String(url).match(/^payshield:\/\/app\/l\/([A-Z2-9]{6})$/);
  if (m) location.hash = `#/app/l/${m[1]}${m[2] || ''}`;
}

export function initNative() {
  if (!Capacitor.isNativePlatform()) return;
  App.addListener('appUrlOpen', (e) => openDeepLink(e.url));
  App.getLaunchUrl().then((r) => openDeepLink(r?.url)).catch(() => {});
  App.addListener('backButton', () => {
    const atRoot = /^#\/app\/?(home|alerts)?$/.test(location.hash) || location.hash === '' || location.hash === '#/app';
    if (atRoot) App.minimizeApp();
    else window.history.back();
  });
}
export const isNative = () => Capacitor.isNativePlatform();
