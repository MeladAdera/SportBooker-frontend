/** True when the build is a public demo (`VITE_DEMO_MODE=true`). */
export function isDemoMode(): boolean {
  return import.meta.env.VITE_DEMO_MODE === 'true';
}

/** Seeded accounts (database/seeds/002_seed_users.sql). Same password for all. */
export const DEMO_PASSWORD = 'Password123!';

export const DEMO_ACCOUNTS = [
  { role: 'player', email: 'player@acfc.test' },
  { role: 'staff', email: 'staff@acfc.test' },
  { role: 'admin', email: 'admin@acfc.test' },
  { role: 'super-admin', email: 'super-admin@acfc.test' },
] as const;
