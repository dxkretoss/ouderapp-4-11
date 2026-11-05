# Ouderschap & Co — Standalone React + Vite SPA

Standalone client-side Single Page Application (SPA) built with pure React 19, Vite, Tailwind CSS v4, and React Router DOM.

## Features
- **Pure Client-Side React SPA**: Zero server-side rendering (SSR) or TanStack Start dependencies.
- **JavaScript (.jsx/.js)**: Full clean JavaScript implementation without TypeScript overhead.
- **100% Complete Dual-Language Support (NL & EN)**:
  - Powered by `i18next` and `react-i18next`.
  - Translations stored in `src/locales/nl/translation.json` and `src/locales/en/translation.json`.
  - Language switcher component (`LanguageSelector.jsx`) available in the top bar and menu.
- **Zero Mock Data**:
  - The app starts in a clean empty state (no hardcoded demo children like Emma/Noah).
  - Data persists automatically to browser `localStorage` under `ouderschap_standalone_data`.
  - Normalized data structure ready for direct connection to Supabase or any REST/GraphQL backend.
- **All Routes Preserved**:
  - Home Dashboard (`/`), Children Management (`/kinderen`, `/kinderen/:kindId`, `AddChildModal`).
  - Care Schedule Builder (`/zorgregeling`).
  - Calendar & Planning (`/agenda`, `/planning`).
  - Tasks & Packing (`/taken`, `/spullen`).
  - Expenses & Settlement (`/kosten`, `/boodschappen`).
  - Messages & Topics (`/berichten`).
  - Parenting Proposals (`/afspraken`, `/beslissingen`, `/veranderd`).
  - Documents & PDF Dossier Export (`/documenten`, `/exporteren`).
  - Caregivers, Circle & Professionals (`/verzorger`, `/kring/:kindId`, `/professionals`).
  - Co Digital Advisor (`/verhaal`).
  - Settings, Privacy, Legal & Menu (`/instellingen`, `/privacy`, `/gezag`, `/meer`).

## Getting Started

### 1. Install dependencies
```bash
npm install
```

### 2. Start development server
```bash
npm run dev
```
Open `http://localhost:5173` in your browser.

### 3. Build for production
```bash
npm run build
```
Generates optimized static assets in `dist/`.

