import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { FlatCompat } from '@eslint/eslintrc';
import js from '@eslint/js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

const config = [
  ...compat.extends('next/core-web-vitals', 'prettier'),
  {
    ignores: ['.next/**', 'node_modules/**', 'dist/**'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      // Customize rules for Next.js apps here
    },
  },
];

export default config;
