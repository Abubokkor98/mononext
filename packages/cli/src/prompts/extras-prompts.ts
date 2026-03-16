import prompts from 'prompts';
import { ProjectConfig } from '../types/config.js';
import { PromptCancelledError } from '../utils/errors.js';
import { getPreference } from '../utils/preferences.js';

type AnimationSelections = ProjectConfig['animations'];
type FeatureSelections = ProjectConfig['features'];

export async function askExtras(): Promise<{ animations: AnimationSelections; features: FeatureSelections }> {
  const savedAnimations = getPreference('animations') ?? [];
  const savedHusky = getPreference('featureHusky') ?? false;
  const savedPlaywright = getPreference('featurePlaywright') ?? false;
  const savedGithubActions = getPreference('featureGithubActions') ?? false;

  const response = await prompts([
    {
      type: 'multiselect',
      name: 'animations',
      message: 'Animation libraries (press Space to select, Enter to skip):',
      instructions: false,
      choices: [
        { title: 'Framer Motion', value: 'framer-motion', selected: savedAnimations.includes('framer-motion') },
        { title: 'Lenis (smooth scroll)', value: 'lenis', selected: savedAnimations.includes('lenis') },
        { title: 'GSAP', value: 'gsap', selected: savedAnimations.includes('gsap') }
      ]
    },
    {
      type: 'multiselect',
      name: 'featuresRaw',
      message: 'Extra features (press Space to select, Enter to skip):',
      instructions: false,
      choices: [
        { title: 'Husky + lint-staged (git hooks)', value: 'husky', selected: savedHusky },
        { title: 'Playwright (e2e testing)', value: 'playwright', selected: savedPlaywright },
        { title: 'GitHub Actions CI', value: 'githubActions', selected: savedGithubActions }
      ]
    }
  ], {
    onCancel: () => {
      throw new PromptCancelledError();
    }
  });

  const featuresRaw = (response.featuresRaw || []) as string[];

  return {
    animations: (response.animations || []) as AnimationSelections,
    features: {
      husky: featuresRaw.includes('husky'),
      playwright: featuresRaw.includes('playwright'),
      githubActions: featuresRaw.includes('githubActions')
    }
  };
}

