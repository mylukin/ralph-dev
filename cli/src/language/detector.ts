import * as fs from 'fs-extra';
import * as path from 'path';

export interface LanguageConfig {
  language: string;
  framework?: string;
  testFramework?: string;
  buildTool?: string;
  verifyCommands: string[];
}

export class LanguageDetector {
  /**
   * Detect project language and configuration
   */
  static detect(projectPath: string): LanguageConfig {
    // TypeScript/JavaScript detection
    if (fs.existsSync(path.join(projectPath, 'package.json'))) {
      return this.detectTypeScript(projectPath);
    }

    // Python detection
    if (
      fs.existsSync(path.join(projectPath, 'requirements.txt')) ||
      fs.existsSync(path.join(projectPath, 'pyproject.toml')) ||
      fs.existsSync(path.join(projectPath, 'setup.py'))
    ) {
      return this.detectPython(projectPath);
    }

    // Go detection
    if (fs.existsSync(path.join(projectPath, 'go.mod'))) {
      return this.detectGo(projectPath);
    }

    // Rust detection
    if (fs.existsSync(path.join(projectPath, 'Cargo.toml'))) {
      return this.detectRust(projectPath);
    }

    // Java detection
    if (
      fs.existsSync(path.join(projectPath, 'pom.xml')) ||
      fs.existsSync(path.join(projectPath, 'build.gradle'))
    ) {
      return this.detectJava(projectPath);
    }

    // Ruby detection
    if (fs.existsSync(path.join(projectPath, 'Gemfile'))) {
      return this.detectRuby(projectPath);
    }

    // PHP detection
    if (fs.existsSync(path.join(projectPath, 'composer.json'))) {
      return this.detectPHP(projectPath);
    }

    // C# detection
    if (
      fs.existsSync(path.join(projectPath, '*.csproj')) ||
      fs.existsSync(path.join(projectPath, '*.sln'))
    ) {
      return this.detectCSharp(projectPath);
    }

    // Swift detection
    if (fs.existsSync(path.join(projectPath, 'Package.swift'))) {
      return this.detectSwift(projectPath);
    }

    // Kotlin detection
    if (
      fs.existsSync(path.join(projectPath, 'build.gradle.kts')) ||
      fs.existsSync(path.join(projectPath, 'settings.gradle.kts'))
    ) {
      return this.detectKotlin(projectPath);
    }

    // Scala detection
    if (fs.existsSync(path.join(projectPath, 'build.sbt'))) {
      return this.detectScala(projectPath);
    }

    // C++ detection
    if (
      fs.existsSync(path.join(projectPath, 'CMakeLists.txt')) ||
      fs.existsSync(path.join(projectPath, 'Makefile'))
    ) {
      return this.detectCPP(projectPath);
    }

    // Default fallback
    return {
      language: 'unknown',
      verifyCommands: [],
    };
  }

  private static detectTypeScript(projectPath: string): LanguageConfig {
    const packageJson = fs.readJSONSync(path.join(projectPath, 'package.json'));
    const hasTSConfig = fs.existsSync(path.join(projectPath, 'tsconfig.json'));

    const framework = this.detectJSFramework(packageJson);
    const testFramework = this.detectTestFramework(packageJson);
    const buildTool = this.detectBuildTool(projectPath);

    const verifyCommands: string[] = [];

    // Type checking
    if (hasTSConfig) {
      verifyCommands.push('npx tsc --noEmit');
    }

    // Linting
    if (packageJson.devDependencies?.eslint || packageJson.dependencies?.eslint) {
      verifyCommands.push('npm run lint');
    }

    // Testing
    const testCommand = this.detectTestCommand(packageJson);
    if (testCommand) {
      verifyCommands.push(testCommand);
    }

    // Building
    const buildCommand = this.detectBuildCommand(packageJson);
    if (buildCommand) {
      verifyCommands.push(buildCommand);
    }

    return {
      language: hasTSConfig ? 'typescript' : 'javascript',
      framework,
      testFramework,
      buildTool,
      verifyCommands,
    };
  }

