import { ProjectConfig } from '../types/config.js';

export const DEFAULT_CONFIG: ProjectConfig = {
  projectName: 'my-saas',
  monorepoTool: 'turborepo',
  framework: 'nextjs',
  codeQuality: 'eslint-prettier',
  apps: [
    { name: 'web', type: 'frontend' },
    { name: 'api', type: 'backend' },
  ],
  shadcn: {
    enabled: true,
    base: 'radix',
    preset: 'nova',
    customPresetCode: undefined,
  },
  animations: [],
  features: {
    husky: false,
    playwright: false,
    githubActions: false,
  },
};
