/**
 * Creates the data receiver lifecycle
 * EDITINGNOTE: See note...
 * EDITINGNOTE: window.app.receive is validated in main, but there is no validation for window.Battle.prototype.run
 */

import { BootAdapter } from './BootAdapter.js';

export class BootClassicAdapter extends BootAdapter {

  // Manages the adapter state
  static __appReceive = null;
  static __appRun = null;
  static __battleReceivers = [];
  static __colorSchemeObserver = null;
  static __mutex = { ok: false, battleBuf: [] };
  static receiverFactory = null;

  // Intercepts client data via window.app.receive
  static receiveHook = () => {
    console.debug('[Gen 3 OU Tools] Intercepting client data via window.app.receive.');

    this.__appReceive = window.app.receive.bind(window.app);

    // Sends the client data to the data receivers
    window.app.receive = (data) => {

      // Sends the client data to the client data receiver
      this.__appReceive(data);

      if (typeof data !== 'string' || !data.length) {
        return;
      }

      // Checks if the client data is a user login and stores the authenticated username
      if (data.startsWith('|updateuser|')) {
        const [
          ,
          ,
          username,
          namedCode,
        ] = data.split('|');

        console.debug(
          '[Gen 3 OU Tools] User logged in.',
          '\nuser type:', namedCode === '1' ? 'registered' : 'guest',
          '\nusername:', username?.trim(),
          '\ndata:', data,
        );

        if (!username || namedCode !== '1') {
          return;
        }

        BootClassicAdapter.authUsername = username;
      }

      // Checks if the client data is battle data and sends the battle data to the battle receiver
      if (data.startsWith('>battle-')) {
        const roomId = data.slice(1, data.indexOf('\n'));

        console.debug(
          '[Gen 3 OU Tools] Received battle data via window.app.receive.',
          '\nbattle room:', roomId,
          '\ndata:', data,
        );

        if (!this.__mutex.ok) {
          this.__mutex.battleBuf.push([roomId, data]);

          return;
        }

        let receiver = this.battleReceiverNamed(roomId);

        if (!receiver && typeof this.receiverFactory === 'function') {
          receiver = this.receiverFactory(roomId);

          if (typeof receiver === 'function') {
            this.addBattleReceiver(roomId, receiver);
          }
        }

        if (typeof receiver !== 'function') {
          return;
        }

        receiver(data);
      }
    };

    console.debug('[Gen 3 OU Tools] Initializing the client color scheme observer.');

    // Creates a client color scheme observer
    this.__colorSchemeObserver = new MutationObserver((mutationList) => {
      const [mutation] = mutationList || [];

      if (mutation?.type !== 'attributes') {
        return;
      }

      const { className } = mutation.target || {};
      const colorScheme = className?.includes('dark') ? 'dark' : 'light';

      BootClassicAdapter.colorScheme = colorScheme;
    });

    // Observes the root element class
    this.__colorSchemeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
      childList: false,
      characterData: false,
    });
  }

  // Intercepts battle data via window.Battle.prototype.run
  static runHook = () => {
    console.debug('[Gen 3 OU Tools] Intercepting battle data via window.Battle.prototype.run.');

    this.__appRun = window.Battle.prototype.run;

    // Sends the battle data to the data receivers
    window.Battle.prototype.run = function (...args) {
      const result = BootClassicAdapter.__appRun.apply(this, args);

      const command = args[0];

      // Sends the battle data to the battle receiver
      if (typeof command === 'string' && command.length) {
        const roomId = this.id;

        console.debug(
          '[Gen 3 OU Tools] Received battle data via window.Battle.prototype.run.',
          '\nbattle room:', roomId,
          '\ncommand:', command,
          '\nargs:', args,
        );

        if (!BootClassicAdapter.__mutex.ok) {
          BootClassicAdapter.__mutex.battleBuf.push([roomId, command]);
        } else {
          let receiver = BootClassicAdapter.battleReceiverNamed(roomId);

          if (!receiver && typeof BootClassicAdapter.receiverFactory === 'function') {
            receiver = BootClassicAdapter.receiverFactory(roomId);

            if (typeof receiver === 'function') {
              BootClassicAdapter.addBattleReceiver(roomId, receiver);
            }
          }

          if (typeof receiver === 'function') {
            receiver(command);
          }
        }
      }

      // Sends the battle data to the client battle data receiver
      return result;
    };
  }

  // Executes hook setup
  static hook = () => {
    this.receiveHook?.();
    this.runHook?.();
  }

  // Flushes the buffer
  static ready = () => {
    this.__mutex.battleBuf.forEach(([roomId, data]) => {
      const receiver = this.battleReceiverNamed(roomId);

      if (typeof receiver === 'function') {
        receiver(data);
      }
    });

    this.__mutex.battleBuf.length = 0;
    this.__mutex.ok = true;
  }

  // Gets the battle receivers
  static get receivers() {
    return this.__battleReceivers;
  }

  // Fetches the battle receiver for the battle room
  static battleReceiverNamed(key) {
    if (!key || !this.__battleReceivers.length) {
      return null;
    }

    const pair = this.__battleReceivers.find((receiver) => receiver[0] === key);

    return pair ? pair[1] : null;
  }

  // Adds a battle receiver to the list of battle receivers
  static addBattleReceiver(roomId, receiver) {
    if (!roomId || typeof receiver !== 'function' || this.__battleReceivers.some((registeredReceiver) => registeredReceiver[0] === roomId)) {
      return;
    }

    this.__battleReceivers.push([roomId, receiver]);
  }

  // Removes a battle receiver from the list of battle receivers
  static removeBattleReceiver(key) {
    if (!key || !this.__battleReceivers.length) {
      return;
    }

    const index = this.__battleReceivers.findIndex((receiver) => receiver[0] === key);

    if (index >= 0) {
      this.__battleReceivers.splice(index, 1);
    }
  }

  // Removes all battle receivers from the list of battle receivers
  static clearBattleReceivers() {
    if (!this.__battleReceivers.length) {
      return;
    }

    this.__battleReceivers.length = 0;
  }
}