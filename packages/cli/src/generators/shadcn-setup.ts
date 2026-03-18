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
      './hooks/*': './hooks/*',
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
    include: ['src', 'lib', 'hooks'],
    exclude: ['node_modules', 'dist'],
  };
}

async function runShadcnInit(
  firstFrontendAppDir: string,
  config: ProjectConfig,
): Promise<boolean> {
  const preset = config.shadcn.preset === 'custom'
    ? config.shadcn.customPresetCode ?? 'nova'
    : PRESET_MAP[config.shadcn.preset] ?? 'nova';

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

/**
 * Read the style and iconLibrary from shadcn-generated components.json
 * so our custom components.json preserves these values.
 */
async function readShadcnGeneratedConfig(
  componentsJsonPath: string,
): Promise<{ style: string; iconLibrary: string; baseColor: string }> {
  const defaults = { style: 'radix-nova', iconLibrary: 'lucide', baseColor: 'neutral' };

  if (!(await fs.pathExists(componentsJsonPath))) {
    return defaults;
  }

  try {
    const config = await fs.readJson(componentsJsonPath);
    return {
      style: config.style ?? defaults.style,
      iconLibrary: config.iconLibrary ?? defaults.iconLibrary,
      baseColor: config.tailwind?.baseColor ?? defaults.baseColor,
    };
  } catch {
    return defaults;
  }
}

/**
 * Move shadcn-generated files from the first frontend app to packages/ui.
 * - components/ui/* → packages/ui/src/components/
 * - lib/utils.ts → packages/ui/lib/utils.ts
 * - globals.css related styles stay in the app
 * - components.json is read then deleted (we write our own)
 */
async function moveFilesToUiPackage(firstFrontendAppDir: string, uiDir: string) {
  // Move components/ui → packages/ui/src/components
  const componentsUiDir = path.join(firstFrontendAppDir, 'components', 'ui');
  const uiComponentsDir = path.join(uiDir, 'src', 'components');

  if (await fs.pathExists(componentsUiDir)) {
    const files = await fs.readdir(componentsUiDir);
    for (const file of files) {
      await fs.move(
        path.join(componentsUiDir, file),
        path.join(uiComponentsDir, file),
        { overwrite: true },
      );
    }
    await fs.remove(componentsUiDir);

    // Clean up empty components dir in the app
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
    const remaining = await fs.readdir(libDir).catch(() => [] as string[]);
    if (remaining.length === 0) {
      await fs.remove(libDir);
    }
  }

  // Delete components.json from the app (we write our own in packages/ui)
  const componentsJsonSrc = path.join(firstFrontendAppDir, 'components.json');
  if (await fs.pathExists(componentsJsonSrc)) {
    await fs.remove(componentsJsonSrc);
  }
}

/**
 * Write the monorepo-optimized components.json to packages/ui.
 * Uses separate aliases for ui (primitives) and components (blocks).
 */
function buildUiComponentsJson(
  generatedConfig: { style: string; iconLibrary: string; baseColor: string },
): object {
  return {
    $schema: 'https://ui.shadcn.com/schema.json',
    style: generatedConfig.style,
    rsc: true,
    tsx: true,
    tailwind: {
      config: '',
      css: 'src/styles/globals.css',
      baseColor: generatedConfig.baseColor,
      cssVariables: true,
    },
    iconLibrary: generatedConfig.iconLibrary,
    aliases: {
      ui: './src/components',
      components: './src/blocks',
      hooks: './hooks',
      lib: './lib',
      utils: './lib/utils',
    },
  };
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

  // 1. Create packages/ui structure with separate folders
  await ensureDir(path.join(uiDir, 'src', 'components'));
  await ensureDir(path.join(uiDir, 'src', 'blocks'));
  await ensureDir(path.join(uiDir, 'src', 'providers'));
  await ensureDir(path.join(uiDir, 'src', 'styles'));
  await ensureDir(path.join(uiDir, 'hooks'));
  await ensureDir(path.join(uiDir, 'lib'));

  await writeJson(path.join(uiDir, 'package.json'), buildUiPackageJson());
  await writeJson(path.join(uiDir, 'tsconfig.json'), buildUiTsconfig());
  await writeFile(path.join(uiDir, 'src', 'index.ts'), '// Export your UI components here\n');
  await writeFile(path.join(uiDir, 'src', 'styles', 'globals.css'), '/* Global styles */\n');

  // 2. Try running shadcn init programmatically
  const shadcnSucceeded = await runShadcnInit(firstFrontendAppDir, config);

  if (shadcnSucceeded) {
    // 3. Read style/iconLibrary from generated config before we delete it
    const componentsJsonPath = path.join(firstFrontendAppDir, 'components.json');
    const generatedConfig = await readShadcnGeneratedConfig(componentsJsonPath);

    // 4. Move generated files to packages/ui (deletes components.json from app)
    await moveFilesToUiPackage(firstFrontendAppDir, uiDir);

    // 5. Write our monorepo-optimized components.json
    await writeJson(
      path.join(uiDir, 'components.json'),
      buildUiComponentsJson(generatedConfig),
    );
  } else {
    // Fallback: write cn() utility manually so packages/ui is still usable
    await writeFile(path.join(uiDir, 'lib', 'utils.ts'), CN_UTILS);

    // Write a default components.json even on failure for future shadcn add
    await writeJson(
      path.join(uiDir, 'components.json'),
      buildUiComponentsJson({ style: 'radix-nova', iconLibrary: 'lucide', baseColor: 'neutral' }),
    );
  }

  // 6. Add @repo/ui dependency to all frontend apps
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
