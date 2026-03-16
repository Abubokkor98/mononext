import prompts from 'prompts';
import pc from 'picocolors';
import { PromptCancelledError } from '../utils/errors.js';
import { getPreference } from '../utils/preferences.js';

const CODE_QUALITY_CHOICES = [
  { title: 'ESLint + Prettier', value: 'eslint-prettier' },
  { title: 'Biome (faster alternative)', value: 'biome' },
];

export async function askProjectDetails() {
  const savedCodeQuality = getPreference('codeQuality');
  const codeQualityInitial = Math.max(
    0,
    CODE_QUALITY_CHOICES.findIndex((c) => c.value === savedCodeQuality),
  );

  const response = await prompts([
    {
      type: 'text',
      name: 'projectName',
      message: 'What is your project name?',
      initial: 'my-saas',
      validate: (value: string) => 
        /^[a-z0-9-]+$/.test(value) 
          ? true 
          : 'Project name must be lowercase alphanumeric and hyphens'
    },
    {
      type: 'select',
      name: 'monorepoTool',
      message: 'Which monorepo tool?',
      choices: [
        { title: 'Turborepo (recommended)', value: 'turborepo' },
        { title: pc.gray('Nx (coming in v1.1)'), value: 'nx', disabled: true }
      ]
    },
    {
      type: 'select',
      name: 'framework',
      message: 'Which frontend framework?',
      choices: [
        { title: 'Next.js', value: 'nextjs' },
        { title: pc.gray('React (coming soon)'), value: 'react', disabled: true }
      ]
    },
    {
      type: 'select',
      name: 'codeQuality',
      message: 'Code quality tooling?',
      choices: CODE_QUALITY_CHOICES,
      initial: codeQualityInitial,
    }
  ], {
    onCancel: () => {
      throw new PromptCancelledError();
    }
  });

  return response as {
    projectName: string;
    monorepoTool: 'turborepo';
    framework: 'nextjs';
    codeQuality: 'eslint-prettier' | 'biome';
  };
}
