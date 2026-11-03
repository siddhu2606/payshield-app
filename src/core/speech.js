// Read the caller's lines aloud. Android WebView has no Web Speech voices, so the APK uses the phone's own
// text-to-speech engine through a Capacitor plugin. Browsers use the Web Speech API, which Chrome on Android
// only allows after a tap, so prime() is called from the "Accept call" tap.
import { Capacitor } from '@capacitor/core';

let tts = null;
async function nativeTts() {
  if (!Capacitor.isNativePlatform()) return null;
  if (!tts) { try { tts = (await import('@capacitor-community/text-to-speech')).TextToSpeech; } catch { tts = null; } }
  return tts;
}

function webVoice(lang = 'en-IN') {
  try {
    const vs = speechSynthesis.getVoices();
    const base = lang.slice(0, 2);
    if (base === 'en') return vs.find((v) => /en[-_]IN/i.test(v.lang)) || vs.find((v) => /hi[-_]IN/i.test(v.lang) && /english/i.test(v.name)) || vs.find((v) => /^en/i.test(v.lang)) || null;
    // Marathi voices are rare on desktops; a Hindi voice reads Devanagari well enough as a fallback.
    return vs.find((v) => v.lang.replace('_', '-').toLowerCase() === lang.toLowerCase()) || vs.find((v) => v.lang.toLowerCase().startsWith(base)) || vs.find((v) => /^hi/i.test(v.lang)) || null;
  } catch { return null; }
}

export async function speak(text, { rate = 1, pitch = 0.85, lang = 'en-IN' } = {}) {
  if (!text) return;
  const t = await nativeTts();
  if (t) {
    try { await t.stop(); } catch { /* nothing playing */ }
    const tries = lang.startsWith('mr') ? [lang, 'hi-IN'] : lang.startsWith('hi') ? [lang] : [lang, 'en-US'];
    for (const l of tries) {
      try { await t.speak({ text, lang: l, rate, pitch, volume: 1, category: 'playback' }); return; } catch { /* try the next language */ }
    }
  }
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
  try {
    const u = new SpeechSynthesisUtterance(text);
    const v = webVoice(lang);
    if (v) u.voice = v;
    u.lang = v?.lang || lang; u.rate = rate; u.pitch = pitch; u.volume = 1;
    speechSynthesis.cancel();
    speechSynthesis.resume();
    speechSynthesis.speak(u);
  } catch { /* ignore */ }
}

/** Call inside a tap handler so mobile browsers allow speech later. */
export function prime() {
  nativeTts();
  try {
    if ('speechSynthesis' in window) { const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); speechSynthesis.getVoices(); }
  } catch { /* ignore */ }
}

export async function stopSpeaking() {
  const t = await nativeTts();
  if (t) { try { await t.stop(); } catch { /* ignore */ } }
  try { speechSynthesis?.cancel(); } catch { /* ignore */ }
}

/** Short two-tone chime for an incoming message (Web Audio, no file needed). */
export function chime() {
  try {
    const C = window.AudioContext || window.webkitAudioContext;
    const ctx = new C();
    [880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.frequency.value = f; o.type = 'sine';
      g.gain.setValueAtTime(0.0001, ctx.currentTime + i * 0.16);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + i * 0.16 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + i * 0.16 + 0.15);
      o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + i * 0.16); o.stop(ctx.currentTime + i * 0.16 + 0.16);
    });
    setTimeout(() => ctx.close(), 600);
  } catch { /* ignore */ }
}
