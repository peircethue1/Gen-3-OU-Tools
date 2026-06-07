/**
 * 
 * EDITINGNOTE: This has been reviewed and blank comments have been inserted appropriately. Look over spacing, punctuation, and insert comments
 */

import { ToolsBootstrappable } from './ToolsBootstrappable.js';
import { ToolsDomRenderer } from './ToolsRenderer.js';
import toolsHtml from './tools.html';

export class ToolsClassicBootstrapper extends ToolsBootstrappable {

  // 
  static getToolsRoomId(battleId) {
    return `view-tools-${ToolsBootstrappable.formatId(battleId)}`;
  }

  // 
  static createToolsRoom(battleId, focus) {

    // 
    if (!battleId) {
      return null;
    }

    // 
    const side = !window.Dex?.prefs('rightpanelbattles');

    const toolsRoomId = this.getToolsRoomId(battleId);
    const toolsRoom = this.createHtmlRoom(
      toolsRoomId,
      'Tools',
      {
        side,
        icon: 'wrench',
        focus,
        maxWidth: 650,
      }
    );

    // 
    if (!toolsRoom?.el) {
      return toolsRoom;
    }

    // 
    toolsRoom.el.innerHTML = toolsHtml;

    // 
    toolsRoom.requestLeave = () => {
      const battle = window.app.rooms?.[battleId]?.battle;

      // 
      if (battle?.id) {
        delete battle.toolsHtmlRoom;
      }

      // 
      toolsRoom.el.innerHTML = '';

      // clean up allocated memory from toolsState for this Tools instance
      this.toolsState = null;

      // 
      if (battle?.id) {
        battle.toolsDestroyed = true;
      }

      // actually leave the room
      return true;
    };

    return toolsRoom;
  }

  // 
  static nonEmptyObject(obj) {
    if (typeof obj !== 'object') {
      return false;
    }

    if (Array.isArray(obj)) {
      return !!obj.length;
    }

    return !!Object.keys(obj || {}).length;
  }

