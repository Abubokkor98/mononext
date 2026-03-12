import prompts from 'prompts';
import { AppConfig, ShadcnConfig } from '../types/config.js';
import { PromptCancelledError } from '../utils/errors.js';

const SHADCN_DISABLED: ShadcnConfig = { enabled: false, base: 'radix', preset: 'nova' };

export async function askShadcnDetails(apps: AppConfig[]): Promise<ShadcnConfig> {
  const hasFrontendApps = apps.some((app) => app.type === 'frontend');

  if (!hasFrontendApps) {
    return SHADCN_DISABLED;
  }

  const { enabled } = await prompts({
    type: 'confirm',
    name: 'enabled',
    message: 'Include shadcn/ui components? (applied to all frontend apps)',
    initial: true
  }, {
    onCancel: () => {
      throw new PromptCancelledError();
    }
  });

  if (!enabled) {
    return SHADCN_DISABLED;
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
      throw new PromptCancelledError();
    }
  });

  return {
    enabled: true,
    base: response.base,
    preset: response.preset,
  };
}
