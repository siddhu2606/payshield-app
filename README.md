# PayShield

**The PIN proves who is paying. PayShield checks they're paying freely.**

Prototype for **FIN-11: Interrupting Coerced Payments Before They Complete** (Vishwakarandak'26), by Team V/Slash: Siddhesh Mandlik (lead), Vidula, Isha, Samarth.

In "digital arrest" and impersonation scams the victim enters the right PIN and OTP themselves, so authentication can't help. PayShield sits between *Pay* and *Paid*. It asks a short voluntary safety check only when a payment gives a reason to, compares the story with facts the caller can't change, and responds in proportion. It never hard-blocks a payment.

| | Link |
|---|---|
| Website (start here) | https://siddhu2606.github.io/payshield-app/ |
| Mobile app in the browser | https://siddhu2606.github.io/payshield-app/#/app |
| Admin risk console | https://siddhu2606.github.io/payshield-app/#/admin |
| Live demo wall (all screens side by side) | https://siddhu2606.github.io/payshield-app/#/demo |
| Android APK | https://github.com/siddhu2606/payshield-app/releases/latest/download/PayShield.apk |

**Demo logins.** Mobile passcode `1234` for Member (Aarav), Child (Anaya), Guardian (Priya) and Scam caller (simulation). Admin staff ID `RISK-2291`, password `demo`, then code `246810`.

## What's inside

**Mobile app (Member, Child, Guardian)**
- Member: sign-in, new-account KYC (Aadhaar, PAN, liveness, all simulated), home, pay flow, activity, safety settings.
- Pay flow: payee → amount → review with the payee's registry facts → voluntary 5-question safety check plus "who asked you to pay, and why?" → risk result with a 0–100 gauge, reasons and the story-vs-facts card → a tier-matched intervention.
- Interventions: Low pays straight away. Medium shows a caution, with verify or pay later. High gives cancel, ask the trusted contact, postpone, or continue after a 10-second pause. Critical gives cancel, ask the trusted contact, postpone, or send for review, plus the 1930 helpline.
- Discreet pressure button: press and hold the shield for 1.5 s. The screen shows only a neutral "routine security check", the payment is held, and the trusted contact is alerted.
- Child: pocket money, daily limit, and guardian approval for new payees or anything over the limit. Includes a "free game coins" scam example.
- Guardian: live alerts with the reasons and the story-vs-facts card, approve or stop, and family limits.
- **Phone lock:** when a guardian stops a held payment (or a child's payment), PayShield cuts any live call and locks that phone. The lock screen shows the time and a neutral message only: no balance, payees, messages or notifications. Further calls from the caller don't connect. The guardian can unlock it remotely, or the owner can unlock with their passcode after a 1-minute cool-off.
- **Scam caller (simulation):** the role-play phone. Pick a target (Aarav or Anaya) and a script (digital arrest, fake KYC/SIM block, customs parcel, investment group, free game coins), optionally as a late-night call, and ring them. The victim's phone shows a real-looking incoming call. Once answered, an on-call bar shows each line the caller taps (read aloud by the phone's voice), and the caller can push an SMS with the payment details. The caller's screen shows live whether PayShield paused, stopped or let the money through, and the Results tab tallies money asked for against money lost. Being on a call with an unknown number feeds the score as a consented call-state signal (+10), never call audio or content.

- **Scam SMS with a payment link:** the scam-caller phone can also *text* the target. The demo phone shows the SMS as a banner with a chime. PayShield scans it on the phone and labels it "Likely scam" with reasons. Tapping the link opens the payment screen with the scammer's details filled in, and a "came from a message link" signal (+15) is added to the score. Optionally the same SMS goes to a real phone through Twilio (see below).
- **Real call detection (Android app):** a small native plugin (`plugins/call-state`) tells PayShield whether a phone or WhatsApp-style call is in progress, and whether the screen is being shared, while you pay. It's yes/no only: never the number, the audio or call logs. A judge can ring the phone for real and watch the score change.
- **Caller voice on phones:** the APK reads the caller's lines with the phone's own text-to-speech engine. The browser uses Web Speech, unlocked by the "accept call" tap.
- **Check a message:** in Safety, paste any SMS or WhatsApp text to get the same scam analysis.

**Admin console:** overview charts, payments table with a case drawer, review queue (release or keep stopped), KYC queue (approving lifts the member's limit live), payee registry (mark an account reported), **mule network** (accounts linked by a shared device or phone number, so one report flags the whole ring; freeze with a lien, draft an STR for FIU-IND, share with 1930), policy (tune every weight and threshold with a live preview on the scenario suite), scenario suite against a rules-only baseline, a role-play recorder, an audit log, **Integrations & API** (architecture, connectors for bank, UPI, Account Aggregator and reporting, plus a live API playground), and **Security** (the 12-point review, with backups).

## Risk engine

`src/core/risk.js` holds the plan's deterministic points, clamped to 0–100: Low 0–24, Medium 25–49, High 50–74, Critical 75–100. Every point carries a plain-language reason.

| Signal | Points |
|---|---|
| New beneficiary | +10 |
| Amount far above usual | +15 |
| Several payments in a short time | +15 |
| Pressure to pay now (answer) | +20 |
| Told to keep it secret (answer) | +15 |
| Threat of arrest or penalty (answer) | +25 |
| Someone directing on a call (answer) | +10 |
| **Stated purpose contradicts the account** | +25 |
| **New account paid by many people** | +15 |
| Payee reported / scam-script words / unusual hour | +20 / +10 / +5 |
| **Opened from a payment link in a message** | +15 |
| **Screen being shared** (Android) | +15 |
| **Account linked to a reported account** (shared device or phone) | +20 |

Guard rails: answering "I verified it" never subtracts points, and a legitimate ₹2,00,000 payment to a known payee is not Critical on amount alone. Run `npm test` to check both.

**Scenario suite** (`src/core/scenarios.js`): 10 normal and 9 coerced scripted payments. At the default policy, 8 of 9 coerced reach High or Critical, and 0 of 10 normal do. A transaction-rules baseline catches none of the coerced ones. The miss is the calm, fully convinced victim, which we state openly. These are synthetic design checks, not accuracy claims.

## Real SMS through Twilio (optional)

The website and APK are public, so the Twilio token can never be inside them. A small relay runs on the team laptop instead. It joins the same encrypted sync room and sends the SMS when the caller phone ticks **Also send as a real SMS**.

```bash
cp .env.example .env              # fill in TWILIO_AUTH_TOKEN, TWILIO_FROM, SMS_TO_u_aarav (never commit .env)
npm run sms-relay -- --check      # validates config and prints the exact texts, sends nothing
npm run sms-relay                 # dry run: logs what it would send (SMS_LIVE=0)
SMS_LIVE=1 npm run sms-relay      # really sends (or set SMS_LIVE=1 in .env)
```

Guard rails protect a trial account's allowance:
- Dry run by default.
- A daily cap (`SMS_DAILY_CAP`, default 5), a minimum gap between texts, and each message sent at most once.
- Recipients come only from `.env`.
- The text is rebuilt by the relay from the fixed script, so nobody in the room can make it send anything else.
- Each text fits in one SMS segment, including Twilio's trial prefix.

On a trial account the recipient must be a number verified in Twilio. The caller phone shows the relay as online or offline, and the result of each text.

## Security

See [SECURITY.md](SECURITY.md) for the 12-point review. In short:
- End-to-end encrypted sync (AES-256-GCM, room-derived key, hashed topic).
- bcrypt-hashed passcodes and admin password, with rate-limited sign-in.
- Input validation on every write.
- CSP and referrer policy, no source maps or console output, and an error boundary.
- A signed, non-debuggable release APK.
- gitleaks and `npm audit` in CI, and Dependabot.

## How it is built

React + Vite, one codebase for the website, the admin console and the Android app (Capacitor). The FastAPI + PostgreSQL backend from the plan is stood in for by `src/core/store.js`, which mirrors the plan's API contract. **Live sync across devices:** every phone (APK or browser) and laptop in the same *room* shares one demo. Changes go through a free public MQTT relay over secure WebSockets (`broker.emqx.io`, falling back to `broker.hivemq.com`). They are **end-to-end encrypted** with AES-256-GCM, using a key derived from the room name, under a hashed topic: the relay never sees the data or the room name. The room's latest state is kept as a retained message, so a newly opened device catches up straight away. A logical revision counter decides which change wins, so device clocks don't matter. The default room is `vslash-vk26`. Tap the "Live sync" badge to switch to a private room, or open any link with `?room=yourname` (for example `#/app?room=team1`). Anyone who knows the room name can join it, so use a private room name for anything beyond the demo, and demo data only. Without a connection the app keeps working on that device and catches up when it reconnects. Hosting is GitHub Pages. The APK is built by GitHub Actions on every push and attached to the latest release.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # engine guard rails, scenario suite, security and detection tests
npm run build      # website into dist/
```

## Honest limits

Simulated payments only: no real money, PIN, OTP, ID document, call or message is ever touched. People, accounts and the payee registry are fictional. The weights are illustrative design values. A real rollout needs an authorised bank or payment-provider partner, its own account data, a security review, a privacy impact assessment and regulatory approval. The role-play page records results; it doesn't show any until the test has been run.
