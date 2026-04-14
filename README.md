# Sportbooker — Frontend

Web client for the Sportbooker multi-tenant sports booking platform (Vite + React + TypeScript).

## Requirements

- **Node.js** 20+ (LTS recommended)
- **npm** (same as backend)

## Setup

```bash
git clone <repo-url>
cd sportbooker-frontend
npm install
```

Copy environment placeholders and adjust for your API:

```bash
cp .env.example .env
```

Edit `.env` from `.env.example`: **`VITE_API_URL`** and **`VITE_APP_DOMAIN`** are required for API calls and tenant subdomain parsing (`extractTenantSlug`). For Nest tenant `Host` routing in dev, use the proxy flow in **[Local development — API and auth](docs/local-development.md)**.

**Layouts and navigation:** player / operator / platform admin shells, app bar, and role-based routing are documented in **[Role-based layouts and navigation](docs/role-based-layouts.md)**.

**Player flow:** login → discover page → match cards, filters, pagination — documented in **[Player flow](docs/player-flow.md)**.

**Admin surfaces:** **[Admin features](docs/admin-features.md)** — platform admin vs tenant operator features, routes, and roles.

## Scripts

| Command                | Description                         |
| ---------------------- | ----------------------------------- |
| `npm run dev`          | Dev server (default: port **5173**) |
| `npm run build`        | Typecheck + production build        |
| `npm run preview`      | Preview production build locally    |
| `npm run lint`         | ESLint                              |
| `npm run format`       | Prettier (write)                    |
| `npm run format:check` | Prettier (check only)               |

## Dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

After changing `.env` or `vite.config.ts`, restart `npm run dev`.

## Git hooks

[Husky](https://typicode.github.io/husky/) runs [lint-staged](https://github.com/lint-staged/lint-staged) on commit: Prettier + ESLint on staged TS/TSX (and Prettier on other listed files).

## Stack

- Vite 8+
- React 18+
- TypeScript 5+
- ESLint + Prettier

## Project structure

Feature-based layout for scaling by domain. Import from barrel files (`index.ts`) where they exist.

```text
src/
├── features/              # Feature modules
│   ├── auth/              # Login, register, password reset
│   ├── player/            # Player: matches, bookings, wallet
│   ├── operator/          # Tenant staff: venues, matches (day-to-day)
│   ├── admin/             # Super-admin / platform admin UI
│   └── index.ts           # Barrel: re-exports feature namespaces
├── shared/                # Cross-cutting UI and hooks
│   ├── components/
│   ├── layouts/
│   ├── hooks/
│   └── index.ts
├── lib/                   # Utilities, helpers (pure functions)
├── stores/                # Zustand: auth, tenant, theme, locale
├── routes/                # Route tables, loaders, guards
├── i18n/                  # Translations
│   ├── en/                # English locale files
│   └── ar/                # Arabic locale files
├── api/                   # HTTP client + hand-written API helpers
│   ├── generated/         # Orval output (generated only)
│   └── index.ts
├── assets/                # Static files bundled by Vite
│   ├── icons/
│   └── images/
├── App.tsx                # Root app component (temporary; can move under shared/layouts later)
├── main.tsx               # Entry point
└── index.css
```

Empty leaf folders use `.gitkeep` so Git tracks them (`api/generated`, `i18n/en`, `i18n/ar`).
