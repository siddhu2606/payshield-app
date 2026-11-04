// Message scanner: reads a message the person chooses to check (or one in the demo inbox) and explains what in it
// matches known scam patterns. Pure function, runs on the phone. PayShield never reads the real SMS inbox.
import { findScriptWords } from './risk.js';
import { factsFor } from './data.js';
import { checkSender } from './sender.js';

const URGENCY = ['now', 'immediately', 'within', 'today', 'tonight', 'min', 'minutes', 'hours', 'last chance', 'expire', 'expired', 'urgent', 'fast'];
const THREAT = ['arrest', 'police', 'case', 'court', 'warrant', 'block', 'blocked', 'suspend', 'penalty', 'legal', 'fir', 'jail'];
const SECRECY = ['secret', 'confidential', 'dont tell', "don't tell", 'do not tell', 'keep this', 'private'];
const MONEY = /(?:rs\.?|inr|₹)\s?[\d,]+/i;
const UPI = /[a-z0-9._-]{3,}@[a-z]{2,}/i;
const URL = /\bhttps?:\/\/[^\s]+|\b[a-z0-9-]+\.(?:in|com|net|org|xyz|top|info|co|link|app|io)(?:\/[^\s]*)?/i;
// Senders that are official-looking short codes, and the brands scammers mimic in links.
const LOOKALIKE = /(sbi|hdfc|icici|axis|paytm|phonepe|gpay|npci|rbi|incometax|uidai|india-?post|customs|cbi|trai)[^/\s]*\.(?!gov\.in|nic\.in)[a-z.]+/i;

export function scanMessage(text = '', { from = '', registry = {} } = {}) {
  const t = ` ${String(text).toLowerCase().replace(/[’']/g, "'")} `;
  const has = (list) => list.filter((w) => new RegExp(`[^a-z]${w.replace(/ /g, '\\s+')}[^a-z]`).test(t));
  const flags = [];
  const money = text.match(MONEY);
  const url = text.match(URL);
  const upi = (text.match(UPI) || [])[0];
  const urgent = has(URGENCY);
  const threat = has(THREAT);
  const secret = has(SECRECY);
  const words = findScriptWords(text);

  if (money && (url || upi)) flags.push({ code: 'pay_request', points: 25, label: 'Asks you to pay through a link or UPI ID', detail: `Mentions ${money[0].replace(/\s/g, '')} and gives a way to pay straight away.` });
  if (url) {
    const host = (url[0].replace(/^https?:\/\//, '').split(/[/?#]/)[0] || '').toLowerCase();
    const ownApp = /github\.io$/.test(host) && /payshield/.test(url[0]);
    if (LOOKALIKE.test(url[0])) flags.push({ code: 'lookalike', points: 25, label: 'Link imitates a bank or government site', detail: `${host} is not an official .gov.in or bank domain.` });
    else flags.push({ code: 'link', points: 10, label: ownApp ? 'Payment link that opens your payment app' : 'Contains a link', detail: ownApp ? 'Links like this jump straight to a filled-in payment. Real organisations don’t send them.' : `Goes to ${host}. Check it yourself instead of tapping.` });
  }
  if (threat.length) flags.push({ code: 'threat', points: 25, label: 'Threat of arrest, blocking or a penalty', detail: `Uses ${threat.slice(0, 3).map((w) => `“${w}”`).join(', ')}.` });
  if (urgent.length) flags.push({ code: 'urgency', points: 15, label: 'Rushes you', detail: `Uses ${urgent.slice(0, 3).map((w) => `“${w}”`).join(', ')}.` });
  if (secret.length) flags.push({ code: 'secrecy', points: 15, label: 'Tells you to keep it secret', detail: 'Genuine banks and police never ask you to hide a payment from family.' });
  if (/\b(won|winner|prize|free|cashback|guaranteed|300%|double)\b/.test(t)) flags.push({ code: 'too_good', points: 10, label: 'Prize or guaranteed returns', detail: 'Offers that sound too good are a common hook.' });
  // Sender ID that imitates a bank or claims to be an authority (SMS Shield), e.g. VK-CBIGOV or AX-HDFCBN.
  if (from && /^[a-z]{2}-[a-z0-9]{6}(-[pstg])?$/i.test(from.trim())) {
    const sc = checkSender(from);
    if (sc.verdict === 'lookalike' || sc.verdict === 'authority') flags.push({ code: 'fake_sender', points: 20, label: 'Sender ID imitates a bank or authority', detail: `${from}: ${sc.title.toLowerCase()}. ${sc.verdict === 'authority' ? 'Police, CBI and courts never send payment SMS.' : 'It is not that organisation’s registered sender ID.'}` });
  }
  if (from && /^\+?\d/.test(from.replace(/\s/g, ''))) flags.push({ code: 'personal_sender', points: 10, label: 'Sent from a personal mobile number', detail: 'Banks and government send from registered short codes, not personal numbers.' });
  if (upi) {
    const f = factsFor(registry, upi.toLowerCase());
    if (f.type === 'individual' && f.ageDays < 30) flags.push({ code: 'new_account', points: 15, label: 'Payee account is days old', detail: `${f.name} was opened ${f.ageDays} day${f.ageDays === 1 ? '' : 's'} ago.` });
    if (f.reported || f.linkedReported?.length) flags.push({ code: 'reported', points: 20, label: 'Payee linked to fraud reports', detail: f.reported ? 'Other users reported this account.' : `It shares ${f.linkedVia} with a reported account.` });
  }
  if (words.length && !threat.length) flags.push({ code: 'script', points: 10, label: 'Words from known scam scripts', detail: words.slice(0, 3).map((w) => `“${w}”`).join(', ') });

  const score = Math.min(100, flags.reduce((a, f) => a + f.points, 0));
  const verdict = score >= 50 ? 'scam' : score >= 25 ? 'suspicious' : 'ok';
  return { score, verdict, flags: flags.sort((a, b) => b.points - a.points), upi: upi?.toLowerCase() || null, url: url?.[0] || null };
}
