/**
 * 
 * EDITINGNOTE: See notes...
 * EDITINGNOTE: can streamline error messages, check battlestate and toolsState
 */

import { NIL as uuidnil } from 'uuid';
import { syncBattle } from './syncBattle.js';
import { toolsSlice } from '@showdex/redux/store'; // EDITINGNOTE: Build this and fix the import
import {
  detectGenFromFormat,
  clamp,
  clonePlayerSideConditions,
  sanitizePlayerSide,
  formatId,
  calcBattleToolsNonce,
  similarPokemon
} from './utilities.js';
import { BootClassicBootstrappable } from './BootClassicBootstrappable.js';

export class ToolsBootstrappable extends BootClassicBootstrappable {

  // 
  prevBattleSubscription = null;

  // 
  battleSubscription = (state) => {
    console.debug(
      '[Gen 3 OU Tools] Received an event from battle.subscribe().',
      '\nstate:', state,
      '\nbattleId:', this.battle?.id || this.battleId,
      '\nbattle:', this.battle,
      '\nrequest:', this.battleRequest,
    );

    this.prevBattleSubscription?.(state);

    this.syncTools();
  };

  // 
  constructor(battleId) {
    super();

    this.battleId = battleId || null;
  }

  // 
  get battle() {
    throw new Error('Bootstrapper error: get battle() must be overridden.');
  }

  // EDITINGNOTE: Is battleRequest actually used?
  get battleRequest() {
    throw new Error('Bootstrapper error: get battleRequest() must be overridden.');
  }

  // 
  get battleState() {
    return ToolsBootstrappable.Adapter?.rootState?.tools?.[this.battle?.id || this.battleId];
  }

  // Checks if initialization is disabled for the battle
  get initDisabled() {
    return (this.battle?.stepQueue || []).some((step) => step?.startsWith('|noinit|nonexistent|'));
  }

  // EDITINGNOTE: which is better? 1) Creates the initial state 2) Initializes the state 3) something else...
  initToolsState() {
    const battleInstance = this.battle;
    const battleId = battleInstance?.id || this.battleId;

    if (!battleId) {
      return;
    }

    const { Adapter } = ToolsBootstrappable;

    if (battleInstance.toolsStateInit) {
      console.debug(
        '[Gen 3 OU Tools] The battle has already been initialized.',// EDITINGNOTE: Check this. battle or state
        '\nbattleId:', battleId,
        '\ntoolsStateInit:', battleInstance.toolsStateInit,
        '\nbattle:', battleInstance,
        '\nstate:', Adapter.rootState?.tools?.[battleId],
      );

      return;
    }

    const { authUsername } = Adapter.rootState?.showdex || {};
    const initNonce = uuidnil;

    console.debug(
      '[Gen 3 OU Tools] Initializing the battle.',// EDITINGNOTE: Check this. Initializing the battle or the state
      '\nbattleId:', battleId,
      '\ninitNonce:', initNonce,
      '\nbattle:', battleInstance,
    );

    // Creates a snapshot of the state EDITINGNOTE: is this true?, 
    // EDITINGNOTE: im getting rid of paused: false, authPlayerKey: null, opponentKey: null,
    // colorScheme: Adapter.colorScheme || 'light', containerSize: 'xs',  containerWidth: 320,  smogonChaos: null,  smogonLeads: null,
    // sideid: playerKey,activeIndices: [], selectionIndex: 0, maxPokemon: 0,pokemonOrder: [], pokemon: [],
    Adapter.store.dispatch(toolsSlice.actions.init({
      battleId,
      battleNonce: initNonce,
      gen: battleInstance.gen,
      format: battleId.split('-').find((part) => detectGenFromFormat(part)),
      gameType: battleInstance.gameType === 'singles' ? 'singles' : 'doubles',
      turn: clamp(0, battleInstance.turn || 0),
      active: !battleInstance.ended,
      switchPlayers: battleInstance.viewpointSwitched ?? battleInstance.sidesSwitched,

      // 
      ...['p1', 'p2'].reduce((prev, playerKey) => {
        const player = battleInstance[playerKey];

        prev[playerKey] = {
          active: !!player?.id,
          name: player?.name || null,
          rating: player?.rating || null,

          side: {
            conditions: clonePlayerSideConditions(player?.sideConditions),
          },
        };

        prev[playerKey].side = {
          conditions: prev[playerKey].side.conditions,
          ...sanitizePlayerSide(prev[playerKey], player),
        };

        return prev;
      }, {}),
    }));

    battleInstance.toolsStateInit = true;
  }

