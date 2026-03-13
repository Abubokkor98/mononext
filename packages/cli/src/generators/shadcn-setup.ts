import { ProjectConfig } from '../types/config.js';
import { ensureDir, writeJson, writeFile } from '../utils/file-system.js';
import { spinner } from '../utils/logger.js';
import path from 'path';
import { execa } from 'execa';
import fs from 'fs-extra';

const PRESET_MAP: Record<string, string> = {
  nova: 'nova',
  vega: 'vega',
  maia: 'maia',
  lyra: 'lyra',
  mira: 'mira',
};

const CN_UTILS = `import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;

function buildUiPackageJson(): object {
  return {
    name: '@repo/ui',
    version: '0.0.0',
    private: true,
    type: 'module',
    exports: {
      '.': './src/index.ts',
      './src/*': './src/*',
      './lib/*': './lib/*',
    },
    dependencies: {
      clsx: 'latest',
      'tailwind-merge': 'latest',
      'tw-animate-css': 'latest',
    },
    devDependencies: {
      '@repo/typescript-config': 'workspace:*',
    },
    peerDependencies: {
      react: '>=18',
      'react-dom': '>=18',
    },
  };
}

function buildUiTsconfig(): object {
  return {
    extends: '@repo/typescript-config/nextjs.json',
    compilerOptions: {
      outDir: 'dist',
    },
    include: ['src', 'lib'],
    exclude: ['node_modules', 'dist'],
  };
}

async function runShadcnInit(
  firstFrontendAppDir: string,
  config: ProjectConfig,
): Promise<boolean> {
  const preset = PRESET_MAP[config.shadcn.preset] ?? 'nova';

  const loadingSpinner = spinner('Running shadcn init...');

  try {
    await execa('npx', [
      'shadcn@latest',
      'init',
      '--yes',
      '--preset', preset,
      '--base', config.shadcn.base,
    ], {
      cwd: firstFrontendAppDir,
      stdio: 'pipe',
    });

    loadingSpinner.succeed('shadcn/ui initialized');
    return true;
  } catch (_error) {
    loadingSpinner.fail('shadcn init failed — skipping. You can run it manually later.');
    return false;
  }
}

async function moveFilesToUiPackage(firstFrontendAppDir: string, uiDir: string) {
  // Move components/ui → packages/ui/src
  const componentsUiDir = path.join(firstFrontendAppDir, 'components', 'ui');
  const uiSrcDir = path.join(uiDir, 'src');

  if (await fs.pathExists(componentsUiDir)) {
    const files = await fs.readdir(componentsUiDir);
    for (const file of files) {
      await fs.move(
        path.join(componentsUiDir, file),
        path.join(uiSrcDir, file),
        { overwrite: true },
      );
    }
    await fs.remove(componentsUiDir);
    // Clean up empty components dir
    const componentsDir = path.join(firstFrontendAppDir, 'components');
    const remaining = await fs.readdir(componentsDir).catch(() => [] as string[]);
    if (remaining.length === 0) {
      await fs.remove(componentsDir);
    }
  }

  // Move lib/utils.ts → packages/ui/lib/utils.ts
  const libUtilsSrc = path.join(firstFrontendAppDir, 'lib', 'utils.ts');
  const libUtilsDest = path.join(uiDir, 'lib', 'utils.ts');

  if (await fs.pathExists(libUtilsSrc)) {
    await fs.move(libUtilsSrc, libUtilsDest, { overwrite: true });
    // Clean up empty lib dir in the app
    const libDir = path.join(firstFrontendAppDir, 'lib');
    const remaining = await fs.readdir(libDir);
    if (remaining.length === 0) {
      await fs.remove(libDir);
    }
  }

  // Move components.json → packages/ui/components.json
  const componentsJsonSrc = path.join(firstFrontendAppDir, 'components.json');
  const componentsJsonDest = path.join(uiDir, 'components.json');

  if (await fs.pathExists(componentsJsonSrc)) {
    await fs.move(componentsJsonSrc, componentsJsonDest, { overwrite: true });
  }
}

async function updateComponentsJson(uiDir: string): Promise<void> {
  const componentsJsonPath = path.join(uiDir, 'components.json');

  if (!(await fs.pathExists(componentsJsonPath))) {
    return;
  }

  const shadcnConfig = await fs.readJson(componentsJsonPath);

  // Update aliases relative to packages/ui
  shadcnConfig.aliases = {
    ...shadcnConfig.aliases,
    components: './src',
    ui: './src',
    lib: './lib',
    utils: './lib/utils',
  };

  await fs.writeJson(componentsJsonPath, shadcnConfig, { spaces: 2 });
}

export async function generateShadcnSetup(config: ProjectConfig, targetDir: string) {
  if (!config.shadcn.enabled) {
    return;
  }

  const frontendApps = config.apps.filter((app) => app.type === 'frontend');

  if (frontendApps.length === 0) {
    return;
  }

  const firstFrontendApp = frontendApps[0];
  const firstFrontendAppDir = path.join(targetDir, 'apps', firstFrontendApp.name);
  const uiDir = path.join(targetDir, 'packages', 'ui');

  // 1. Create packages/ui structure
  await ensureDir(path.join(uiDir, 'src'));
  await ensureDir(path.join(uiDir, 'lib'));

  await writeJson(path.join(uiDir, 'package.json'), buildUiPackageJson());
  await writeJson(path.join(uiDir, 'tsconfig.json'), buildUiTsconfig());
  await writeFile(path.join(uiDir, 'src', 'index.ts'), '// Export your UI components here\n');

  // 2. Try running shadcn init programmatically
  const shadcnSucceeded = await runShadcnInit(firstFrontendAppDir, config);

  if (shadcnSucceeded) {
    // 3. Move generated files + components.json to packages/ui
    await moveFilesToUiPackage(firstFrontendAppDir, uiDir);

    // 4. Update components.json aliases (now in packages/ui)
    await updateComponentsJson(uiDir);
  } else {
    // Fallback: write cn() utility manually so packages/ui is still usable
    await writeFile(path.join(uiDir, 'lib', 'utils.ts'), CN_UTILS);
  }

  // 5. Add @repo/ui dependency to all frontend apps
  for (const app of frontendApps) {
    const appPkgPath = path.join(targetDir, 'apps', app.name, 'package.json');

    if (await fs.pathExists(appPkgPath)) {
      const pkg = await fs.readJson(appPkgPath);
      pkg.dependencies = {
        ...pkg.dependencies,
        '@repo/ui': 'workspace:*',
      };

      await fs.writeJson(appPkgPath, pkg, { spaces: 2 });
    }
  }
}
