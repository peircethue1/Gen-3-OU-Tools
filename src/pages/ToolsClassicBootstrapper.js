/**
 * Creates the classic Tools bootstrapper
 * EDITINGNOTE: See notes...
 * EDITINGNOTE: Consider changing top-level comments from BootBootstrappable to this to describe functionality
 * EDITINGNOTE: Check hasSinglePanel across all files and remove if not implemented
 * EDITINGNOTE: The toolsIdPatched flag is never set, both in my code and in Showdex
 * EDITINGNOTE: If createToolsRoom fails, calling toolsRoom.reactRoot will crash the page, both in my code and in Showdex
 */

import * as ReactDOM from 'react-dom/client';
import { toolsSlice } from '@showdex/redux/store';// EDITINGNOTE: Build this and fix the import
import { formatId, nonEmptyObject, detectAuthPlayerKeyFromBattle } from './utilities.js';// EDITINGNOTE: Re-sort detectAuthPlayerKeyFromBattle in utilities
import { ToolsBootstrappable } from './ToolsBootstrappable.js';
import { ToolsDomRenderer } from './ToolsRenderer.jsx';

export class ToolsClassicBootstrapper extends ToolsBootstrappable {

  // Creates the room ID
  static getToolsRoomId(battleId) {
    return `view-tools-${formatId(battleId)}`;
  }

  // Creates the room with the React root and cleanup handler
  static createToolsRoom(battleId, focus) {
    if (!battleId) {
      return null;
    }

    const { store } = this.Adapter || {};

    const side = !window.Dex?.prefs('rightpanelbattles');

    const toolsRoomId = this.getToolsRoomId(battleId);

    const toolsRoom = this.createHtmlRoom(toolsRoomId, 'Tools', {
      side,
      icon: 'wrench',
      focus,
      maxWidth: 650,
    });

    if (!toolsRoom?.el) {
      return toolsRoom;
    }

    toolsRoom.reactRoot = ReactDOM.createRoot(toolsRoom.el);

    // Cleans up the room references, React root, and state when leaving the room
    toolsRoom.requestLeave = () => {
      const battle = window.app.rooms?.[battleId]?.battle;

      if (battle?.id) {
        delete battle.toolsHtmlRoom;

        battle.toolsDestroyed = true;
      }

      toolsRoom.reactRoot?.unmount?.();

      store.dispatch(toolsSlice.actions.destroy(battleId));

      return true;
    };

    return toolsRoom;
  }

  // Gets the room
  get battleRoom() {
    if (!nonEmptyObject(window.app?.rooms) || !this.battleId?.startsWith?.('battle-')) {
      return null;
    }

    return window.app.rooms[this.battleId];
  }

  // Gets the battle
  get battle() {
    return this.battleRoom?.battle;
  }

  // Gets the request
  get battleRequest() {
    return this.battleRoom?.request;
  }

  // Restores the identifier to client and server Pokemon
  patchToolsIdentifier() {
    if (!this.battle?.id || this.battle.toolsIdPatched) {
      return;
    }

    // Intercepts addPokemon to restore the identifier to client Pokemon
    ['p1', 'p2'].forEach((playerKey) => {
      if (typeof this.battle[playerKey]?.addPokemon !== 'function') {
        return;
      }

      console.debug(
        '[Gen 3 OU Tools] Intercepting side.addPokemon.',
        '\nplayer:', playerKey,
        '\nbattleId:', this.battle.id,
      );

      const side = this.battle[playerKey];
      const addPokemon = side.addPokemon.bind(side);

      side.addPokemon = (...argv) => this.patchClientToolsIdentifier(playerKey, addPokemon, argv);
    });

    console.debug('[Gen 3 OU Tools] Intercepting updateSide for this battle:', this.battle.id);

    const updateSide = this.battleRoom.updateSide.bind(this.battleRoom);

    // Intercepts updateSide to restore the identifier to server Pokemon
    this.battleRoom.updateSide = () => {
      const myPokemon = [...(this.battleRoom.battle?.myPokemon || [])];

      updateSide();

      this.patchServerToolsIdentifier(myPokemon);
    };
  }

