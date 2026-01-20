/**
 * StateService - Business logic for workflow state management
 *
 * Extracts state operations from CLI commands into testable service layer.
 * Uses dependency injection for repository and logger.
 */

import { State, Phase, StateConfig } from '../domain/state-entity';
import { IStateRepository } from '../repositories/state-repository';
import { ILogger } from '../infrastructure/logger';

export interface StateUpdate {
  phase?: Phase;
  currentTask?: string;
  prd?: any;
  addError?: any;
}

/**
 * IStateService interface for dependency injection
 */
export interface IStateService {
  /**
   * Get current workflow state
   */
  getState(): Promise<State | null>;

  /**
   * Initialize new workflow state
   */
  initializeState(phase?: Phase): Promise<State>;

  /**
   * Update state fields
   */
  updateState(updates: StateUpdate): Promise<State>;

  /**
   * Set current task
   */
  setCurrentTask(taskId: string | undefined): Promise<State>;

  /**
   * Clear state (delete state file)
   */
  clearState(): Promise<void>;

  /**
   * Check if state exists
   */
  exists(): Promise<boolean>;
}

/**
 * StateService implementation
 */
export class StateService implements IStateService {
  constructor(
    private stateRepository: IStateRepository,
    private logger: ILogger
  ) {}

  async getState(): Promise<State | null> {
    this.logger.debug('Getting workflow state');
    return await this.stateRepository.get();
  }

  async initializeState(phase: Phase = 'clarify'): Promise<State> {
    this.logger.info(`Initializing workflow state`, { phase });

    // Check if state already exists
    const existing = await this.stateRepository.get();
    if (existing) {
      this.logger.warn('State already exists, returning existing state');
      return existing;
    }

    // Create new state
    const now = new Date().toISOString();
    const stateConfig: Omit<StateConfig, 'updatedAt'> = {
      phase,
      startedAt: now,
    };

    await this.stateRepository.set(stateConfig);

    const state = await this.stateRepository.get();
    if (!state) {
      throw new Error('Failed to initialize state');
    }

    this.logger.info(`Workflow state initialized`, { phase });
    return state;
  }

  async updateState(updates: StateUpdate): Promise<State> {
    this.logger.info('Updating workflow state', { updates });

    const currentState = await this.stateRepository.get();
    if (!currentState) {
      throw new Error('State not found. Initialize state first.');
    }

    // Apply updates using repository
    await this.stateRepository.update(updates);

    const updatedState = await this.stateRepository.get();
    if (!updatedState) {
      throw new Error('Failed to update state');
    }

    this.logger.info('Workflow state updated');
    return updatedState;
  }

  async setCurrentTask(taskId: string | undefined): Promise<State> {
    this.logger.info('Setting current task', { taskId });

    const currentState = await this.stateRepository.get();
    if (!currentState) {
      throw new Error('State not found. Initialize state first.');
    }

    await this.stateRepository.update({ currentTask: taskId });

    const updatedState = await this.stateRepository.get();
    if (!updatedState) {
      throw new Error('Failed to set current task');
    }

    this.logger.info('Current task set', { taskId });
    return updatedState;
  }

  async clearState(): Promise<void> {
    this.logger.info('Clearing workflow state');
    await this.stateRepository.clear();
    this.logger.info('Workflow state cleared');
  }

  async exists(): Promise<boolean> {
    return await this.stateRepository.exists();
  }
}