  // 
  syncTools() {
    const battleInstance = this.battle;

    if (!battleInstance?.id) {
      return;
    }

    if (battleInstance.toolsDestroyed) {
      console.debug(
        '[Gen 3 OU Tools] The battle has been destroyed.',//EDITINGNOTE: again, battle or state
        '\nbattleId:', battleInstance.id,
        '\ntoolsDestroyed:', battleInstance.toolsDestroyed,
        '\nbattle:', battleInstance,
      );

      return;
    }

    if (['p1', 'p2'].every((playerKey) => !battleInstance[playerKey]?.id)) {
      console.debug(
        '[Gen 3 OU Tools] Not all players exist in the battle.',
        '\nbattleId:', battleInstance.id,
        '\nplayers:', ['p1', 'p2'].map((playerKey) => battleInstance[playerKey]?.id),
        '\nstepQueue:', battleInstance.stepQueue,
      );

      return;
    }

    const { Adapter } = ToolsBootstrappable;//EDITINGNOTE: pull this out of these functions?

    // EDITINGNOTE: this has become the same condition as the block below
    if (!battleInstance.toolsStateInit) {
      const authUserId = (!!Adapter?.authUsername && formatId(Adapter.authUsername)) || null;

      this.initToolsState();

      if (!battleInstance.ended && ['p1', 'p2'].some((playerKey) => formatId(battleInstance[playerKey]?.name) === authUserId)) {
        return;
      }
    }

    if (!battleInstance.toolsStateInit) {
      return;
    }

    // EDITINGNOTE: make sure the battle was active on the previous sync, but now has ended
    if (this.battleState?.active && battleInstance.ended) {
      console.debug(
        '[Gen 3 OU Tools] Updating active state for the battle.',
        '\nbattleId:', battleInstance.id,
        '\ntoolsRoomId:', battleInstance.toolsRoomId,
        '\nbattle:', battleInstance,
      );

      Adapter.store.dispatch(toolsSlice.actions.update({
        battleId: battleInstance.id,
        battleNonce: battleInstance.nonce,
        active: false,
        paused: true,
      }));

      return;
    }

    battleInstance.nonce = calcBattleToolsNonce(battleInstance, this.battleRequest);

    if (!this.battleState?.battleNonce) {
      return;
    }

    if (battleInstance.nonce === this.battleState.battleNonce) {
      return;
    }

    console.debug(
      '[Gen 3 OU Tools] Syncing the battle.',
      '\nbattleId:', battleInstance.id,
      '\nprevious nonce:', this.battleState.battleNonce,
      '\nnew nonce:', battleInstance.nonce,
      '\nrequest:', this.battleRequest,
      '\nbattle:', battleInstance,
      '\nstate:', this.battleState,
    );

    Adapter.store.dispatch(syncBattle({
      battle: this.battle,
      request: this.battleRequest,
    }));
  }

