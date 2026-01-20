/**
 * Repository exports
 *
 * This module exports all repository interfaces and implementations.
 */

// Task Repository
export { ITaskRepository, TaskFilter } from './task-repository';
export { FileSystemTaskRepository } from './task-repository.service';

// State Repository
export { IStateRepository, State, StateUpdate, Phase } from './state-repository';
export { FileSystemStateRepository } from './state-repository.service';

// Index Repository
export {
  IIndexRepository,
  TaskIndex,
  TaskIndexEntry,
  MetadataUpdate,
} from './index-repository';
export { FileSystemIndexRepository } from './index-repository.service';
