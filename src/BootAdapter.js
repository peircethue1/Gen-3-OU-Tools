/**
 * Creates the initialization lifecycle
 */

export class BootAdapter {

  // Defines the initialization state
  static __initialized = false;
  static __authUsername = null;

  // Defines the initialization lifecycle hooks
  static hook = null;
  static ready = null;

  // Prepares the extension state
  static async __init() {
    if (this.__initialized) {
      return;
    }

    // Defines the initialization lock
    this.__initialized = true;
  };

  // EDITINGNOTE: A getter is created here for rootState based on getState(). Do I need an analog?

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
    try {
      if (typeof this.hook === 'function') {
        await this.hook();
      }
    } catch (error) {
      console.error('[Gen 3 OU Tools] Initialization failed: An error occurred while executing hook setup.', error);
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

    console.debug('[Gen 3 OU Tools] The initialization pipeline finished successfully.');
  };
}