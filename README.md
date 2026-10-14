# MeterMind

MeterMind is a responsive electricity and water utility tracker. The repository contains a React/Vite frontend prototype and an Express/PostgreSQL API starter.

## Frontend

- Responsive dashboard for desktop and mobile
- Electricity and water meter-reading entry
- Consumption calculated as current reading minus previous reading
- Editable flat-rate and fixed-charge estimates
- Reading history, bill estimates, and insights
- Google Fonts: Outfit, Sora, and DM Mono
- Online Lucide icons delivered through Iconify
- Browser-local persistence with `localStorage`

Run it locally:

```bash
cd frontend
npm install
npm run dev
```

Build it:

```bash
npm run build
```

## Backend

The `backend/` directory contains an Express API, JWT authentication, PostgreSQL schema/migration, meter and reading endpoints, configurable flat tariffs, and estimate endpoints.

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your PostgreSQL URL and a long random JWT_SECRET
npm run db:migrate
npm run dev
```

The frontend is currently a prototype and has not yet been wired to the API; its readings and tariffs stay in the current browser. The backend requires a running PostgreSQL database and environment variables.

## Vercel deployment

Configure Vercel's project root directory as `frontend`, framework as Vite, build command as `npm run build`, and output directory as `dist`. The backend needs a separate Node.js hosting target and PostgreSQL database; it is not part of this static frontend deployment.

## Billing accuracy

Tariff values in the frontend are editable examples, not official utility rates. Flat-rate estimates do not include official tiered tariffs, taxes, levies, or provider-specific adjustments. Configure rates from the user's actual provider and billing category before relying on an estimate.

## Deployment note

The current Vercel production deployment was created from a source snapshot. Automatic deployments from GitHub require the connected Vercel account to be granted access to this repository and the project to be linked to it.
