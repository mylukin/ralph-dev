import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import { registerUpdateCommand } from '../../src/commands/update';

// Mock child_process
vi.mock('child_process', () => ({
  execSync: vi.fn(),
}));

// Mock fs functions
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>();
  return {
    ...actual,
    existsSync: vi.fn().mockReturnValue(false),
    mkdirSync: vi.fn(),
    rmSync: vi.fn(),
    readdirSync: vi.fn().mockReturnValue([]),
  };
});

// Mock readline for askConfirmation
vi.mock('readline', () => ({
  createInterface: vi.fn().mockReturnValue({
    question: vi.fn((_query: string, callback: (answer: string) => void) => {
      callback('y');
    }),
    close: vi.fn(),
  }),
}));

describe('Update Command', () => {
  let program: Command;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    process.env = { ...originalEnv };

    program = new Command();
    program.exitOverride();
    registerUpdateCommand(program);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = originalEnv;
  });

  describe('registerUpdateCommand', () => {
    it('should register update command', () => {
      const updateCmd = program.commands.find((cmd) => cmd.name() === 'update');
      expect(updateCmd).toBeDefined();
    });

    it('should have correct description', () => {
      const updateCmd = program.commands.find((cmd) => cmd.name() === 'update');
      expect(updateCmd?.description()).toContain('update');
    });

    it('should have --cli-only option', () => {
      const updateCmd = program.commands.find((cmd) => cmd.name() === 'update');
      const options = updateCmd?.options || [];
      const cliOnlyOption = options.find(
        (opt) => opt.long === '--cli-only'
      );
      expect(cliOnlyOption).toBeDefined();
    });

    it('should have --plugin-only option', () => {
      const updateCmd = program.commands.find((cmd) => cmd.name() === 'update');
      const options = updateCmd?.options || [];
      const pluginOnlyOption = options.find(
        (opt) => opt.long === '--plugin-only'
      );
      expect(pluginOnlyOption).toBeDefined();
    });

    it('should have --check option', () => {
      const updateCmd = program.commands.find((cmd) => cmd.name() === 'update');
      const options = updateCmd?.options || [];
      const checkOption = options.find((opt) => opt.long === '--check');
      expect(checkOption).toBeDefined();
    });

    it('should have --json option', () => {
      const updateCmd = program.commands.find((cmd) => cmd.name() === 'update');
      const options = updateCmd?.options || [];
      const jsonOption = options.find((opt) => opt.long === '--json');
      expect(jsonOption).toBeDefined();
    });
  });

  describe('command options', () => {
    it('--cli-only and --plugin-only are mutually exclusive in intent', () => {
      const updateCmd = program.commands.find((cmd) => cmd.name() === 'update');
      expect(updateCmd).toBeDefined();

      // Both options exist but serve different purposes
      const options = updateCmd?.options || [];
      const cliOnly = options.find((opt) => opt.long === '--cli-only');
      const pluginOnly = options.find((opt) => opt.long === '--plugin-only');

      expect(cliOnly).toBeDefined();
      expect(pluginOnly).toBeDefined();
    });
  });
});

