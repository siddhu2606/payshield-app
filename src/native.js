// Android-only behaviour: the hardware back button walks back through screens instead of closing the app.
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';

export function initNative() {
  if (!Capacitor.isNativePlatform()) return;
  App.addListener('backButton', () => {
    const atRoot = /^#\/app\/?(home|alerts)?$/.test(location.hash) || location.hash === '' || location.hash === '#/app';
    if (atRoot) App.minimizeApp();
    else window.history.back();
  });
}
export const isNative = () => Capacitor.isNativePlatform();
