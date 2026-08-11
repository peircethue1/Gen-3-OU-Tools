/**
 * Creates the initialization lifecycle
 */

import { openIndexedDb } from '@gen-3-ou-tools/utilities.js';
import { createStore } from '@gen-3-ou-tools/redux/createStore.js';
import { syncSmogonData } from '@gen-3-ou-tools/redux/syncSmogonData.js';
import { gen3OUToolsSlice } from '@gen-3-ou-tools/redux/gen3OUToolsSlice.js';

export class BootAdapter {

  // Manages the initialization state
  static store = createStore();
  static db = null;
  static __initialized = false;

  // Manages the initialization lifecycle hooks
  static hook = null;
  static ready = null;

  // Initializes the database and syncs Smogon data to the store
  static async __init() {
    if (this.__initialized) {
      return;
    }

    if (!this.db) {
      this.db = await openIndexedDb();
    }

    await syncSmogonData({ db: this.db, store: this.store });

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

    try {
      this.hook?.();
    } catch (error) {
      console.error('[Gen 3 OU Tools] Initialization failed: An error occurred while executing hook setup.', error);
    }

    try {
      await this.__init();
      await this.ready?.();

      console.debug('[Gen 3 OU Tools] The initialization sequence finished successfully.');
    } catch (error) {
      console.error('[Gen 3 OU Tools] Initialization failed: An error occurred while executing initialization.', error);
    }
  }
}