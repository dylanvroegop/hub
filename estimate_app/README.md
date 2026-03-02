# Calvora Verliescheck

Standalone lead-app voor timmermannen, volledig Nederlandstalig.

## Features
- Diepe verliescheck met 6 secties
- Resultaten in 3 views: per klus, per maand, per jaar
- Upsell modal alleen bij positief verlies
- Lead capture naar Firestore (`lead_loss_checks`)
- Optionele forwarding naar infra hub webhook

## Starten
```bash
npm install
npm run dev
```
App draait op [http://localhost:9011](http://localhost:9011).

## Omgeving
Kopieer `.env.example` naar `.env.local` en vul in:
- `FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`
- optioneel `INFRA_HUB_LEAD_WEBHOOK_URL`
- optioneel `INFRA_HUB_LEAD_WEBHOOK_SECRET`
- optioneel `NEXT_PUBLIC_CALVORA_DEMO_URL`
