/**
 * Creates the classic Tools bootstrapper
 * EDITINGNOTE: address notes, then create comments...
 * EDITINGNOTE: Consider changing top-level comments from bootbootstrappable to this to describe functionality
 * EDITINGNOTE: check hasSinglePanel across all files and remove if not implemented
 * toolsIdPatched flag is never set (neither is it set in showdex)
 * if createToolsRoom fails, calling toolsRoom.reactRoot will crash the page (same in showdex)
 */

import * as ReactDOM from 'react-dom/client';
import { toolsSlice } from '@showdex/redux/store';// EDITINGNOTE: Build this and fix the import
import { formatId, nonEmptyObject, detectAuthPlayerKeyFromBattle } from './utilities.js';// EDITINGNOTE: Build detectAuthPlayerKeyFromBattle
import { ToolsBootstrappable } from './ToolsBootstrappable.js';
import { ToolsDomRenderer } from './ToolsRenderer.jsx';

export class ToolsClassicBootstrapper extends ToolsBootstrappable {

  // 
  static getToolsRoomId(battleId) {
    return `view-tools-${formatId(battleId)}`;
  }

  // 
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

    // 
    toolsRoom.requestLeave = () => {
      const battle = window.app.rooms?.[battleId]?.battle;

      if (battle?.id) {
        delete battle.toolsHtmlRoom;
      }

      toolsRoom.reactRoot?.unmount?.();

      store.dispatch(toolsSlice.actions.destroy(battleId));

      if (battle?.id) {
        battle.toolsDestroyed = true;
      }

      return true;
    };

    return toolsRoom;
  }

  // 
  get battleRoom() {
    if (!nonEmptyObject(window.app?.rooms) || !this.battleId?.startsWith?.('battle-')) {
      return null;
    }

    return window.app.rooms[this.battleId];
  }

  // 
  get battle() {
    return this.battleRoom?.battle;
  }

  // 
  get battleRequest() {
    return this.battleRoom?.request;
  }

  // 
  patchToolsIdentifier() {
    if (!this.battle?.id) {
      return;
    }

    if (this.battle.toolsIdPatched) {
      return;
    }//EDITINGNOTE: combine duplicate conditions/outputs

    // 
    ['p1', 'p2'].forEach((playerKey) => {
      if (!(playerKey in this.battle) || typeof this.battle[playerKey]?.addPokemon !== 'function') {
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

    // 
    this.battleRoom.updateSide = () => {
      const myPokemon = [...(this.battleRoom.battle?.myPokemon || [])];

      updateSide();

      this.patchServerToolsIdentifier(myPokemon);
    };
  }

  // 
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

    // 
    this.battleRoom.requestLeave = (event) => {
      const shouldLeave = requestLeave(event);

      if (!shouldLeave) {
        const forfeitPopup = window.app.popups.find((popup) => popup.room === this.battleRoom);

        if (typeof forfeitPopup?.submit === 'function') {
          console.debug('[Gen 3 OU Tools] Intercepting forfeitPopup.submit for this battle:', this.battle.id);

          const submitForfeit = forfeitPopup.submit.bind(forfeitPopup);

          // 
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

  // 
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

  // 
  open() {
    if (!this.battleState?.battleId) {
      return;
    }

    const toolsRoomId = ToolsClassicBootstrapper.getToolsRoomId(this.battleId);

    // 
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

  // 
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

  // 
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

  // 
  run() {
    console.debug('[Gen 3 OU Tools] The bootstrapper run() method was called for this battle:', this.battleId);

    if (!this.battleId?.startsWith?.('battle-')) {
      console.debug('[Gen 3 OU Tools] The bootstrap request was ignored for the battle with this invalid battleId:', this.battleId);

      return;
    }

    const { Adapter, getToolsRoomId } = ToolsClassicBootstrapper;

    // 
    if (!this.battle?.id) {
      if (!this.battleState?.battleId) {
        console.debug('[Gen 3 OU Tools] The bootstrap request was ignored for this battle with no state:', this.battleId);

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
          '[Gen 3 OU Tools] Leaving with a destroyed battle.',
          '\ntoolsRoomId:', toolsRoomId,
          '\nbattleId:', this.battleId,
          '\nstate:', this.battleState,
        );//EDITINGNOTE: is this right, destroyed battle?

        window.app.leaveRoom(toolsRoomId);

        return;
      }

      console.debug(
        '[Gen 3 OU Tools] The battle was forcibly ended.',
        '\nbattleId:', this.battleId,
        '\nbattle:', this.battle,
        '\nbattleRoom:', this.battleRoom,
        '\nstate:', this.battleState,
      );//EDITINGNOTE: what does this message mean?

      return;
    }

    if (this.initDisabled) {
      console.debug(
        '[Gen 3 OU Tools] The bootstrap request was ignored because the battle was marked as nonexistent.',
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
        '[Gen 3 OU Tools] Initialization failed due to uninitialized players in the battle',
        '\nstepQueue:', this.battle.stepQueue,
        '\nbattleId:', this.battle.id,
        '\nbattle:', this.battle,
      );

      return;
    }

    // EDITINGNOTE: showdex comment: (don't process this battle if we've already added (or forcibly prevented) the filth)
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