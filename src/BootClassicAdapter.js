/**
 * Creates the data receiver lifecycle
 */

import { BootAdapter } from './BootAdapter.js';

export class BootClassicAdapter extends BootAdapter {

  // Defines the adapter state
  static __appReceive = null;
  static __appRun = null;
  static __battleReceivers = [];
  static __mutex = {
    ok: false,
    battleBuf: [],
  };
  static receiverFactory = null;

  // Intercepts client data via window.app.receive
  static hook = () => {
    console.debug('[Gen 3 OU Tools] Intercepting client data via window.app.receive.');

    // Creates a copy of the client data receiver
    this.__appReceive = window.app.receive.bind(window.app);

    // Sends the client data to the data receivers
    window.app.receive = (data) => {

      // Sends the client data to the client data receiver
      this.__appReceive(data);

      // Checks if the client data is in the correct format
      if (typeof data !== 'string' || !data.length) {
        return;
      }

      // Checks if the client data is user data and stores the username
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

        // Checks if the user has a username and is registered
        if (!username || namedCode !== '1') {
          return;
        }

        // Stores the username
        BootClassicAdapter.authUsername = username;
      }

      // Checks if the client data is battle data and sends the battle data to the data receiver
      if (data.startsWith('>battle-')) {
        const roomId = data.slice(1, data.indexOf('\n'));

        console.debug(
          '[Gen 3 OU Tools] Received client data via window.app.receive.',
          '\nbattle room:', roomId,
          '\ndata:', data,
        );

        // Stores the battle data in the buffer if the initialization sequence is active
        if (!this.__mutex.ok) {
          this.__mutex.battleBuf.push([roomId, data]);

          return;
        }

        // Fetches the data receiver for the battle room
        let receiver = this.battleReceiverNamed(roomId);

        // Creates a data receiver for the battle room if none exists
        if (!receiver && typeof this.receiverFactory === 'function') {
          receiver = this.receiverFactory(roomId);

          if (typeof receiver === 'function') {
            this.addBattleReceiver(roomId, receiver);
          }
        }

        // Checks if the data receiver is valid
        if (typeof receiver !== 'function') {
          return;
        }

        // Sends the battle data to the data receiver
        receiver(data);
      }
    };
  };

  // Intercepts battle data via window.Battle.prototype.run
  static runHook = () => {
    console.debug('[Gen 3 OU Tools] Intercepting battle data via window.Battle.prototype.run.');

    // Creates a copy of the client battle data receiver
    this.__appRun = window.Battle.prototype.run;

    // Sends the battle data to the data receivers
    window.Battle.prototype.run = function(...args) {

      // Sends the battle data to the client battle data receiver
      const result = BootClassicAdapter.__appRun.apply(this, args);

      // Checks if the battle data is in the correct format
      const command = args[0];

      if (typeof command === 'string' && !!command.length) {
        const roomId = this.id;

        console.debug(
          '[Gen 3 OU Tools] Received client data via window.Battle.prototype.run.',
          '\nbattle room:', roomId,
          '\ncommand:', command,
          '\nargs:', args,
        );

        // Checks if the initialization sequence is active
        if (!BootClassicAdapter.__mutex.ok) {
          
          // Stores the battle data in the buffer
          BootClassicAdapter.__mutex.battleBuf.push([roomId, command]);
        } else {

          // Fetches the data receiver for the battle room
          let receiver = BootClassicAdapter.battleReceiverNamed(roomId);

          // Creates a data receiver for the battle room if none exists
          if (!receiver && typeof BootClassicAdapter.receiverFactory === 'function') {
            receiver = BootClassicAdapter.receiverFactory(roomId);

            if (typeof receiver === 'function') {
              BootClassicAdapter.addBattleReceiver(roomId, receiver);
            }
          }

          // Checks if the data receiver is valid and sends the battle data to the data receiver
          if (typeof receiver === 'function') {
            receiver(command);
          }
        }
      }

      return result;
    };
  };

  // Adds each hook to the registry
  static {
    this.registerHook(this.hook);
    this.registerHook(this.runHook);
  };

  // Flushes the buffer after initialization
  static ready = () => {

    // Sends the battle data collected by the buffer during initialization to the data receiver
    this.__mutex.battleBuf.forEach(([roomId, data]) => {
      const receiver = this.battleReceiverNamed(roomId);

      if (typeof receiver === 'function') {
        receiver(data);
      }
    });

    // Empties the buffer and releases the mutex lock
    this.__mutex.battleBuf.length = 0;
    this.__mutex.ok = true;
  };

  // Creates an array of data receivers
  static get receivers() {
    return this.__battleReceivers;
  };

  // Fetches the data receiver for the battle room
  static battleReceiverNamed(key) {
    if (!key || !this.__battleReceivers.length) {
      return null;
    }

    const pair = this.__battleReceivers.find((receiver) => receiver[0] === key);

    return pair ? pair[1] : null;
  };

  // Adds a data receiver to the array of data receivers
  static addBattleReceiver(roomId, receiver) {
    if (!roomId || typeof receiver !== 'function' || this.__battleReceivers.some((receiver) => receiver[0] === roomId)) {
      return;
    }

    this.__battleReceivers.push([roomId, receiver]);
  };

  // Removes a data receiver from the array of data receivers
  static removeBattleReceiver(key) {
    if (!key || !this.__battleReceivers.length) {
      return;
    }

    const index = this.__battleReceivers.findIndex((receiver) => receiver[0] === key);

    if (index >= 0) {
      this.__battleReceivers.splice(index, 1);
    }
  };

  // Removes all data receivers from the array of data receivers
  static clearBattleReceivers() {
    if (!this.__battleReceivers.length) {
      return;
    }

    this.__battleReceivers.length = 0;
  };
}