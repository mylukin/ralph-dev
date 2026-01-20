/**
 * LanguageConfig Domain Model
 *
 * Value object representing project language configuration.
 * Encapsulates language, framework, and verification commands.
 */

export interface LanguageConfigData {
  language: string;
  framework?: string;
  testFramework?: string;
  buildTool?: string;
  verifyCommands?: string[];
}

/**
 * LanguageConfig Value Object
 *
 * Represents project language configuration with business rules for:
 * - Verification commands generation
 * - Configuration validation
 */
export class LanguageConfig {
  public readonly language: string;
  public readonly framework?: string;
  public readonly testFramework?: string;
  public readonly buildTool?: string;
  private readonly _verifyCommands: string[];

  constructor(data: LanguageConfigData) {
    if (!data.language || data.language.trim() === '') {
      throw new Error('Language is required');
    }

    this.language = data.language.trim().toLowerCase();
    this.framework = data.framework?.trim();
    this.testFramework = data.testFramework?.trim();
    this.buildTool = data.buildTool?.trim();
    this._verifyCommands = data.verifyCommands || this.deriveVerifyCommands();
  }

  /**
   * Get verification commands
   * Returns commands for type checking, linting, testing, and building
   */
  getVerifyCommands(): string[] {
    return [...this._verifyCommands]; // Return copy
  }

  /**
   * Check if language is TypeScript/JavaScript
   */
  isJavaScriptBased(): boolean {
    return ['javascript', 'typescript'].includes(this.language);
  }

  /**
   * Check if language is Python
   */
  isPython(): boolean {
    return this.language === 'python';
  }

  /**
   * Check if language is compiled
   */
  isCompiled(): boolean {
    return ['typescript', 'go', 'rust', 'java', 'kotlin', 'scala', 'c++', 'c'].includes(
      this.language
    );
  }

  /**
   * Check if has test framework configured
   */
  hasTestFramework(): boolean {
    return this.testFramework !== undefined;
  }

  /**
   * Check if has build tool configured
   */
  hasBuildTool(): boolean {
    return this.buildTool !== undefined;
  }

  /**
   * Derive default verify commands based on language
   */
  private deriveVerifyCommands(): string[] {
    const commands: string[] = [];

    // TypeScript/JavaScript
    if (this.isJavaScriptBased()) {
      if (this.language === 'typescript') {
        commands.push('npx tsc --noEmit'); // Type check
      }
      commands.push('npm run lint || echo "No lint script"');
      commands.push('npm test');
      commands.push('npm run build');
    }

    // Python
    else if (this.isPython()) {
      commands.push('python -m py_compile $(find . -name "*.py")'); // Syntax check
      commands.push('pytest || python -m unittest');
    }

    // Go
    else if (this.language === 'go') {
      commands.push('go vet ./...');
      commands.push('go test ./...');
      commands.push('go build ./...');
    }

    // Rust
    else if (this.language === 'rust') {
      commands.push('cargo check');
      commands.push('cargo test');
      commands.push('cargo build');
    }

    // Java
    else if (this.language === 'java') {
      if (this.buildTool === 'maven') {
        commands.push('mvn compile');
        commands.push('mvn test');
      } else if (this.buildTool === 'gradle') {
        commands.push('gradle compileJava');
        commands.push('gradle test');
      }
    }

    return commands.length > 0 ? commands : ['echo "No verify commands configured"'];
  }

  /**
   * Convert to plain object for serialization
   */
  toJSON(): LanguageConfigData {
    return {
      language: this.language,
      framework: this.framework,
      testFramework: this.testFramework,
      buildTool: this.buildTool,
      verifyCommands: this.getVerifyCommands(),
    };
  }

  /**
   * Create from plain object
   */
  static fromJSON(data: LanguageConfigData): LanguageConfig {
    return new LanguageConfig(data);
  }

  /**
   * Create unknown language config
   */
  static createUnknown(): LanguageConfig {
    return new LanguageConfig({
      language: 'unknown',
      verifyCommands: [],
    });
  }
}
