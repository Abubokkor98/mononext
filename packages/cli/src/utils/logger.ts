import pc from 'picocolors';
import ora from 'ora';

export const logger = {
  error: (text: string) => console.log(pc.red(text)),
  success: (text: string) => console.log(pc.green(text)),
  info: (text: string) => console.log(pc.cyan(text)),
  warn: (text: string) => console.log(pc.yellow(text)),
};

export function spinner(text: string) {
  return ora({ text, color: 'cyan' }).start();
}
