import prompts from 'prompts';
import { AppConfig, ShadcnConfig } from '../types/config.js';
import { PromptCancelledError } from '../utils/errors.js';
import { getPreference } from '../utils/preferences.js';

const SHADCN_DISABLED: ShadcnConfig = { enabled: false, base: 'radix', preset: 'nova' };

const BASE_CHOICES = [
  { title: 'Radix (most popular)', value: 'radix' },
  { title: 'Base UI (alternative)', value: 'base' },
];

const PRESET_CHOICES = [
  { title: 'Nova (Lucide / Geist)', value: 'nova' },
  { title: 'Vega (Lucide / Inter)', value: 'vega' },
  { title: 'Maia (Hugeicons / Figtree)', value: 'maia' },
  { title: 'Lyra (Phosphor / JetBrains Mono)', value: 'lyra' },
  { title: 'Mira (Hugeicons / Inter)', value: 'mira' },
];

export async function askShadcnDetails(apps: AppConfig[]): Promise<ShadcnConfig> {
  const hasFrontendApps = apps.some((app) => app.type === 'frontend');

  if (!hasFrontendApps) {
    return SHADCN_DISABLED;
  }

  const savedEnabled = getPreference('shadcnEnabled');

  const { enabled } = await prompts({
    type: 'confirm',
    name: 'enabled',
    message: 'Include shadcn/ui components? (applied to all frontend apps)',
    initial: savedEnabled ?? true
  }, {
    onCancel: () => {
      throw new PromptCancelledError();
    }
  });

  if (!enabled) {
    return SHADCN_DISABLED;
  }

  const savedBase = getPreference('shadcnBase');
  const savedPreset = getPreference('shadcnPreset');
  const baseInitial = Math.max(0, BASE_CHOICES.findIndex((c) => c.value === savedBase));
  const presetInitial = Math.max(0, PRESET_CHOICES.findIndex((c) => c.value === savedPreset));

  const response = await prompts([
    {
      type: 'select',
      name: 'base',
      message: 'Component library base?',
      choices: BASE_CHOICES,
      initial: baseInitial,
    },
    {
      type: 'select',
      name: 'preset',
      message: 'shadcn design preset?',
      choices: PRESET_CHOICES,
      initial: presetInitial,
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

