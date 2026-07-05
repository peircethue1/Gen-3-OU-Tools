/**
 * Creates the initialization lifecycle
 */

export class BootAdapter {

  // Defines the initialization state
  static __initialized = false;
  static __colorScheme = null;
  static __authUsername = null;

  // Defines the initialization lifecycle hooks
  static __hooks = [];
  static ready = null;

  // Adds a hook to the registry
  static registerHook(hook) {
    if (typeof hook === 'function') {
      this.__hooks.push(hook)
    }
  }

  // Prepares the extension state
  static async __init() {
    if (this.__initialized) {
      return;
    }

    // Defines the initialization lock
    this.__initialized = true;
  };

  // Fetches the color scheme
  static get colorScheme() {
    return this.__colorScheme;
  }

  // Updates the color scheme
  static set colorScheme(value) {
    this.__colorScheme = value;
  }

  // Fetches the username
  static get authUsername() {
    return this.__authUsername;
  }

  // Updates the username
  static set authUsername(value) {
    this.__authUsername = value?.trim() || null;
  }

  // Executes the initialization sequence
  static async run() {
    console.debug('[Gen 3 OU Tools] Starting the initialization sequence.');

    // Executes hook setup
    for (const hook of this.__hooks) {
      try {
        await hook();
      } catch (error) {
        console.error('[Gen 3 OU Tools] Initialization failed: An error occurred while executing hook setup.', error);
      }
    }

    // Executes post-initialization setup
    try {
      await this.__init();

      if (typeof this.ready === 'function') {
        await this.ready();
      }
    } catch (error) {
      console.error('[Gen 3 OU Tools] Initialization failed: An error occurred while executing post-initialization setup.', error);
    }

    console.debug('[Gen 3 OU Tools] The initialization sequence finished successfully.');
  };
}