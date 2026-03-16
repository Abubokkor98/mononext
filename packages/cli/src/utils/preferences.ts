import Conf from 'conf';
import { ProjectConfig } from '../types/config.js';
import { logger } from './logger.js';

interface SavedPreferences {
  codeQuality: 'eslint-prettier' | 'biome';
  shadcnEnabled: boolean;
  shadcnBase: string;
  shadcnPreset: string;
  animations: string[];
  featureHusky: boolean;
  featurePlaywright: boolean;
  featureGithubActions: boolean;
}

const PREFERENCES_SCHEMA = {
  codeQuality: { type: 'string', enum: ['eslint-prettier', 'biome'] },
  shadcnEnabled: { type: 'boolean' },
  shadcnBase: { type: 'string' },
  shadcnPreset: { type: 'string' },
  animations: { type: 'array', items: { type: 'string' } },
  featureHusky: { type: 'boolean' },
  featurePlaywright: { type: 'boolean' },
  featureGithubActions: { type: 'boolean' },
} as const;

const PREFERENCES_DEFAULTS: SavedPreferences = {
  codeQuality: 'eslint-prettier',
  shadcnEnabled: true,
  shadcnBase: 'radix',
  shadcnPreset: 'nova',
  animations: [],
  featureHusky: false,
  featurePlaywright: false,
  featureGithubActions: false,
};

const preferences = new Conf<SavedPreferences>({
  projectName: 'mononext',
  schema: PREFERENCES_SCHEMA,
  defaults: PREFERENCES_DEFAULTS,
});

/**
 * Read a saved preference. Returns undefined if not found or on error.
 * Silent on failure — prompts fall back to their built-in defaults.
 */
export function getPreference<K extends keyof SavedPreferences>(
  key: K,
): SavedPreferences[K] | undefined {
  try {
    return preferences.get(key);
  } catch {
    return undefined;
  }
}

type PreferencesInput = Pick<ProjectConfig, 'codeQuality' | 'shadcn' | 'animations' | 'features'>;

/**
 * Save user choices after a successful scaffold.
 * Warns on failure — the project was created successfully,
 * but preferences won't be remembered next time.
 */
export function saveAllPreferences(config: PreferencesInput): void {
  try {
    preferences.set({
      codeQuality: config.codeQuality,
      shadcnEnabled: config.shadcn.enabled,
      shadcnBase: config.shadcn.base,
      shadcnPreset: config.shadcn.preset,
      animations: config.animations,
      featureHusky: config.features.husky,
      featurePlaywright: config.features.playwright,
      featureGithubActions: config.features.githubActions,
    });
  } catch {
    logger.warn('Could not save preferences. Your choices will not be remembered next time.');
  }
}

/**
 * Clear all saved preferences.
 * Warns on failure — user explicitly asked to reset but it didn't work.
 */
export function clearPreferences(): boolean {
  try {
    preferences.clear();
    return true;
  } catch {
    logger.warn('Could not clear preferences. Try manually deleting the config file.');
    return false;
  }
}
