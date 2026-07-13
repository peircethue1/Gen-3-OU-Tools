/**
 * Creates the Tools bootstrapper template
 * EDITINGNOTE: See notes...
 * EDITINGNOTE: Write the order of data in error messages consistently across files
 * EDITINGNOTE: Standardize >-1 to >=0 across files
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

  // Stores the previous battle subscription
  prevBattleSubscription = null;

  // Subscribes to battle events
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

  // Initializes the bootstrapper instance
  constructor(battleId) {
    super();

    this.battleId = battleId || null;
  }

  // Checks if a getter is executed without being overridden
  get battle() {
    throw new Error('Bootstrapper error: get battle() must be overridden.');
  }

  get battleRequest() {
    throw new Error('Bootstrapper error: get battleRequest() must be overridden.');
  }// EDITINGNOTE: Check if battleRequest is actually used and remove throughout if not

  // Gets the battle state from the store
  get battleState() {
    return ToolsBootstrappable.Adapter?.rootState?.tools?.[this.battle?.id || this.battleId];
  }

  // Checks if initialization is disabled for the battle
  get initDisabled() {
    return (this.battle?.stepQueue || []).some((step) => step?.startsWith('|noinit|nonexistent|'));
  }

  // Initializes the state for the battle
  initToolsState() {
    const battleId = this.battle?.id || this.battleId;

    if (!battleId) {
      return;
    }

    const { Adapter } = ToolsBootstrappable;

    if (this.battle.toolsStateInit) {
      console.debug(
        '[Gen 3 OU Tools] The state has already been initialized.',
        '\nbattleId:', battleId,
        '\ntoolsStateInit:', this.battle.toolsStateInit,
        '\nbattle:', this.battle,
        '\nstate:', Adapter.rootState?.tools?.[battleId],
      );

      return;
    }

    const initNonce = uuidnil;

    console.debug(
      '[Gen 3 OU Tools] Initializing the state.',
      '\nbattleId:', battleId,
      '\ninitNonce:', initNonce,
      '\nbattle:', this.battle,
    );

    // Dispatches the initial state to the store
    Adapter.store.dispatch(toolsSlice.actions.init({
      battleId,
      battleNonce: initNonce,
      gen: this.battle.gen,
      format: battleId.split('-').find((part) => detectGenFromFormat(part)),
      gameType: this.battle.gameType === 'singles' ? 'singles' : 'doubles',
      turn: clamp(0, this.battle.turn || 0),
      active: !this.battle.ended,
      switchPlayers: this.battle.viewpointSwitched ?? this.battle.sidesSwitched,

      // Creates the initial state for each player
      ...['p1', 'p2'].reduce((prev, playerKey) => {
        const player = this.battle[playerKey];

        prev[playerKey] = {
          active: !!player?.id,
          name: player?.name || null,
          rating: player?.rating || null,

          // Creates side conditions for sanitizePlayerSide
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

    this.battle.toolsStateInit = true;
  }// EDITINGNOTE: Check paused, authPlayerKey, opponentKey, colorScheme, containerSize, containerWidth, smogonChaos, smogonLeads, sideid, activeIndices, selectionIndex, maxPokemon,pokemonOrder, pokemon

  // Syncs the battle state to the store
  syncTools() {
    if (!this.battle?.id) {
      return;
    }

    if (this.battle.toolsDestroyed) {
      console.debug(
        '[Gen 3 OU Tools] The state has been destroyed.',
        '\nbattleId:', this.battle.id,
        '\ntoolsDestroyed:', this.battle.toolsDestroyed,
        '\nbattle:', this.battle,
      );

      return;
    }

    if (['p1', 'p2'].every((playerKey) => !this.battle[playerKey]?.id)) {
      console.debug(
        '[Gen 3 OU Tools] Not all players exist in the battle.',
        '\nbattleId:', this.battle.id,
        '\nplayers:', ['p1', 'p2'].map((playerKey) => this.battle[playerKey]?.id),
        '\nstepQueue:', this.battle.stepQueue,
      );

      return;
    }

    const { Adapter } = ToolsBootstrappable;

    // EDITINGNOTE: This block can be combined with the one above if we don't reintroduce detectClassicHost. Possibly write a comment once I decide
    if (!this.battle.toolsStateInit) {
      const authUserId = (Adapter?.authUsername && formatId(Adapter.authUsername)) || null;

      this.initToolsState();

      if (!this.battle.ended && ['p1', 'p2'].some((playerKey) => formatId(this.battle[playerKey]?.name) === authUserId)) {
        return;
      }
    }

    if (!this.battle.toolsStateInit) {
      return;
    }

    // Dispatches a state update on battle end
    if (this.battleState?.active && this.battle.ended) {
      console.debug(
        '[Gen 3 OU Tools] Updating active state for the battle.',
        '\nbattleId:', this.battle.id,
        '\ntoolsRoomId:', this.battle.toolsRoomId,
        '\nbattle:', this.battle,
      );

      Adapter.store.dispatch(toolsSlice.actions.update({
        battleId: this.battle.id,
        battleNonce: this.battle.nonce,
        active: false,
        paused: true,
      }));

      return;
    }

    this.battle.nonce = calcBattleToolsNonce(this.battle, this.battleRequest);

    if (!this.battleState?.battleNonce) {
      return;
    }

    if (this.battle.nonce === this.battleState.battleNonce) {
      return;
    }

    console.debug(
      '[Gen 3 OU Tools] Syncing the battle.',
      '\nbattleId:', this.battle.id,
      '\nprevious nonce:', this.battleState.battleNonce,
      '\nnew nonce:', this.battle.nonce,
      '\nrequest:', this.battleRequest,
      '\nbattle:', this.battle,
      '\nstate:', this.battleState,
    );

    Adapter.store.dispatch(syncBattle({
      battle: this.battle,
      request: this.battleRequest,
    }));
  }

  // Restores the identifier to client Pokemon
  patchClientToolsIdentifier(playerKey, addPokemon, addPokemonArgv) {
    if (!playerKey || typeof addPokemon !== 'function' || !addPokemonArgv?.length) {
      return null;
    }

    const side = this.battle?.[playerKey];
    const execAddPokemon = () => addPokemon(...addPokemonArgv);

    if (!this.battle?.id || !this.battle.toolsStateInit || !side?.sideid || !this.battleState?.battleId) {
      return execAddPokemon();
    }

    const pokemonSearchCandidates = [];

    if (side.pokemon?.length) {
      pokemonSearchCandidates.push(...side.pokemon);
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

    // Finds matching client Pokemon
    const prevPokemon = (replaceSlot >= 0 && pokemonSearchList[replaceSlot]) ||
      pokemonSearchList.filter((pokemon) => !!pokemon.toolsId).find((pokemon) => (
        (!ident || (
          (!!pokemon?.ident && pokemon.ident === ident) ||
          (pokemon?.searchid?.includes('|') && pokemon.searchid.split('|')[0] === ident)
        )) &&
        similarPokemon(
          { details },
          pokemon,
          { format: this.battleState.format },// EDITINGNOTE: Check that normalizeformes can be removed
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

  // Restores the identifier to server Pokemon
  patchServerToolsIdentifier(myPokemon) {
    const format = this.battle?.id?.split('-').find((part) => detectGenFromFormat(part));

    if (!this.battle?.id || !myPokemon?.length || !format || !Array.isArray(this.battle.myPokemon)) {
      return;
    }

    console.debug(
      '[Gen 3 OU Tools] Syncing team data from the server.',
      '\nbattle:', this.battle,
      '\nprevious myPokemon:', myPokemon,
      '\nnew myPokemon:', this.battle.myPokemon,
    );

    let didUpdate = !myPokemon?.length && !!this.battle.myPokemon?.length;

    // Finds matching server Pokemon
    this.battle.myPokemon.forEach((pokemon) => {
      if (!pokemon?.ident || pokemon.toolsId) {
        return;
      }

      const prevMyPokemon = myPokemon.find((prev) => !!prev?.ident && (
        prev.ident === pokemon.ident ||
        prev.speciesForme === pokemon.speciesForme ||
        prev.details === pokemon.details ||
        similarPokemon(pokemon, prev, { format })
      ));

      if (!prevMyPokemon?.toolsId) {
        return;
      }

      pokemon.toolsId = prevMyPokemon.toolsId;

      didUpdate = true;
    });

    if (!didUpdate || !this.battle.toolsInit) {
      return;
    }

    const { nonce: prevNonce } = this.battle;

    this.battle.nonce = calcBattleToolsNonce(this.battle, this.battleRequest);

    console.debug(
      '[Gen 3 OU Tools] Restored toolsId to data from the server.',
      '\nprevious nonce:', prevNonce,
      '\nnew nonce:', this.battle.nonce,
      '\nprevious myPokemon:', myPokemon,
      '\nnew myPokemon:', this.battle.myPokemon,
    );

    this.battle.subscription('callback');
  }

  // Checks if a setup method is executed without being overridden
  patchToolsIdentifier() {
    throw new Error('Bootstrapper error: patchToolsIdentifier() must be overridden.');
  }

  // Checks if a lifecycle method is executed without being overridden
  open() {
    throw new Error('Bootstrapper error: open() must be overridden.');
  }

  close() {
    throw new Error('Bootstrapper error: close() must be overridden.');
  }

  destroy() {
    throw new Error('Bootstrapper error: destroy() must be overridden.');
  }
}