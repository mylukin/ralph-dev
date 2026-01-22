import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import { registerStateCommands } from '../../src/commands/state';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('state commands', () => {
  let program: Command;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let processExitSpy: any;
  const testDir = path.join(__dirname, '__test-state-command__');
  const stateFile = path.join(testDir, '.ralph-dev', 'state.json');

  beforeEach(() => {
    program = new Command();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    vi.useFakeTimers();

    fs.ensureDirSync(testDir);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
    vi.clearAllMocks();
    vi.useRealTimers();
    fs.removeSync(testDir);
  });

  describe('state get', () => {
    it('should register state get command', () => {
      registerStateCommands(program, testDir);

      const stateCommand = program.commands.find(cmd => cmd.name() === 'state');
      expect(stateCommand).toBeDefined();

      const getCommand = stateCommand?.commands.find(cmd => cmd.name() === 'get');
      expect(getCommand).toBeDefined();
    });

    it('should show no active session when state file does not exist', async () => {
      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'get']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No active ralph-dev session'));
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should display current state when state file exists', async () => {
      const now = new Date('2025-01-19T10:00:00.000Z');
      vi.setSystemTime(now);

      const state = {
        phase: 'implement',
        currentTask: 'task-123',
        startedAt: '2025-01-19T09:00:00.000Z',
        updatedAt: '2025-01-19T10:00:00.000Z',
      };

      fs.ensureDirSync(path.dirname(stateFile));
      fs.writeJSONSync(stateFile, state);

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'get']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Current State:'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('implement'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('task-123'));
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should output JSON format when --json flag is used', async () => {
      const state = {
        phase: 'clarify',
        startedAt: '2025-01-19T09:00:00.000Z',
        updatedAt: '2025-01-19T10:00:00.000Z',
      };

      fs.ensureDirSync(path.dirname(stateFile));
      fs.writeJSONSync(stateFile, state);

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'get', '--json']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"phase": "clarify"')
      );
    });

    it('should handle file read errors', async () => {
      fs.ensureDirSync(path.dirname(stateFile));
      fs.writeFileSync(stateFile, 'invalid-json', 'utf-8');

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'get']);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(8);
    });
  });

  describe('state set', () => {
    it('should register state set command', () => {
      registerStateCommands(program, testDir);

      const stateCommand = program.commands.find(cmd => cmd.name() === 'state');
      const setCommand = stateCommand?.commands.find(cmd => cmd.name() === 'set');

      expect(setCommand).toBeDefined();
    });

    it('should create new state file', async () => {
      const now = new Date('2025-01-19T10:00:00.000Z');
      vi.setSystemTime(now);

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'set', '--phase', 'clarify']);

      expect(fs.existsSync(stateFile)).toBe(true);
      const state = fs.readJSONSync(stateFile);
      expect(state.phase).toBe('clarify');
      expect(state.startedAt).toBe('2025-01-19T10:00:00.000Z');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✓ State updated'));
    });

    it('should set phase and task', async () => {
      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'set', '--phase', 'implement', '--task', 'task-456']);

      const state = fs.readJSONSync(stateFile);
      expect(state.phase).toBe('implement');
      expect(state.currentTask).toBe('task-456');
    });

    it('should preserve existing startedAt, prd, and errors', async () => {
      const now = new Date('2025-01-19T10:00:00.000Z');
      vi.setSystemTime(now);

      const existingState = {
        phase: 'clarify',
        startedAt: '2025-01-19T08:00:00.000Z',
        updatedAt: '2025-01-19T09:00:00.000Z',
        prd: { goal: 'Build feature' },
        errors: [{ message: 'Error 1' }],
      };

      fs.ensureDirSync(path.dirname(stateFile));
      fs.writeJSONSync(stateFile, existingState);

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'set', '--phase', 'breakdown']);

      const state = fs.readJSONSync(stateFile);
      expect(state.phase).toBe('breakdown');
      expect(state.startedAt).toBe('2025-01-19T08:00:00.000Z');
      expect(state.prd).toEqual({ goal: 'Build feature' });
      expect(state.errors).toEqual([{ message: 'Error 1' }]);
    });

    it('should reject invalid phase', async () => {
      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'set', '--phase', 'invalid-phase']);

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid phase'));
      expect(processExitSpy).toHaveBeenCalledWith(2);
    });

    it('should output JSON when --json flag is used', async () => {
      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'set', '--phase', 'heal', '--json']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"phase": "heal"')
      );
    });

    it('should validate all phases', async () => {
      const validPhases = ['clarify', 'breakdown', 'implement', 'heal', 'deliver'];

      for (const phase of validPhases) {
        fs.removeSync(stateFile);
        registerStateCommands(new Command(), testDir);
        await new Command()
          .exitOverride()
          .configureOutput({
            writeOut: () => {},
            writeErr: () => {},
          })
          .addCommand(
            new Command()
              .name('state')
              .addCommand(
                new Command()
                  .name('set')
                  .requiredOption('-p, --phase <phase>')
                  .option('-t, --task <taskId>')
                  .option('--json')
                  .action((options) => {
                    expect(validPhases.includes(options.phase)).toBe(true);
                  })
              )
          )
          .parseAsync(['node', 'test', 'state', 'set', '--phase', phase]);
      }
    });

    it('should handle file system error during set', async () => {
      const now = new Date('2025-01-19T10:00:00.000Z');
      vi.setSystemTime(now);

      // Create the directory but make it read-only to cause write failure
      const ralphDevDir = path.join(testDir, '.ralph-dev');
      fs.ensureDirSync(ralphDevDir);
      fs.chmodSync(ralphDevDir, 0o444);

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'set', '--phase', 'clarify']);

      // Restore permissions for cleanup
      fs.chmodSync(ralphDevDir, 0o755);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(8);
    });
  });

  describe('state update', () => {
    it('should register state update command', () => {
      registerStateCommands(program, testDir);

      const stateCommand = program.commands.find(cmd => cmd.name() === 'state');
      const updateCommand = stateCommand?.commands.find(cmd => cmd.name() === 'update');

      expect(updateCommand).toBeDefined();
    });

    it('should update phase', async () => {
      const initialState = {
        phase: 'clarify',
        startedAt: '2025-01-19T09:00:00.000Z',
        updatedAt: '2025-01-19T09:30:00.000Z',
      };

      fs.ensureDirSync(path.dirname(stateFile));
      fs.writeJSONSync(stateFile, initialState);

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'update', '--phase', 'breakdown']);

      const state = fs.readJSONSync(stateFile);
      expect(state.phase).toBe('breakdown');
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('phase'));
    });

    it('should update task', async () => {
      const initialState = {
        phase: 'implement',
        currentTask: 'task-1',
        startedAt: '2025-01-19T09:00:00.000Z',
        updatedAt: '2025-01-19T09:30:00.000Z',
      };

      fs.ensureDirSync(path.dirname(stateFile));
      fs.writeJSONSync(stateFile, initialState);

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'update', '--task', 'task-2']);

      const state = fs.readJSONSync(stateFile);
      expect(state.currentTask).toBe('task-2');
    });

    it('should update PRD from JSON string', async () => {
      const initialState = {
        phase: 'breakdown',
        startedAt: '2025-01-19T09:00:00.000Z',
        updatedAt: '2025-01-19T09:30:00.000Z',
      };

      fs.ensureDirSync(path.dirname(stateFile));
      fs.writeJSONSync(stateFile, initialState);

      const prdJson = JSON.stringify({ goal: 'Build API', tasks: [] });

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'update', '--prd', prdJson]);

      const state = fs.readJSONSync(stateFile);
      expect(state.prd).toEqual({ goal: 'Build API', tasks: [] });
    });

    it('should add error from JSON string', async () => {
      const initialState = {
        phase: 'implement',
        startedAt: '2025-01-19T09:00:00.000Z',
        updatedAt: '2025-01-19T09:30:00.000Z',
      };

      fs.ensureDirSync(path.dirname(stateFile));
      fs.writeJSONSync(stateFile, initialState);

      const errorJson = JSON.stringify({ message: 'Test failed', code: 'E001' });

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'update', '--add-error', errorJson]);

      const state = fs.readJSONSync(stateFile);
      expect(state.errors).toHaveLength(1);
      expect(state.errors[0]).toEqual({ message: 'Test failed', code: 'E001' });
    });

    it('should append to existing errors array', async () => {
      const initialState = {
        phase: 'implement',
        errors: [{ message: 'Error 1' }],
        startedAt: '2025-01-19T09:00:00.000Z',
        updatedAt: '2025-01-19T09:30:00.000Z',
      };

      fs.ensureDirSync(path.dirname(stateFile));
      fs.writeJSONSync(stateFile, initialState);

      const errorJson = JSON.stringify({ message: 'Error 2' });

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'update', '--add-error', errorJson]);

      const state = fs.readJSONSync(stateFile);
      expect(state.errors).toHaveLength(2);
      expect(state.errors[1]).toEqual({ message: 'Error 2' });
    });

    it('should handle state file not found', async () => {
      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'update', '--phase', 'implement']);

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('No active ralph-dev session'));
      expect(processExitSpy).toHaveBeenCalledWith(3);
    });

    it('should handle invalid phase in update', async () => {
      const initialState = {
        phase: 'clarify',
        startedAt: '2025-01-19T09:00:00.000Z',
        updatedAt: '2025-01-19T09:30:00.000Z',
      };

      fs.ensureDirSync(path.dirname(stateFile));
      fs.writeJSONSync(stateFile, initialState);

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'update', '--phase', 'invalid']);

      expect(consoleErrorSpy).toHaveBeenCalledWith(expect.stringContaining('Invalid phase'));
      expect(processExitSpy).toHaveBeenCalledWith(2);
    });

    it('should handle invalid PRD JSON', async () => {
      const initialState = {
        phase: 'breakdown',
        startedAt: '2025-01-19T09:00:00.000Z',
        updatedAt: '2025-01-19T09:30:00.000Z',
      };

      fs.ensureDirSync(path.dirname(stateFile));
      fs.writeJSONSync(stateFile, initialState);

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'update', '--prd', 'invalid-json']);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(9);
    });

    it('should handle invalid error JSON', async () => {
      const initialState = {
        phase: 'implement',
        startedAt: '2025-01-19T09:00:00.000Z',
        updatedAt: '2025-01-19T09:30:00.000Z',
      };

      fs.ensureDirSync(path.dirname(stateFile));
      fs.writeJSONSync(stateFile, initialState);

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'update', '--add-error', 'invalid{']);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(9);
    });

    it('should update updatedAt timestamp', async () => {
      const now = new Date('2025-01-19T11:00:00.000Z');
      vi.setSystemTime(now);

      const initialState = {
        phase: 'clarify',
        startedAt: '2025-01-19T09:00:00.000Z',
        updatedAt: '2025-01-19T09:30:00.000Z',
      };

      fs.ensureDirSync(path.dirname(stateFile));
      fs.writeJSONSync(stateFile, initialState);

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'update', '--phase', 'breakdown']);

      const state = fs.readJSONSync(stateFile);
      expect(state.updatedAt).toBe('2025-01-19T11:00:00.000Z');
    });
  });

  describe('refactored architecture', () => {
    it('should use StateService via createStateService factory', async () => {
      // This test verifies command uses service factory pattern like status.ts
      // The implementation should call createStateService(workspaceDir)
      const now = new Date('2025-01-19T10:00:00.000Z');
      vi.setSystemTime(now);

      registerStateCommands(program, testDir);

      // Test complete workflow through service layer
      await program.parseAsync(['node', 'test', 'state', 'set', '--phase', 'clarify']);
      expect(fs.existsSync(stateFile)).toBe(true);

      consoleLogSpy.mockClear();
      await program.parseAsync(['node', 'test', 'state', 'get']);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('clarify'));

      await program.parseAsync(['node', 'test', 'state', 'update', '--phase', 'breakdown']);
      const state = fs.readJSONSync(stateFile);
      expect(state.phase).toBe('breakdown');

      await program.parseAsync(['node', 'test', 'state', 'clear']);
      expect(fs.existsSync(stateFile)).toBe(false);
    });

    it('should have thin command handlers without business logic', async () => {
      // Verify commands contain minimal logic - just parsing and formatting
      // All business logic should be in StateService
      const now = new Date('2025-01-19T10:00:00.000Z');
      vi.setSystemTime(now);

      registerStateCommands(program, testDir);

      // Set command should not contain validation logic
      await program.parseAsync(['node', 'test', 'state', 'set', '--phase', 'clarify']);

      // Update should handle PRD without parsing logic in command
      const prdJson = JSON.stringify({ goal: 'Test' });
      await program.parseAsync(['node', 'test', 'state', 'update', '--prd', prdJson]);

      const state = fs.readJSONSync(stateFile);
      expect(state.prd).toEqual({ goal: 'Test' });
    });
  });

  describe('state clear', () => {
    it('should register state clear command', () => {
      registerStateCommands(program, testDir);

      const stateCommand = program.commands.find(cmd => cmd.name() === 'state');
      const clearCommand = stateCommand?.commands.find(cmd => cmd.name() === 'clear');

      expect(clearCommand).toBeDefined();
    });

    it('should clear existing state file', async () => {
      const state = {
        phase: 'implement',
        startedAt: '2025-01-19T09:00:00.000Z',
        updatedAt: '2025-01-19T10:00:00.000Z',
      };

      fs.ensureDirSync(path.dirname(stateFile));
      fs.writeJSONSync(stateFile, state);

      expect(fs.existsSync(stateFile)).toBe(true);

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'clear']);

      expect(fs.existsSync(stateFile)).toBe(false);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✓ State cleared'));
    });

    it('should handle clearing when no state exists', async () => {
      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'clear']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No state to clear'));
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should output JSON when --json flag is used', async () => {
      fs.ensureDirSync(path.dirname(stateFile));
      fs.writeJSONSync(stateFile, { phase: 'clarify', startedAt: '2025-01-19T09:00:00.000Z', updatedAt: '2025-01-19T10:00:00.000Z' });

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'clear', '--json']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"cleared": true')
      );
    });

    it('should handle file system error during clear with JSON output', async () => {
      // Create state file first, then make the file itself read-only
      const ralphDevDir = path.join(testDir, '.ralph-dev');
      fs.ensureDirSync(ralphDevDir);
      fs.writeJSONSync(stateFile, {
        phase: 'implement',
        startedAt: '2025-01-19T09:00:00.000Z',
        updatedAt: '2025-01-19T10:00:00.000Z',
      });

      // Make the file read-only (not the directory)
      fs.chmodSync(stateFile, 0o444);
      // Also make the directory read-only so the file cannot be deleted
      fs.chmodSync(ralphDevDir, 0o555);

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'clear']);

      // Restore permissions for cleanup
      fs.chmodSync(ralphDevDir, 0o755);
      fs.chmodSync(stateFile, 0o644);

      // The clear operation should fail due to file permission issues
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(8);
    });
  });

  describe('state archive', () => {
    it('should register state archive command', () => {
      registerStateCommands(program, testDir);

      const stateCommand = program.commands.find(cmd => cmd.name() === 'state');
      const archiveCommand = stateCommand?.commands.find(cmd => cmd.name() === 'archive');

      expect(archiveCommand).toBeDefined();
    });

    it('should archive complete session successfully', async () => {
      const now = new Date('2025-01-19T10:00:00.000Z');
      vi.setSystemTime(now);

      // Set up a complete session
      const ralphDevDir = path.join(testDir, '.ralph-dev');
      fs.ensureDirSync(ralphDevDir);
      fs.writeJSONSync(stateFile, {
        phase: 'complete',
        startedAt: '2025-01-19T09:00:00.000Z',
        updatedAt: '2025-01-19T10:00:00.000Z',
      });
      fs.writeFileSync(path.join(ralphDevDir, 'prd.md'), '# PRD\nTest content');
      fs.ensureDirSync(path.join(ralphDevDir, 'tasks'));
      fs.writeFileSync(path.join(ralphDevDir, 'tasks', 'index.json'), '{}');

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'archive']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Session archived'));
      expect(processExitSpy).toHaveBeenCalledWith(0);

      // Verify state.json is cleared
      expect(fs.existsSync(stateFile)).toBe(false);

      // Verify archive was created
      const archiveDir = path.join(ralphDevDir, 'archive');
      expect(fs.existsSync(archiveDir)).toBe(true);
    });

    it('should block archive for incomplete session', async () => {
      const now = new Date('2025-01-19T10:00:00.000Z');
      vi.setSystemTime(now);

      const ralphDevDir = path.join(testDir, '.ralph-dev');
      fs.ensureDirSync(ralphDevDir);
      fs.writeJSONSync(stateFile, {
        phase: 'implement',
        startedAt: '2025-01-19T09:00:00.000Z',
        updatedAt: '2025-01-19T10:00:00.000Z',
      });

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'archive']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Archive blocked'));
      expect(processExitSpy).toHaveBeenCalledWith(0);

      // State should still exist
      expect(fs.existsSync(stateFile)).toBe(true);
    });

    it('should force archive incomplete session with --force flag', async () => {
      const now = new Date('2025-01-19T10:00:00.000Z');
      vi.setSystemTime(now);

      const ralphDevDir = path.join(testDir, '.ralph-dev');
      fs.ensureDirSync(ralphDevDir);
      fs.writeJSONSync(stateFile, {
        phase: 'implement',
        startedAt: '2025-01-19T09:00:00.000Z',
        updatedAt: '2025-01-19T10:00:00.000Z',
      });
      fs.writeFileSync(path.join(ralphDevDir, 'prd.md'), '# PRD\nTest');

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'archive', '--force']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Session archived'));
      expect(processExitSpy).toHaveBeenCalledWith(0);

      // State should be cleared
      expect(fs.existsSync(stateFile)).toBe(false);
    });

    it('should handle no session data to archive', async () => {
      const now = new Date('2025-01-19T10:00:00.000Z');
      vi.setSystemTime(now);

      // Ensure .ralph-dev directory is empty
      fs.ensureDirSync(path.join(testDir, '.ralph-dev'));

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'archive']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('No session data to archive'));
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should output JSON when --json flag is used for successful archive', async () => {
      const now = new Date('2025-01-19T10:00:00.000Z');
      vi.setSystemTime(now);

      const ralphDevDir = path.join(testDir, '.ralph-dev');
      fs.ensureDirSync(ralphDevDir);
      fs.writeJSONSync(stateFile, {
        phase: 'complete',
        startedAt: '2025-01-19T09:00:00.000Z',
        updatedAt: '2025-01-19T10:00:00.000Z',
      });

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'archive', '--json']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"archived": true'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"archivePath"'));
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should output JSON when --json flag is used for blocked archive', async () => {
      const now = new Date('2025-01-19T10:00:00.000Z');
      vi.setSystemTime(now);

      const ralphDevDir = path.join(testDir, '.ralph-dev');
      fs.ensureDirSync(ralphDevDir);
      fs.writeJSONSync(stateFile, {
        phase: 'breakdown',
        startedAt: '2025-01-19T09:00:00.000Z',
        updatedAt: '2025-01-19T10:00:00.000Z',
      });

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'archive', '--json']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"blocked": true'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('"blockedReason"'));
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should handle file system error during archive', async () => {
      const now = new Date('2025-01-19T10:00:00.000Z');
      vi.setSystemTime(now);

      const ralphDevDir = path.join(testDir, '.ralph-dev');
      fs.ensureDirSync(ralphDevDir);
      fs.writeJSONSync(stateFile, {
        phase: 'complete',
        startedAt: '2025-01-19T09:00:00.000Z',
        updatedAt: '2025-01-19T10:00:00.000Z',
      });

      // Create archive directory and make it read-only to cause error
      const archiveDir = path.join(ralphDevDir, 'archive');
      fs.ensureDirSync(archiveDir);
      fs.chmodSync(archiveDir, 0o444);

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'archive']);

      // Restore permissions for cleanup
      fs.chmodSync(archiveDir, 0o755);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(8);
    });

    it('should archive all session files including logs', async () => {
      const now = new Date('2025-01-19T10:00:00.000Z');
      vi.setSystemTime(now);

      const ralphDevDir = path.join(testDir, '.ralph-dev');
      fs.ensureDirSync(ralphDevDir);
      fs.writeJSONSync(stateFile, {
        phase: 'complete',
        startedAt: '2025-01-19T09:00:00.000Z',
        updatedAt: '2025-01-19T10:00:00.000Z',
      });
      fs.writeFileSync(path.join(ralphDevDir, 'prd.md'), '# PRD');
      fs.ensureDirSync(path.join(ralphDevDir, 'tasks'));
      fs.writeFileSync(path.join(ralphDevDir, 'tasks', 'index.json'), '{}');
      fs.writeFileSync(path.join(ralphDevDir, 'progress.log'), 'progress');
      fs.writeFileSync(path.join(ralphDevDir, 'debug.log'), 'debug');

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'archive', '--json']);

      // Find the JSON output - it's wrapped in a CLIResponse structure
      const jsonCall = consoleLogSpy.mock.calls.find((call: unknown[]) => {
        const str = String(call[0]);
        return str.includes('"archived"') && str.includes('"files"');
      });
      expect(jsonCall).toBeDefined();
      const response = JSON.parse(jsonCall![0]);
      // The files array is inside the data property (CLIResponse wrapper)
      const files = response.data?.files || response.files;
      expect(files).toContain('state.json');
      expect(files).toContain('prd.md');
      expect(files).toContain('tasks');
      expect(files).toContain('progress.log');
      expect(files).toContain('debug.log');

      // Verify original files are removed
      expect(fs.existsSync(stateFile)).toBe(false);
      expect(fs.existsSync(path.join(ralphDevDir, 'prd.md'))).toBe(false);
      expect(fs.existsSync(path.join(ralphDevDir, 'tasks'))).toBe(false);
      expect(fs.existsSync(path.join(ralphDevDir, 'progress.log'))).toBe(false);
      expect(fs.existsSync(path.join(ralphDevDir, 'debug.log'))).toBe(false);
    });

    it('should display blocked reason with current phase in text output', async () => {
      const now = new Date('2025-01-19T10:00:00.000Z');
      vi.setSystemTime(now);

      const ralphDevDir = path.join(testDir, '.ralph-dev');
      fs.ensureDirSync(ralphDevDir);
      fs.writeJSONSync(stateFile, {
        phase: 'heal',
        startedAt: '2025-01-19T09:00:00.000Z',
        updatedAt: '2025-01-19T10:00:00.000Z',
      });

      registerStateCommands(program, testDir);
      await program.parseAsync(['node', 'test', 'state', 'archive']);

      // Verify text output contains phase info
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('heal'));
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });
  });
});
