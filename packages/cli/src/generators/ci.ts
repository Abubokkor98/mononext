import { ProjectConfig } from '../types/config.js';
import { writeFile } from '../utils/file-system.js';
import path from 'path';

function buildCiWorkflow(config: ProjectConfig): string {
  const hasPlaywright = config.features.playwright;

  const testStep = hasPlaywright
    ? `
      - name: Install Playwright browsers
        run: pnpm exec playwright install chromium --with-deps

      - name: Run e2e tests
        run: pnpm test:e2e`
    : '';

  return `name: CI

on:
  push:
    branches: ['main']
  pull_request:
    types: [opened, synchronize]

jobs:
  ci:
    name: Build and Lint
    timeout-minutes: 15
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 2

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Lint
        run: pnpm turbo run lint

      - name: Build
        run: pnpm turbo run build${testStep}
`;
}

export async function generateGitHubActions(config: ProjectConfig, targetDir: string) {
  if (!config.features.githubActions) {
    return;
  }

  const workflowDir = path.join(targetDir, '.github', 'workflows');

  await writeFile(path.join(workflowDir, 'ci.yml'), buildCiWorkflow(config));
}
