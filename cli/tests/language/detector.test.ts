import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LanguageDetector } from '../../src/language/detector';
import * as fs from 'fs-extra';
import * as path from 'path';

describe('LanguageDetector', () => {
  const testDir = path.join(__dirname, '../../test-projects');

  beforeEach(() => {
    fs.ensureDirSync(testDir);
  });

  afterEach(() => {
    fs.removeSync(testDir);
  });

  describe('TypeScript/JavaScript detection', () => {
    it('should detect TypeScript project with all features', () => {
      const projectDir = path.join(testDir, 'ts-project');
      fs.ensureDirSync(projectDir);

      const packageJson = {
        name: 'test-app',
        scripts: {
          test: 'vitest',
          build: 'tsc',
          lint: 'eslint .',
        },
        dependencies: {
          react: '^18.0.0',
        },
        devDependencies: {
          typescript: '^5.0.0',
          vitest: '^1.0.0',
          eslint: '^8.0.0',
        },
      };

      fs.writeJSONSync(path.join(projectDir, 'package.json'), packageJson);
      fs.writeFileSync(path.join(projectDir, 'tsconfig.json'), '{}');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('typescript');
      expect(config.framework).toBe('react');
      expect(config.testFramework).toBe('vitest');
      expect(config.verifyCommands).toContain('npx tsc --noEmit');
      expect(config.verifyCommands).toContain('npm run lint');
      expect(config.verifyCommands).toContain('npm test');
      expect(config.verifyCommands).toContain('npm run build');
    });

    it('should detect JavaScript project without TypeScript', () => {
      const projectDir = path.join(testDir, 'js-project');
      fs.ensureDirSync(projectDir);

      const packageJson = {
        name: 'test-app',
        scripts: {
          test: 'jest',
        },
        devDependencies: {
          jest: '^29.0.0',
        },
      };

      fs.writeJSONSync(path.join(projectDir, 'package.json'), packageJson);

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('javascript');
      expect(config.testFramework).toBe('jest');
      expect(config.verifyCommands).toContain('npm test');
    });

    it('should detect Next.js framework', () => {
      const projectDir = path.join(testDir, 'next-project');
      fs.ensureDirSync(projectDir);

      const packageJson = {
        name: 'next-app',
        dependencies: {
          next: '^14.0.0',
          react: '^18.0.0',
        },
      };

      fs.writeJSONSync(path.join(projectDir, 'package.json'), packageJson);
      fs.writeFileSync(path.join(projectDir, 'tsconfig.json'), '{}');
      fs.writeFileSync(path.join(projectDir, 'next.config.js'), '');

      const config = LanguageDetector.detect(projectDir);

      expect(config.framework).toBe('next');
      expect(config.buildTool).toBe('next');
    });

    it('should detect Vite build tool', () => {
      const projectDir = path.join(testDir, 'vite-project');
      fs.ensureDirSync(projectDir);

      const packageJson = {
        name: 'vite-app',
        dependencies: {
          vue: '^3.0.0',
        },
        devDependencies: {
          vite: '^5.0.0',
        },
      };

      fs.writeJSONSync(path.join(projectDir, 'package.json'), packageJson);
      fs.writeFileSync(path.join(projectDir, 'vite.config.ts'), '');

      const config = LanguageDetector.detect(projectDir);

      expect(config.framework).toBe('vue');
      expect(config.buildTool).toBe('vite');
    });
  });

  describe('Python detection', () => {
    it('should detect Python project with pytest', () => {
      const projectDir = path.join(testDir, 'python-project');
      fs.ensureDirSync(projectDir);

      fs.writeFileSync(path.join(projectDir, 'requirements.txt'), 'pytest==7.0.0');
      fs.writeFileSync(path.join(projectDir, 'pytest.ini'), '[pytest]');
      fs.writeFileSync(path.join(projectDir, '.flake8'), '[flake8]');
      fs.writeFileSync(path.join(projectDir, 'mypy.ini'), '[mypy]');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('python');
      expect(config.testFramework).toBe('pytest');
      expect(config.verifyCommands).toContain('mypy .');
      expect(config.verifyCommands).toContain('flake8');
      expect(config.verifyCommands).toContain('pytest');
    });

    it('should detect Python with pyproject.toml', () => {
      const projectDir = path.join(testDir, 'python-modern');
      fs.ensureDirSync(projectDir);

      fs.writeFileSync(path.join(projectDir, 'pyproject.toml'), '[tool.poetry]');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('python');
      expect(config.verifyCommands).toContain('pytest');
    });

    it('should fallback to unittest if pytest not found', () => {
      const projectDir = path.join(testDir, 'python-basic');
      fs.ensureDirSync(projectDir);

      fs.writeFileSync(path.join(projectDir, 'setup.py'), '');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('python');
      expect(config.verifyCommands).toContain('python -m unittest discover');
    });
  });

  describe('Go detection', () => {
    it('should detect Go project', () => {
      const projectDir = path.join(testDir, 'go-project');
      fs.ensureDirSync(projectDir);

      fs.writeFileSync(path.join(projectDir, 'go.mod'), 'module test');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('go');
      expect(config.testFramework).toBe('go test');
      expect(config.buildTool).toBe('go');
      expect(config.verifyCommands).toContain('go fmt ./...');
      expect(config.verifyCommands).toContain('go vet ./...');
      expect(config.verifyCommands).toContain('go test ./...');
      expect(config.verifyCommands).toContain('go build ./...');
    });
  });

  describe('Rust detection', () => {
    it('should detect Rust project', () => {
      const projectDir = path.join(testDir, 'rust-project');
      fs.ensureDirSync(projectDir);

      fs.writeFileSync(path.join(projectDir, 'Cargo.toml'), '[package]');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('rust');
      expect(config.testFramework).toBe('cargo test');
      expect(config.buildTool).toBe('cargo');
      expect(config.verifyCommands).toContain('cargo fmt -- --check');
      expect(config.verifyCommands).toContain('cargo clippy -- -D warnings');
      expect(config.verifyCommands).toContain('cargo test');
      expect(config.verifyCommands).toContain('cargo build');
    });
  });

  describe('Java detection', () => {
    it('should detect Maven project', () => {
      const projectDir = path.join(testDir, 'maven-project');
      fs.ensureDirSync(projectDir);

      fs.writeFileSync(path.join(projectDir, 'pom.xml'), '<project></project>');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('java');
      expect(config.buildTool).toBe('maven');
      expect(config.verifyCommands).toContain('mvn test');
      expect(config.verifyCommands).toContain('mvn package');
    });

    it('should detect Gradle project', () => {
      const projectDir = path.join(testDir, 'gradle-project');
      fs.ensureDirSync(projectDir);

      fs.writeFileSync(path.join(projectDir, 'build.gradle'), '');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('java');
      expect(config.buildTool).toBe('gradle');
      expect(config.verifyCommands).toContain('./gradlew test');
      expect(config.verifyCommands).toContain('./gradlew build');
    });
  });

  describe('Kotlin detection', () => {
    it('should detect Kotlin project with Gradle wrapper', () => {
      const projectDir = path.join(testDir, 'kotlin-project-wrapper');
      fs.ensureDirSync(projectDir);

      fs.writeFileSync(path.join(projectDir, 'build.gradle.kts'), 'plugins { kotlin("jvm") }');
      fs.writeFileSync(path.join(projectDir, 'gradlew'), '#!/bin/bash');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('kotlin');
      expect(config.buildTool).toBe('gradle');
      expect(config.verifyCommands).toContain('./gradlew test');
      expect(config.verifyCommands).toContain('./gradlew build');
    });

    it('should detect Kotlin project without Gradle wrapper', () => {
      const projectDir = path.join(testDir, 'kotlin-project-no-wrapper');
      fs.ensureDirSync(projectDir);

      fs.writeFileSync(path.join(projectDir, 'build.gradle.kts'), 'plugins { kotlin("jvm") }');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('kotlin');
      expect(config.buildTool).toBe('gradle');
      expect(config.verifyCommands).toContain('gradle test');
      expect(config.verifyCommands).toContain('gradle build');
    });
  });

  describe('Scala detection', () => {
    it('should detect Scala project with sbt', () => {
      const projectDir = path.join(testDir, 'scala-project');
      fs.ensureDirSync(projectDir);

      fs.writeFileSync(path.join(projectDir, 'build.sbt'), 'name := "test"');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('scala');
      expect(config.testFramework).toBe('scalatest');
      expect(config.buildTool).toBe('sbt');
      expect(config.verifyCommands).toContain('sbt test');
      expect(config.verifyCommands).toContain('sbt compile');
    });
  });

  describe('C++ detection', () => {
    it('should detect C++ project with CMake', () => {
      const projectDir = path.join(testDir, 'cpp-cmake-project');
      fs.ensureDirSync(projectDir);

      fs.writeFileSync(path.join(projectDir, 'CMakeLists.txt'), 'cmake_minimum_required(VERSION 3.0)');
      fs.writeFileSync(path.join(projectDir, 'main.cpp'), '// cpp file');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('cpp');
      expect(config.buildTool).toBe('cmake');
      expect(config.verifyCommands).toContain('cmake -B build');
      expect(config.verifyCommands).toContain('cmake --build build');
      expect(config.verifyCommands).toContain('ctest --test-dir build');
    });

    it('should detect C++ project with Makefile', () => {
      const projectDir = path.join(testDir, 'cpp-make-project');
      fs.ensureDirSync(projectDir);

      fs.writeFileSync(path.join(projectDir, 'Makefile'), 'all:\n\tg++ main.cpp');
      fs.writeFileSync(path.join(projectDir, 'main.cpp'), '// cpp file');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('cpp');
      expect(config.buildTool).toBe('make');
      expect(config.verifyCommands).toContain('make');
      expect(config.verifyCommands).toContain('make test');
    });
  });

  describe('PHP detection', () => {
    it('should detect PHP project with composer.json', () => {
      const projectDir = path.join(testDir, 'php-project');
      fs.ensureDirSync(projectDir);

      const composerJson = {
        name: 'test/php-app',
        require: {
          php: '^8.0',
        },
      };

      fs.writeJSONSync(path.join(projectDir, 'composer.json'), composerJson);

      // Create phpunit.xml to trigger phpunit verification
      fs.writeFileSync(path.join(projectDir, 'phpunit.xml'), '<phpunit></phpunit>');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('php');
      expect(config.testFramework).toBe('phpunit');
      expect(config.verifyCommands).toContain('./vendor/bin/phpunit');
    });

    it('should detect Laravel framework', () => {
      const projectDir = path.join(testDir, 'laravel-project');
      fs.ensureDirSync(projectDir);

      const composerJson = {
        name: 'test/laravel-app',
        require: {
          php: '^8.0',
          'laravel/framework': '^10.0',
        },
      };

      fs.writeJSONSync(path.join(projectDir, 'composer.json'), composerJson);

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('php');
      expect(config.framework).toBe('laravel');
      expect(config.testFramework).toBe('phpunit');
    });
  });

  describe('Unknown project', () => {
    it('should return unknown for unrecognized project', () => {
      const projectDir = path.join(testDir, 'unknown-project');
      fs.ensureDirSync(projectDir);

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('unknown');
      expect(config.verifyCommands).toEqual([]);
    });
  });

  describe('C# detection', () => {
    it('should detect C# project with csproj file', () => {
      const projectDir = path.join(testDir, 'csharp-project');
      fs.ensureDirSync(projectDir);

      // Create a .csproj file (the detection uses glob pattern *.csproj)
      fs.writeFileSync(path.join(projectDir, '*.csproj'), '<Project></Project>');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('csharp');
      expect(config.testFramework).toBe('xunit');
      expect(config.buildTool).toBe('dotnet');
      expect(config.verifyCommands).toContain('dotnet format --verify-no-changes');
      expect(config.verifyCommands).toContain('dotnet test');
      expect(config.verifyCommands).toContain('dotnet build');
    });

    it('should detect C# project with sln file', () => {
      const projectDir = path.join(testDir, 'csharp-sln-project');
      fs.ensureDirSync(projectDir);

      fs.writeFileSync(path.join(projectDir, '*.sln'), 'Solution file');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('csharp');
      expect(config.testFramework).toBe('xunit');
      expect(config.buildTool).toBe('dotnet');
    });
  });

  describe('Swift detection', () => {
    it('should detect Swift project with Package.swift', () => {
      const projectDir = path.join(testDir, 'swift-project');
      fs.ensureDirSync(projectDir);

      fs.writeFileSync(path.join(projectDir, 'Package.swift'), '// swift-tools-version:5.5');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('swift');
      expect(config.testFramework).toBe('XCTest');
      expect(config.buildTool).toBe('swift');
      expect(config.verifyCommands).toContain('swift build');
      expect(config.verifyCommands).toContain('swift test');
    });
  });

  describe('Ruby detection', () => {
    it('should detect Ruby project with rspec', () => {
      const projectDir = path.join(testDir, 'ruby-rspec-project');
      fs.ensureDirSync(projectDir);

      fs.writeFileSync(path.join(projectDir, 'Gemfile'), 'source "https://rubygems.org"');
      fs.ensureDirSync(path.join(projectDir, 'spec'));
      fs.writeFileSync(path.join(projectDir, '.rubocop.yml'), 'AllCops:');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('ruby');
      expect(config.testFramework).toBe('rspec');
      expect(config.verifyCommands).toContain('rubocop');
      expect(config.verifyCommands).toContain('rspec');
    });

    it('should detect Ruby project with minitest', () => {
      const projectDir = path.join(testDir, 'ruby-minitest-project');
      fs.ensureDirSync(projectDir);

      fs.writeFileSync(path.join(projectDir, 'Gemfile'), 'source "https://rubygems.org"');
      fs.ensureDirSync(path.join(projectDir, 'test'));

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('ruby');
      expect(config.testFramework).toBe('minitest');
      expect(config.verifyCommands).toContain('rake test');
    });

    it('should fallback to bundle exec rake test', () => {
      const projectDir = path.join(testDir, 'ruby-basic-project');
      fs.ensureDirSync(projectDir);

      fs.writeFileSync(path.join(projectDir, 'Gemfile'), 'source "https://rubygems.org"');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('ruby');
      expect(config.verifyCommands).toContain('bundle exec rake test');
    });
  });

  describe('Additional JS framework detection', () => {
    it('should detect Angular framework', () => {
      const projectDir = path.join(testDir, 'angular-project');
      fs.ensureDirSync(projectDir);

      const packageJson = {
        name: 'angular-app',
        dependencies: {
          '@angular/core': '^17.0.0',
        },
      };

      fs.writeJSONSync(path.join(projectDir, 'package.json'), packageJson);

      const config = LanguageDetector.detect(projectDir);

      expect(config.framework).toBe('angular');
    });

    it('should detect Svelte framework', () => {
      const projectDir = path.join(testDir, 'svelte-project');
      fs.ensureDirSync(projectDir);

      const packageJson = {
        name: 'svelte-app',
        dependencies: {
          svelte: '^4.0.0',
        },
      };

      fs.writeJSONSync(path.join(projectDir, 'package.json'), packageJson);

      const config = LanguageDetector.detect(projectDir);

      expect(config.framework).toBe('svelte');
    });

    it('should detect Nuxt framework', () => {
      const projectDir = path.join(testDir, 'nuxt-project');
      fs.ensureDirSync(projectDir);

      const packageJson = {
        name: 'nuxt-app',
        dependencies: {
          nuxt: '^3.0.0',
          vue: '^3.0.0',
        },
      };

      fs.writeJSONSync(path.join(projectDir, 'package.json'), packageJson);

      const config = LanguageDetector.detect(projectDir);

      expect(config.framework).toBe('nuxt');
    });
  });

  describe('Additional test framework detection', () => {
    it('should detect Mocha test framework', () => {
      const projectDir = path.join(testDir, 'mocha-project');
      fs.ensureDirSync(projectDir);

      const packageJson = {
        name: 'mocha-app',
        devDependencies: {
          mocha: '^10.0.0',
        },
      };

      fs.writeJSONSync(path.join(projectDir, 'package.json'), packageJson);

      const config = LanguageDetector.detect(projectDir);

      expect(config.testFramework).toBe('mocha');
    });

    it('should detect Jasmine test framework', () => {
      const projectDir = path.join(testDir, 'jasmine-project');
      fs.ensureDirSync(projectDir);

      const packageJson = {
        name: 'jasmine-app',
        devDependencies: {
          jasmine: '^5.0.0',
        },
      };

      fs.writeJSONSync(path.join(projectDir, 'package.json'), packageJson);

      const config = LanguageDetector.detect(projectDir);

      expect(config.testFramework).toBe('jasmine');
    });

    it('should detect Playwright test framework', () => {
      const projectDir = path.join(testDir, 'playwright-project');
      fs.ensureDirSync(projectDir);

      const packageJson = {
        name: 'playwright-app',
        devDependencies: {
          '@playwright/test': '^1.40.0',
        },
      };

      fs.writeJSONSync(path.join(projectDir, 'package.json'), packageJson);

      const config = LanguageDetector.detect(projectDir);

      expect(config.testFramework).toBe('playwright');
    });

    it('should return npx playwright test when no scripts.test', () => {
      const projectDir = path.join(testDir, 'playwright-no-script');
      fs.ensureDirSync(projectDir);

      const packageJson = {
        name: 'playwright-app',
        devDependencies: {
          '@playwright/test': '^1.40.0',
        },
      };

      fs.writeJSONSync(path.join(projectDir, 'package.json'), packageJson);

      const config = LanguageDetector.detect(projectDir);

      expect(config.verifyCommands).toContain('npx playwright test');
    });

    it('should return npx vitest run when no scripts.test', () => {
      const projectDir = path.join(testDir, 'vitest-no-script');
      fs.ensureDirSync(projectDir);

      const packageJson = {
        name: 'vitest-app',
        devDependencies: {
          vitest: '^1.0.0',
        },
      };

      fs.writeJSONSync(path.join(projectDir, 'package.json'), packageJson);

      const config = LanguageDetector.detect(projectDir);

      expect(config.verifyCommands).toContain('npx vitest run');
    });

    it('should return npx jest when no scripts.test', () => {
      const projectDir = path.join(testDir, 'jest-no-script');
      fs.ensureDirSync(projectDir);

      const packageJson = {
        name: 'jest-app',
        devDependencies: {
          jest: '^29.0.0',
        },
      };

      fs.writeJSONSync(path.join(projectDir, 'package.json'), packageJson);

      const config = LanguageDetector.detect(projectDir);

      expect(config.verifyCommands).toContain('npx jest');
    });
  });

  describe('Additional build tool detection', () => {
    it('should detect Webpack build tool', () => {
      const projectDir = path.join(testDir, 'webpack-project');
      fs.ensureDirSync(projectDir);

      const packageJson = {
        name: 'webpack-app',
        devDependencies: {
          webpack: '^5.0.0',
        },
      };

      fs.writeJSONSync(path.join(projectDir, 'package.json'), packageJson);
      fs.writeFileSync(path.join(projectDir, 'webpack.config.js'), 'module.exports = {}');

      const config = LanguageDetector.detect(projectDir);

      expect(config.buildTool).toBe('webpack');
    });

    it('should detect Rollup build tool', () => {
      const projectDir = path.join(testDir, 'rollup-project');
      fs.ensureDirSync(projectDir);

      const packageJson = {
        name: 'rollup-app',
        devDependencies: {
          rollup: '^4.0.0',
        },
      };

      fs.writeJSONSync(path.join(projectDir, 'package.json'), packageJson);
      fs.writeFileSync(path.join(projectDir, 'rollup.config.js'), 'export default {}');

      const config = LanguageDetector.detect(projectDir);

      expect(config.buildTool).toBe('rollup');
    });
  });

  describe('Python with alternative config files', () => {
    it('should detect mypy with .mypy.ini', () => {
      const projectDir = path.join(testDir, 'python-mypy-alt');
      fs.ensureDirSync(projectDir);

      fs.writeFileSync(path.join(projectDir, 'requirements.txt'), 'mypy==1.0.0');
      fs.writeFileSync(path.join(projectDir, '.mypy.ini'), '[mypy]');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('python');
      expect(config.verifyCommands).toContain('mypy .');
    });

    it('should detect flake8 with setup.cfg', () => {
      const projectDir = path.join(testDir, 'python-flake8-setup');
      fs.ensureDirSync(projectDir);

      fs.writeFileSync(path.join(projectDir, 'requirements.txt'), 'flake8==6.0.0');
      fs.writeFileSync(path.join(projectDir, 'setup.cfg'), '[flake8]');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('python');
      expect(config.verifyCommands).toContain('flake8');
    });
  });

  describe('PHP additional detection', () => {
    it('should detect PHP with phpcs.xml linting', () => {
      const projectDir = path.join(testDir, 'php-phpcs-project');
      fs.ensureDirSync(projectDir);

      const composerJson = {
        name: 'test/php-phpcs',
        require: { php: '^8.0' },
      };

      fs.writeJSONSync(path.join(projectDir, 'composer.json'), composerJson);
      fs.writeFileSync(path.join(projectDir, 'phpcs.xml'), '<ruleset></ruleset>');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('php');
      expect(config.verifyCommands).toContain('./vendor/bin/phpcs');
    });

    it('should detect PHP with vendor/bin/phpcs', () => {
      const projectDir = path.join(testDir, 'php-vendor-phpcs');
      fs.ensureDirSync(projectDir);

      const composerJson = {
        name: 'test/php-vendor',
        require: { php: '^8.0' },
      };

      fs.writeJSONSync(path.join(projectDir, 'composer.json'), composerJson);
      fs.ensureDirSync(path.join(projectDir, 'vendor/bin'));
      fs.writeFileSync(path.join(projectDir, 'vendor/bin/phpcs'), '#!/bin/bash');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('php');
      expect(config.verifyCommands).toContain('./vendor/bin/phpcs');
    });

    it('should detect PHP with vendor/bin/phpunit', () => {
      const projectDir = path.join(testDir, 'php-vendor-phpunit');
      fs.ensureDirSync(projectDir);

      const composerJson = {
        name: 'test/php-vendor-unit',
        require: { php: '^8.0' },
      };

      fs.writeJSONSync(path.join(projectDir, 'composer.json'), composerJson);
      fs.ensureDirSync(path.join(projectDir, 'vendor/bin'));
      fs.writeFileSync(path.join(projectDir, 'vendor/bin/phpunit'), '#!/bin/bash');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('php');
      expect(config.verifyCommands).toContain('./vendor/bin/phpunit');
    });

    it('should detect Symfony framework', () => {
      const projectDir = path.join(testDir, 'symfony-project');
      fs.ensureDirSync(projectDir);

      const composerJson = {
        name: 'test/symfony-app',
        require: {
          php: '^8.0',
          'symfony/symfony': '^6.0',
        },
      };

      fs.writeJSONSync(path.join(projectDir, 'composer.json'), composerJson);

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('php');
      expect(config.framework).toBe('symfony');
    });

    it('should detect CakePHP framework', () => {
      const projectDir = path.join(testDir, 'cakephp-project');
      fs.ensureDirSync(projectDir);

      const composerJson = {
        name: 'test/cakephp-app',
        require: {
          php: '^8.0',
          'cakephp/cakephp': '^5.0',
        },
      };

      fs.writeJSONSync(path.join(projectDir, 'composer.json'), composerJson);

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('php');
      expect(config.framework).toBe('cakephp');
    });

    it('should handle composer.json parsing failure gracefully', () => {
      const projectDir = path.join(testDir, 'php-invalid-composer');
      fs.ensureDirSync(projectDir);

      // Write invalid JSON
      fs.writeFileSync(path.join(projectDir, 'composer.json'), 'invalid json {{{');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('php');
      expect(config.framework).toBeUndefined();
    });
  });

  describe('Kotlin with settings.gradle.kts', () => {
    it('should detect Kotlin project with settings.gradle.kts', () => {
      const projectDir = path.join(testDir, 'kotlin-settings-project');
      fs.ensureDirSync(projectDir);

      fs.writeFileSync(path.join(projectDir, 'settings.gradle.kts'), 'rootProject.name = "test"');

      const config = LanguageDetector.detect(projectDir);

      expect(config.language).toBe('kotlin');
      expect(config.buildTool).toBe('gradle');
    });
  });
});
