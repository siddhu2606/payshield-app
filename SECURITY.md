# Security

PayShield is a hackathon prototype: a static web app (GitHub Pages) plus an Android app, with encrypted live sync through a public MQTT relay and an optional SMS relay that runs on the team laptop. All data is synthetic. This is the 12-point review. The admin console's **Security** page shows the same list.

| # | Check | Status | How |
|---|---|---|---|
| 1 | Secrets only in env vars, never in frontend or git | Done | The SMS API key (Fast2SMS or Twilio) lives only in a git-ignored `.env`, read by `scripts/sms-relay.mjs`. No keys in the web or APK bundle. CI runs gitleaks on the full history and greps the build for key patterns. |
| 2 | Admin routes need an admin login | Done | Every `/admin` route renders sign-in until a valid admin session exists. The password is checked against a bcrypt hash, then a second factor. The session lives in `sessionStorage` and times out after 20 idle minutes. |
| 3 | Every page checks the user is signed in | Done | Phone screens need a session and a passcode. A locked phone renders only the lock screen. |
| 4 | Users only read/change their own data | Prototype | Each role's screens load only its own records, and sync is end-to-end encrypted per room. Production needs server-side row-level authorisation. |
| 5 | Validate and sanitise all input | Done | `src/core/validate.js` runs on every write. Remote state is shape-checked before use. React escapes all output. Covered by `tests/security.test.js`. |
| 6 | Rate-limit sign-in and API | Done | 5 wrong passcode or admin tries lock sign-in for 30 s, doubling up to 15 min. The SMS relay has a daily cap and a minimum gap. Sync publishes are debounced. |
| 7 | HTTPS everywhere + security headers | Done | HTTPS-only Pages, WSS-only sync, and no cleartext traffic on Android. CSP and referrer policy are set by meta tag. GitHub Pages can't send HSTS or X-Frame-Options, so production sets those at the gateway. |
| 8 | Passwords hashed with bcrypt/argon2 | Done | bcrypt, cost 10, for passcodes and the admin password. New members' passcodes are hashed before they're stored. |
| 9 | Database not public, daily backups | Done | There is no database server. The relay sees only a hashed topic and AES-256-GCM ciphertext. Each device keeps daily snapshots (last 7), with export and restore in the admin console. |
| 10 | Debug off, no error details to users | Done | No source maps, console calls stripped, and an error boundary with a generic message. The APK is a signed release build, not debuggable, with `allowBackup=false`. |
| 11 | Update vulnerable packages | Done | `npm audit --omit=dev`: 0. Vite 6, React Router 7, sharp and node-tar are upgraded. Dependabot runs weekly. CI fails on audit findings. |
| 12 | Scan git history for secrets | Done | The full history was scanned (no findings), and gitleaks runs on every push. |

**Known limits.** The room name is the encryption key, so anyone who knows it can join that room. Use a private room for anything beyond the demo. Some dev-only build tools (inside the Capacitor CLI) still carry moderate advisories. They never ship to users.

To report a problem, open a GitHub issue without sensitive details.