  private static detectPython(projectPath: string): LanguageConfig {
    const verifyCommands: string[] = [];

    // Type checking
    if (fs.existsSync(path.join(projectPath, 'mypy.ini')) ||
        fs.existsSync(path.join(projectPath, '.mypy.ini'))) {
      verifyCommands.push('mypy .');
    }

    // Linting
    if (fs.existsSync(path.join(projectPath, '.flake8')) ||
        fs.existsSync(path.join(projectPath, 'setup.cfg'))) {
      verifyCommands.push('flake8');
    }

    // Testing
    if (fs.existsSync(path.join(projectPath, 'pytest.ini')) ||
        fs.existsSync(path.join(projectPath, 'pyproject.toml'))) {
      verifyCommands.push('pytest');
    } else {
      verifyCommands.push('python -m unittest discover');
    }

    return {
      language: 'python',
      testFramework: 'pytest',
      verifyCommands,
    };
  }

  private static detectGo(projectPath: string): LanguageConfig {
    const verifyCommands: string[] = [
      'go fmt ./...',
      'go vet ./...',
      'go test ./...',
      'go build ./...',
    ];

    return {
      language: 'go',
      testFramework: 'go test',
      buildTool: 'go',
      verifyCommands,
    };
  }

  private static detectRust(projectPath: string): LanguageConfig {
    const verifyCommands: string[] = [
      'cargo fmt -- --check',
      'cargo clippy -- -D warnings',
      'cargo test',
      'cargo build',
    ];

    return {
      language: 'rust',
      testFramework: 'cargo test',
      buildTool: 'cargo',
      verifyCommands,
    };
  }

  private static detectJava(projectPath: string): LanguageConfig {
    const isMaven = fs.existsSync(path.join(projectPath, 'pom.xml'));
    const isGradle = fs.existsSync(path.join(projectPath, 'build.gradle'));

    const verifyCommands: string[] = [];

    if (isMaven) {
      verifyCommands.push('mvn test', 'mvn package');
    } else if (isGradle) {
      verifyCommands.push('./gradlew test', './gradlew build');
    }

    return {
      language: 'java',
      buildTool: isMaven ? 'maven' : 'gradle',
      verifyCommands,
    };
  }

  private static detectJSFramework(packageJson: any): string | undefined {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    // Check meta-frameworks first (they depend on base frameworks)
    if (deps.next) return 'next';
    if (deps.nuxt) return 'nuxt';

    // Then check base frameworks
    if (deps.react) return 'react';
    if (deps.vue) return 'vue';
    if (deps['@angular/core']) return 'angular';
    if (deps.svelte) return 'svelte';

    return undefined;
  }

  private static detectTestFramework(packageJson: any): string | undefined {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    if (deps.vitest) return 'vitest';
    if (deps.jest) return 'jest';
    if (deps.mocha) return 'mocha';
    if (deps.jasmine) return 'jasmine';
    if (deps['@playwright/test']) return 'playwright';

    return undefined;
  }

  private static detectBuildTool(projectPath: string): string | undefined {
    if (fs.existsSync(path.join(projectPath, 'vite.config.ts'))) return 'vite';
    if (fs.existsSync(path.join(projectPath, 'webpack.config.js'))) return 'webpack';
    if (fs.existsSync(path.join(projectPath, 'rollup.config.js'))) return 'rollup';
    if (fs.existsSync(path.join(projectPath, 'next.config.js'))) return 'next';

    return undefined;
  }

  private static detectTestCommand(packageJson: any): string | undefined {
    if (packageJson.scripts?.test) {
      return 'npm test';
    }

    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };

    if (deps.vitest) return 'npx vitest run';
    if (deps.jest) return 'npx jest';
    if (deps['@playwright/test']) return 'npx playwright test';

