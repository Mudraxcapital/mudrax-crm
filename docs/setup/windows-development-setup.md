# Windows development setup

This repo is actively developed on Windows (PowerShell). Use these settings so
paths and scripts behave the same as the rest of the team.

## Required

1. **Git for Windows** — use “Git from the command line and also from 3rd-party software”.
2. **Node.js 20 LTS** — install from [nodejs.org](https://nodejs.org/); confirm:

   ```powershell
   node -v   # v20.x
   npm -v
   ```

3. **Docker Desktop for Windows**
   - Enable WSL 2 backend if prompted.
   - Start Docker Desktop before `npm run app:start` or `docker compose …`.
   - Confirm: `docker compose version`

4. **PowerShell execution** (once, if scripts are blocked):

   ```powershell
   Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
   ```

## Recommended for Android mobile

1. Install **Android Studio** → SDK Platform 35 (or the version Expo/RN asks for), Platform-Tools, and a device or emulator.
2. Install **JDK 17** (Microsoft OpenJDK or Temurin). Set for the session when building APKs:

   ```powershell
   $env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.0.xx.x-hotspot"
   $env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
   $env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
   ```

3. Phone and PC on the same Wi‑Fi. Point `apps/mobile/.env` `EXPO_PUBLIC_API_URL` at your PC’s LAN IP (`ipconfig`), not `localhost`.

## Everyday commands (PowerShell)

```powershell
cd D:\Mudrax_CRM
npm run app:start          # postgres+redis in Docker + Next.js on :3000
npm run restart            # free :3000 and start again
npm run docker:down        # stop containers (keeps volumes)
npm run mobile:android     # Expo Android (from monorepo root)
```

## Line endings

Prefer `core.autocrlf=true` on Windows so checkout does not fight Prettier/ESLint.
Do not commit editor-specific folders (`.idea/`, `.vscode/` local overrides) unless the team agrees.
