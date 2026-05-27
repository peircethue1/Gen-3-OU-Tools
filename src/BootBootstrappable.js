/**
 * Creates references and a template for the bootstrappers
 */

import { BootAdapter } from './BootAdapter';
import { BootManager } from './BootManager';

export class BootBootstrappable {

  // Creates references to the adapter and the manager
  static Adapter = BootAdapter;
  static Manager = BootManager;

  // Determines if the client is in the single panel layout
  static hasSinglePanel = () => false;

  // Checks if a lifecycle method is executed without being implemented
  open() {
    throw new Error('Bootstrapper Error: open() is not implemented.');
  }

  close() {
    throw new Error('Bootstrapper Error: close() is not implemented.');
  }

  run() {
    throw new Error('Bootstrapper Error: run() is not implemented.');
  }

  destroy() {
    throw new Error('Bootstrapper Error: destroy() is not implemented.');
  }
}