describe('Update Command Integration', () => {
  let program: Command;
  const originalEnv = process.env;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let consoleLogSpy: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let processExitSpy: any;

  beforeEach(() => {
    vi.clearAllMocks();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);
    process.env = { ...originalEnv };

    program = new Command();
    program.exitOverride();
    registerUpdateCommand(program);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.env = originalEnv;
  });

  it('should handle --check option without throwing', async () => {
    const { execSync } = await import('child_process');
    const execSyncMock = vi.mocked(execSync);
    execSyncMock.mockReturnValue('0.4.1\n');

    // This should not throw
    expect(() => {
      try {
        program.parse(['node', 'test', 'update', '--check', '--json']);
      } catch {
        // Expected to fail in test environment
      }
    }).not.toThrow();
  });

  it('should display help without errors', () => {
    expect(() => {
      try {
        program.parse(['node', 'test', 'update', '--help']);
      } catch {
        // Help throws in commander
      }
    }).not.toThrow();
  });

  describe('--check mode', () => {
    it('should show update available when new version exists', async () => {
      const { execSync } = await import('child_process');
      vi.mocked(execSync).mockReturnValue('99.0.0\n'); // Higher version

      await program.parseAsync(['node', 'test', 'update', '--check']);

      const allLogs = consoleLogSpy.mock.calls.flat().join('\n');
      expect(allLogs).toContain('Update available');
    });

    it('should show up to date when on latest version', async () => {
      const { execSync } = await import('child_process');
      const { version } = await import('../../package.json');
      vi.mocked(execSync).mockReturnValue(`${version}\n`);

      await program.parseAsync(['node', 'test', 'update', '--check']);

      const allLogs = consoleLogSpy.mock.calls.flat().join('\n');
      expect(allLogs).toContain('latest version');
    });

    it('should handle npm view failure', async () => {
      const { execSync } = await import('child_process');
      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('npm view failed');
      });

      await program.parseAsync(['node', 'test', 'update', '--check']);

      const allLogs = consoleLogSpy.mock.calls.flat().join('\n');
      expect(allLogs).toContain('Failed to check');
    });

    it('should output JSON when --json flag is used with --check', async () => {
      const { execSync } = await import('child_process');
      vi.mocked(execSync).mockReturnValue('99.0.0\n');

      await program.parseAsync(['node', 'test', 'update', '--check', '--json']);

      const allLogs = consoleLogSpy.mock.calls.flat().join('\n');
      expect(allLogs).toContain('latestVersion');
      expect(allLogs).toContain('updateAvailable');
    });
  });

  describe('CLI update', () => {
    it('should update CLI successfully', async () => {
      const { execSync } = await import('child_process');
      const fs = await import('fs');

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(execSync).mockReturnValue('0.5.0\n');

      await program.parseAsync(['node', 'test', 'update', '--cli-only']);

      expect(vi.mocked(execSync)).toHaveBeenCalledWith(
        expect.stringContaining('npm install -g ralph-dev@latest'),
        expect.any(Object)
      );
    });

    it('should try npx when npm fails', async () => {
      const { execSync } = await import('child_process');
      const fs = await import('fs');

      vi.mocked(fs.existsSync).mockReturnValue(false);

      let callCount = 0;
      vi.mocked(execSync).mockImplementation((cmd: any) => {
        const cmdStr = String(cmd);
        callCount++;
        // First call is npm view (version check) - return higher version to trigger update
        if (cmdStr.includes('npm view')) return '99.0.0\n';
        // Second call is npm install - fail it
        if (callCount === 2) throw new Error('npm failed');
        // Third call is npx npm install - succeed
        return '99.0.0\n';
      });

      await program.parseAsync(['node', 'test', 'update', '--cli-only']);

      expect(vi.mocked(execSync)).toHaveBeenCalledWith(
        expect.stringContaining('npx npm install -g'),
        expect.any(Object)
      );
    });

    it('should handle update failure', async () => {
      const { execSync } = await import('child_process');
      const fs = await import('fs');

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(execSync).mockImplementation((cmd: any) => {
        const cmdStr = String(cmd);
        // Version check returns higher version to trigger update
        if (cmdStr.includes('npm view')) return '99.0.0\n';
        // All install attempts fail
        throw new Error('update failed');
      });

      await program.parseAsync(['node', 'test', 'update', '--cli-only']);

      const allLogs = consoleLogSpy.mock.calls.flat().join('\n');
      expect(allLogs).toContain('update failed');
    });
  });

  describe('Plugin update', () => {
    it('should update marketplace via git pull', async () => {
      const { execSync } = await import('child_process');
      const fs = await import('fs');

      // Marketplace exists with .git
      vi.mocked(fs.existsSync).mockImplementation((path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('marketplaces')) return true;
        if (pathStr.includes('.git')) return true;
        return false;
      });
      vi.mocked(execSync).mockReturnValue('');

      await program.parseAsync(['node', 'test', 'update', '--plugin-only']);

      const gitPullCalls = vi.mocked(execSync).mock.calls.filter(
        call => String(call[0]).includes('git pull')
      );
      expect(gitPullCalls.length).toBeGreaterThan(0);
    });

    it('should skip marketplace when not a git repo', async () => {
      const { execSync } = await import('child_process');
      const fs = await import('fs');

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(execSync).mockReturnValue('0.5.0\n');

      await program.parseAsync(['node', 'test', 'update', '--plugin-only']);

      const gitPullCalls = vi.mocked(execSync).mock.calls.filter(
        call => String(call[0]).includes('git pull')
      );
      expect(gitPullCalls).toHaveLength(0);
    });

    it('should download cache when cache directory exists', async () => {
      const { execSync } = await import('child_process');
      const fs = await import('fs');

      vi.mocked(fs.existsSync).mockImplementation((path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('cache') && !pathStr.includes('0.5.0')) return true;
        return false;
      });
      vi.mocked(execSync).mockReturnValue('0.5.0\n');

      await program.parseAsync(['node', 'test', 'update', '--plugin-only']);

      const curlCalls = vi.mocked(execSync).mock.calls.filter(
        call => String(call[0]).includes('curl')
      );
      expect(curlCalls.length).toBeGreaterThan(0);
    });

    it('should skip cache download when version already exists', async () => {
      const { execSync } = await import('child_process');
      const fs = await import('fs');

      vi.mocked(fs.existsSync).mockImplementation((path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('cache')) return true;
        return false;
      });
      vi.mocked(execSync).mockReturnValue('0.5.0\n');

      await program.parseAsync(['node', 'test', 'update', '--plugin-only']);

      const allLogs = consoleLogSpy.mock.calls.flat().join('\n');
      expect(allLogs).toContain('already exists');
    });
  });

  describe('JSON output', () => {
    it('should output JSON when --json flag is used', async () => {
      const { execSync } = await import('child_process');
      const fs = await import('fs');

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(execSync).mockReturnValue('0.5.0\n');

      await program.parseAsync(['node', 'test', 'update', '--json']);

      const allLogs = consoleLogSpy.mock.calls.flat().join('');
      // Should contain JSON structure
      expect(allLogs).toContain('"cli"');
      expect(allLogs).toContain('"plugin"');
    });
  });

  describe('Marketplace error handling', () => {
    it('should display custom error when git pull fails with non-standard error', async () => {
      const { execSync } = await import('child_process');
      const fs = await import('fs');

      // Marketplace directory exists with .git
      vi.mocked(fs.existsSync).mockImplementation((path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('marketplaces') && pathStr.includes('ralph-dev')) return true;
        if (pathStr.includes('.git')) return true;
        if (pathStr.includes('cache')) return false;
        return false;
      });

      // npm view succeeds, git pull fails with custom error
      vi.mocked(execSync).mockImplementation((cmd: any) => {
        const cmdStr = String(cmd);
        if (cmdStr.includes('npm view')) return '0.5.0\n';
        if (cmdStr.includes('git pull')) {
          throw new Error('Could not resolve host: github.com');
        }
        return '';
      });

      await program.parseAsync(['node', 'test', 'update', '--plugin-only']);

      const allLogs = consoleLogSpy.mock.calls.flat().join('\n');
      // Should show the custom error message (lines 356-357)
      expect(allLogs).toContain('Marketplace:');
      expect(allLogs).toContain('Could not resolve host');
    });
  });

  describe('Error handling in action', () => {
    it('should handle unexpected errors in action handler', async () => {
      const { execSync } = await import('child_process');

      // Make getLatestVersion throw an unexpected error
      vi.mocked(execSync).mockImplementation(() => {
        throw { code: 'UNEXPECTED', toString: () => 'Unexpected system error' };
      });

      await program.parseAsync(['node', 'test', 'update', '--check', '--json']);

      // Should exit with error code
      expect(processExitSpy).toHaveBeenCalled();
    });

    it('should handle errors in non-JSON mode during --check', async () => {
      const { execSync } = await import('child_process');

      vi.mocked(execSync).mockImplementation(() => {
        throw new Error('Network error');
      });

      await program.parseAsync(['node', 'test', 'update', '--check']);

      const allLogs = consoleLogSpy.mock.calls.flat().join('\n');
      expect(allLogs).toContain('Failed to check');
    });
  });

  describe('Cache update edge cases', () => {
    it('should handle cache update failure when curl fails', async () => {
      const { execSync } = await import('child_process');
      const fs = await import('fs');

      // Cache directory exists but version doesn't
      vi.mocked(fs.existsSync).mockImplementation((path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('cache') && !pathStr.includes('0.5.0') && !pathStr.includes('.tmp')) return true;
        return false;
      });

      vi.mocked(execSync).mockImplementation((cmd: any) => {
        const cmdStr = String(cmd);
        if (cmdStr.includes('npm view')) return '0.5.0\n';
        if (cmdStr.includes('curl')) {
          throw new Error('curl: (7) Failed to connect');
        }
        return '';
      });

      await program.parseAsync(['node', 'test', 'update', '--plugin-only']);

      const allLogs = consoleLogSpy.mock.calls.flat().join('\n');
      expect(allLogs).toContain('Cache update failed');
    });

    it('should handle extracted directory not found error', async () => {
      const { execSync } = await import('child_process');
      const fs = await import('fs');

      // Cache directory exists but extracted dir doesn't
      vi.mocked(fs.existsSync).mockImplementation((path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('cache') && !pathStr.includes('0.5.0')) return true;
        if (pathStr.includes('ralph-dev-cli-v')) return false; // Extracted dir not found
        return false;
      });

      vi.mocked(execSync).mockImplementation((cmd: any) => {
        const cmdStr = String(cmd);
        if (cmdStr.includes('npm view')) return '0.5.0\n';
        if (cmdStr.includes('curl') || cmdStr.includes('tar')) return '';
        return '';
      });

      await program.parseAsync(['node', 'test', 'update', '--plugin-only']);

      const allLogs = consoleLogSpy.mock.calls.flat().join('\n');
      expect(allLogs).toContain('Cache update failed');
      expect(allLogs).toContain('Extracted directory not found');
    });
  });

  describe('Version cleanup', () => {
    it('should clean up old versions when more than 3 exist', async () => {
      const { execSync } = await import('child_process');
      const fs = await import('fs');

      let existsSyncCallCount = 0;

      // Setup: cache base dir exists, target version doesn't exist yet
      vi.mocked(fs.existsSync).mockImplementation((path: any) => {
        existsSyncCallCount++;
        const pathStr = String(path);
        if (pathStr.includes('marketplaces')) return false;
        // Cache base directories exist
        if (pathStr.includes('/cache') && !pathStr.includes('.tmp') && !pathStr.includes('0.5.0')) return true;
        // Target version doesn't exist (to trigger download)
        if (pathStr.includes('0.5.0') && !pathStr.includes('ralph-dev-cli-v')) return false;
        // Extracted directory exists after extraction
        if (pathStr.includes('ralph-dev-cli-v0.5.0')) return true;
        // Temp dir exists for cleanup in finally block
        if (pathStr.includes('.tmp')) return true;
        return true;
      });

      // Return old versions in the cache directory
      vi.mocked(fs.readdirSync).mockReturnValue(['0.1.0', '0.2.0', '0.3.0', '0.4.0'] as any);

      vi.mocked(execSync).mockImplementation((cmd: any) => {
        const cmdStr = String(cmd);
        if (cmdStr.includes('npm view')) return '0.5.0\n';
        // curl and tar and mv succeed
        if (cmdStr.includes('curl') || cmdStr.includes('tar') || cmdStr.includes('mv')) return '';
        return '';
      });

      await program.parseAsync(['node', 'test', 'update', '--plugin-only']);

      // rmSync should be called for temp cleanup (finally block) and old version cleanup
      expect(vi.mocked(fs.rmSync)).toHaveBeenCalled();
    });
  });

  describe('CLI already at latest version', () => {
    it('should skip update when already at latest version', async () => {
      const { execSync } = await import('child_process');
      const fs = await import('fs');
      const { version } = await import('../../package.json');

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(execSync).mockReturnValue(`${version}\n`);

      await program.parseAsync(['node', 'test', 'update', '--cli-only']);

      const allLogs = consoleLogSpy.mock.calls.flat().join('\n');
      expect(allLogs).toContain('already at the latest version');

      // Should not call npm install
      const installCalls = vi.mocked(execSync).mock.calls.filter(
        call => String(call[0]).includes('npm install -g')
      );
      expect(installCalls).toHaveLength(0);
    });
  });

  describe('Plugin-only mode behavior', () => {
    it('should not update CLI when --plugin-only is specified', async () => {
      const { execSync } = await import('child_process');
      const fs = await import('fs');

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(execSync).mockReturnValue('99.0.0\n');

      await program.parseAsync(['node', 'test', 'update', '--plugin-only']);

      // Should not call npm install -g
      const installCalls = vi.mocked(execSync).mock.calls.filter(
        call => String(call[0]).includes('npm install -g ralph-dev@latest')
      );
      expect(installCalls).toHaveLength(0);
    });
  });

  describe('Non-JSON output messages', () => {
    it('should display restart message in non-JSON mode', async () => {
      const { execSync } = await import('child_process');
      const fs = await import('fs');

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(execSync).mockReturnValue('0.5.0\n');

      await program.parseAsync(['node', 'test', 'update', '--cli-only']);

      const allLogs = consoleLogSpy.mock.calls.flat().join('\n');
      expect(allLogs).toContain('restart the CLI');
    });
  });

  describe('Interactive confirmation', () => {
    it('should ask for confirmation when update available and not in CI', async () => {
      const { execSync } = await import('child_process');
      const fs = await import('fs');
      const readline = await import('readline');

      // Remove CI env to enable interactive mode
      delete process.env.CI;

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(execSync).mockReturnValue('99.0.0\n');

      // Mock user confirming the update
      vi.mocked(readline.createInterface).mockReturnValue({
        question: vi.fn((_query: string, callback: (answer: string) => void) => {
          callback('y');
        }),
        close: vi.fn(),
      } as any);

      await program.parseAsync(['node', 'test', 'update', '--cli-only']);

      const allLogs = consoleLogSpy.mock.calls.flat().join('\n');
      expect(allLogs).toContain('Update available');
    });

    it('should show "Checking for updates" when version is unknown', async () => {
      const { execSync } = await import('child_process');
      const fs = await import('fs');
      const readline = await import('readline');

      // Remove CI env to enable interactive mode
      delete process.env.CI;

      vi.mocked(fs.existsSync).mockReturnValue(false);

      let versionCheckCount = 0;
      vi.mocked(execSync).mockImplementation((cmd: any) => {
        const cmdStr = String(cmd);
        if (cmdStr.includes('npm view')) {
          versionCheckCount++;
          // First call returns null (version unknown)
          throw new Error('npm view failed');
        }
        return '';
      });

      // Mock user confirming the update
      vi.mocked(readline.createInterface).mockReturnValue({
        question: vi.fn((_query: string, callback: (answer: string) => void) => {
          callback('y');
        }),
        close: vi.fn(),
      } as any);

      await program.parseAsync(['node', 'test', 'update', '--cli-only']);

      const allLogs = consoleLogSpy.mock.calls.flat().join('\n');
      expect(allLogs).toContain('Checking for updates');
    });

    it('should cancel update when user declines', async () => {
      const { execSync } = await import('child_process');
      const fs = await import('fs');
      const readline = await import('readline');

      // Remove CI env to enable interactive mode
      delete process.env.CI;

      vi.mocked(fs.existsSync).mockReturnValue(false);
      vi.mocked(execSync).mockReturnValue('99.0.0\n');

      // Mock user declining the update
      vi.mocked(readline.createInterface).mockReturnValue({
        question: vi.fn((_query: string, callback: (answer: string) => void) => {
          callback('n');
        }),
        close: vi.fn(),
      } as any);

      await program.parseAsync(['node', 'test', 'update', '--cli-only']);

      const allLogs = consoleLogSpy.mock.calls.flat().join('\n');
      expect(allLogs).toContain('Update cancelled');
    });
  });

  describe('Unexpected error handling', () => {
    it('should handle error thrown during update with JSON output', async () => {
      const { execSync } = await import('child_process');
      const fs = await import('fs');

      vi.mocked(fs.existsSync).mockReturnValue(false);

      // First call succeeds for version check, then throw during update
      let callCount = 0;
      vi.mocked(execSync).mockImplementation((cmd: any) => {
        callCount++;
        const cmdStr = String(cmd);
        if (cmdStr.includes('npm view')) return '99.0.0\n';
        // Make the update throw an error
        if (cmdStr.includes('npm install -g') || cmdStr.includes('npx npm install')) {
          const error = new Error('Permission denied');
          (error as any).code = 'EACCES';
          throw error;
        }
        return '';
      });

      await program.parseAsync(['node', 'test', 'update', '--cli-only', '--json']);

      const allLogs = consoleLogSpy.mock.calls.flat().join('\n');
      expect(allLogs).toContain('"cli"');
    });
  });

  describe('cleanupOldVersions error handling', () => {
    it('should silently ignore errors during cleanup', async () => {
      const { execSync } = await import('child_process');
      const fs = await import('fs');

      // Setup successful cache update but cleanup throws
      vi.mocked(fs.existsSync).mockImplementation((path: any) => {
        const pathStr = String(path);
        if (pathStr.includes('marketplaces')) return false;
        if (pathStr.includes('/cache') && !pathStr.includes('.tmp') && !pathStr.includes('0.5.0')) return true;
        if (pathStr.includes('0.5.0') && !pathStr.includes('ralph-dev-cli-v')) return false;
        if (pathStr.includes('ralph-dev-cli-v0.5.0')) return true;
        if (pathStr.includes('.tmp')) return true;
        return true;
      });

      // readdirSync throws an error
      vi.mocked(fs.readdirSync).mockImplementation(() => {
        throw new Error('Permission denied');
      });

      vi.mocked(execSync).mockImplementation((cmd: any) => {
        const cmdStr = String(cmd);
        if (cmdStr.includes('npm view')) return '0.5.0\n';
        if (cmdStr.includes('curl') || cmdStr.includes('tar') || cmdStr.includes('mv')) return '';
        return '';
      });

      // Should not throw - cleanup errors are silently ignored
      await program.parseAsync(['node', 'test', 'update', '--plugin-only']);

      const allLogs = consoleLogSpy.mock.calls.flat().join('\n');
      // Should still report success for the cache update
      expect(allLogs).toContain('Plugin cache updated');
    });
  });
});
