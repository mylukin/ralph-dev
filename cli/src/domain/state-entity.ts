/**
 * State Domain Entity
 *
 * Rich domain model with phase transition logic.
 * Encapsulates workflow phase progression rules.
 */

export type Phase = 'clarify' | 'breakdown' | 'implement' | 'heal' | 'deliver' | 'complete';

export interface StateConfig {
  phase: Phase;
  currentTask?: string;
  prd?: any;
  errors?: any[];
  startedAt: string;
  updatedAt: string;
}

/**
 * State Domain Entity
 *
 * Represents the current workflow state with business rules for:
 * - Phase transitions (clarify → breakdown → implement → heal → deliver → complete)
 * - Phase order validation
 * - Timestamp tracking
 */
export class State {
  // Valid transitions map (phase → allowed next phases)
  private static readonly VALID_TRANSITIONS: ReadonlyMap<Phase, ReadonlySet<Phase>> = new Map([
    ['clarify', new Set(['breakdown'])],
    ['breakdown', new Set(['implement'])],
    ['implement', new Set(['heal', 'deliver'])],
    ['heal', new Set(['implement', 'deliver'])],
    ['deliver', new Set(['complete'])],
    ['complete', new Set()], // Terminal phase
  ]);

  // Current state
  private _phase: Phase;
  private _currentTask?: string;
  private _prd?: any;
  private _errors: any[];
  private readonly _startedAt: Date;
  private _updatedAt: Date;

  constructor(config: StateConfig) {
    this._phase = config.phase;
    this._currentTask = config.currentTask;
    this._prd = config.prd;
    this._errors = config.errors || [];
    this._startedAt = new Date(config.startedAt);
    this._updatedAt = new Date(config.updatedAt);
  }

  // Getters
  get phase(): Phase {
    return this._phase;
  }

  get currentTask(): string | undefined {
    return this._currentTask;
  }

  get prd(): any {
    return this._prd;
  }

  get errors(): any[] {
    return [...this._errors]; // Return copy to prevent external modification
  }

  get startedAt(): Date {
    return this._startedAt;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Check if can transition to target phase
   * @param targetPhase Target phase to transition to
   * @returns true if transition is allowed (includes staying in same phase for idempotency)
   */
  canTransitionTo(targetPhase: Phase): boolean {
    // Allow staying in same phase (idempotent operation)
    if (targetPhase === this._phase) {
      return true;
    }
    const allowedPhases = State.VALID_TRANSITIONS.get(this._phase);
    if (!allowedPhases) {
      return false;
    }
    return allowedPhases.has(targetPhase);
  }

  /**
   * Transition to new phase
   * @param targetPhase Target phase
   * @throws Error if transition is not allowed
   */
  transitionTo(targetPhase: Phase): void {
    if (!this.canTransitionTo(targetPhase)) {
      const allowedPhases = State.VALID_TRANSITIONS.get(this._phase);
      const allowedList =
        allowedPhases && allowedPhases.size > 0 ? Array.from(allowedPhases).join(', ') : 'none';
      throw new Error(
        `Invalid phase transition: ${this._phase} → ${targetPhase}. Allowed transitions from ${this._phase}: ${allowedList}`
      );
    }

    this._phase = targetPhase;
    this._updatedAt = new Date();
  }

  /**
   * Update current task
   * @param taskId Task ID or undefined to clear
   */
  setCurrentTask(taskId?: string): void {
    this._currentTask = taskId;
    this._updatedAt = new Date();
  }

  /**
   * Update PRD
   * @param prd PRD data
   */
  setPrd(prd: any): void {
    this._prd = prd;
    this._updatedAt = new Date();
  }

  /**
   * Add error to errors array
   * @param error Error data
   */
  addError(error: any): void {
    this._errors.push(error);
    this._updatedAt = new Date();
  }

  /**
   * Clear all errors
   */
  clearErrors(): void {
    this._errors = [];
    this._updatedAt = new Date();
  }

  /**
   * Get next allowed phases
   * @returns Array of phases that can be transitioned to
   */
  getNextAllowedPhases(): Phase[] {
    const allowedPhases = State.VALID_TRANSITIONS.get(this._phase);
    return allowedPhases ? Array.from(allowedPhases) : [];
  }

  /**
   * Convert to plain object for serialization
   */
  toJSON(): StateConfig {
    return {
      phase: this._phase,
      currentTask: this._currentTask,
      prd: this._prd,
      errors: [...this._errors],
      startedAt: this._startedAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }

  /**
   * Create State from plain object
   */
  static fromJSON(config: StateConfig): State {
    return new State(config);
  }

  /**
   * Create new state in clarify phase
   */
  static createNew(): State {
    const now = new Date().toISOString();
    return new State({
      phase: 'clarify',
      startedAt: now,
      updatedAt: now,
    });
  }
}
