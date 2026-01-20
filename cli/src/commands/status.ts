/**
 * Status Command - Display project progress
 *
 * Lightweight command layer that calls StatusService and formats output.
 * Follows the architectural pattern: Command → Service → Repository
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { ExitCode } from '../core/exit-codes';
import { handleError } from '../core/error-handler';
import { successResponse, outputResponse } from '../core/response-wrapper';
import { createStatusService } from './service-factory';

/**
 * Register status command
 */
export function registerStatusCommand(program: Command, workspaceDir: string): void {
  program
    .command('status')
    .description('Display overall project progress and statistics')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const statusService = createStatusService(workspaceDir);
        const status = await statusService.getProjectStatus();

        const response = successResponse(status);

        outputResponse(response, options.json, () => {
          // Header
          console.log(chalk.bold.blue('\n📊 Ralph-dev Project Status\n'));

          // Current session info
          console.log(chalk.bold('Session:'));
          console.log(`  Phase: ${formatPhase(status.currentPhase)}`);
          if (status.currentTask) {
            console.log(`  Current Task: ${chalk.green(status.currentTask)}`);
          }
          if (status.startedAt) {
            console.log(`  Started: ${chalk.dim(formatTimestamp(status.startedAt))}`);
          }
          if (status.updatedAt) {
            console.log(`  Updated: ${chalk.dim(formatTimestamp(status.updatedAt))}`);
          }

          // Overall progress
          console.log(chalk.bold('\nOverall Progress:'));
          renderProgressBar(status.overall.completionPercentage);
          console.log(`  Total Tasks: ${chalk.cyan(status.overall.total)}`);
          console.log(`  Completed: ${chalk.green(status.overall.completed)}`);
          console.log(`  In Progress: ${chalk.yellow(status.overall.inProgress)}`);
          console.log(`  Pending: ${chalk.dim(status.overall.pending)}`);
          if (status.overall.blocked > 0) {
            console.log(`  Blocked: ${chalk.magenta(status.overall.blocked)}`);
          }
          if (status.overall.failed > 0) {
            console.log(`  Failed: ${chalk.red(status.overall.failed)}`);
          }

          // Module breakdown
          if (status.byModule.length > 0) {
            console.log(chalk.bold('\nProgress by Module:'));
            for (const module of status.byModule) {
              console.log(`\n  ${chalk.bold(module.module)}`);
              renderProgressBar(module.completionPercentage, '    ');
              console.log(`    Total: ${module.total} | ` +
                `${chalk.green('✓ ' + module.completed)} | ` +
                `${chalk.yellow('→ ' + module.inProgress)} | ` +
                `${chalk.dim('○ ' + module.pending)}` +
                (module.blocked > 0 ? ` | ${chalk.magenta('⊗ ' + module.blocked)}` : '') +
                (module.failed > 0 ? ` | ${chalk.red('✗ ' + module.failed)}` : '')
              );
            }
          }

          // Empty state
          if (!status.hasActiveTasks) {
            console.log(chalk.yellow('\n  No tasks found. Run task breakdown to create tasks.\n'));
          } else {
            console.log(); // Empty line at the end
          }
        });

        process.exit(ExitCode.SUCCESS);
      } catch (error: any) {
        handleError(error, options.json);
      }
    });
}

/**
 * Format phase name with color
 */
function formatPhase(phase: string): string {
  const colors: Record<string, (text: string) => string> = {
    'clarify': chalk.blue,
    'breakdown': chalk.cyan,
    'implement': chalk.yellow,
    'heal': chalk.magenta,
    'deliver': chalk.green,
    'none': chalk.dim,
  };

  const colorFn = colors[phase] || chalk.white;
  return colorFn(phase);
}

/**
 * Format timestamp as human-readable relative time
 */
function formatTimestamp(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) {
    return 'just now';
  } else if (diffMins < 60) {
    return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  } else if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffDays < 7) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else {
    return date.toLocaleString();
  }
}

/**
 * Render a visual progress bar
 */
function renderProgressBar(percentage: number, indent: string = '  '): void {
  const barLength = 30;
  const filled = Math.round((percentage / 100) * barLength);
  const empty = barLength - filled;

  const filledBar = chalk.green('█'.repeat(filled));
  const emptyBar = chalk.dim('░'.repeat(empty));
  const percentText = chalk.bold(`${percentage}%`);

  console.log(`${indent}[${filledBar}${emptyBar}] ${percentText}`);
}
