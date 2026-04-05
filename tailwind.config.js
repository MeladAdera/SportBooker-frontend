/**
 * Tailwind v4 with `@tailwindcss/vite` primarily discovers classes from source via the Vite plugin.
 * This `content` list documents the intended scan paths (same as classic `tailwind.config` setup).
 */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
};
