/**
 * Creates the bootstrapper template
 */

import { BootAdapter } from './BootAdapter';
import { BootManager } from './BootManager';

export class BootBootstrappable {

  // Creates references to the adapter and the manager
  static Adapter = BootAdapter;
  static Manager = BootManager;

  // Determines if the client is in the single panel layout EDITINGNOTE: determines? this is really initializing right? why is this here?
  static hasSinglePanel = () => false;

  // Checks if a lifecycle method is executed without being implemented
  open() {
    throw new Error('Bootstrapper error: open() is not implemented.');
  }

  close() {
    throw new Error('Bootstrapper error: close() is not implemented.');
  }

  run() {
    throw new Error('Bootstrapper error: run() is not implemented.');
  }

  destroy() {
    throw new Error('Bootstrapper error: destroy() is not implemented.');
  }
}