  // Prepares the panel
  preparePanel() {
    if (!this.battle?.id) {
      return;
    }

    if (!this.battle.toolsHtmlRoom) {
      this.battle.toolsHtmlRoom = ToolsClassicBootstrapper.createToolsRoom(this.battleId, true);

      this.battle.toolsRoomId = this.battle.toolsHtmlRoom?.id;
    }

    if (!this.battle.toolsRoomId) {
      return;
    }

    const { getToolsRoomId } = ToolsClassicBootstrapper;

    const requestLeave = this.battleRoom.requestLeave.bind(this.battleRoom);

    // Overrides requestLeave to intercept forfeit submissions
    this.battleRoom.requestLeave = (event) => {
      const shouldLeave = requestLeave(event);

      if (!shouldLeave) {
        const forfeitPopup = window.app.popups.find((popup) => popup.room === this.battleRoom);

        if (typeof forfeitPopup?.submit === 'function') {
          console.debug('[Gen 3 OU Tools] Intercepting forfeitPopup.submit for this battle:', this.battle.id);

          const submitForfeit = forfeitPopup.submit.bind(forfeitPopup);

          // Leaves the room on forfeit confirmation
          forfeitPopup.submit = (...args) => {
            const toolsRoomId = getToolsRoomId(this.battleId);

            if (toolsRoomId && toolsRoomId in (window.app.rooms || {})) {
              window.app.leaveRoom(toolsRoomId);
            }

            return submitForfeit(...args);
          };
        }

        return false;
      }

      return true;
    };
  }

  // Renders the user interface
  renderTools(dom) {
    if (!this.battleId || !dom) {
      return;
    }

    const { Adapter } = ToolsClassicBootstrapper;

    ToolsDomRenderer(dom, {
      store: Adapter.store,
      battleId: this.battleId,
    });
  }

  // Opens the panel
  open() {
    if (!this.battleState?.battleId) {
      return;
    }

    const toolsRoomId = ToolsClassicBootstrapper.getToolsRoomId(this.battleId);

    // Focuses the existing room or creates and renders a new one
    if (toolsRoomId in window.app.rooms) {
      window.app.focusRoomRight(toolsRoomId);
    } else {
      const toolsRoom = ToolsClassicBootstrapper.createToolsRoom(this.battleId, true);

      this.renderTools(toolsRoom.reactRoot);

      if (this.battleRoom?.battle?.id) {
        this.battleRoom.battle.toolsDestroyed = false;
        this.battleRoom.battle.toolsHtmlRoom = toolsRoom;
      }
    }

    if ((!window.app.curRoom?.id || window.app.curRoom.id !== this.battleId) && this.battleId in window.app.rooms) {
      window.app.focusRoom(this.battleId);
    }
  }

  // Closes the panel and leaves the inactive battle
  close() {
    if (!this.battleId || !nonEmptyObject(window.app?.rooms)) {
      return;
    }

    const { Adapter, getToolsRoomId } = ToolsClassicBootstrapper;
    const toolsRoomId = getToolsRoomId(this.battleId);

    if (window.app.rooms[toolsRoomId]) {
      window.app.leaveRoom(toolsRoomId);
    }

    if (this.battleRoom?.id && !Adapter.rootState?.tools?.[this.battleId]?.active) {
      window.app.leaveRoom(this.battleId);
    }
  }

  // Destroys the session, removing the battle receiver and cleaning up the state
  destroy() {
    if (!this.battleId) {
      return;
    }

    const { Adapter } = ToolsClassicBootstrapper;

    if (this.battle?.toolsStateInit) {
      this.battle.toolsStateInit = false;
      this.battle.toolsDestroyed = true;
    }

    this.close();

    Adapter.removeBattleReceiver(this.battleId);

    Adapter.store.dispatch(toolsSlice.actions.destroy(this.battleId));
  }

