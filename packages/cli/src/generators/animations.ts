import { ProjectConfig } from '../types/config.js';
import { ensureDir, writeFile } from '../utils/file-system.js';
import path from 'path';
import fs from 'fs-extra';
import { LATEST_DEPS } from '../constants/versions.js';

// --- Shared component templates (packages/ui/src/) ---

const MOTION_WRAPPER = `'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';

interface MotionWrapperProps {
  children: React.ReactNode;
}

export function MotionWrapper({ children }: MotionWrapperProps) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
`;

const SMOOTH_SCROLL_PROVIDER = `'use client';

import { ReactLenis } from 'lenis/react';

interface SmoothScrollProviderProps {
  children: React.ReactNode;
}

export function SmoothScrollProvider({ children }: SmoothScrollProviderProps) {
  return (
    <ReactLenis root options={{ lerp: 0.1, duration: 1.2, smoothWheel: true }}>
      {children}
    </ReactLenis>
  );
}
`;

const GSAP_REGISTER = `'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Register GSAP plugins once — imported in root layout
gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };
`;

// --- Per-app template (apps/<name>/app/template.tsx) ---

const TEMPLATE_TSX = `import { MotionWrapper } from '@repo/ui/src/motion-wrapper';

export default function Template({ children }: { children: React.ReactNode }) {
  return <MotionWrapper>{children}</MotionWrapper>;
}
`;

// --- Generator ---

async function writeSharedComponents(config: ProjectConfig, uiSrcDir: string) {
  if (config.animations.includes('framer-motion')) {
    await writeFile(path.join(uiSrcDir, 'motion-wrapper.tsx'), MOTION_WRAPPER);
  }

  if (config.animations.includes('lenis')) {
    await writeFile(path.join(uiSrcDir, 'smooth-scroll-provider.tsx'), SMOOTH_SCROLL_PROVIDER);
  }

  if (config.animations.includes('gsap')) {
    await writeFile(path.join(uiSrcDir, 'gsap-register.ts'), GSAP_REGISTER);
  }
}

async function wireFrontendApps(config: ProjectConfig, targetDir: string) {
  const frontendApps = config.apps.filter((app) => app.type === 'frontend');
  const hasFramerMotion = config.animations.includes('framer-motion');
  const hasLenis = config.animations.includes('lenis');
  const hasGsap = config.animations.includes('gsap');

  for (const app of frontendApps) {
    const appDir = path.join(targetDir, 'apps', app.name);
    const appSourceDir = path.join(appDir, 'app');

    // 1. Framer Motion: create template.tsx
    if (hasFramerMotion) {
      await writeFile(path.join(appSourceDir, 'template.tsx'), TEMPLATE_TSX);
    }

    // 2. Lenis + GSAP: modify layout.tsx
    if (hasLenis || hasGsap) {
      await modifyLayout(path.join(appSourceDir, 'layout.tsx'), { hasLenis, hasGsap });
    }

    // 3. Add animation deps to package.json
    await addAnimationDeps(path.join(appDir, 'package.json'), config);
  }
}

async function modifyLayout(
  layoutPath: string,
  options: { hasLenis: boolean; hasGsap: boolean },
) {
  if (!(await fs.pathExists(layoutPath))) {
    return;
  }

  let content = await fs.readFile(layoutPath, 'utf-8');

  // Add imports at the top (after existing imports), skip if already present
  const imports: string[] = [];
  if (options.hasGsap) {
    const gsapImport = "import '@repo/ui/src/gsap-register';";
    if (!content.includes(gsapImport)) imports.push(gsapImport);
  }
  if (options.hasLenis) {
    const lenisImport = "import { SmoothScrollProvider } from '@repo/ui/src/smooth-scroll-provider';";
    if (!content.includes(lenisImport)) imports.push(lenisImport);
  }

  if (imports.length > 0) {
    // Insert after the last import statement
    const lastImportIndex = content.lastIndexOf('import ');
    const lineEnd = content.indexOf('\n', lastImportIndex);
    content = content.slice(0, lineEnd + 1) + imports.join('\n') + '\n' + content.slice(lineEnd + 1);
  }

  // Wrap {children} with SmoothScrollProvider
  if (options.hasLenis) {
    const bodyPattern = /<body className=\{inter\.className\}>\s*\{children\}\s*<\/body>/m;
    const updated = content.replace(
      bodyPattern,
      '<body className={inter.className}><SmoothScrollProvider>{children}</SmoothScrollProvider></body>',
    );
    if (updated === content) {
      throw new Error(`Unable to inject SmoothScrollProvider in ${layoutPath}`);
    }
    content = updated;
  }

  await fs.writeFile(layoutPath, content);
}

async function addAnimationDeps(packageJsonPath: string, config: ProjectConfig) {
  if (!(await fs.pathExists(packageJsonPath))) {
    return;
  }

  const pkg = await fs.readJson(packageJsonPath);
  const deps: Record<string, string> = {};

  // Ensure @repo/ui is a dependency — animation components live there
  if (config.animations.length > 0) {
    deps['@repo/ui'] = 'workspace:*';
  }

  if (config.animations.includes('framer-motion')) {
    deps['framer-motion'] = LATEST_DEPS['framer-motion'];
  }

  if (config.animations.includes('lenis')) {
    deps.lenis = LATEST_DEPS.lenis;
  }

  if (config.animations.includes('gsap')) {
    deps.gsap = LATEST_DEPS.gsap;
  }

  if (Object.keys(deps).length > 0) {
    pkg.dependencies = { ...pkg.dependencies, ...deps };
    await fs.writeJson(packageJsonPath, pkg, { spaces: 2 });
  }
}

async function updateBarrelExports(config: ProjectConfig, uiSrcDir: string) {
  const indexPath = path.join(uiSrcDir, 'index.ts');

  if (!(await fs.pathExists(indexPath))) {
    return;
  }

  let indexContent = await fs.readFile(indexPath, 'utf-8');
  const exports: string[] = [];

  if (config.animations.includes('framer-motion')) {
    const exportLine = "export { MotionWrapper } from './motion-wrapper';";
    if (!indexContent.includes(exportLine)) exports.push(exportLine);
  }

  if (config.animations.includes('lenis')) {
    const exportLine = "export { SmoothScrollProvider } from './smooth-scroll-provider';";
    if (!indexContent.includes(exportLine)) exports.push(exportLine);
  }

  if (config.animations.includes('gsap')) {
    const exportLine = "export { gsap, ScrollTrigger } from './gsap-register';";
    if (!indexContent.includes(exportLine)) exports.push(exportLine);
  }

  if (exports.length > 0) {
    indexContent += '\n' + exports.join('\n') + '\n';
    await fs.writeFile(indexPath, indexContent);
  }
}

export async function generateAnimations(config: ProjectConfig, targetDir: string) {
  if (config.animations.length === 0) {
    return;
  }

  const frontendApps = config.apps.filter((app) => app.type === 'frontend');

  if (frontendApps.length === 0) {
    return;
  }

  const uiSrcDir = path.join(targetDir, 'packages', 'ui', 'src');
  await ensureDir(uiSrcDir);

  // 1. Write shared components to packages/ui/src/
  await writeSharedComponents(config, uiSrcDir);

  // 2. Update index.ts with exports
  await updateBarrelExports(config, uiSrcDir);

  // 3. Wire into each frontend app (template.tsx, layout.tsx mods, deps)
  await wireFrontendApps(config, targetDir);
}