  // EDITINGNOTE: patches in the toolsId to client Showdown.Pokemon
  patchClientToolsIdentifier(playerKey, addPokemon, addPokemonArgv) {
    if (!playerKey || typeof addPokemon !== 'function' || !addPokemonArgv?.length) {
      return null;
    }

    const execAddPokemon = () => addPokemon(...addPokemonArgv);

    if (!this.battle?.id || !this.battle.toolsStateInit) {
      return execAddPokemon();
    }

    const side = this.battle[playerKey];

    if (!side?.sideid) {
      return execAddPokemon();
    }

    const pokemonSearchCandidates = [];

    if (side.pokemon?.length) {
      pokemonSearchCandidates.push(...side.pokemon);
    }

    if (!this.battleState?.battleId) {
      return execAddPokemon();
    }

    const { pokemon: pokemonFromState } = this.battleState[playerKey] || {};

    if (pokemonFromState?.length) {
      pokemonSearchCandidates.push(...pokemonFromState);
    }

    const pokemonSearchList = pokemonSearchCandidates.map((pokemon) => ({
      toolsId: pokemon.toolsId,
      ident: pokemon.ident,
      speciesForme: pokemon.speciesForme,
      details: pokemon.details,
      searchid: pokemon.searchid,
    }));

    const [
      ,
      ident,
      details,
      replaceSlot = -1,
    ] = addPokemonArgv;

    // 
    const prevPokemon = (replaceSlot >= 0 && pokemonSearchList[replaceSlot]) ||
      pokemonSearchList.filter((pokemon) => !!pokemon.toolsId).find((pokemon) => (
        (!ident || (
          (!!pokemon?.ident && pokemon.ident === ident) ||
          (!!pokemon?.searchid?.includes('|') && pokemon.searchid.split('|')[0] === ident)
        )) &&
        similarPokemon(
          { details },
          pokemon,
          { format: this.toolsState.format },
        )
      ));

    const newPokemon = execAddPokemon();

    if (!newPokemon?.speciesForme) {
      return newPokemon;
    }

    if (!prevPokemon?.toolsId) {
      return newPokemon;
    }

    newPokemon.toolsId = prevPokemon.toolsId;

    console.debug(
      '[Gen 3 OU Tools] Restored toolsId.',
      '\ntoolsId:', newPokemon.toolsId,
      '\nprevious Pokemon:', prevPokemon,
      '\nnew Pokemon:', newPokemon,
      '\nplayer:', side.sideid,
    );

    return newPokemon;
  }

  // 
  patchServerToolsIdentifier(myPokemon) {
    if (!this.battle?.id) {
      return;
    }

    if (!myPokemon?.length) {
      return;
    }

    const format = this.battle.id.split('-').find((part) => detectGenFromFormat(part));

    if (!format) {
      return;
    }

    console.debug(
      '[Gen 3 OU Tools] Syncing team data from the server.',
      '\nbattle:', this.battle,
      '\nprevious myPokemon:', myPokemon,
      '\nnew myPokemon', this.battle.myPokemon,
    );

    if (!Array.isArray(this.battle.myPokemon)) {
      return;
    }

    let didUpdate = !myPokemon?.length && !!this.battle.myPokemon?.length;

    // EDITINGNOTE: with each updated myPokemon[], see if we find a match to restore its toolsId
    this.battle.myPokemon.forEach((pokemon) => {
      if (!pokemon?.ident || pokemon.toolsId) {
        return;
      }

      const prevMyPokemon = myPokemon.find((prev) => !!prev?.ident && (
        prev.ident === pokemon.ident || prev.speciesForme === pokemon.speciesForme || prev.details === pokemon.details ||
        similarPokemon(
          pokemon,
          prev,
          { format }
        )
      ));

      // 
      if (!prevMyPokemon?.toolsId) {
        return;
      }

      // 
      pokemon.toolsId = prevMyPokemon.toolsId;

      // 
      didUpdate = true;
    });

    // 
    if (!didUpdate || !this.battle.toolsInit) {
      return;
    }

    // 
    const { nonce: prevNonce } = this.battle;

    // 
    this.battle.nonce = calcBattleToolsNonce(this.battle, this.battleRequest, this.toolsState);

    console.debug(
      '[Gen 3 OU Tools] Restored toolsId to data from the server.',
      '\nprevious nonce:', prevNonce,
      '\nnew nonce:', this.battle.nonce,
      '\nprevious myPokemon:', myPokemon,
      '\nnew myPokemon:', this.battle.myPokemon,
    );

    // 
    this.battle.subscription('callback');
  }

  // 
  patchToolsIdentifier() {
    throw new Error('Bootstrapper error: patchToolsIdentifier() is not implemented.');
  }

  open() {
    throw new Error('Bootstrapper error: open() is not implemented.');
  }

  close() {
    throw new Error('Bootstrapper error: close() is not implemented.');
  }

  destroy() {
    throw new Error('Bootstrapper error: destroy() is not implemented.');
  }
}