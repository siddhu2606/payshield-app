// Real call-state on the Android app (native CallState plugin in plugins/call-state).
// Yes/no signals only: is a call in progress (SIM or internet), is the screen shared. Never numbers, audio or content.
// In a browser there is no such API, so the simulated call from the role-play caller phone is used instead.
import { useSyncExternalStore } from 'react';
import { Capacitor } from '@capacitor/core';

let CallState = null;
const native = () => Capacitor.isNativePlatform();
let state = { supported: false, onCall: false, kind: 'none', ringing: false, screenShared: false, phonePermission: false, since: null, checkedAt: null };
const subs = new Set();
const set = (p) => { state = { ...state, ...p }; subs.forEach((f) => f()); };
let timer = null;

async function plugin() {
  if (!native()) return null;
  if (!CallState) { try { CallState = (await import('payshield-call-state')).CallState; } catch { CallState = null; } }
  return CallState;
}

async function poll() {
  const p = await plugin();
  if (!p) return;
  try {
    const r = await p.getState();
    const onCall = !!r.onCall;
    set({ supported: true, onCall, kind: r.kind || 'none', ringing: !!r.ringing, screenShared: !!r.screenShared, phonePermission: !!r.phonePermission, since: onCall ? (state.onCall ? state.since : Date.now()) : null, checkedAt: Date.now() });
  } catch { set({ supported: false }); }
}

/** Start watching (about every 2 s while the app is open). Safe to call many times. */
export function startCallWatch() {
  if (!native() || timer) return;
  set({ supported: true });
  poll();
  timer = setInterval(poll, 2000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) poll(); });
}

export async function askPhonePermission() {
  const p = await plugin();
  if (!p) return false;
  try { const r = await p.requestPhonePermission(); await poll(); return !!r.phonePermission; } catch { return false; }
}

export const getDeviceCall = () => state;
export function useDeviceCall() {
  return useSyncExternalStore((f) => { subs.add(f); return () => subs.delete(f); }, () => state);
}
export const isNativeApp = native;
