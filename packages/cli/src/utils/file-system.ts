import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function getTemplatesDir() {
  // Walk upward from __dirname to find the package root (where package.json lives),
  // then resolve the templates/ directory relative to it.
  let currentDir = __dirname;
  while (!fs.existsSync(path.join(currentDir, 'package.json'))) {
    currentDir = path.dirname(currentDir);
    if (currentDir === '/' || currentDir === '.' || currentDir.match(/^[A-Z]:\\$/)) {
      throw new Error('Could not find package root');
    }
  }
  return path.join(currentDir, 'templates');
}

export async function copyTemplate(srcRelativePath: string, destAbsolutePath: string) {
  const templatesDir = getTemplatesDir();
  const srcPath = path.join(templatesDir, srcRelativePath);
  
  if (!fs.existsSync(srcPath)) {
    throw new Error(`Template not found: ${srcPath}`);
  }

  await fs.copy(srcPath, destAbsolutePath);
}

export async function writeJson(destAbsolutePath: string, data: unknown) {
  await fs.outputJson(destAbsolutePath, data, { spaces: 2 });
}

export async function writeFile(destAbsolutePath: string, content: string) {
  await fs.outputFile(destAbsolutePath, content);
}

export async function ensureDir(dirPath: string) {
  await fs.ensureDir(dirPath);
}
