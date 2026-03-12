export class PromptCancelledError extends Error {
  constructor() {
    super('Operation cancelled.');
    this.name = 'PromptCancelledError';
  }
}
