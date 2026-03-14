import { ProjectConfig } from '../types/config.js';
import { logger } from '../utils/logger.js';
import { writeFile } from '../utils/file-system.js';
import { LATEST_DEPS } from '../constants/versions.js';
import path from 'path';
import fs from 'fs-extra';

function buildPlaywrightConfig(firstFrontendAppName: string): string {
  return `import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code.
  forbidOnly: !!process.env.CI,

  // Retry on CI only.
  retries: process.env.CI ? 2 : 0,

  // Single worker on CI for stability; use all available locally.
  workers: process.env.CI ? 1 : undefined,

  reporter: 'html',

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Auto-start the dev server before running tests.
  webServer: {
    command: 'pnpm dev --filter=${firstFrontendAppName}',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
`;
}

const EXAMPLE_TEST = `import { test, expect } from '@playwright/test';

test('homepage has correct title', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/./);
});

test('homepage renders successfully', async ({ page }) => {
  await page.goto('/');

  // Verify the page loaded with visible content
  const body = page.locator('body');
  await expect(body).toBeVisible();
});
`;

export async function generatePlaywright(config: ProjectConfig, targetDir: string) {
  if (!config.features.playwright) {
    return;
  }

  const frontendApps = config.apps.filter((app) => app.type === 'frontend');

  if (frontendApps.length === 0) {
    logger.warn('Playwright enabled but no frontend apps found; skipping Playwright setup.');
    return;
  }

  const firstFrontendAppName = frontendApps[0].name;

  // 1. Write playwright.config.ts
  await writeFile(
    path.join(targetDir, 'playwright.config.ts'),
    buildPlaywrightConfig(firstFrontendAppName),
  );

  // 2. Write test stub
  await writeFile(path.join(targetDir, 'tests', 'example.spec.ts'), EXAMPLE_TEST);

  // 3. Add @playwright/test to root devDependencies + test:e2e script
  const rootPkgPath = path.join(targetDir, 'package.json');

  if (await fs.pathExists(rootPkgPath)) {
    const pkg = await fs.readJson(rootPkgPath);

    pkg.devDependencies = {
      ...pkg.devDependencies,
      '@playwright/test': LATEST_DEPS['@playwright/test'],
    };

    pkg.scripts = {
      ...pkg.scripts,
      'test:e2e': 'playwright test',
    };

    await fs.writeJson(rootPkgPath, pkg, { spaces: 2 });
  }
}
