/**
 * Pinned versions for dependencies where we rely on specific API syntax.
 * Update these manually after testing with new major versions.
 */
export const PINNED_VERSIONS = {
  turbo: '^2.0.0',
} as const;

/**
 * Resolved to the newest stable version at pnpm install time.
 * Zero maintenance needed for these.
 */
export const LATEST_DEPS = {
  next: 'latest',
  react: 'latest',
  'react-dom': 'latest',
  typescript: 'latest',
  tailwindcss: 'latest',
  eslint: '^9', // Pinned: eslint-config-next supports up to v9; revisit when v10 compatibility lands
  prettier: 'latest',
  '@biomejs/biome': 'latest',
  'framer-motion': 'latest',
  lenis: 'latest',
  gsap: 'latest',
  '@playwright/test': 'latest',
  husky: 'latest',
  'lint-staged': 'latest',
  express: 'latest',
  cors: 'latest',
  tsx: 'latest',
  '@types/express': 'latest',
  '@types/cors': 'latest',
  '@types/node': 'latest',
  '@types/react': 'latest',
  '@types/react-dom': 'latest',
} as const;
