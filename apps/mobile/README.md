# @mudrax/mobile — Mudrax CRM Android client

Expo (React Native) app for callers: leads, dialer, post-call logging, and
best-effort call recording upload to the web CRM API.

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

## Recording note

Android third-party apps cannot reliably capture full duplex cellular audio.
Use **speakerphone** so the microphone path records usable voice. Audio is
uploaded to the server (`local:call-recordings/…`); see ADR 0006.
