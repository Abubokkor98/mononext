import { ProjectConfig } from '../types/config.js';
import { copyTemplate, ensureDir, writeJson } from '../utils/file-system.js';
import { LATEST_DEPS } from '../constants/versions.js';
import path from 'path';

export async function generateSharedPackages(config: ProjectConfig, targetDir: string) {
  const packagesDir = path.join(targetDir, 'packages');
  await ensureDir(packagesDir);

  // 1. config-typescript (always included)
  const tsConfigDir = path.join(packagesDir, 'config-typescript');
  await ensureDir(tsConfigDir);
  await writeJson(path.join(tsConfigDir, 'package.json'), {
    name: '@repo/typescript-config',
    version: '0.0.0',
    private: true,
    license: 'MIT'
  });
  await copyTemplate('packages/config-typescript/base.json', path.join(tsConfigDir, 'base.json'));
  await copyTemplate('packages/config-typescript/nextjs.json', path.join(tsConfigDir, 'nextjs.json'));
  await copyTemplate('packages/config-typescript/express.json', path.join(tsConfigDir, 'express.json'));

  // 2. config-eslint OR config-biome based on user choice
  if (config.codeQuality === 'eslint-prettier') {
    const eslintDir = path.join(packagesDir, 'config-eslint');
    await ensureDir(eslintDir);
    await writeJson(path.join(eslintDir, 'package.json'), {
      name: '@repo/eslint-config',
      version: '0.0.0',
      private: true,
      type: 'module',
      license: 'MIT',
      dependencies: {
        eslint: LATEST_DEPS.eslint,
        '@eslint/js': '^9',
        '@eslint/eslintrc': '^3',
        'typescript-eslint': '^8',
        'eslint-config-next': '^15',
        'eslint-config-prettier': '^9',
        'eslint-plugin-react': '^7',
      },
    });
    await copyTemplate('packages/config-eslint/next.js', path.join(eslintDir, 'next.js'));
    await copyTemplate('packages/config-eslint/express.js', path.join(eslintDir, 'express.js'));
  } else if (config.codeQuality === 'biome') {
    const biomeDir = path.join(packagesDir, 'config-biome');
    await ensureDir(biomeDir);
    await writeJson(path.join(biomeDir, 'package.json'), {
      name: '@repo/biome-config',
      version: '0.0.0',
      private: true,
      license: 'MIT'
    });
    await copyTemplate('packages/config-biome/biome.json', path.join(biomeDir, 'biome.json'));
  }
}
