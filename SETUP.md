# Fishmaster — Local setup guide

## What you need to install

Neither **Python** nor **Node.js** are installed on your PC yet (Windows only has Store stubs). For this TypeScript monorepo you need:

### 1. Node.js 20 LTS (required)

1. Download from [https://nodejs.org/](https://nodejs.org/) (LTS version)
2. Run installer — check **"Add to PATH"**
3. Close and reopen Cursor/terminal
4. Verify:
   ```powershell
   node --version
   npm --version
   ```

### 2. Git (recommended)

Download from [https://git-scm.com/download/win](https://git-scm.com/download/win)

```powershell
cd C:\Users\olanr\Projects\fishmaster
git init
git add .
git commit -m "Initial Fishmaster monorepo scaffold"
```

### 3. Database (SQLite — already configured)

No PostgreSQL install needed for local dev. Run `npm run db:setup` once to create `packages/db/prisma/dev.db`.

### 4. Python (optional — not needed for Fishmaster)

Only install if you want to run Python scripts separately. The Excel was already parsed; the app uses TypeScript.

---

## Run the project (after Node.js is installed)

```powershell
$env:Path = "C:\Program Files\nodejs;" + $env:Path
cd C:\Users\olanr\Projects\fishmaster

# Use npm.cmd if PowerShell blocks npm (execution policy)
npm.cmd install
npm.cmd run db:setup
npm.cmd run dev:api
```

In a second terminal:

```powershell
cd C:\Users\olanr\Projects\fishmaster
npm run dev:web
```

- API: http://localhost:3001/health
- Web: http://localhost:3000

---

## Open in Cursor

**File → Open Folder →** `C:\Users\olanr\Projects\fishmaster`
