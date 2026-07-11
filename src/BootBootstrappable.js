/**
 * Creates the bootstrapper template
 */

import { BootAdapter } from './BootAdapter';
import { BootManager } from './BootManager';

export class BootBootstrappable {

  // Exposes the adapter and the manager classes
  static Adapter = BootAdapter;
  static Manager = BootManager;

  // Defines the default client layout
  static hasSinglePanel = () => false;

  // Checks if a lifecycle method is executed without being overridden
  open() {
    throw new Error('Bootstrapper error: open() must be overridden.');
  }

  close() {
    throw new Error('Bootstrapper error: close() must be overridden.');
  }

  run() {
    throw new Error('Bootstrapper error: run() must be overridden.');
  }

  destroy() {
    throw new Error('Bootstrapper error: destroy() must be overridden.');
  }
}