    return undefined;
  }

  private static detectBuildCommand(packageJson: any): string | undefined {
    if (packageJson.scripts?.build) {
      return 'npm run build';
    }

    return undefined;
  }

  private static detectRuby(projectPath: string): LanguageConfig {
    const verifyCommands: string[] = [];

    // Linting
    if (fs.existsSync(path.join(projectPath, '.rubocop.yml'))) {
      verifyCommands.push('rubocop');
    }

    // Testing
    if (fs.existsSync(path.join(projectPath, 'spec'))) {
      verifyCommands.push('rspec');
    } else if (fs.existsSync(path.join(projectPath, 'test'))) {
      verifyCommands.push('rake test');
    } else {
      verifyCommands.push('bundle exec rake test');
    }

    return {
      language: 'ruby',
      testFramework: fs.existsSync(path.join(projectPath, 'spec')) ? 'rspec' : 'minitest',
      verifyCommands,
    };
  }

  private static detectPHP(projectPath: string): LanguageConfig {
    const verifyCommands: string[] = [];

    // Linting
    if (fs.existsSync(path.join(projectPath, 'phpcs.xml')) ||
        fs.existsSync(path.join(projectPath, 'vendor/bin/phpcs'))) {
      verifyCommands.push('./vendor/bin/phpcs');
    }

    // Testing
    if (fs.existsSync(path.join(projectPath, 'phpunit.xml')) ||
        fs.existsSync(path.join(projectPath, 'vendor/bin/phpunit'))) {
      verifyCommands.push('./vendor/bin/phpunit');
    }

    let framework: string | undefined;
    try {
      const composerJson = fs.readJSONSync(path.join(projectPath, 'composer.json'));
      const deps = { ...composerJson.require, ...composerJson['require-dev'] };

      if (deps.laravel || deps['laravel/framework']) framework = 'laravel';
      else if (deps.symfony || deps['symfony/symfony']) framework = 'symfony';
      else if (deps['cakephp/cakephp']) framework = 'cakephp';
    } catch (e) {
      // composer.json parsing failed, no framework detected
    }

    return {
      language: 'php',
      framework,
      testFramework: 'phpunit',
      verifyCommands,
    };
  }

  private static detectCSharp(projectPath: string): LanguageConfig {
    const verifyCommands: string[] = [
      'dotnet format --verify-no-changes',
      'dotnet test',
      'dotnet build',
    ];

    return {
      language: 'csharp',
      testFramework: 'xunit',
      buildTool: 'dotnet',
      verifyCommands,
    };
  }

  private static detectSwift(projectPath: string): LanguageConfig {
    const verifyCommands: string[] = [
      'swift build',
      'swift test',
    ];

    return {
      language: 'swift',
      testFramework: 'XCTest',
      buildTool: 'swift',
      verifyCommands,
    };
  }

  private static detectKotlin(projectPath: string): LanguageConfig {
    const verifyCommands: string[] = [];

    // Check if using Gradle wrapper
    if (fs.existsSync(path.join(projectPath, 'gradlew'))) {
      verifyCommands.push('./gradlew test', './gradlew build');
    } else {
      verifyCommands.push('gradle test', 'gradle build');
    }

    return {
      language: 'kotlin',
      buildTool: 'gradle',
      verifyCommands,
    };
  }

  private static detectScala(projectPath: string): LanguageConfig {
    const verifyCommands: string[] = [
      'sbt test',
      'sbt compile',
    ];

    return {
      language: 'scala',
      testFramework: 'scalatest',
      buildTool: 'sbt',
      verifyCommands,
    };
  }

  private static detectCPP(projectPath: string): LanguageConfig {
    const verifyCommands: string[] = [];

    // CMake project
    if (fs.existsSync(path.join(projectPath, 'CMakeLists.txt'))) {
      verifyCommands.push(
        'cmake -B build',
        'cmake --build build',
        'ctest --test-dir build'
      );
    }
    // Makefile project
    else if (fs.existsSync(path.join(projectPath, 'Makefile'))) {
      verifyCommands.push('make', 'make test');
    }

    return {
      language: 'cpp',
      buildTool: fs.existsSync(path.join(projectPath, 'CMakeLists.txt')) ? 'cmake' : 'make',
      verifyCommands,
    };
  }
}
