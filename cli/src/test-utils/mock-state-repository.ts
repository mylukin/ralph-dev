/**
 * Mock State Repository for Testing
 *
 * Provides in-memory state storage for unit tests.
 * Implements IStateRepository interface with synchronous operations.
 */

import { IStateRepository, State, StateUpdate, StateConfig } from '../repositories/state-repository';

/**
 * Mock implementation of IStateRepository
 *
 * Stores state in memory for testing without file system dependency.
 */
export class MockStateRepository implements IStateRepository {
  private state: State | null = null;

  async get(): Promise<State | null> {
    return this.state ? State.fromJSON(this.state.toJSON()) : null;
  }

  async set(stateConfig: Omit<StateConfig, 'updatedAt'>): Promise<void> {
    const fullConfig = {
      ...stateConfig,
      updatedAt: new Date().toISOString(),
    };

    this.state = State.fromJSON(fullConfig);
  }

  async update(updates: StateUpdate): Promise<void> {
    if (!this.state) {
      throw new Error('State not initialized. Call set() first.');
    }

    // Apply updates to state
    if (updates.phase !== undefined) {
      this.state = State.fromJSON({
        ...this.state.toJSON(),
        phase: updates.phase,
        updatedAt: new Date().toISOString(),
      });
    }

    if (updates.currentTask !== undefined) {
      this.state = State.fromJSON({
        ...this.state.toJSON(),
        currentTask: updates.currentTask,
        updatedAt: new Date().toISOString(),
      });
    }

    if (updates.prd !== undefined) {
      this.state = State.fromJSON({
        ...this.state.toJSON(),
        prd: updates.prd,
        updatedAt: new Date().toISOString(),
      });
    }

    if (updates.addError !== undefined) {
      const currentState = this.state.toJSON();
      const errors = currentState.errors || [];
      this.state = State.fromJSON({
        ...currentState,
        errors: [...errors, updates.addError],
        updatedAt: new Date().toISOString(),
      });
    }
  }

  async clear(): Promise<void> {
    this.state = null;
  }

  async exists(): Promise<boolean> {
    return this.state !== null;
  }

  // Test helper methods

  /**
   * Reset repository to null state
   */
  reset(): void {
    this.state = null;
  }

  /**
   * Directly set state (bypassing validation)
   */
  setState(state: State | null): void {
    this.state = state;
  }

  /**
   * Get current state without cloning (for test assertions)
   */
  getStateSnapshot(): StateConfig | null {
    return this.state ? this.state.toJSON() : null;
  }
}
