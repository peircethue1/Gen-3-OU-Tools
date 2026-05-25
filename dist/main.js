(() => {
  // src/BootAdapter.js
  var BootAdapter = class {
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
      this.__initialized = true;
    }
    // Executes the initialization pipeline
    static async run() {
      console.log("[Gen 3 OU Tools] Starting the initialization pipeline.");
      try {
        if (typeof this.hook === "function") {
          await this.hook();
        }
      } catch (error) {
        console.error("[Gen 3 OU Tools] Initialization failed: An error occurred while executing hook setup.", error);
      }
      try {
        await this.__init();
        if (typeof this.ready === "function") {
          await this.ready();
        }
      } catch (error) {
        console.error("[Gen 3 OU Tools] Initialization failed: An error occurred during post-initialization setup.", error);
      }
      console.log("[Gen 3 OU Tools] The initialization pipeline completed successfully.");
    }
  };

  // src/BootClassicAdapter.js
  var BootClassicAdapter = class extends BootAdapter {
    // Defines the adapter state
    static __appReceive = null;
    static __battleReceivers = [];
    static __mutex = {
      ok: false,
      battleBuf: []
    };
    static receiverFactory = null;
    // Intercepts client data
    static hook = () => {
      console.log("[Gen 3 OU Tools] Intercepting client data via window.app.receive.");
      this.__appReceive = window.app.receive.bind(window.app);
      window.app.receive = (data) => {
        this.__appReceive(data);
        if (typeof data !== "string" || !data.length) {
          return;
        }
        if (data.startsWith(">battle-")) {
          const roomId = data.slice(1, data.indexOf("\n"));
          if (!this.__mutex.ok) {
            this.__mutex.battleBuf.push([roomId, data]);
            return;
          }
          let receiver = this.battleReceiverNamed(roomId);
          if (!receiver && typeof this.receiverFactory === "function") {
            receiver = this.receiverFactory(roomId);
            if (typeof receiver === "function") {
              this.addBattleReceiver(roomId, receiver);
            }
          }
          if (typeof receiver !== "function") {
            return;
          }
          receiver(data);
        }
      };
    };
    // Flushes the buffer after initialization
    static ready = () => {
      console.log("[Gen 3 OU Tools] Adapter initialized. Flushing the buffer.");
      this.__mutex.battleBuf.forEach(([roomId, data]) => {
        const receiver = this.battleReceiverNamed(roomId);
        if (typeof receiver === "function") {
          receiver(data);
        }
      });
      this.__mutex.battleBuf.length = 0;
      this.__mutex.ok = true;
    };
    // Creates a list of active rooms
    static get receivers() {
      return this.__battleReceivers;
    }
    // Identifies the data receiver for a room
    static battleReceiverNamed(key) {
      if (!key || !this.__battleReceivers.length) {
        return null;
      }
      const pair = this.__battleReceivers.find((r) => r[0] === key);
      return pair ? pair[1] : null;
    }
    // Adds new rooms and data receivers to the list of active rooms
    static addBattleReceiver(roomId, receiver) {
      if (!roomId || typeof receiver !== "function" || this.__battleReceivers.some((r) => r[0] === roomId)) {
        return;
      }
      this.__battleReceivers.push([roomId, receiver]);
    }
    // Removes a room from the list of active rooms
    static removeBattleReceiver(key) {
      if (!key || !this.__battleReceivers.length) {
        return;
      }
      const index = this.__battleReceivers.findIndex((r) => r[0] === key);
      if (index >= 0) {
        this.__battleReceivers.splice(index, 1);
      }
    }
    // Removes all rooms from the list of active rooms
    static clearBattleReceivers() {
      this.__battleReceivers.length = 0;
    }
  };

  // src/main.js
  console.log("[Gen 3 OU Tools] Starting the initialization engine.");
  if (typeof window?.Dex?.gen !== "number" || typeof window.Dex.forGen !== "function" || typeof window.app?.receive !== "function") {
    console.error(
      "[Gen 3 OU Tools] Initialization failed: Executed on an unsupported webpage or before the webpage finished loading.",
      "\nwindow.Dex:",
      typeof window?.Dex,
      "\nwindow.app:",
      typeof window?.app
    );
    throw new Error("Gen 3 OU Tools attempted to start in an unsupported webpage.");
  }
  if (window.__GEN_3_OU_TOOLS_INIT) {
    console.error(
      "[Gen 3 OU Tools] Initialization failed: An instance of Gen 3 OU Tools was already active on this webpage.",
      "\n__GEN_3_OU_TOOLS_INIT:",
      window.__GEN_3_OU_TOOLS_INIT
    );
    throw new Error("Another instance of Gen 3 OU Tools tried to start when one was already active.");
  }
  window.__GEN_3_OU_TOOLS_INIT = "gen-3-ou-tools";
  window.__GEN_3_OU_TOOLS_HOST = typeof window.app?.receive === "function" ? "classic" : null;
  (async () => {
    if (window.__GEN_3_OU_TOOLS_HOST === "classic") {
      BootClassicAdapter.receiverFactory = (roomId) => () => new (void 0)(roomId).run();
      await BootClassicAdapter.run();
    } else {
      console.error(
        "[Gen 3 OU Tools] Initialization failed: Could not determine the host environment.",
        "\n__GEN_3_OU_TOOLS_HOST:",
        window.__GEN_3_OU_TOOLS_HOST
      );
      throw new Error("Gen 3 OU Tools attempted to run with an unsupported host.");
    }
    console.log("[Gen 3 OU Tools] Adapter initialized successfully.");
  })();
})();
//# sourceMappingURL=main.js.map
