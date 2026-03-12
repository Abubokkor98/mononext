import { ProjectConfig } from '../types/config.js';
import { ensureDir } from '../utils/file-system.js';
import path from 'path';
import { logger } from '../utils/logger.js';
import { generateTurborepo } from './turborepo.js';
import { generateSharedPackages } from './shared-packages.js';

export async function scaffold(config: ProjectConfig) {
  const targetDir = path.resolve(process.cwd(), config.projectName);

  logger.info(`\nScaffolding project in ${targetDir}...`);

  await ensureDir(targetDir);

  // 1. Turborepo root
  await generateTurborepo(config, targetDir);

  // 2. Shared config packages
  await generateSharedPackages(config, targetDir);

  logger.success('\nProject generated successfully!');
}
