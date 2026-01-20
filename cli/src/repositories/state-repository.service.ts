/**
 * FileSystem-based State Repository Implementation
 *
 * Persists workflow state to .ralph-dev/state.json with retry logic.
 */

import * as path from 'path';
import { IFileSystem } from '../infrastructure/file-system';
import { IStateRepository, State, StateUpdate } from './state-repository';

export class FileSystemStateRepository implements IStateRepository {
  private readonly stateFile: string;

  constructor(
    private fileSystem: IFileSystem,
    private workspaceDir: string
  ) {
    this.stateFile = path.join(workspaceDir, '.ralph-dev', 'state.json');
  }

  async get(): Promise<State | null> {
    const exists = await this.fileSystem.exists(this.stateFile);
    if (!exists) {
      return null;
    }

    const content = await this.fileSystem.readFile(this.stateFile, 'utf-8');
    return JSON.parse(content as string);
  }

  async set(state: Omit<State, 'updatedAt'>): Promise<void> {
    const fullState: State = {
      ...state,
      updatedAt: new Date().toISOString(),
    };

    // Ensure directory exists
    await this.fileSystem.ensureDir(path.dirname(this.stateFile));

    // Write state
    await this.fileSystem.writeFile(
      this.stateFile,
      JSON.stringify(fullState, null, 2),
      { encoding: 'utf-8' }
    );
  }

  async update(updates: StateUpdate): Promise<void> {
    const currentState = await this.get();
    if (!currentState) {
      throw new Error('State not found. Use set() to initialize state.');
    }

    // Apply updates
    if (updates.phase !== undefined) {
      currentState.phase = updates.phase;
    }

    if (updates.currentTask !== undefined) {
      currentState.currentTask = updates.currentTask;
    }

    if (updates.prd !== undefined) {
      currentState.prd = updates.prd;
    }

    if (updates.addError !== undefined) {
      currentState.errors = currentState.errors || [];
      currentState.errors.push(updates.addError);
    }

    // Update timestamp
    currentState.updatedAt = new Date().toISOString();

    // Write updated state
    await this.fileSystem.writeFile(
      this.stateFile,
      JSON.stringify(currentState, null, 2),
      { encoding: 'utf-8' }
    );
  }

  async clear(): Promise<void> {
    const exists = await this.fileSystem.exists(this.stateFile);
    if (exists) {
      await this.fileSystem.remove(this.stateFile);
    }
  }

  async exists(): Promise<boolean> {
    return this.fileSystem.exists(this.stateFile);
  }
}