  // 
  get battleRoom() {
    if (!ToolsClassicBootstrapper.nonEmptyObject(window.app?.rooms) || !this.battleId?.startsWith?.('battle-')) {
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

    // 
    if (!this.battle?.id) {
      return;
    }

    // 
    if (this.battle.toolsIdPatched) {
      return;
    }

    // 
    ['p1', 'p2'].forEach((playerKey) => {

      // 
      if (!(playerKey in this.battle) || typeof this.battle[playerKey]?.addPokemon !== 'function') {
        return;
      }

      console.debug(
        '[Gen 3 OU Tools] Intercepting side.addPokemon.',
        '\nplayer:', playerKey,
        '\nbattleId:', this.battle.id,
      );

      // 
      const side = this.battle[playerKey];
      const addPokemon = side.addPokemon.bind(side);

      side.addPokemon = (...argv) => this.patchClientToolsIdentifier(playerKey, addPokemon, argv);
    });

    console.debug('[Gen 3 OU Tools] Intercepting updateSide for this battle:', this.battle.id);

    // 
    const updateSide = this.battleRoom.updateSide.bind(this.battleRoom);

    // 
    this.battleRoom.updateSide = () => {

      // grab a copy of myPokemon[] before updateSide() unleashes valhalla on it
      const myPokemon = [...(this.battleRoom.battle?.myPokemon || [])];

      // now run the original function, which will directly mutate myPokemon[] from the battleRoom.requests.side.pokemon[]
      updateSide();

      // 
      this.patchServerToolsIdentifier(myPokemon);
    };
  }

  // 
  preparePanel() {

    // 
    if (!this.battle?.id) {
      return;
    }

    // create the toolsRoom if it doesn't already exist (shouldn't tho)
    if (!this.battle.toolsHtmlRoom) {
      this.battle.toolsHtmlRoom = ToolsClassicBootstrapper.createToolsRoom(this.battleId, true);
      this.battle.toolsRoomId = this.battle.toolsHtmlRoom?.id;
    }

    // 
    if (!this.battle.toolsRoomId) {
      return;
    }

    const { getToolsRoomId } = ToolsClassicBootstrapper;

    // handle destroying the Tools when leaving the battleRoom
    const requestLeave = this.battleRoom.requestLeave.bind(this.battleRoom);

    // 
    this.battleRoom.requestLeave = (event) => {

      // 
      const shouldLeave = requestLeave(event);

      // ForfeitPopup probably appeared
      if (!shouldLeave) {

        // similar to the battle overlay, we'll override the submit() handler of the ForfeitPopup
        const forfeitPopup = window.app.popups.find((popup) => (popup).room === this.battleRoom);

        // 
        if (typeof forfeitPopup?.submit === 'function') {
          console.debug('[Gen 3 OU Tools] Intercepting forfeitPopup.submit for this battle:', this.battle.id);

          // 
          const submitForfeit = forfeitPopup.submit.bind(forfeitPopup);

          // we'll only close if configured to (and destroy if closing the room)
          forfeitPopup.submit = (...args) => {

            // 
            const toolsRoomId = getToolsRoomId(this.battleId);

            if (toolsRoomId && toolsRoomId in (window.app.rooms || {})) {

              // this will trigger toolsRoom's requestLeave() handler, which may destroy the state depending on the user's settings
              window.app.leaveRoom(toolsRoomId);
            }

            // call ForfeitPopup's original submit() handler
            return submitForfeit(...args);
          };
        }

        // don't actually leave the room, as requested by requestLeave()
        return false;
      }

      // actually leave the room
      return true;
    };
  }

  // 
  renderTools(element) {

    // 
    if (!this.battleId || !element) {
      return;
    }

    // 
    ToolsDomRenderer(
      element,
      {
        state: this.battleState,
        battleId: this.battleId,
      },
    );
  }

  // 
  open() {

    // 
    if (!this.battleState?.battleId) {
      return;
    }

    // check if the Tools tab is already open
    const toolsRoomId = ToolsClassicBootstrapper.getToolsRoomId(this.battleId);

    // 
    if (toolsRoomId in window.app.rooms) {

      // 
      window.app.focusRoomRight(toolsRoomId);
    } else {

      // at this point, we need to recreate the room
      const toolsRoom = ToolsClassicBootstrapper.createToolsRoom(this.battleId, true);

      // 
      this.renderTools(toolsRoom.el);

      // if the battleRoom exists, attach the created room to the battle object
      if (this.battleRoom?.battle?.id) {

        // 
        this.battleRoom.battle.toolsDestroyed = false;

        // 
        this.battleRoom.battle.toolsHtmlRoom = toolsRoom;
      }
    }

    // refocus the battleRoom that the tabbed Tools pertains to, if still joined
    if ((!window.app.curRoom?.id || window.app.curRoom.id !== this.battleId) && this.battleId in window.app.rooms) {

      // 
      window.app.focusRoom(this.battleId);
    }
  }

  // 
  close() {

    // 
    if (!this.battleId || !ToolsClassicBootstrapper.nonEmptyObject(window.app?.rooms)) {
      return;
    }

    // 
    const { getToolsRoomId } = ToolsClassicBootstrapper;
    const toolsRoomId = getToolsRoomId(this.battleId);

    if (window.app.rooms[toolsRoomId]) {
      window.app.leaveRoom(toolsRoomId);
    }

    // 
    if (this.battleRoom?.id && this.toolsState?.active) {
      window.app.leaveRoom(this.battleId);
    }
  }

  // 
  destroy() {

    // 
    if (!this.battleId) {
      return;
    }

    // 
    const { Adapter } = ToolsClassicBootstrapper;

    // 
    if (this.battle?.toolsStateInit) {

      // 
      this.battle.toolsStateInit = false;
      this.battle.toolsDestroyed = true;
    }

    // 
    this.close();

    // 
    Adapter.removeBattleReceiver(this.battleId);

    // 
    this.toolsState = null;
  }

  // 
  run() {
    console.debug('[Gen 3 OU Tools] The bootstrapper run() method was called for this battle:', this.battleId);

    // 
    if (!this.battleId?.startsWith?.('battle-')) {
      console.debug('[Gen 3 OU Tools] The bootstrap request was ignored for the battle with this invalid battleId:', this.battleId);

      return;
    }

    // 
    const { getToolsRoomId } = ToolsClassicBootstrapper;

    // 
    if (!this.battle?.id) {

      // we'd typically reach this point when the user forfeits through the popup
      if (!this.battleState?.battleId) {
        console.debug('[Gen 3 OU Tools] The bootstrap request was ignored for this battle with no battleState:', this.battleId);

        return;
      }

      // 
      if (this.battleState?.active) {
        this.toolsState = {
          battleId: this.battleId,
          active: false,
        };
      }

      // 
      const toolsRoomId = getToolsRoomId(this.battleId);

      if (toolsRoomId in window.app.rooms) {
        console.debug(
          '[Gen 3 OU Tools] Leaving with a destroyed battleState.',
          '\ntoolsRoomId:', toolsRoomId,
          '\nbattleId:', this.battleId,
          '\nbattleState:', this.battleState,
        );

        // this will destroy the Tools state if configured to, via toolsRoom's requestLeave() handler
        window.app.leaveRoom(toolsRoomId);

        return;
      }

      console.debug(
        '[Gen 3 OU Tools] The battle was forcibly ended.',
        '\nbattleId:', this.battleId,
        '\nbattle:', this.battle,
        '\nbattleRoom:', this.battleRoom,
        '\nbattleState:', this.battleState,
      );

      return;
    }

    // 
    if (this.initDisabled) {
      console.debug(
        '[Gen 3 OU Tools] The bootstrap request was ignored because the battle was marked as nonexistent.',
        '\nbattleId:', this.battleId,
        '\nstep:', this.battle.stepQueue.find((step) => step?.startsWith('|noinit|nonexistent|')),
        '\nbattle:', this.battle,
      );

      return;
    }

    if (typeof this.battle?.subscribe !== 'function') {
      console.warn('[Gen 3 OU Tools] battle.subscribe has this invalid type:', typeof this.battle?.subscribe);

      return;
    }

    // delaying initialization if the battle hasn't instantiated all the players yet (which we can quickly determine by the existence of '|player|' steps in the stepQueue)
    if (!this.battle.stepQueue?.length || !this.battle.stepQueue.some((step) => step?.startsWith('|player|'))) {
      console.debug(
        '[Gen 3 OU Tools] Initialization failed due to uninitialized players in the battle',
        '\nstepQueue:', this.battle.stepQueue,
        '\nbattleId:', this.battle.id,
        '\nbattle:', this.battle,
      );

      return;
    }

    // don't process this battle if we've already added (or forcibly prevented) the filth
    if (this.battle.toolsInit) {

      // force a battle sync if we've received some data, but the active battle is just idling
      if (this.battle.toolsStateInit && this.battle.atQueueEnd) {

        // 
        this.battle.subscription('atqueueend');
      }

      return;
    }

    // anything below here executes once per battle
    if (!this.battle.toolsStateInit) {

      // 
      this.initToolsState();
    }

    // 
    this.preparePanel();

    // 
    const toolsElement = this.battle.toolsHtmlRoom?.el;

    if (!toolsElement) {
      console.error(
        'ReactDOM root hasn\'t been initialized, despite completing the classic bootstrap;',
        'something is horribly wrong here!',
        '\n', 'battleId', this.battle.id,
        '\n', 'toolsElement', '(typeof)', typeof toolsElement, toolsElement,
        '\n', 'battle', this.battle,
        '\n', 'battleRoom', this.battleRoom,
      );

      return;
    }

    // 
    this.patchToolsIdentifier();

    // 
    this.renderTools(toolsElement);

    console.debug(
      '[Gen 3 OU Tools] Intercepting client data via battle.subscribe.',
      '\nbattleId:', this.battleId,
      '\nbattle.subscription:', typeof this.battle.subscription,
      '\nbattle:', this.battle,
    );

    // 
    this.prevBattleSubscription = this.battle.subscription?.bind?.(this.battle);

    // 
    this.battle.subscribe(this.battleSubscription);

    // 
    this.battle.toolsInit = true;

    // 
    if (toolsElement && this.battle.atQueueEnd) {

      // 
      this.battle.subscription('atqueueend');
    }
  }
}