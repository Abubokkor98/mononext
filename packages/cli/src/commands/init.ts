import { askProjectDetails } from '../prompts/project-prompts.js';
import { askAppDetails } from '../prompts/app-prompts.js';
import { askShadcnDetails } from '../prompts/shadcn-prompts.js';
import { askExtras } from '../prompts/extras-prompts.js';
import { DEFAULT_CONFIG } from '../constants/defaults.js';
import { ProjectConfig, projectConfigSchema } from '../types/config.js';
import { scaffold } from '../generators/scaffold.js';
import { handleError } from '../utils/handle-error.js';
import { PromptCancelledError } from '../utils/errors.js';
import { logger } from '../utils/logger.js';

export async function init(options: { yes: boolean }) {
  try {
    let config: ProjectConfig;

    if (options.yes) {
      config = DEFAULT_CONFIG;
    } else {
      const projectDetails = await askProjectDetails();
      const apps = await askAppDetails();
      const shadcn = await askShadcnDetails(apps);
      const extras = await askExtras();

      config = {
        ...projectDetails,
        apps,
        shadcn,
        animations: extras.animations,
        features: extras.features,
      };
    }

    await scaffold(projectConfigSchema.parse(config));
  } catch (err) {
    if (err instanceof PromptCancelledError) {
      logger.warn('\nOperation cancelled.');
      process.exit(0);
    }
    handleError(err);
  }
}

