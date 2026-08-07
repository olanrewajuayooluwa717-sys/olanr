# Fishmaster Mobile (Expo)

React Native app sharing the same API as web.

## Prerequisites

- Node.js 20+
- [Expo Go](https://expo.dev/go) on your phone or iPad (**SDK 54**)
- API running: `npm run dev:api` (local) or production API URL

## Install

```powershell
cd C:\Users\olanr\Projects\fishmaster
npm install --legacy-peer-deps
```

## Configure API URL

Copy `apps/mobile/.env.example` → `apps/mobile/.env`.

### Local dev (Expo Go)

**Physical devices cannot use `localhost`.** Use your PC's LAN IP:

1. Find IP: `ipconfig` → IPv4 (e.g. `192.168.1.71`)
2. In `apps/mobile/.env`:
   ```
   EXPO_PUBLIC_API_URL=http://192.168.1.71:3001
   ```
3. Phone and PC on the **same Wi-Fi**
4. Allow port 3001 through Windows Firewall if needed

### Production / staging

Point to your Render API:

```
EXPO_PUBLIC_API_URL=https://fishmaster-api.onrender.com
```

Or custom domain: `https://api.fishmaster.ng`

## Run (development)

```powershell
npm run dev:mobile
```

Scan the QR code with **Expo Go** (Android) or Camera app (iOS).

---

## Production builds (EAS)

### One-time setup

1. Create account: https://expo.dev/signup
2. Install CLI: `npm install -g eas-cli`
3. Login: `eas login`
4. From `apps/mobile`:
   ```powershell
   cd apps/mobile
   eas init
   ```
5. Update `app.json`:
   - `extra.eas.projectId` — from `eas init`
   - `owner` — your Expo username

### Build profiles (`eas.json`)

| Profile | Use case | API URL |
|---------|----------|---------|
| `development` | Dev client + simulator | `localhost:3001` |
| `preview` | Internal APK/IPA testing | Production API |
| `production` | App Store / Play Store | Production API |

Update `EXPO_PUBLIC_API_URL` in `eas.json` before building if your API URL differs.

### Build commands

```powershell
cd apps/mobile

# Internal test (Android APK)
eas build --profile preview --platform android

# Internal test (iOS — requires Apple Developer account)
eas build --profile preview --platform ios

# Store release
eas build --profile production --platform all
```

### Submit to stores

```powershell
eas submit --platform ios
eas submit --platform android
```

First submission requires App Store Connect / Google Play Console setup. See [Expo submit docs](https://docs.expo.dev/submit/introduction/).

### Rebuild when API URL changes

`EXPO_PUBLIC_API_URL` is baked in at build time. After changing the API domain, run a new EAS build.

---

## Screens

| Tab | Features |
|-----|----------|
| **Home** | Pond stats, news feed, subscription status |
| **Reports** | Key Excel reports (1, 2, 8–10, 20–21) |
| **Daily log** | Mortality + feed logging with under/over alerts |
| **Account** | Subscribe via Stripe browser, logout |

## Demo logins

Same as web — `logunsina@yahoo.com` / `demo1234`

## Troubleshooting

| Problem | Fix |
|--------|-----|
| **SDK mismatch** | Run `npm install` from repo root, then `npx expo start -c` |
| **Network request failed** on device | Use LAN IP in `.env`, not `localhost`. Restart with `-c`. |
| **Production build can't reach API** | Check `EXPO_PUBLIC_API_URL` in `eas.json`; API must allow requests (no Origin = OK). |
| **Render cold start** | First request after idle may take 30–60s on free tier. |
| **`expo-asset` cannot be found** | Run `npm install --ignore-scripts` from repo root. |
| **Invalid hook call / duplicate React** | Run `npm install --legacy-peer-deps` from root, then `npx expo start -c`. |
| **Second device: failed to download remote update** | Run `npx expo start --tunnel -c`. |

## Related docs

- [DEPLOY.md](../DEPLOY.md) — full production deploy guide
- [docs/PRODUCTION_CHECKLIST.md](../docs/PRODUCTION_CHECKLIST.md) — pre-launch checklist
