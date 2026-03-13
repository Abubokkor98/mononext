import { ProjectConfig } from '../types/config.js';
import { ensureDir } from '../utils/file-system.js';
import fs from 'fs-extra';
import path from 'path';
import { logger } from '../utils/logger.js';
import { generateTurborepo } from './turborepo.js';
import { generateSharedPackages } from './shared-packages.js';
import { generateFrontendApps } from './frontend-app.js';
import { generateBackendApps } from './backend-app.js';
import { generateShadcnSetup } from './shadcn-setup.js';
import { generateAnimations } from './animations.js';

export async function scaffold(config: ProjectConfig) {
  const targetDir = path.resolve(process.cwd(), config.projectName);
  const createdTargetDir = !fs.existsSync(targetDir);

  // Fail fast if the target directory already exists and is non-empty
  if (fs.existsSync(targetDir)) {
    const entries = fs.readdirSync(targetDir);
    if (entries.length > 0) {
      throw new Error(
        `Directory "${config.projectName}" already exists and is not empty. Choose a different project name or remove the directory.`
      );
    }
  }

  logger.info(`\nScaffolding project in ${targetDir}...`);

  await ensureDir(targetDir);

  try {
    // 1. Turborepo root
    await generateTurborepo(config, targetDir);

    // 2. Shared config packages
    await generateSharedPackages(config, targetDir);

    // 3. Frontend apps (Next.js)
    await generateFrontendApps(config, targetDir);

    // 4. Backend apps (Express)
    await generateBackendApps(config, targetDir);

    // 5. shadcn/ui setup (if enabled)
    await generateShadcnSetup(config, targetDir);

    // 6. Animation libraries (if selected)
    await generateAnimations(config, targetDir);
  } catch (error) {
    if (createdTargetDir) {
      await fs.remove(targetDir);
    }
    throw error;
  }

  logger.success('\nProject generated successfully!');
}
