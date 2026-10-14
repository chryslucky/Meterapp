# MeterMind

MeterMind is a responsive electricity and water utility tracker. The current deployed release is the React/Vite frontend prototype.

## Frontend features

- Responsive dashboard for desktop and mobile
- Electricity and water meter reading entry
- Consumption calculations from current minus previous readings
- Editable flat-rate and fixed-charge estimates
- Reading history, bill estimate, and insight views
- Google Fonts: Outfit, Sora, and DM Mono
- Online Lucide icons delivered through Iconify
- Local browser persistence using `localStorage`

## Run locally

```bash
cd frontend
npm install
npm run dev
```

Create a production build:

```bash
npm run build
```

## Deploy on Vercel

Use `frontend` as the Vercel project root directory. Framework preset: Vite. Build command: `npm run build`. Output directory: `dist`.

## Important limitations

This release is a frontend prototype. Meter readings and tariffs are stored in the current browser only. Chart trend data is illustrative, and flat-rate estimates do not include official tiered tariffs, taxes, levies, or provider-specific adjustments. The Express/PostgreSQL backend and authentication are not yet committed or connected in this repository.

The Vercel deployment was created directly from a source snapshot. Git-based automatic deployments require granting the connected Vercel account access to this GitHub repository and linking the project.
