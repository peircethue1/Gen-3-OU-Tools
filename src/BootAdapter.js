/**
 * Creates the initialization lifecycle
 * EDITINGNOTE: See notes...
 */

import { createStore, gen3OUToolsSlice } from '@showdex/redux/store'; // EDITINGNOTE: Build these and fix the import
import { bakeBakedexBundles } from '@showdex/utils/app'; // EDITINGNOTE: Build this, fix the import, and rename this to avoid Bakedex name
import { openIndexedDb } from '@showdex/utils/storage'; // EDITINGNOTE: Build this and fix the import

export class BootAdapter {

  // Manages the initialization state
  static store = createStore();
  static db = null;
  static __initialized = false;

  // Manages the initialization lifecycle hooks
  static hooks = [];
  static ready = null;

  // Adds a hook to the registry
  static registerHook(hook) {
    if (typeof hook !== 'function' || this.hooks.some((registeredHook) => registeredHook === hook)) {
      return;
    }

    this.hooks.push(hook);
  }

  // Initializes the storage and background data synchronization EDITINGNOTE: Rename once it's clear what Bakedex does
  static async __init() {
    if (this.__initialized) {
      return;
    }

    if (!this.db) {
      this.db = await openIndexedDb();
    }

    void bakeBakedexBundles({ db: this.db, store: this.store }); // EDITINGNOTE: Rename this to avoid Bakedex name

    this.__initialized = true;
  }

  // Gets the root state tree
  static get rootState() {
    return this.store.getState();
  }

  // Gets the color scheme of the active layout
  static get colorScheme() {
    return this.rootState?.gen3OUTools?.settings?.colorScheme;
  }

  // Sets the color scheme of the active layout
  static set colorScheme(value) {
    this.store.dispatch(gen3OUToolsSlice.actions.setColorScheme(value));
  }

  // Gets the authenticated username
  static get authUsername() {
    return this.rootState?.gen3OUTools?.authUsername;
  }

  // Sets the authenticated username
  static set authUsername(value) {
    this.store.dispatch(gen3OUToolsSlice.actions.setAuthUsername(value?.trim()));
  }

  // Executes the initialization sequence
  static async run() {
    console.debug('[Gen 3 OU Tools] Starting the initialization sequence.');

    for (const hook of this.hooks) {
      try {
        hook();
      } catch (error) {
        console.error('[Gen 3 OU Tools] Initialization failed: An error occurred while executing hook setup.', error);
      }
    }

    try {
      await this.__init();
      await this.ready?.();
    } catch (error) {
      console.error('[Gen 3 OU Tools] Initialization failed: An error occurred while executing initialization.', error);
    }

    console.debug('[Gen 3 OU Tools] The initialization sequence finished successfully.');
  }
}