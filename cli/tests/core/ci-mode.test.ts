import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CIConfigLoader, CIModeManager, CIConfig, printCIBanner, printCIReport } from '../../src/core/ci-mode';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('CIConfigLoader', () => {
  const testDir = path.join(__dirname, '../../test-fixtures/ci-config');
  const configPath = path.join(testDir, '.ralph-dev', 'ci-config.yml');

  beforeEach(() => {
    fs.ensureDirSync(path.dirname(configPath));
    // Clear environment variables
    delete process.env.RALPH_DEV_CI_MODE;
    delete process.env.RALPH_DEV_AUTO_APPROVE;
    delete process.env.SLACK_WEBHOOK_URL;
    delete process.env.GIT_AUTHOR_NAME;
    delete process.env.GIT_AUTHOR_EMAIL;
  });

  afterEach(() => {
    fs.removeSync(testDir);
  });

  describe('load', () => {
    it('should load config from file', () => {
      const configContent = `ci_mode:
  enabled: true
  auto_approve_breakdown: true
  clarify_answers:
    project_type: "Web app"
    tech_stack: "TypeScript"
  limits:
    max_tasks: 100
    max_total_time: "2h"
  notifications:
    slack_webhook: "https://hooks.slack.com/test"
    on_success: true
    on_failure: true`;

      fs.writeFileSync(configPath, configContent, 'utf-8');

      const config = CIConfigLoader.load(testDir);

      expect(config.enabled).toBe(true);
      expect(config.auto_approve_breakdown).toBe(true);
      expect(config.clarify_answers?.project_type).toBe('Web app');
      expect(config.limits?.max_tasks).toBe(100);
      expect(config.notifications?.slack_webhook).toBe('https://hooks.slack.com/test');
    });

    it('should return default config when no file exists', () => {
      const config = CIConfigLoader.load(testDir);

      expect(config.enabled).toBe(false);
      expect(config.auto_approve_breakdown).toBe(false);
    });

    it('should override with environment variables', () => {
      process.env.RALPH_DEV_CI_MODE = 'true';
      process.env.RALPH_DEV_AUTO_APPROVE = 'true';
      process.env.SLACK_WEBHOOK_URL = 'https://hooks.slack.com/env';

      const config = CIConfigLoader.load(testDir);

      expect(config.enabled).toBe(true);
      expect(config.auto_approve_breakdown).toBe(true);
      expect(config.notifications?.slack_webhook).toBe('https://hooks.slack.com/env');
    });

    it('should merge file and environment config', () => {
      const configContent = `ci_mode:
  enabled: false
  limits:
    max_tasks: 50`;

      fs.writeFileSync(configPath, configContent, 'utf-8');
      process.env.RALPH_DEV_CI_MODE = 'true';

      const config = CIConfigLoader.load(testDir);

      expect(config.enabled).toBe(true); // Override from env
      expect(config.limits?.max_tasks).toBe(50); // From file
    });

    it('should handle git author/email from env', () => {
      process.env.GIT_AUTHOR_NAME = 'CI Bot';
      process.env.GIT_AUTHOR_EMAIL = '[email protected]';

      const config = CIConfigLoader.load(testDir);

      expect(config.git?.author).toBe('CI Bot <[email protected]>');
    });

    it('should handle invalid YAML gracefully', () => {
      fs.writeFileSync(configPath, 'invalid: yaml: content:', 'utf-8');

      // Should not throw, just use defaults
      const config = CIConfigLoader.load(testDir);
      expect(config.enabled).toBe(false);
    });
  });

  describe('validate', () => {
    it('should validate valid config', () => {
      const config: CIConfig = {
        enabled: true,
        auto_approve_breakdown: true,
        clarify_answers: {
          project_type: 'Web app',
        },
        limits: {
          max_tasks: 100,
        },
      };

      const result = CIConfigLoader.validate(config);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing clarify_answers', () => {
      const config: CIConfig = {
        enabled: true,
        auto_approve_breakdown: true,
      };

      const result = CIConfigLoader.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('clarify_answers');
    });

    it('should detect invalid max_tasks', () => {
      const config: CIConfig = {
        enabled: true,
        auto_approve_breakdown: true,
        clarify_answers: { type: 'test' },
        limits: {
          max_tasks: 0,
        },
      };

      const result = CIConfigLoader.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('max_tasks');
    });
  });

  describe('createTemplate', () => {
    it('should create template file', () => {
      CIConfigLoader.createTemplate(testDir);

      expect(fs.existsSync(configPath)).toBe(true);

      const content = fs.readFileSync(configPath, 'utf-8');
      expect(content).toContain('ci_mode:');
      expect(content).toContain('enabled: true');
      expect(content).toContain('clarify_answers:');
    });
  });
});

