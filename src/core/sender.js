// SMS Shield: checks an SMS sender ID before the person trusts the message.
//
// In India, business and government SMS come from a registered sender ID, shown as XY-HEADER-S:
//   XY      two letters for the telecom network and region (they vary, so they are not checked)
//   HEADER  six characters registered by the organisation on TRAI's DLT platform (AXISBK, HDFCBK...)
//   S       optional suffix for the message type: P promotional, S service, T transactional, G government
// Banks and government never send official SMS from a 10-digit mobile number.
//
// The header list below is a small sample for the demo. A bank deploying PayShield would load its own headers and
// TRAI's DLT header registry instead. Pure function: runs on the phone, nothing is sent anywhere.

export const OFFICIAL_HEADERS = {
  AXISBK: { org: 'Axis Bank', kind: 'bank' },
  HDFCBK: { org: 'HDFC Bank', kind: 'bank' },
  ICICIB: { org: 'ICICI Bank', kind: 'bank' },
  SBIINB: { org: 'State Bank of India', kind: 'bank' },
  SBIUPI: { org: 'State Bank of India', kind: 'bank' },
  CBSSBI: { org: 'State Bank of India', kind: 'bank' },
  ATMSBI: { org: 'State Bank of India', kind: 'bank' },
  KOTAKB: { org: 'Kotak Mahindra Bank', kind: 'bank' },
  PNBSMS: { org: 'Punjab National Bank', kind: 'bank' },
  BOBTXN: { org: 'Bank of Baroda', kind: 'bank' },
  BOBSMS: { org: 'Bank of Baroda', kind: 'bank' },
  PYSHLD: { org: 'PayShield (this app, demo)', kind: 'app' }
};

export const SUFFIX = {
  P: 'Promotional (offers and ads)',
  S: 'Service (updates for customers)',
  T: 'Transactional (OTPs and account alerts)',
  G: 'Government'
};

// Brand stems scammers borrow, and words that pretend to be an authority.
const BRANDS = [['AXIS', 'Axis Bank'], ['HDFC', 'HDFC Bank'], ['ICIC', 'ICICI Bank'], ['SBI', 'State Bank of India'], ['KOTAK', 'Kotak Mahindra Bank'], ['PNB', 'Punjab National Bank'], ['BOB', 'Bank of Baroda'], ['PAYTM', 'Paytm'], ['PHONPE', 'PhonePe'], ['GPAY', 'Google Pay']];
const AUTHORITY = ['CBI', 'RBI', 'GOV', 'POLICE', 'POLICE', 'COURT', 'CUSTM', 'CUSTOM', 'TRAI', 'UIDAI', 'AADHAR', 'AADHAAR', 'INCTAX', 'ITDEPT', 'NCB', 'EDGOV', 'KYC', 'FEDEX', 'DHL', 'INDPST'];

function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}

/** Split whatever was typed or pasted ("VK-CBIGOV-T", "axisbk", "+91 98765 43210") into its parts. */
export function parseSender(raw = '') {
  const s = String(raw).trim();
  const digits = s.replace(/[\s()-]/g, '');
  if (/^\+?\d{10,13}$/.test(digits)) return { mobile: true, raw: s };
  const parts = s.toUpperCase().replace(/[\s_.]+/g, '-').split('-').filter(Boolean);
  let prefix = '';
  let header = '';
  let suffix = '';
  if (parts.length >= 2 && /^[A-Z]{2}$/.test(parts[0])) { prefix = parts[0]; header = parts[1]; suffix = parts[2] || ''; }
  else if (parts.length >= 1) { header = parts[0]; suffix = parts[1] || ''; }
  return { prefix, header, suffix, raw: s };
}

/**
 * Check a sender. Accepts a raw string or { prefix, header, suffix }.
 * verdict: official | mobile | lookalike | authority | unknown | invalid
 * tone:    good | bad | warn | info (for colour)
 */
export function checkSender(input) {
  const p = typeof input === 'string' ? parseSender(input) : { prefix: String(input?.prefix || '').toUpperCase().trim(), header: String(input?.header || '').toUpperCase().trim(), suffix: String(input?.suffix || '').toUpperCase().trim() };
  if (typeof input !== 'string' && /^\+?\d[\d\s]{9,}$/.test(p.header)) return checkSender(p.header);
  if (p.mobile) {
    return { verdict: 'mobile', tone: 'bad', title: 'Sent from a mobile number', body: 'Banks, government offices and real companies never send official SMS from a 10-digit mobile number. Treat any request for money, an OTP or a link as a scam.' };
  }
  const { prefix, header, suffix } = p;
  const id = [prefix, header, suffix].filter(Boolean).join('-');
  if (!/^[A-Z0-9]{6}$/.test(header)) {
    return { verdict: 'invalid', tone: 'warn', id, title: 'Not a standard sender ID', body: 'Registered sender IDs have a six-character name, like AD-AXISBK. This one doesn’t follow that format, so it can’t be an official bank or government sender.' };
  }
  if (suffix && !SUFFIX[suffix]) {
    return { verdict: 'invalid', tone: 'warn', id, title: 'Unknown message type', body: 'The letter after the name should be P, S, T or G. Anything else isn’t an official sender format.' };
  }
  const reg = OFFICIAL_HEADERS[header];
  if (reg) {
    if (suffix === 'G' && reg.kind !== 'government') {
      return { verdict: 'lookalike', tone: 'bad', id, org: reg.org, title: `Wrong type for ${reg.org}`, body: `${reg.org} is not a government sender, but this ID is marked -G (government). Don’t trust it.` };
    }
    const promo = suffix === 'P';
    return {
      verdict: 'official', tone: promo ? 'warn' : 'good', id, org: reg.org, kind: reg.kind,
      title: `Registered sender of ${reg.org}`,
      body: promo
        ? `This is ${reg.org}’s promotional channel. It sends offers only: it will never ask for an OTP, PIN or payment.`
        : `${header} is ${reg.org}’s registered sender ID${suffix ? ` (${SUFFIX[suffix].split(' (')[0].toLowerCase()})` : ''}. Even so, ${reg.org} will never ask you for an OTP, PIN or to pay someone through a link.`
    };
  }
  const near = Object.entries(OFFICIAL_HEADERS).find(([h]) => distance(h, header) === 1);
  if (near) return { verdict: 'lookalike', tone: 'bad', id, org: near[1].org, title: `Imitates ${near[1].org}`, body: `${header} is one letter away from ${near[0]}, ${near[1].org}’s real sender ID. This is a common trick. Don’t tap links or reply.` };
  const brand = BRANDS.find(([b]) => header.includes(b));
  if (brand) return { verdict: 'lookalike', tone: 'bad', id, org: brand[1], title: `Uses ${brand[1]}’s name but isn’t registered to it`, body: `${header} isn’t one of ${brand[1]}’s sender IDs we know. Contact the bank on the number on your card or its official app before you act.` };
  const auth = AUTHORITY.find((w) => header.includes(w));
  if (auth) return { verdict: 'authority', tone: 'bad', id, title: 'Pretends to be an authority', body: 'Police, CBI, courts, RBI and customs never send SMS asking you to pay, verify KYC or tap a link. Sender IDs like this are used in digital-arrest and KYC scams.' };
  return { verdict: 'unknown', tone: 'info', id, title: 'Not a bank or government sender we know', body: 'It may be a shop or a service. If it asks for money, an OTP or tells you to tap a link, check with the company directly first.' };
}
