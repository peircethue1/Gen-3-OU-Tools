/**
 * 
 * EDITINGNOTE: Review comment content, perhaps spacing - need to generally match up init, sync, and nonce
 */

import { NIL as uuidnil } from 'uuid';
import { syncBattle } from './syncBattle.js';
import { syncCalculator } from './syncCalculator.js';
import { syncPrediction } from './syncPrediction.js';
import { syncInformation } from './syncInformation.js';
import {
  detectGenFromFormat,
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
  syncBattle = syncBattle;
  syncCalculator = syncCalculator;
  syncPrediction = syncPrediction;
  syncInformation = syncInformation;

  // 
  battleSubscription = (state) => {
    console.debug(
      '[Gen 3 OU Tools] Received an event from battle.subscribe().',
      '\nstate:', state,
      '\nbattleId:', this.battle?.id || this.battleId,
      '\nbattle:', this.battle,
      '\nrequest:', this.battleRequest,
    );

    // 
    this.prevBattleSubscription?.(state);

    // 
    this.syncTools();
  };

  // 
  constructor(battleId) {
    super();

    this.battleId = battleId || null;
  }

  // 
  get battle() {
    throw new Error('Bootstrapper error: get battle() is not implemented.');
  }

  get battleRequest() {
    throw new Error('Bootstrapper error: get battleRequest() is not implemented.');
  }

  // Checks if initialization is disabled for the battle
  get initDisabled() {
    return (this.battle?.stepQueue || []).some((step) => step?.startsWith('|noinit|nonexistent|'));
  }

  // Creates the initial state
  initToolsState() {
    const battleInstance = this.battle;
    const battleId = battleInstance?.id || this.battleId;

    // Checks if the battle ID is valid
    if (!battleId) {
      return;
    }

    // Checks if the battle has already been initialized
    if (battleInstance.toolsStateInit) {
      console.debug(
        '[Gen 3 OU Tools] The battle has already been initialized.',
        '\nbattleId:', battleId,
        '\ntoolsStateInit:', battleInstance.toolsStateInit,
        '\nbattle:', battleInstance,
        '\nstate:', this.toolsState,
      );

      return;
    }

    // Defines the initial nonce representing the state
    const initNonce = uuidnil;

    console.debug(
      '[Gen 3 OU Tools] Initializing the battle.',
      '\nbattleId:', battleId,
      '\ninitNonce:', initNonce,
      '\nbattle:', battleInstance,
    );

    // Creates a snapshot of the state
    this.toolsState = {
      battleId,
      battleNonce: initNonce,
      gen: battleInstance.gen,
      format: battleId.split('-').find((part) => detectGenFromFormat(part)),
      gameType: battleInstance.gameType === 'singles' ? 'singles' : 'doubles',
      turn: Math.max((battleInstance.turn || 0), 0),
      active: !battleInstance.ended,
      paused: false,
      authPlayerKey: null,
      opponentKey: null,
      switchPlayers: battleInstance.viewpointSwitched ?? battleInstance.sidesSwitched,
      field: {
        weather: null,
        attackerSide: null,
        defenderSide: null,
      },
      p1: {
        sideid: null,
        active: false,
        name: null,
        rating: null,
        activeIndices: [],
        selectionIndex: 0,
        maxPokemon: 0,
        side: {
          conditions: {},
        },
        pokemonOrder: [],
        pokemon: [],
      },
      p2: {
        sideid: null,
        active: false,
        name: null,
        rating: null,
        activeIndices: [],
        selectionIndex: 0,
        maxPokemon: 0,
        side: {
          conditions: {},
        },
        pokemonOrder: [],
        pokemon: [],
      },
      smogonChaos: null,
      smogonLeads: null,
    };

    // Populates the snapshot with player and side data
    ['p1', 'p2'].forEach((playerKey) => {
      const player = battleInstance[playerKey];

      this.toolsState[playerKey] = {
        sideid: playerKey,
        active: !!player?.id,
        name: player?.name || null,
        rating: player?.rating || null,
        activeIndices: [],
        selectionIndex: 0,
        maxPokemon: 0,
        side: {
          conditions: clonePlayerSideConditions(player?.sideConditions),
        },
        pokemonOrder: [],
        pokemon: [],
      };

      // Populates the player side conditions with sanitized data
      this.toolsState[playerKey].side = {
        conditions: this.toolsState[playerKey].side.conditions,
        ...sanitizePlayerSide(this.toolsState[playerKey], player),
      };
    });

    // Sets the initialization lock
    battleInstance.toolsStateInit = true;
  }

  // 
  syncTools() {
    const battleInstance = this.battle;

    // Checks if the battle ID is valid
    if (!battleInstance?.id) {
      return;
    }

    // Checks if Tools has been destroyed
    if (battleInstance.toolsDestroyed) {
      console.debug(
        '[Gen 3 OU Tools] The battle has been destroyed.',
        '\nbattleId:', battleInstance.id,
        '\ntoolsDestroyed:', battleInstance.toolsDestroyed,
        '\nbattle:', battleInstance,
      );

      return;
    }

    // Checks if the battle is missing players
    if (['p1', 'p2'].every((playerKey) => !battleInstance[playerKey]?.id)) {
      console.debug(
        '[Gen 3 OU Tools] Not all players exist in the battle.',
        '\nbattleId:', battleInstance.id,
        '\nplayers:', ['p1', 'p2'].map((playerKey) => battleInstance[playerKey]?.id),
        '\nstepQueue:', battleInstance.stepQueue,
      );

      return;
    }

    // 
    if (!battleInstance.toolsStateInit) {

      // defines the userID
      const { Adapter } = ToolsBootstrappable;
      const authUserId = (!!Adapter?.authUsername && formatId(Adapter.authUsername)) || null;

      // 
      this.initToolsState();

      // Checks if the user is a player in the battle
      if (!battleInstance.ended && ['p1', 'p2'].some((playerKey) => formatId(battleInstance[playerKey]?.name) === authUserId)) {
        return;
      }
    }

    // 
    if (!battleInstance.toolsStateInit) {
      return;
    }

    // make sure the battle was active on the previous sync, but now has ended
    if (this.toolsState?.active && battleInstance.ended) {
      console.debug(
        '[Gen 3 OU Tools] Updating active state for the battle.',
        '\nbattleId:', battleInstance.id,
        '\ntoolsRoomId:', battleInstance.toolsRoomId,
        '\nbattle:', battleInstance,
      );

      // 
      this.toolsState = {
        battleId: battleInstance.id,
        battleNonce: battleInstance.nonce,
        active: false,
        paused: true,
      };

      return;
    }

    // 
    battleInstance.nonce = calcBattleToolsNonce(battleInstance, this.battleRequest, this.toolsState);

    // 
    if (!this.toolsState?.battleNonce) {
      return;
    }

    // dispatch a battle sync if the nonces are different (i.e., something changed)
    if (battleInstance.nonce === this.toolsState.battleNonce) {
      return;
    }

    console.debug(
      '[Gen 3 OU Tools] Syncing the battle.',
      '\nbattleId:', battleInstance.id,
      '\nprevious nonce:', this.toolsState.battleNonce,
      '\nnew nonce:', battleInstance.nonce,
      '\nrequest:', this.battleRequest,
      '\nbattle:', battleInstance,
      '\nstate:', this.toolsState,
    );

    // 
    this.syncBattle(battleInstance, this.battleRequest);
  }

  // patches in the toolsId to client Showdown.Pokemon
  patchClientToolsIdentifier(playerKey, addPokemon, addPokemonArgv) {

    // checks for valid inputs
    if (!playerKey || typeof addPokemon !== 'function' || !addPokemonArgv?.length) {
      return null;
    }

    // 
    const execAddPokemon = () => addPokemon(...addPokemonArgv);

    // execute the client's function if we have a bad state
    if (!this.battle?.id || !this.battle.toolsStateInit) {
      return execAddPokemon();
    }

    // 
    const side = this.battle[playerKey];

    // execute the client's function if we have a bad side
    if (!side?.sideid) {
      return execAddPokemon();
    }

    // we'll collect potential candidates to assemble the final search list below
    const pokemonSearchCandidates = [];

    // make sure this comes first before `pokemonState` in case `replaceSlot` is specified
    if (side.pokemon?.length) {
      pokemonSearchCandidates.push(...side.pokemon);
    }

    // checks for valid tools state
    if (!this.toolsState?.battleId) {
      return execAddPokemon();
    }

    // 
    const { pokemon: pokemonFromState } = this.toolsState[playerKey] || {};

    if (pokemonFromState?.length) {
      pokemonSearchCandidates.push(...pokemonFromState);
    }

    // don't filter this in case `replaceSlot` is specified
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
    const prevPokemon = (replaceSlot >= 0 && pokemonSearchList[replaceSlot]) || pokemonSearchList.filter((pokemon) => !!pokemon.toolsId).find((pokemon) => (
        (!ident || ((!!pokemon?.ident && pokemon.ident === ident) || (!!pokemon?.searchid?.includes('|') && pokemon.searchid.split('|')[0] === ident))) &&
          similarPokemon(
            { details },
            pokemon, 
            { format: this.toolsState.format },
          )
      ));

    const newPokemon = execAddPokemon();

    // 
    if (!newPokemon?.speciesForme) {
      return newPokemon;
    }

    // 
    if (!prevPokemon?.toolsId) {
      return newPokemon;
    }

    // 
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

    // 
    if (!this.battle?.id) {
      return;
    }

    // 
    if (!myPokemon?.length) {
      return;
    }

    // 
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

    // 
    if (!Array.isArray(this.battle.myPokemon)) {
      return;
    }

    // 
    let didUpdate = !myPokemon?.length && !!this.battle.myPokemon?.length;

    // with each updated myPokemon[], see if we find a match to restore its toolsId
    this.battle.myPokemon.forEach((pokemon) => {

      // 
      if (!pokemon?.ident || pokemon.toolsId) {
        return;
      }

      // 
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