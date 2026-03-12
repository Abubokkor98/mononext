import prompts from 'prompts';
import { AppConfig } from '../types/config.js';
import { PromptCancelledError } from '../utils/errors.js';

export async function askAppDetails(): Promise<AppConfig[]> {
  const { count } = await prompts({
    type: 'number',
    name: 'count',
    message: 'How many apps do you want to create? (1-5)',
    initial: 2,
    min: 1,
    max: 5,
  }, {
    onCancel: () => {
      throw new PromptCancelledError();
    }
  });

  const apps: AppConfig[] = [];

  for (let i = 1; i <= count; i++) {
    const defaultName = i === 1 ? 'web' : i === 2 ? 'api' : `app-${i}`;
    
    const response = await prompts([
      {
        type: 'text',
        name: 'name',
        message: `App ${i} — Name:`,
        initial: defaultName,
        validate: (value: string) => {
          if (!/^[a-z0-9-]+$/.test(value)) {
            return 'App name must be lowercase alphanumeric and hyphens';
          }
          if (apps.some((app) => app.name === value)) {
            return 'App name must be unique';
          }
          return true;
        }
      },
      {
        type: 'select',
        name: 'type',
        message: `App ${i} — Type:`,
        choices: [
          { title: 'Frontend', value: 'frontend' },
          { title: 'Backend (Node.js + Express)', value: 'backend' }
        ]
      }
    ], {
      onCancel: () => {
        throw new PromptCancelledError();
      }
    });

    apps.push(response as AppConfig);
  }

  return apps;
}
