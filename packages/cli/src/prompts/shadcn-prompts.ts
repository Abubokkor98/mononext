import prompts from 'prompts';
import pc from 'picocolors';
import { ShadcnConfig } from '../types/config.js';

export async function askShadcnDetails(): Promise<ShadcnConfig> {
  const { enabled } = await prompts({
    type: 'confirm',
    name: 'enabled',
    message: 'Include shadcn/ui components? (applied to all frontend apps)',
    initial: true
  }, {
    onCancel: () => {
      console.log(pc.red('Operation cancelled.'));
      process.exit(1);
    }
  });

  if (!enabled) {
    return { enabled: false, base: 'radix', preset: 'nova' }; // Base and preset ignored if disabled
  }

  const response = await prompts([
    {
      type: 'select',
      name: 'base',
      message: 'Component library base?',
      choices: [
        { title: 'Radix (most popular)', value: 'radix' },
        { title: 'Base UI (alternative)', value: 'base' }
      ]
    },
    {
      type: 'select',
      name: 'preset',
      message: 'shadcn design preset?',
      choices: [
        { title: 'Nova (Lucide / Geist)', value: 'nova' },
        { title: 'Vega (Lucide / Inter)', value: 'vega' },
        { title: 'Maia (Hugeicons / Figtree)', value: 'maia' },
        { title: 'Lyra (Phosphor / JetBrains Mono)', value: 'lyra' },
        { title: 'Mira (Hugeicons / Inter)', value: 'mira' }
      ]
    }
  ], {
    onCancel: () => {
      console.log(pc.red('Operation cancelled.'));
      process.exit(1);
    }
  });

  return {
    enabled: true,
    base: response.base,
    preset: response.preset,
  };
}
