import prompts from 'prompts';
import { ProjectConfig } from '../types/config.js';
import { PromptCancelledError } from '../utils/errors.js';

type AnimationSelections = ProjectConfig['animations'];
type FeatureSelections = ProjectConfig['features'];

export async function askExtras(): Promise<{ animations: AnimationSelections; features: FeatureSelections }> {
  const response = await prompts([
    {
      type: 'multiselect',
      name: 'animations',
      message: 'Animation libraries (press Space to select, Enter to skip):',
      instructions: false,
      choices: [
        { title: 'Framer Motion', value: 'framer-motion' },
        { title: 'Lenis (smooth scroll)', value: 'lenis' },
        { title: 'GSAP', value: 'gsap' }
      ]
    },
    {
      type: 'multiselect',
      name: 'featuresRaw',
      message: 'Extra features (press Space to select, Enter to skip):',
      instructions: false,
      choices: [
        { title: 'Husky + lint-staged (git hooks)', value: 'husky' },
        { title: 'Playwright (e2e testing)', value: 'playwright' },
        { title: 'GitHub Actions CI', value: 'githubActions' }
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