describe('CIModeManager', () => {
  const testDir = path.join(__dirname, '../../test-fixtures/ci-manager');

  beforeEach(() => {
    fs.ensureDirSync(testDir);
  });

  afterEach(() => {
    fs.removeSync(testDir);
  });

  describe('constructor', () => {
    it('should initialize with config', () => {
      const config: CIConfig = {
        enabled: true,
        auto_approve_breakdown: true,
        limits: {
          max_total_time: '30m',
        },
      };

      const manager = new CIModeManager(testDir, config);

      expect(manager.isEnabled()).toBe(true);
      expect(manager.shouldAutoApproveBreakdown()).toBe(true);
    });

    it('should parse timeout correctly', () => {
      const config: CIConfig = {
        enabled: true,
        auto_approve_breakdown: false,
        limits: {
          max_total_time: '5s',
        },
      };

      const manager = new CIModeManager(testDir, config);
      const timeout = manager.checkTimeout();

      expect(timeout.remaining).toBeGreaterThan(0);
      expect(timeout.remaining).toBeLessThanOrEqual(5);
    });
  });

  describe('getClarifyAnswers', () => {
    it('should return clarify answers filtering undefined', () => {
      const config: CIConfig = {
        enabled: true,
        auto_approve_breakdown: true,
        clarify_answers: {
          project_type: 'Web app',
          tech_stack: undefined,
          scale: 'Production',
        },
      };

      const manager = new CIModeManager(testDir, config);
      const answers = manager.getClarifyAnswers();

      expect(answers).toEqual({
        project_type: 'Web app',
        scale: 'Production',
      });
    });

    it('should return undefined when no answers', () => {
      const config: CIConfig = {
        enabled: true,
        auto_approve_breakdown: true,
      };

      const manager = new CIModeManager(testDir, config);
      const answers = manager.getClarifyAnswers();

      expect(answers).toBeUndefined();
    });
  });

  describe('checkTimeout', () => {
    it('should check if timeout exceeded', async () => {
      const config: CIConfig = {
        enabled: true,
        auto_approve_breakdown: true,
        limits: {
          max_total_time: '1s', // Use supported format (s, m, h)
        },
      };

      const manager = new CIModeManager(testDir, config);

      // Initially not exceeded
      let check = manager.checkTimeout();
      expect(check.exceeded).toBe(false);

      // Wait for timeout
      await new Promise(resolve => setTimeout(resolve, 1100));

      check = manager.checkTimeout();
      expect(check.exceeded).toBe(true);
    });
  });

  describe('checkResourceQuota', () => {
    it('should check tasks quota', () => {
      const config: CIConfig = {
        enabled: true,
        auto_approve_breakdown: true,
        limits: {
          max_tasks: 10,
        },
      };

      const manager = new CIModeManager(testDir, config);

      // Initially not exceeded
      let check = manager.checkResourceQuota('tasks');
      expect(check.exceeded).toBe(false);
      expect(check.current).toBe(0);
      expect(check.limit).toBe(10);

      // Record usage
      manager.recordResourceUsage('tasks', 5);
      check = manager.checkResourceQuota('tasks');
      expect(check.current).toBe(5);

      // Exceed quota
      manager.recordResourceUsage('tasks', 6);
      check = manager.checkResourceQuota('tasks');
      expect(check.exceeded).toBe(true);
      expect(check.current).toBe(11);
    });

    it('should check healing quota', () => {
      const config: CIConfig = {
        enabled: true,
        auto_approve_breakdown: true,
        limits: {
          max_healing_attempts_per_session: 5,
        },
      };

      const manager = new CIModeManager(testDir, config);

      manager.recordResourceUsage('healing', 3);
      let check = manager.checkResourceQuota('healing');
      expect(check.current).toBe(3);
      expect(check.exceeded).toBe(false);

      manager.recordResourceUsage('healing', 3);
      check = manager.checkResourceQuota('healing');
      expect(check.exceeded).toBe(true);
    });
  });

  describe('getFinalReport', () => {
    it('should generate final report', () => {
      const config: CIConfig = {
        enabled: true,
        auto_approve_breakdown: true,
        limits: {
          max_tasks: 100,
        },
      };

      const manager = new CIModeManager(testDir, config);
      manager.recordResourceUsage('tasks', 50);
      manager.recordResourceUsage('healing', 5);

      const report = manager.getFinalReport();

      expect(report.success).toBe(true);
      expect(report.resourcesUsed.tasksCreated).toBe(50);
      expect(report.resourcesUsed.healingAttempts).toBe(5);
      expect(report.config.autoApprove).toBe(true);
      expect(report.config.limits?.max_tasks).toBe(100);
    });
  });

  describe('configureGit', () => {
    it('should configure git from config', () => {
      const config: CIConfig = {
        enabled: true,
        auto_approve_breakdown: true,
        git: {
          author: 'CI Bot <[email protected]>',
          committer: 'CI System <[email protected]>',
        },
      };

      const manager = new CIModeManager(testDir, config);
      manager.configureGit();

      expect(process.env.GIT_AUTHOR_NAME).toBe('CI Bot');
      expect(process.env.GIT_AUTHOR_EMAIL).toBe('[email protected]');
      expect(process.env.GIT_COMMITTER_NAME).toBe('CI System');
      expect(process.env.GIT_COMMITTER_EMAIL).toBe('[email protected]');

      // Cleanup
      delete process.env.GIT_AUTHOR_NAME;
      delete process.env.GIT_AUTHOR_EMAIL;
      delete process.env.GIT_COMMITTER_NAME;
      delete process.env.GIT_COMMITTER_EMAIL;
    });

    it('should handle missing git config', () => {
      const config: CIConfig = {
        enabled: true,
        auto_approve_breakdown: true,
      };

      const manager = new CIModeManager(testDir, config);

      // Should not throw
      expect(() => manager.configureGit()).not.toThrow();
    });
  });
});

