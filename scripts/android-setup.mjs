// Runs in CI after `npx cap add android` (the android/ folder is generated, not committed).
//  - Release build signed with the project key from GitHub secrets (not debuggable).
//  - App backup off, cleartext traffic off.
//  - Payment links from a real SMS can open in the app (https link to the site, or payshield://).
import { readFileSync, writeFileSync } from 'node:fs';

const manifestPath = 'android/app/src/main/AndroidManifest.xml';
let m = readFileSync(manifestPath, 'utf8');
m = m.replace('android:allowBackup="true"', 'android:allowBackup="false"\n        android:usesCleartextTraffic="false"');
const links = `
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="siddhu2606.github.io" android:pathPrefix="/payshield-app" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="payshield" android:host="app" />
            </intent-filter>
`;
if (!m.includes('android:scheme="payshield"')) m = m.replace(/(<category android:name="android.intent.category.LAUNCHER" \/>\s*<\/intent-filter>)/, `$1\n${links}`);
writeFileSync(manifestPath, m);

const gradlePath = 'android/app/build.gradle';
let g = readFileSync(gradlePath, 'utf8');
if (process.env.PS_KEYSTORE && !g.includes('signingConfigs')) {
  g = g.replace(/android \{/, `android {
    signingConfigs {
        release {
            storeFile file(System.getenv("PS_KEYSTORE"))
            storePassword System.getenv("PS_KEYSTORE_PASSWORD")
            keyAlias System.getenv("PS_KEY_ALIAS")
            keyPassword System.getenv("PS_KEYSTORE_PASSWORD")
            storeType "pkcs12"
        }
    }`);
  g = g.replace(/release \{\s*minifyEnabled false/, 'release {\n            signingConfig signingConfigs.release\n            debuggable false\n            minifyEnabled false');
  console.log('release signing configured');
} else console.log('no keystore: release signing skipped');
writeFileSync(gradlePath, g);
console.log('android manifest hardened, deep links added');
