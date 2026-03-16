import { Command } from 'commander';
import { init } from './commands/init.js';

const program = new Command();

program
  .name('mononext')
  .description('Scaffold production-ready monorepos')
  .version('0.0.0');

program
  .command('init')
  .description('Initialize a new monorepo project')
  .option('-y, --yes', 'Skip prompts and use default options', false)
  .option('--reset-preferences', 'Clear saved preferences and use defaults', false)
  .action((options) => {
    init(options);
  });

program.parse(process.argv);
