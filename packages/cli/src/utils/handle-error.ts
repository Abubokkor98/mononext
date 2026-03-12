import { logger } from './logger.js';

export function handleError(error: unknown) {
  if (error instanceof Error) {
    logger.error(`\nError: ${error.message}`);
  } else {
    logger.error(`\nAn unknown error occurred: ${String(error)}`);
  }
  process.exit(1);
}
