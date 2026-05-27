// Creates the data receiver lifecycles for active rooms EDITINGNOTE: LEFT OFF HERE ON SECOND PASS - DO BOOTMANAGER FIRST THEN THIS, then CONTINUE DOWN, DO MAIN LAST
import { BootAdapter } from './BootAdapter.js';

export class BootClassicAdapter extends BootAdapter {

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
    console.log('[Gen 3 OU Tools] Intercepting client data via window.app.receive.');

    // Creates a copy of the client data receiver
    this.__appReceive = window.app.receive.bind(window.app);

    // Sends client data to data recievers
    window.app.receive = (data) => {

      // Sends the client data to the client data receiver
      this.__appReceive(data);

      // Checks if the client data is the correct type
      if (typeof data !== 'string' || !data.length) {
        return;
      }

      // Checks if the client data is user data and identifies the username
      if (data.startsWith('|updateuser|')) {
        const [
          ,
          ,
          username,
          namedCode,
        ] = data.split('|');

        console.debug(
          '[Gen 3 OU Tools] User logged in as', namedCode === '1' ? 'registered' : 'guest', 'username:', username?.trim(),
          '\ndata:', data,
        );

        // Checks if the username is valid and registered
        if (!username || namedCode !== '1') {
          return;
        }

        // Stores the username
        BootClassicAdapter.authUsername = username;
      }

      // Checks if the client data is from a battle room and identifies the room
      if (data.startsWith('>battle-')) {
        const roomId = data.slice(1, data.indexOf('\n'));

        // Stores the client data in a buffer if the initialization pipeline is active
        if (!this.__mutex.ok) {
          this.__mutex.battleBuf.push([roomId, data]);
          return;
        }

        // Defines the data receiver for the room
        let receiver = this.battleReceiverNamed(roomId);

        // Generates a data receiver for the room if none exists
        if (!receiver && typeof this.receiverFactory === 'function') {
          receiver = this.receiverFactory(roomId);

          if (typeof receiver === 'function') {
            this.addBattleReceiver(roomId, receiver);
          }
        }

        if (typeof receiver !== 'function') {
          return;
        }

        // Sends the client data to the data receiver
        receiver(data);
      }
    };
  };

  // Flushes the buffer after initialization
  static ready = () => {
    console.log('[Gen 3 OU Tools] Adapter initialized. Flushing the buffer.');

    // Sends the client data collected by the buffer during initialization to the data receiver
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
    if (!roomId || typeof receiver !== 'function' || this.__battleReceivers.some((r) => r[0] === roomId)) {
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
}