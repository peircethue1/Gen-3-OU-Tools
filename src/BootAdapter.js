// Creates the initialization lifecycle
export class BootAdapter {

  // Defines the initialization state
  static __initialized = false;

  // Defines the lifecycle hooks
  static hook = null;
  static ready = null;

  // EDITINGNOTE: check if this is needed
  // static receiverFactory = null;

  // Prepares the internal state
  static async __init() {
    if (this.__initialized) {
      return;
    }

    // Defines the initialization lock
    this.__initialized = true;
  }

  // Executes the initialization pipeline
  static async run() {
    console.log('[Gen 3 OU Tools] Starting the initialization pipeline.');

    // Executes hook setup
    try {
      if (typeof this.hook === 'function') {
        await this.hook();
      }
    } catch (error) {
      console.error("[Gen 3 OU Tools] Initialization failed: An error occurred while executing hook setup.", error);
    }

    // Executes post-initialization setup
    try {
      await this.__init();

      if (typeof this.ready === 'function') {
        await this.ready();
      }
    } catch (error) {
      console.error("[Gen 3 OU Tools] Initialization failed: An error occurred during post-initialization setup.", error);
    }

    console.log('[Gen 3 OU Tools] The initialization pipeline completed successfully.');
  }
}