  // Runs the cleanup, event subscription, and initialization sequence
  run() {
    console.debug('[Gen 3 OU Tools] run() was called for this battle:', this.battleId);

    if (!this.battleId?.startsWith?.('battle-')) {
      console.debug('[Gen 3 OU Tools] Skipping the bootstrap for this invalid battleId:', this.battleId);

      return;
    }

    const { Adapter, getToolsRoomId } = ToolsClassicBootstrapper;

    // Cleans up the state and user interface for a destroyed battle
    if (!this.battle?.id) {
      if (!this.battleState?.battleId) {
        console.debug('[Gen 3 OU Tools] Skipping the bootstrap for this battle with an invalid state:', this.battleId);

        return;
      }

      if (this.battleState?.active) {
        Adapter.store.dispatch(toolsSlice.actions.update({
          battleId: this.battleId,
          active: false,
        }));
      }

      const toolsRoomId = getToolsRoomId(this.battleId);

      if (toolsRoomId in window.app.rooms) {
        console.debug(
          '[Gen 3 OU Tools] Leaving the room with a destroyed battle.',
          '\ntoolsRoomId:', toolsRoomId,
          '\nbattleId:', this.battleId,
          '\nstate:', this.battleState,
        );

        window.app.leaveRoom(toolsRoomId);

        return;
      }

      console.debug(
        '[Gen 3 OU Tools] The battle and room have been removed.',
        '\nbattleId:', this.battleId,
        '\nbattle:', this.battle,
        '\nbattleRoom:', this.battleRoom,
        '\nstate:', this.battleState,
      );

      return;
    }

    if (this.initDisabled) {
      console.debug(
        '[Gen 3 OU Tools] Skipping the bootstrap for the nonexistent battle.',
        '\nbattleId:', this.battleId,
        '\nstep:', this.battle.stepQueue?.find((step) => step?.startsWith('|noinit|nonexistent|')),
        '\nbattle:', this.battle,
      );

      return;
    }

    if (typeof this.battle?.subscribe !== 'function') {
      console.warn('[Gen 3 OU Tools] battle.subscribe has this invalid type:', typeof this.battle?.subscribe);

      return;
    }

    if (!this.battle.stepQueue?.length || !this.battle.stepQueue.some((step) => step?.startsWith('|player|'))) {
      console.debug(
        '[Gen 3 OU Tools] Initialization failed because no initialized players were found in the battle',
        '\nstepQueue:', this.battle.stepQueue,
        '\nbattleId:', this.battle.id,
        '\nbattle:', this.battle,
      );

      return;
    }

    // Triggers a subscription callback and exits if the bootstrapper is already initialized
    if (this.battle.toolsInit) {
      if (this.battle.toolsStateInit) {
        if (this.battle.atQueueEnd) {
          this.battle.subscription('atqueueend');
        } else {
          this.battle.subscription('step');
        }
      }

      return;
    }

    const authPlayerKey = detectAuthPlayerKeyFromBattle(this.battle);

    this.battle.toolsDisabled = !authPlayerKey;

    if (this.battle.toolsDisabled) {
      return;
    }

    if (!this.battle.toolsStateInit) {
      this.initToolsState();
    }

    this.preparePanel();

    const toolsReactRoot = this.battle.toolsHtmlRoom?.reactRoot;

    if (!toolsReactRoot) {
      console.error(
        '[Gen 3 OU Tools] The bootstrap completed but the React root has not been initialized.',
        '\nbattleId:', this.battle.id,
        '\nReact root type:', typeof toolsReactRoot,
        '\nReact root:', toolsReactRoot,
        '\nbattle:', this.battle,
        '\nbattleRoom:', this.battleRoom,
      );

      return;
    }

    this.patchToolsIdentifier();

    this.renderTools(toolsReactRoot);

    console.debug(
      '[Gen 3 OU Tools] Intercepting client data via battle.subscribe.',
      '\nbattleId:', this.battleId,
      '\nbattle.subscription:', typeof this.battle.subscription,
      '\nbattle:', this.battle,
    );

    this.prevBattleSubscription = this.battle.subscription?.bind?.(this.battle);

    this.battle.subscribe(this.battleSubscription);

    this.battle.toolsInit = true;

    if (this.battle.atQueueEnd) {
      this.battle.subscription('atqueueend');
    } else {
      this.battle.subscription('step');
    }
  }
}