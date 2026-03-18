import { z } from 'zod';

export const appConfigSchema = z.object({
  name: z.string().min(1).regex(/^[a-z0-9-]+$/, 'App name must be lowercase alphanumeric and hyphens'),
  type: z.enum(['frontend', 'backend']),
});

export const shadcnConfigSchema = z.object({
  enabled: z.boolean(),
  base: z.enum(['radix', 'base']),
  preset: z.enum(['nova', 'vega', 'maia', 'lyra', 'mira', 'custom']),
  customPresetCode: z.string().optional(),
});

export const projectConfigSchema = z.object({
  projectName: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Project name must be lowercase alphanumeric and hyphens'),
  monorepoTool: z.literal('turborepo'), // Nx coming in v1.1
  framework: z.literal('nextjs'), // React coming in v2.0
  codeQuality: z.enum(['eslint-prettier', 'biome']),
  apps: z.array(appConfigSchema).min(1).max(5),
  shadcn: shadcnConfigSchema,
  animations: z.array(z.enum(['framer-motion', 'lenis', 'gsap'])),
  features: z.object({
    husky: z.boolean(),
    playwright: z.boolean(),
    githubActions: z.boolean(),
  }),
});

export type AppConfig = z.infer<typeof appConfigSchema>;
export type ShadcnConfig = z.infer<typeof shadcnConfigSchema>;
export type ProjectConfig = z.infer<typeof projectConfigSchema>;
