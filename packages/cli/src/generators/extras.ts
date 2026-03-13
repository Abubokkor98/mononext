import { ProjectConfig } from '../types/config.js';
import { writeFile } from '../utils/file-system.js';
import { spinner } from '../utils/logger.js';
import path from 'path';
import fs from 'fs-extra';
import { execa } from 'execa';
import { LATEST_DEPS } from '../constants/versions.js';

function buildLintStagedConfig(codeQuality: ProjectConfig['codeQuality']): object {
  if (codeQuality === 'biome') {
    return {
      '*.{ts,tsx,js,jsx,json,css}': ['biome check --write'],
    };
  }

  return {
    '*.{ts,tsx,js,jsx}': ['eslint --fix'],
    '*.{ts,tsx,js,jsx,json,css,md}': ['prettier --write'],
  };
}

const PRE_COMMIT_HOOK = `npx --no-install lint-staged
`;

async function runHuskyInit(targetDir: string): Promise<boolean> {
  const loadingSpinner = spinner('Initializing Husky...');

  try {
    await execa('npx', ['husky', 'init'], {
      cwd: targetDir,
      stdio: 'pipe',
    });

    loadingSpinner.succeed('Husky initialized');
    return true;
  } catch (_error) {
    loadingSpinner.fail('Husky init failed — skipping. You can run `npx husky init` manually later.');
    return false;
  }
}

export async function generateExtras(config: ProjectConfig, targetDir: string) {
  if (!config.features.husky) {
    return;
  }

  // 1. Add husky + lint-staged to root package.json
  const rootPkgPath = path.join(targetDir, 'package.json');

  if (await fs.pathExists(rootPkgPath)) {
    const pkg = await fs.readJson(rootPkgPath);

    pkg.devDependencies = {
      ...pkg.devDependencies,
      husky: LATEST_DEPS.husky,
      'lint-staged': LATEST_DEPS['lint-staged'],
    };

    pkg.scripts = {
      ...pkg.scripts,
      prepare: 'husky',
    };

    pkg['lint-staged'] = buildLintStagedConfig(config.codeQuality);

    await fs.writeJson(rootPkgPath, pkg, { spaces: 2 });
  }

  // 2. Try running husky init programmatically
  const huskySucceeded = await runHuskyInit(targetDir);

  const preCommitPath = path.join(targetDir, '.husky', 'pre-commit');

  if (huskySucceeded) {
    // 3. Overwrite the default pre-commit hook with lint-staged
    await writeFile(preCommitPath, PRE_COMMIT_HOOK);
  } else {
    // Fallback: create .husky directory and pre-commit hook manually
    const huskyDir = path.join(targetDir, '.husky');
    await fs.ensureDir(huskyDir);
    await writeFile(preCommitPath, PRE_COMMIT_HOOK);
  }

  // Git requires hooks to be executable
  await fs.chmod(preCommitPath, 0o755);
}
