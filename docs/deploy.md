# Deployment (Firebase App Hosting)

## 1. Configure secrets
Set all variables from `.env.example` as App Hosting secrets.

## 2. Build and run checks
```bash
npm install
npm run typecheck
npm run build
```

## 3. Deploy
Use Firebase App Hosting CLI flow and point backend to this workspace.

## 4. Post-deploy bootstrap
Run full backfill once from `/instellingen/integraties`.
