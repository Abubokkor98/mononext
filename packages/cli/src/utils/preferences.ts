import Conf from 'conf';
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

const preferences = new Conf<SavedPreferences>({
  projectName: 'mononext',
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

/**
 * Save user choices after a successful scaffold.
 * Warns on failure — the project was created successfully,
 * but preferences won't be remembered next time.
 */
export function saveAllPreferences(config: {
  codeQuality: string;
  shadcn: { enabled: boolean; base: string; preset: string };
  animations: string[];
  features: { husky: boolean; playwright: boolean; githubActions: boolean };
}): void {
  try {
    preferences.set('codeQuality', config.codeQuality as SavedPreferences['codeQuality']);
    preferences.set('shadcnEnabled', config.shadcn.enabled);
    preferences.set('shadcnBase', config.shadcn.base);
    preferences.set('shadcnPreset', config.shadcn.preset);
    preferences.set('animations', config.animations);
    preferences.set('featureHusky', config.features.husky);
    preferences.set('featurePlaywright', config.features.playwright);
    preferences.set('featureGithubActions', config.features.githubActions);
  } catch {
    logger.warn('Could not save preferences. Your choices will not be remembered next time.');
  }
}

/**
 * Clear all saved preferences.
 * Warns on failure — user explicitly asked to reset but it didn't work.
 */
export function clearPreferences(): void {
  try {
    preferences.clear();
  } catch {
    logger.warn('Could not clear preferences. Try manually deleting the config file.');
  }
}
