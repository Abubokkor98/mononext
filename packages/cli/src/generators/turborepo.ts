import { ProjectConfig } from '../types/config.js';
import { writeJson, copyTemplate } from '../utils/file-system.js';
import path from 'path';
import { PINNED_VERSIONS, LATEST_DEPS } from '../constants/versions.js';

export async function generateTurborepo(config: ProjectConfig, targetDir: string) {
  // 1. package.json
  const packageJson: {
    name: string;
    private: boolean;
    scripts: Record<string, string | undefined>;
    devDependencies: Record<string, string | undefined>;
    packageManager: string;
  } = {
    name: config.projectName,
    private: true,
    scripts: {
      build: 'turbo build',
      dev: 'turbo dev',
      lint: 'turbo lint',
      'ui:add': 'pnpm dlx shadcn@latest add -c packages/ui',
      format: config.codeQuality === 'biome'
        ? 'biome format --write .'
        : 'prettier --write "**/*.{ts,tsx,md}"',
      prepare: config.features.husky ? 'husky' : undefined,
    },
    devDependencies: {
      turbo: PINNED_VERSIONS.turbo,
      typescript: LATEST_DEPS.typescript,
      ...(config.features.husky ? { husky: LATEST_DEPS.husky, 'lint-staged': LATEST_DEPS['lint-staged'] } : {})
    },
    packageManager: 'pnpm@9.15.0', // Standardize on pnpm 9
  };

  if (config.codeQuality === 'eslint-prettier') {
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      prettier: LATEST_DEPS.prettier,
    };
  } else if (config.codeQuality === 'biome') {
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      '@biomejs/biome': LATEST_DEPS['@biomejs/biome'],
    };
  }

  // Remove undefined properties (like prepare if husky is false)
  Object.keys(packageJson.scripts).forEach((key) => {
    if (packageJson.scripts[key] === undefined) {
      delete packageJson.scripts[key];
    }
  });

  await writeJson(path.join(targetDir, 'package.json'), packageJson);

  // 2. turbo.json
  await copyTemplate('turbo/turbo.json', path.join(targetDir, 'turbo.json'));

  // 3. pnpm-workspace.yaml
  await copyTemplate('turbo/pnpm-workspace.yaml', path.join(targetDir, 'pnpm-workspace.yaml'));
}
