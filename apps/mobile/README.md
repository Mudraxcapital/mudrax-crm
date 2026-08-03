# @mudrax/mobile — Mudrax CRM Android client

Expo (React Native) app for callers: leads, dialer, post-call logging, and
TeleCRM-style dialer call-recording import/upload to the web CRM API.

## Prerequisites

- Root monorepo `npm install` already done
- Web CRM reachable on your LAN (`npm run dev` or Docker) with a valid `.env`
- Android Studio SDK + JDK 17 for device/emulator builds
- Copy env template:

  ```bash
  cp apps/mobile/.env.example apps/mobile/.env
  ```

  Set `EXPO_PUBLIC_API_URL` to your PC’s LAN URL, e.g. `http://192.168.x.x:3000`
  (physical device cannot use `localhost`; emulator can use `http://10.0.2.2:3000`).

## Commands (from repo root)

| Command | Purpose |
| --- | --- |
| `npm run mobile:dev` | Start Expo Metro |
| `npm run mobile:android` | Run on Android (uses `apps/mobile/scripts/run-android.ps1`) |
| `npm run mobile:type-check` | TypeScript check |
| `npm run mobile:lint` | ESLint |

## Project layout

```
apps/mobile/
├── App.tsx                 # Root navigation shell
├── index.js                # Expo entry
├── src/                    # Feature modules (calling, leads, auth, …)
├── modules/mudrax-call-log # Native Expo module (Android call log / recording)
├── scripts/                # Windows Android helper scripts
├── android/                # Generated native project (gitignored; created by prebuild/run)
└── dist/                   # Local APK publish folder (gitignored)
```

## Release APK (local)

From `apps/mobile/android` with `JAVA_HOME` / `ANDROID_HOME` set:

```powershell
.\gradlew.bat assembleRelease --no-daemon
```

The monorepo root [`index.js`](../../index.js) is required so Metro can bundle
during `assembleRelease`. Copy the APK from
`android/app/build/outputs/apk/release/` to `apps/mobile/dist/` if you serve it
on your LAN.

## Recording note (TeleCRM-style dialer sync)

Mudrax does **not** record cellular audio with the app microphone. Like TeleCRM:

1. Enable **Record all calls** in **Samsung Phone** or **ODialer** (set as default dialer).
2. In Mudrax, set **Media Path** to that dialer’s recordings folder (Profile or Lead Call screen).
3. Turn off **Wi‑Fi Calling**.
4. After hangup, Mudrax imports the dialer file and uploads it to CRM storage.

See ADR 0006 for recording metadata / external audio reference.
