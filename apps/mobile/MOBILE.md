# Fishmaster Mobile (Expo)

React Native app sharing the same API as web.

## Prerequisites

- Node.js 20+
- [Expo Go](https://expo.dev/go) on your phone or iPad (**must match SDK 54** — iOS App Store only offers the latest Expo Go)
- API running: `npm.cmd run dev:api`

## Install

```powershell
$env:Path = "C:\Program Files\nodejs;" + $env:Path
cd C:\Users\olanr\Projects\fishmaster
npm.cmd install
```

## Configure API URL

**Physical phone cannot use `localhost`.** Use your PC's LAN IP:

1. Find IP: `ipconfig` → look for IPv4 (e.g. `192.168.1.71`)
2. Create `apps/mobile/.env`:
   ```
   EXPO_PUBLIC_API_URL=http://192.168.1.71:3001
   ```
3. Ensure phone and PC are on the **same Wi-Fi**
4. Allow port 3001 through Windows Firewall if needed

## Run

```powershell
npm.cmd run dev:mobile
```

Scan the QR code with **Expo Go** (Android) or Camera app (iOS).

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
| **"Project is incompatible with Expo Go" (SDK mismatch)** | iPad/iPhone App Store only has the latest Expo Go (SDK 54). This project uses SDK 54 — run `npm install` from repo root, then `npx expo start -c`. |
| **"Network request failed"** on device | Use LAN IP in `.env`, not `localhost`. Restart Expo with `-c`. |
| **`expo-asset` cannot be found** | Run `npm install --ignore-scripts` from repo root. |
| **`@fishmaster/db` not found** | Run `npm run build -w @fishmaster/db` from repo root. |
| **Invalid hook call / duplicate React** | Run `npm install --ignore-scripts --legacy-peer-deps` from repo root, then `npx expo start -c`. |

## Production

- Build with EAS: `npx eas build`
- Publish to App Store / Google Play
- Point `EXPO_PUBLIC_API_URL` to production API
