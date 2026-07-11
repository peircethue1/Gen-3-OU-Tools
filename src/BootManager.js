/**
 * Creates the registration and execution lifecycles
 */

import { BootAdapter } from './BootAdapter';

export class BootManager {

  // Exposes the adapter class
  static Adapter = BootAdapter;

  // Manages the bootstrapper registry
  static __bootstrappers = {
    tools: null,
  }

  // Gets the registered bootstrapper names
  static get registry() {
    return Object.entries(this.__bootstrappers)
      .filter(([, bootstrapper]) => !!bootstrapper)
      .map(([name]) => name);
  }

  // Registers a bootstrapper
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

  // Checks if the bootstrapper is registered
  static registered(name) {
    return !!this.__bootstrappers[name];
  }

  // Retrieves a bootstrapper from the registry
  static named(name) {
    const Bootstrapper = this.__bootstrappers[name];

    if (!this.registered(name)) {
      console.error(
        '[Gen 3 OU Tools] The bootstrapper is not registered.',
        '\nname:', name,
        '\nBootstrapper.name:', Bootstrapper.name,
        '\nBootstrapper:', Bootstrapper,
      );

      throw new Error(`The ${name} bootstrapper could not be found.`);
    }

    return Bootstrapper;
  }

  // Runs the Tools bootstrapper
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

  // Destroys the Tools session
  static destroyTools(battleId) {
    if (!battleId) {
      return;
    }

    new (this.named('tools'))(battleId).destroy();
  }
}