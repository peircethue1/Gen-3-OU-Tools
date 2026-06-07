/**
 * Creates registration and execution lifecycles
 */

import { BootAdapter } from './BootAdapter';

export class BootManager {

  // Defines the registry state
  static Adapter = BootAdapter;
  static __bootstrappers = {
    tools: null,
  };

  // Creates an array of registered bootstrappers
  static get registry() {
    return Object.entries(this.__bootstrappers)
      .filter(([, bootstrapper]) => !!bootstrapper)
      .map(([name]) => name);
  }

  // Adds the bootstrapper to the registry
  static register(name, Bootstrapper) {
    if (!name || !(name in this.__bootstrappers) || typeof Bootstrapper !== 'function') {
      return;
    }

    this.__bootstrappers[name] = Bootstrapper;

    console.debug(
      '[Gen 3 OU Tools] Registered the bootstrapper.',
      '\nBootstrapper.name:', Bootstrapper.name,
      '\nname:', name,
      '\nregistry:', this.registry,
    );
  }

  // Checks if the bootstrapper has been registered
  static registered(name) {
    return !!this.__bootstrappers[name];
  }

  // Fetches the bootstrapper from the registry
  static named(name) {
    const Bootstrapper = this.__bootstrappers[name];

    if (!this.registered(name)) {
      console.error(
        '[Gen 3 OU Tools] The bootstrapper is not registered.',
        '\nname:', name,
        '\nBootstrapper.name:', Bootstrapper.name,
        '\nBootstrapper:', Bootstrapper,
      );

      throw new Error('The', name, 'bootstrapper could not be found.');
    }

    return Bootstrapper;
  }

  // Initializes the Tools panel
  static runTools(battleId) {
    if (!battleId) {
      return;
    }

    new (this.named('tools'))(battleId).run();
  }

  // Opens the Tools panel
  static openTools(battleId) {
    if (!battleId) {
      return;
    }

    new (this.named('tools'))(battleId).open();
  }

  // Closes the Tools panel
  static closeTools(battleId) {
    if (!battleId) {
      return;
    }

    new (this.named('tools'))(battleId).close();
  }

  // Removes the Tools panel
  static destroyTools(battleId) {
    if (!battleId) {
      return;
    }

    new (this.named('tools'))(battleId).destroy();
  }
}