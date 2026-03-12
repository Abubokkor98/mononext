import prompts from 'prompts';
import pc from 'picocolors';
import { AppConfig } from '../types/config.js';

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
      console.log(pc.red('Operation cancelled.'));
      process.exit(1);
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
        validate: (value: string) => 
          /^[a-z0-9-]+$/.test(value) 
            ? true 
            : 'App name must be lowercase alphanumeric and hyphens'
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
        console.log(pc.red('Operation cancelled.'));
        process.exit(1);
      }
    });

    apps.push(response as AppConfig);
  }

  return apps;
}
