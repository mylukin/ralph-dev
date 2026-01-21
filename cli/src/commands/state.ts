/**
 * State Command - Manage workflow state
 *
 * Lightweight command layer that calls StateService and formats output.
 * Follows the architectural pattern: Command → Service → Repository
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { ExitCode } from '../core/exit-codes';
import { handleError, Errors } from '../core/error-handler';
import { successResponse, outputResponse } from '../core/response-wrapper';
import { createStateService } from './service-factory';
import { Phase } from '../domain/state-entity';

export function registerStateCommands(program: Command, workspaceDir: string): void {
  const state = program.command('state').description('Manage ralph-dev state');

  // Get current state
  state
    .command('get')
    .description('Get current ralph-dev state')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const stateService = createStateService(workspaceDir);
        const currentState = await stateService.getState();

        if (!currentState) {
          const response = successResponse({ phase: 'none', active: false });
          outputResponse(response, options.json, () => {
            console.log(chalk.yellow('No active ralph-dev session'));
          });
          process.exit(ExitCode.SUCCESS);
        }

        const response = successResponse({ ...currentState.toJSON(), active: true });

        outputResponse(response, options.json, () => {
          console.log(chalk.bold('Current State:'));
          console.log(`Phase: ${chalk.cyan(currentState.phase)}`);
          if (currentState.currentTask) {
            console.log(`Current Task: ${chalk.green(currentState.currentTask)}`);
          }
          console.log(`Started: ${currentState.startedAt}`);
          console.log(`Updated: ${currentState.updatedAt}`);
        });

        process.exit(ExitCode.SUCCESS);
      } catch (error) {
        handleError(Errors.fileSystemError('Failed to read state file', error), options.json);
      }
    });

  // Set state
  state
    .command('set')
    .description('Set ralph-dev state')
    .requiredOption('-p, --phase <phase>', 'Current phase')
    .option('-t, --task <taskId>', 'Current task ID')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const stateService = createStateService(workspaceDir);

        // Validate phase
        const validPhases: Phase[] = ['clarify', 'breakdown', 'implement', 'heal', 'deliver', 'complete'];
        if (!validPhases.includes(options.phase)) {
          handleError(
            Errors.invalidInput(`Invalid phase "${options.phase}". Valid phases: ${validPhases.join(', ')}`),
            options.json
          );
        }

        // Check if state exists
        const existingState = await stateService.getState();

        let newState;
        if (existingState) {
          // Update existing state
          newState = await stateService.updateState({
            phase: options.phase,
            currentTask: options.task,
          });
        } else {
          // Initialize new state
          newState = await stateService.initializeState(options.phase);
          if (options.task) {
            newState = await stateService.setCurrentTask(options.task);
          }
        }

        const response = successResponse(newState.toJSON(), {
          operation: 'set',
        });

        outputResponse(response, options.json, (data) => {
          console.log(chalk.green('✓ State updated'));
          console.log(`  Phase: ${chalk.cyan(data.phase)}`);
          if (data.currentTask) {
            console.log(`  Task: ${chalk.green(data.currentTask)}`);
          }
        });

        process.exit(ExitCode.SUCCESS);
      } catch (error) {
        handleError(Errors.fileSystemError('Failed to set state', error), options.json);
      }
    });

  // Update state field
  state
    .command('update')
    .description('Update specific state fields')
    .option('--phase <phase>', 'Update phase')
    .option('--task <taskId>', 'Update current task')
    .option('--prd <prdJson>', 'Update PRD (JSON string)')
    .option('--add-error <errorJson>', 'Add error (JSON string)')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const stateService = createStateService(workspaceDir);

        // Check state exists
        const exists = await stateService.exists();
        if (!exists) {
          handleError(Errors.stateNotFound(), options.json);
        }

        const updatedFields: string[] = [];
        const updates: any = {};

        // Validate and prepare phase update
        if (options.phase) {
          const validPhases: Phase[] = ['clarify', 'breakdown', 'implement', 'heal', 'deliver', 'complete'];
          if (!validPhases.includes(options.phase)) {
            handleError(
              Errors.invalidInput(`Invalid phase "${options.phase}". Valid phases: ${validPhases.join(', ')}`),
              options.json
            );
          }
          updates.phase = options.phase;
          updatedFields.push('phase');
        }

        // Prepare task update
        if (options.task) {
          updates.currentTask = options.task;
          updatedFields.push('currentTask');
        }

        // Prepare PRD update
        if (options.prd) {
          try {
            updates.prd = JSON.parse(options.prd);
            updatedFields.push('prd');
          } catch (error) {
            handleError(Errors.invalidJson(error), options.json);
          }
        }

        // Prepare error addition
        if (options.addError) {
          try {
            updates.addError = JSON.parse(options.addError);
            updatedFields.push('errors');
          } catch (error) {
            handleError(Errors.invalidJson(error), options.json);
          }
        }

        // Update state via service
        const updatedState = await stateService.updateState(updates);

        const response = successResponse(updatedState.toJSON(), {
          operation: 'update',
          updatedFields,
        });

        outputResponse(response, options.json, () => {
          console.log(chalk.green('✓ State updated'));
          console.log(`  Updated fields: ${updatedFields.join(', ')}`);
        });

        process.exit(ExitCode.SUCCESS);
      } catch (error) {
        handleError(Errors.fileSystemError('Failed to update state', error), options.json);
      }
    });

  // Clear state
  state
    .command('clear')
    .description('Clear ralph-dev state')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const stateService = createStateService(workspaceDir);
        const existed = await stateService.exists();

        if (existed) {
          await stateService.clearState();
        }

        const response = successResponse({
          cleared: existed,
        });

        outputResponse(response, options.json, (data) => {
          if (data.cleared) {
            console.log(chalk.green('✓ State cleared'));
          } else {
            console.log(chalk.yellow('No state to clear'));
          }
        });

        process.exit(ExitCode.SUCCESS);
      } catch (error) {
        handleError(Errors.fileSystemError('Failed to clear state', error), options.json);
      }
    });

  // Archive session
  state
    .command('archive')
    .description('Archive current session to .ralph-dev/archive/ and clear state')
    .option('--force', 'Force archive even if session is incomplete')
    .option('--json', 'Output as JSON')
    .action(async (options) => {
      try {
        const stateService = createStateService(workspaceDir);
        const result = await stateService.archiveSession({ force: options.force });

        const response = successResponse(result);

        outputResponse(response, options.json, (data) => {
          if (data.archived) {
            console.log(chalk.green('✓ Session archived'));
            console.log(chalk.gray(`  Location: ${data.archivePath}`));
            console.log(chalk.gray(`  Files: ${data.files.join(', ')}`));
          } else if (data.blocked) {
            console.log(chalk.yellow('⚠ Archive blocked'));
            console.log(chalk.yellow(`  ${data.blockedReason}`));
            console.log(chalk.gray(`  Current phase: ${data.currentPhase}`));
          } else {
            console.log(chalk.yellow('No session data to archive'));
          }
        });

        process.exit(ExitCode.SUCCESS);
      } catch (error) {
        handleError(Errors.fileSystemError('Failed to archive session', error), options.json);
      }
    });
}
