import { AppConfig, ProjectConfig } from '../types/config.js';
import { ensureDir, writeJson, writeFile } from '../utils/file-system.js';
import path from 'path';
import { LATEST_DEPS } from '../constants/versions.js';

const DEFAULT_PORT_START = 4000;

function buildHealthRoute(appName: string): string {
  return `import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.json({ status: 'ok', service: '${appName}' });
});

export default router;
`;
}

function buildServerEntry(appName: string, port: number): string {
  return `import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.js';

const app = express();
const PORT = process.env.PORT || ${port};

app.use(cors());
app.use(express.json());

app.use('/health', healthRouter);

app.listen(PORT, () => {
  console.log(\`[${appName}] Server running on http://localhost:\${PORT}\`);
});
`;
}

function buildPackageJson(app: AppConfig, config: ProjectConfig): object {
  const devDependencies: Record<string, string> = {
    '@repo/typescript-config': 'workspace:*',
    '@types/express': LATEST_DEPS['@types/express'],
    '@types/cors': LATEST_DEPS['@types/cors'],
    '@types/node': LATEST_DEPS['@types/node'],
    tsx: LATEST_DEPS.tsx,
  };

  if (config.codeQuality === 'eslint-prettier') {
    devDependencies['@repo/eslint-config'] = 'workspace:*';
    devDependencies.eslint = LATEST_DEPS.eslint;
  } else if (config.codeQuality === 'biome') {
    devDependencies['@biomejs/biome'] = LATEST_DEPS['@biomejs/biome'];
  }

  return {
    name: app.name,
    version: '0.0.0',
    private: true,
    type: 'module',
    scripts: {
      dev: 'tsx watch src/index.ts',
      build: 'tsc',
      start: 'node dist/index.js',
      lint: config.codeQuality === 'biome'
        ? 'biome check .'
        : 'eslint "src/**/*.ts"',
    },
    dependencies: {
      express: LATEST_DEPS.express,
      cors: LATEST_DEPS.cors,
    },
    devDependencies,
  };
}

function buildTsconfig(): object {
  return {
    extends: '@repo/typescript-config/express.json',
    compilerOptions: {
      rootDir: 'src',
    },
    include: ['src'],
    exclude: ['node_modules', 'dist'],
  };
}

export async function generateBackendApps(config: ProjectConfig, targetDir: string) {
  const backendApps = config.apps.filter((app) => app.type === 'backend');

  for (let index = 0; index < backendApps.length; index++) {
    const app = backendApps[index];
    const appDir = path.join(targetDir, 'apps', app.name);
    const srcDir = path.join(appDir, 'src');
    const routesDir = path.join(srcDir, 'routes');
    const port = DEFAULT_PORT_START + index;

    await ensureDir(routesDir);

    // package.json
    await writeJson(path.join(appDir, 'package.json'), buildPackageJson(app, config));

    // tsconfig.json
    await writeJson(path.join(appDir, 'tsconfig.json'), buildTsconfig());

    // src/index.ts
    await writeFile(path.join(srcDir, 'index.ts'), buildServerEntry(app.name, port));

    // src/routes/health.ts
    await writeFile(path.join(routesDir, 'health.ts'), buildHealthRoute(app.name));
  }
}