describe('printCIBanner', () => {
  it('should print banner without errors', () => {
    const config: CIConfig = {
      enabled: true,
      auto_approve_breakdown: true,
      limits: {
        max_tasks: 100,
        max_total_time: '2h',
      },
      notifications: {
        slack_webhook: 'https://test.com',
      },
    };

    // Should not throw
    expect(() => printCIBanner(config)).not.toThrow();
  });
});

describe('printCIReport', () => {
  it('should print report without errors', () => {
    const report = {
      success: true,
      duration: 3600,
      resourcesUsed: {
        tasksCreated: 50,
        healingAttempts: 5,
      },
      notificationsSent: 2,
      config: {
        autoApprove: true,
        limits: {
          max_tasks: 100,
        },
      },
    };

    // Should not throw
    expect(() => printCIReport(report)).not.toThrow();
  });

  it('should print failure report', () => {
    const report = {
      success: false,
      duration: 120,
      resourcesUsed: {
        tasksCreated: 10,
        healingAttempts: 15,
      },
      notificationsSent: 5,
      config: {
        autoApprove: false,
        limits: undefined,
      },
    };

    expect(() => printCIReport(report)).not.toThrow();
  });
});

describe('CIModeManager - Notifications', () => {
  const testDir = path.join(__dirname, '../../test-fixtures/ci-notifications');
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fs.ensureDirSync(testDir);
    fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
    } as Response);
  });

  afterEach(() => {
    fs.removeSync(testDir);
    vi.restoreAllMocks();
  });

  it('should send slack notification on success event', async () => {
    const config: CIConfig = {
      enabled: true,
      auto_approve_breakdown: true,
      notifications: {
        slack_webhook: 'https://hooks.slack.com/test',
        on_success: true,
      },
    };

    const manager = new CIModeManager(testDir, config);
    await manager.sendNotification('success', { task: 'test-task' });

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://hooks.slack.com/test',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('should send slack notification on failure event', async () => {
    const config: CIConfig = {
      enabled: true,
      auto_approve_breakdown: true,
      notifications: {
        slack_webhook: 'https://hooks.slack.com/test',
        on_failure: true,
      },
    };

    const manager = new CIModeManager(testDir, config);
    await manager.sendNotification('failure', { error: 'test-error' });

    expect(fetchSpy).toHaveBeenCalled();
    const callBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(callBody.attachments[0].color).toBe('danger');
  });

  it('should send slack notification on healing event', async () => {
    const config: CIConfig = {
      enabled: true,
      auto_approve_breakdown: true,
      notifications: {
        slack_webhook: 'https://hooks.slack.com/test',
        on_healing: true,
      },
    };

    const manager = new CIModeManager(testDir, config);
    await manager.sendNotification('healing', { attempt: 1 });

    expect(fetchSpy).toHaveBeenCalled();
    const callBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(callBody.attachments[0].color).toBe('warning');
  });

  it('should send webhook notification', async () => {
    const config: CIConfig = {
      enabled: true,
      auto_approve_breakdown: true,
      notifications: {
        webhook_url: 'https://example.com/webhook',
        on_success: true,
      },
    };

    const manager = new CIModeManager(testDir, config);
    await manager.sendNotification('success', { result: 'ok' });

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://example.com/webhook',
      expect.objectContaining({
        method: 'POST',
      })
    );
    const callBody = JSON.parse(fetchSpy.mock.calls[0][1]?.body as string);
    expect(callBody.event).toBe('success');
    expect(callBody.data.result).toBe('ok');
  });

  it('should send both slack and webhook notifications', async () => {
    const config: CIConfig = {
      enabled: true,
      auto_approve_breakdown: true,
      notifications: {
        slack_webhook: 'https://hooks.slack.com/test',
        webhook_url: 'https://example.com/webhook',
        on_success: true,
      },
    };

    const manager = new CIModeManager(testDir, config);
    await manager.sendNotification('success', { task: 'done' });

    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('should skip notification when event type not enabled', async () => {
    const config: CIConfig = {
      enabled: true,
      auto_approve_breakdown: true,
      notifications: {
        slack_webhook: 'https://hooks.slack.com/test',
        on_success: false,
        on_failure: true,
      },
    };

    const manager = new CIModeManager(testDir, config);
    await manager.sendNotification('success', { task: 'done' });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should skip notification when no notifications configured', async () => {
    const config: CIConfig = {
      enabled: true,
      auto_approve_breakdown: true,
    };

    const manager = new CIModeManager(testDir, config);
    await manager.sendNotification('success', { task: 'done' });

    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('should handle slack notification failure gracefully', async () => {
    fetchSpy.mockResolvedValue({ ok: false } as Response);
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const config: CIConfig = {
      enabled: true,
      auto_approve_breakdown: true,
      notifications: {
        slack_webhook: 'https://hooks.slack.com/test',
        on_success: true,
      },
    };

    const manager = new CIModeManager(testDir, config);
    await manager.sendNotification('success', { task: 'done' });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to send Slack notification')
    );
    consoleSpy.mockRestore();
  });

  it('should handle slack fetch error gracefully', async () => {
    fetchSpy.mockRejectedValue(new Error('Network error'));
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const config: CIConfig = {
      enabled: true,
      auto_approve_breakdown: true,
      notifications: {
        slack_webhook: 'https://hooks.slack.com/test',
        on_success: true,
      },
    };

    const manager = new CIModeManager(testDir, config);
    await manager.sendNotification('success', { task: 'done' });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Slack notification error'),
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it('should handle webhook notification failure gracefully', async () => {
    fetchSpy.mockResolvedValue({ ok: false } as Response);
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const config: CIConfig = {
      enabled: true,
      auto_approve_breakdown: true,
      notifications: {
        webhook_url: 'https://example.com/webhook',
        on_success: true,
      },
    };

    const manager = new CIModeManager(testDir, config);
    await manager.sendNotification('success', { task: 'done' });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Failed to send webhook notification')
    );
    consoleSpy.mockRestore();
  });

  it('should handle webhook fetch error gracefully', async () => {
    fetchSpy.mockRejectedValue(new Error('Connection refused'));
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const config: CIConfig = {
      enabled: true,
      auto_approve_breakdown: true,
      notifications: {
        webhook_url: 'https://example.com/webhook',
        on_success: true,
      },
    };

    const manager = new CIModeManager(testDir, config);
    await manager.sendNotification('success', { task: 'done' });

    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Webhook notification error'),
      expect.any(Error)
    );
    consoleSpy.mockRestore();
  });

  it('should increment notificationsSent counter', async () => {
    const config: CIConfig = {
      enabled: true,
      auto_approve_breakdown: true,
      notifications: {
        slack_webhook: 'https://hooks.slack.com/test',
        on_success: true,
        on_failure: true,
      },
    };

    const manager = new CIModeManager(testDir, config);
    await manager.sendNotification('success', { task: '1' });
    await manager.sendNotification('failure', { error: '2' });

    const report = manager.getFinalReport();
    expect(report.notificationsSent).toBe(2);
  });
});

describe('CIModeManager - Edge Cases', () => {
  const testDir = path.join(__dirname, '../../test-fixtures/ci-edge-cases');

  beforeEach(() => {
    fs.ensureDirSync(testDir);
  });

  afterEach(() => {
    fs.removeSync(testDir);
  });

  it('should use default timeout for invalid format', () => {
    const config: CIConfig = {
      enabled: true,
      auto_approve_breakdown: true,
      limits: {
        max_total_time: 'invalid',
      },
    };

    const manager = new CIModeManager(testDir, config);
    const timeout = manager.checkTimeout();

    // Default is 2 hours = 7200 seconds
    expect(timeout.remaining).toBeGreaterThan(7000);
    expect(timeout.remaining).toBeLessThanOrEqual(7200);
  });

  it('should parse timeout in hours', () => {
    const config: CIConfig = {
      enabled: true,
      auto_approve_breakdown: true,
      limits: {
        max_total_time: '1h',
      },
    };

    const manager = new CIModeManager(testDir, config);
    const timeout = manager.checkTimeout();

    // 1 hour = 3600 seconds
    expect(timeout.remaining).toBeGreaterThan(3500);
    expect(timeout.remaining).toBeLessThanOrEqual(3600);
  });

  it('should parse timeout in minutes', () => {
    const config: CIConfig = {
      enabled: true,
      auto_approve_breakdown: true,
      limits: {
        max_total_time: '30m',
      },
    };

    const manager = new CIModeManager(testDir, config);
    const timeout = manager.checkTimeout();

    // 30 minutes = 1800 seconds
    expect(timeout.remaining).toBeGreaterThan(1700);
    expect(timeout.remaining).toBeLessThanOrEqual(1800);
  });

  it('should return default for unknown resource type', () => {
    const config: CIConfig = {
      enabled: true,
      auto_approve_breakdown: true,
    };

    const manager = new CIModeManager(testDir, config);
    // @ts-expect-error - testing unknown resource type
    const check = manager.checkResourceQuota('unknown');

    expect(check.exceeded).toBe(false);
    expect(check.current).toBe(0);
    expect(check.limit).toBe(0);
  });

  it('should return Infinity limit as 0 for tasks without limits', () => {
    const config: CIConfig = {
      enabled: true,
      auto_approve_breakdown: true,
    };

    const manager = new CIModeManager(testDir, config);
    const check = manager.checkResourceQuota('tasks');

    expect(check.limit).toBe(0); // Infinity converted to 0
    expect(check.exceeded).toBe(false);
  });

  it('should return Infinity limit as 0 for healing without limits', () => {
    const config: CIConfig = {
      enabled: true,
      auto_approve_breakdown: true,
    };

    const manager = new CIModeManager(testDir, config);
    const check = manager.checkResourceQuota('healing');

    expect(check.limit).toBe(0); // Infinity converted to 0
    expect(check.exceeded).toBe(false);
  });

  it('should handle parseGitIdentity with invalid format', () => {
    const config: CIConfig = {
      enabled: true,
      auto_approve_breakdown: true,
      git: {
        author: 'InvalidFormatWithoutEmail',
      },
    };

    const manager = new CIModeManager(testDir, config);
    manager.configureGit();

    // Should fall back to defaults
    expect(process.env.GIT_AUTHOR_NAME).toBe('Ralph CI');
    expect(process.env.GIT_AUTHOR_EMAIL).toBe('[email protected]');

    // Cleanup
    delete process.env.GIT_AUTHOR_NAME;
    delete process.env.GIT_AUTHOR_EMAIL;
  });

  it('should return undefined for empty clarify answers', () => {
    const config: CIConfig = {
      enabled: true,
      auto_approve_breakdown: true,
      clarify_answers: {},
    };

    const manager = new CIModeManager(testDir, config);
    const answers = manager.getClarifyAnswers();

    expect(answers).toBeUndefined();
  });

  it('should return undefined when all clarify answers are undefined', () => {
    const config: CIConfig = {
      enabled: true,
      auto_approve_breakdown: true,
      clarify_answers: {
        project_type: undefined,
        tech_stack: undefined,
      },
    };

    const manager = new CIModeManager(testDir, config);
    const answers = manager.getClarifyAnswers();

    expect(answers).toBeUndefined();
  });
});
