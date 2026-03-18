import { ProjectConfig } from '../types/config.js';
import { writeFile } from '../utils/file-system.js';
import { spinner } from '../utils/logger.js';
import path from 'path';
import { execa } from 'execa';

const GITIGNORE = `# Dependencies
node_modules/
.pnpm-store/

# Build outputs
dist/
.next/
out/
build/

# Environment
.env*
!.env.example

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Turbo
.turbo/

# Testing
coverage/
playwright-report/
test-results/

# Debug
npm-debug.log*
pnpm-debug.log*
`;

function buildReadme(config: ProjectConfig): string {
  const frontendApps = config.apps.filter((app) => app.type === 'frontend');
  const backendApps = config.apps.filter((app) => app.type === 'backend');

  const appList = config.apps
    .map((app) => `- **${app.name}** — ${app.type === 'frontend' ? 'Next.js (frontend)' : 'Express + TypeScript (backend)'}`)
    .join('\n');

  const devFilterExamples = config.apps
    .map((app) => `pnpm dev --filter=${app.name}`)
    .join('\n');

  let shadcnSection = '';
  if (config.shadcn.enabled) {
    shadcnSection = `
## Adding UI Components

Run from the project root — no need to \`cd\`:

\`\`\`bash
# Add a component (button, input, card, etc.)
pnpm ui:add button

# Add a block (login page, dashboard, etc.)
pnpm ui:add login-01
\`\`\`

Components go to \`packages/ui/src/components/\`.
Blocks go to \`packages/ui/src/blocks/\`.

### Importing

\`\`\`tsx
// Import a component
import { Button } from '@repo/ui/src/components/button';

// Import a block
import { LoginForm } from '@repo/ui/src/blocks/login-form';

// Import a utility
import { cn } from '@repo/ui/lib/utils';
\`\`\`
`;
  }

  let deploySection = '';
  if (frontendApps.length > 0) {
    const deploySteps = frontendApps
      .map(
        (app) => `### ${app.name}
1. Import your repo on [Vercel](https://vercel.com)
2. Set **Root Directory** to \`apps/${app.name}\`
3. Set **Build Command** to \`cd ../.. && pnpm turbo run build --filter=${app.name}\`
4. Deploy`,
      )
      .join('\n\n');

    deploySection = `
## Deployment

${deploySteps}
`;
  }

  let backendDeploySection = '';
  if (backendApps.length > 0) {
    const backendSteps = backendApps
      .map(
        (app) => `### ${app.name}
1. Build: \`pnpm build --filter=${app.name}\`
2. Run: \`node apps/${app.name}/dist/index.js\`
3. Or use Docker / Railway / Fly.io for deployment`,
      )
      .join('\n\n');

    backendDeploySection += `
${backendSteps}
`;
  }

  return `# ${config.projectName}

A Turborepo monorepo generated with [MonoNext](https://github.com/mononext).

## Apps

${appList}

## Getting Started

\`\`\`bash
# Install dependencies
pnpm install

# Run all apps in development
pnpm dev

# Run a specific app
${devFilterExamples}
\`\`\`

## Commands

| Command | Description |
|---------|-------------|
| \`pnpm dev\` | Start all apps in development mode |
| \`pnpm build\` | Build all apps |
| \`pnpm lint\` | Lint all apps |
| \`pnpm dev --filter=<app>\` | Start a specific app |
| \`pnpm ui:add <component>\` | Add a shadcn component or block |

## Project Structure

\`\`\`
${config.projectName}/
├── apps/
${config.apps.map((app, i) => `│   ${i === config.apps.length - 1 ? '└' : '├'}── ${app.name}/`).join('\n')}
├── packages/
│   ├── ui/
│   │   ├── src/components/   ← Shared primitives (button, card)
│   │   ├── src/blocks/       ← Shared blocks (login, dashboard)
│   │   ├── src/providers/    ← Shared providers (motion, scroll)
│   │   └── lib/utils.ts
│   ├── config-typescript/    ← Shared TypeScript config
│   └── config-${config.codeQuality === 'biome' ? 'biome' : 'eslint'}/        ← Shared ${config.codeQuality === 'biome' ? 'Biome' : 'ESLint'} config
├── turbo.json
├── pnpm-workspace.yaml
└── package.json
\`\`\`
${shadcnSection}${deploySection}${backendDeploySection}
## License

MIT
`;
}

async function initGitRepo(targetDir: string): Promise<boolean> {
  const loadingSpinner = spinner('Initializing git repository...');

  try {
    await execa('git', ['init'], { cwd: targetDir, stdio: 'pipe' });
    await execa('git', ['add', '-A'], { cwd: targetDir, stdio: 'pipe' });
    await execa('git', ['commit', '-m', 'chore: initial commit from MonoNext'], {
      cwd: targetDir,
      stdio: 'pipe',
    });

    loadingSpinner.succeed('Git repository initialized');
    return true;
  } catch (_error) {
    loadingSpinner.fail('Git init failed — you can run `git init` manually.');
    return false;
  }
}

export async function generateFinalize(config: ProjectConfig, targetDir: string): Promise<boolean> {
  // 1. Write .gitignore
  await writeFile(path.join(targetDir, '.gitignore'), GITIGNORE);

  // 2. Write README.md
  await writeFile(path.join(targetDir, 'README.md'), buildReadme(config));

  // 3. Initialize git repo with initial commit
  return await initGitRepo(targetDir);
}
