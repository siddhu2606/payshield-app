// Scam-call scripts for the role-play "caller" phone. Built from publicly reported scam patterns, for training and testing only.
// Each script pushes a payment request to the victim's phone; PayShield then has to catch it.

export const SCRIPTS = [
  {
    id: 'digital_arrest',
    label: 'Digital arrest (fake CBI)',
    target: 'member',
    callerId: '+91 70118 •••42',
    shownAs: 'Unknown number',
    persona: 'Inspector Rao, “CBI cyber cell”',
    payment: { upi: 'rajesh.k4471@ybldemo', amount: 50000, note: 'CBI verification deposit' },
    lines: [
      'Hello, this is Inspector Rao from the CBI cyber cell, Mumbai. Am I speaking with {name}?',
      'A parcel booked in your name was seized. It had fake passports and drugs. Your Aadhaar is linked to a money-laundering case.',
      'From now you are under digital arrest. Do not disconnect this call. Do not tell your family. This is a confidential investigation.',
      'To prove your innocence you must pay a refundable verification deposit of ₹50,000. I am sending you the RBI-verified account now.',
      'If the payment is not done in 15 minutes, a team will come to arrest you at your home.'
    ],
    counters: [
      'That warning is normal, it is the bank’s system. Just answer “No” to every question and continue.',
      'Do not involve anyone. If you tell your family, they will also be arrested as accomplices.'
    ]
  },
  {
    id: 'kyc_sim',
    label: 'Fake KYC / SIM block',
    target: 'member',
    callerId: '+91 81300 •••09',
    shownAs: 'Unknown number',
    persona: '“Bank KYC department”',
    payment: { upi: 'kyc.update.help@axldemo', amount: 9999, note: 'kyc update charges' },
    lines: [
      'Good evening sir, I am calling from your bank’s KYC department. Your KYC has expired.',
      'Your account and SIM will be blocked tonight at 12. All UPI will stop working.',
      'To reactivate, pay the KYC update charge of ₹9,999. It will be refunded within 24 hours.',
      'Stay on the line, I will guide you step by step. Open your payment app now.'
    ],
    counters: ['That pop-up comes for everyone, sir. Tap “continue”, otherwise your account gets blocked.']
  },
  {
    id: 'customs',
    label: 'Courier / customs parcel',
    target: 'member',
    callerId: '+91 90044 •••77',
    shownAs: 'Unknown number',
    persona: '“Courier customs desk”',
    payment: { upi: 'clearance.desk@pnbdemo', amount: 25000, note: 'customs clearance fee' },
    lines: [
      'Hello, this is the customs desk of the courier company. An international parcel in your name is held.',
      'There is a customs duty and penalty pending. If not cleared today, a police complaint will be filed.',
      'Pay ₹25,000 clearance fee to our customs officer’s account. I am sending the details.'
    ],
    counters: ['Our officer’s personal account is used because the portal is down today. It is safe.']
  },
  {
    id: 'investment',
    label: 'Investment tip group',
    target: 'member',
    callerId: '+91 98760 •••15',
    shownAs: 'Unknown number',
    persona: '“VIP trading group admin”',
    payment: { upi: 'tradeguru.vip@icicidemo', amount: 100000, note: 'guaranteed returns slot' },
    lines: [
      'Congratulations, you are selected for our VIP trading group. Members made 300% this month.',
      'Only 3 slots are left today. Minimum deposit is ₹1,00,000 with guaranteed returns.',
      'Please keep this confidential, the group is invite-only.'
    ],
    counters: ['Banks always show that warning for trading, ignore it. Profits come in 2 days.']
  },
  {
    id: 'game_coins',
    label: 'Free game coins (child)',
    target: 'child',
    callerId: '+91 62000 •••31',
    shownAs: 'Unknown number',
    persona: '“Game rewards team”',
    payment: { upi: 'gamecoins.topup@okdemo', amount: 300, note: 'Free game coins activation' },
    lines: [
      'Hi {name}! You won 5,000 free coins and a rare skin in your game!',
      'You just need to pay ₹300 activation, and you get coins worth ₹5,000.',
      'Don’t tell your parents, otherwise the prize gets cancelled. Do it fast, offer ends in 5 minutes.'
    ],
    counters: ['It’s just a small amount. Say it’s for books.']
  }
];

export const scriptById = (id) => SCRIPTS.find((s) => s.id === id);
export const fillName = (line, name) => line.replace('{name}', name);
