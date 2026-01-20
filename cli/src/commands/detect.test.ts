import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Command } from 'commander';
import { registerDetectCommand } from './detect';
import { LanguageDetector } from '../language/detector';
import { IndexManager } from '../core/index-manager';
import * as fs from 'fs-extra';
import * as path from 'path';

// Mock modules
vi.mock('../language/detector');
vi.mock('../core/index-manager');

describe('detect command', () => {
  let program: Command;
  let consoleLogSpy: any;
  let consoleErrorSpy: any;
  let processExitSpy: any;
  const testDir = path.join(__dirname, '__test-detect-command__');

  beforeEach(() => {
    program = new Command();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    processExitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);

    fs.ensureDirSync(testDir);
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
    vi.clearAllMocks();
    fs.removeSync(testDir);
  });

  describe('command registration', () => {
    it('should register detect command', () => {
      registerDetectCommand(program, testDir);

      const detectCommand = program.commands.find(cmd => cmd.name() === 'detect');
      expect(detectCommand).toBeDefined();
    });

    it('should have correct description', () => {
      registerDetectCommand(program, testDir);

      const detectCommand = program.commands.find(cmd => cmd.name() === 'detect');
      expect(detectCommand?.description()).toBe('Detect project language and configuration');
    });

    it('should have --json option', () => {
      registerDetectCommand(program, testDir);

      const detectCommand = program.commands.find(cmd => cmd.name() === 'detect');
      const options = detectCommand?.options;
      const jsonOption = options?.find(opt => opt.flags === '--json');

      expect(jsonOption).toBeDefined();
      expect(jsonOption?.description).toBe('Output as JSON');
    });

    it('should have --save option', () => {
      registerDetectCommand(program, testDir);

      const detectCommand = program.commands.find(cmd => cmd.name() === 'detect');
      const options = detectCommand?.options;
      const saveOption = options?.find(opt => opt.flags === '--save');

      expect(saveOption).toBeDefined();
      expect(saveOption?.description).toBe('Save to index metadata');
    });
  });

  describe('command execution', () => {
    it('should detect language and output human-readable format', async () => {
      const mockLanguageConfig = {
        language: 'typescript',
        framework: 'node',
        testFramework: 'vitest',
        buildTool: 'npm',
        verifyCommands: ['npm test', 'npm run build'],
      };

      vi.mocked(LanguageDetector.detect).mockReturnValue(mockLanguageConfig);

      registerDetectCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'detect']);

      expect(LanguageDetector.detect).toHaveBeenCalledWith(testDir);
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Project Configuration:'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('typescript'));
      expect(processExitSpy).toHaveBeenCalledWith(0);
    });

    it('should output JSON format when --json flag is used', async () => {
      const mockLanguageConfig = {
        language: 'typescript',
        framework: 'node',
        testFramework: 'vitest',
        buildTool: 'npm',
        verifyCommands: ['npm test'],
      };

      vi.mocked(LanguageDetector.detect).mockReturnValue(mockLanguageConfig);

      registerDetectCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'detect', '--json']);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"success": true')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"language": "typescript"')
      );
    });

    it('should save language config when --save flag is used', async () => {
      const mockLanguageConfig = {
        language: 'typescript',
        framework: 'node',
        testFramework: 'vitest',
        buildTool: 'npm',
        verifyCommands: ['npm test'],
      };

      const mockUpdateMetadata = vi.fn();
      vi.mocked(LanguageDetector.detect).mockReturnValue(mockLanguageConfig);
      vi.mocked(IndexManager).mockImplementation(() => ({
        updateMetadata: mockUpdateMetadata,
      } as any));

      registerDetectCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'detect', '--save']);

      expect(mockUpdateMetadata).toHaveBeenCalledWith({ languageConfig: mockLanguageConfig });
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('✓ Saved to index metadata'));
    });

    it('should save and output JSON when both flags are used', async () => {
      const mockLanguageConfig = {
        language: 'python',
        framework: 'django',
        testFramework: 'pytest',
        buildTool: 'pip',
        verifyCommands: ['pytest'],
      };

      const mockUpdateMetadata = vi.fn();
      vi.mocked(LanguageDetector.detect).mockReturnValue(mockLanguageConfig);
      vi.mocked(IndexManager).mockImplementation(() => ({
        updateMetadata: mockUpdateMetadata,
      } as any));

      registerDetectCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'detect', '--json', '--save']);

      expect(mockUpdateMetadata).toHaveBeenCalledWith({ languageConfig: mockLanguageConfig });
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('"saved": true')
      );
    });

    it('should display framework when present', async () => {
      const mockLanguageConfig = {
        language: 'javascript',
        framework: 'react',
        testFramework: 'jest',
        buildTool: 'webpack',
        verifyCommands: [],
      };

      vi.mocked(LanguageDetector.detect).mockReturnValue(mockLanguageConfig);

      registerDetectCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'detect']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Framework:'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('react'));
    });

    it('should display test framework when present', async () => {
      const mockLanguageConfig = {
        language: 'javascript',
        framework: undefined,
        testFramework: 'jest',
        buildTool: 'npm',
        verifyCommands: [],
      };

      vi.mocked(LanguageDetector.detect).mockReturnValue(mockLanguageConfig);

      registerDetectCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'detect']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Test Framework:'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('jest'));
    });

    it('should display build tool when present', async () => {
      const mockLanguageConfig = {
        language: 'java',
        framework: undefined,
        testFramework: 'junit',
        buildTool: 'maven',
        verifyCommands: [],
      };

      vi.mocked(LanguageDetector.detect).mockReturnValue(mockLanguageConfig);

      registerDetectCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'detect']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Build Tool:'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('maven'));
    });

    it('should display verification commands when present', async () => {
      const mockLanguageConfig = {
        language: 'go',
        framework: undefined,
        testFramework: 'testing',
        buildTool: 'go',
        verifyCommands: ['go test ./...', 'go build'],
      };

      vi.mocked(LanguageDetector.detect).mockReturnValue(mockLanguageConfig);

      registerDetectCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'detect']);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Verification Commands:'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('go test ./...'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('go build'));
    });

    it('should handle detection error', async () => {
      vi.mocked(LanguageDetector.detect).mockImplementation(() => {
        throw new Error('Detection failed');
      });

      registerDetectCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'detect']);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(8); // FILE_SYSTEM_ERROR
    });

    it('should handle save error gracefully', async () => {
      const mockLanguageConfig = {
        language: 'typescript',
        framework: 'node',
        testFramework: 'vitest',
        buildTool: 'npm',
        verifyCommands: [],
      };

      vi.mocked(LanguageDetector.detect).mockReturnValue(mockLanguageConfig);
      vi.mocked(IndexManager).mockImplementation(() => {
        throw new Error('Failed to save');
      });

      registerDetectCommand(program, testDir);
      await program.parseAsync(['node', 'test', 'detect', '--save']);

      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(processExitSpy).toHaveBeenCalledWith(8); // FILE_SYSTEM_ERROR
    });
  });
});
