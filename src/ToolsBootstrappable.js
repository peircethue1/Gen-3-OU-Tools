/**
 * 
 * EDITINGNOTE: REVIEW THIS, THEN TOOLSCLASSICBOOTSTRAPPER, THEN SYNCBATTLE, THEN MAIN SECOND TO LAST, THEN CONTENT LAST BUT CONTENT ONLY NEEDS THE EXCEL MAP
 * EDITINGNOTE: Review comment content and excel map only
 */

import { NIL as uuidnil } from 'uuid';
import { syncBattle } from './syncBattle.js';
import { BootClassicBootstrappable } from './BootClassicBootstrappable.js';

export class ToolsBootstrappable extends BootClassicBootstrappable {

  // 
  prevBattleSubscription = null;

  // 
  syncBattle = syncBattle;

  // 
  battleSubscription = (state) => {
    console.debug(
      '[Gen 3 OU Tools] Received an event from battle.subscribe():', state,
      '\nbattleId:', this.battle?.id || this.battleId,
      '\nbattle:', this.battle,
      '\nbattleRequest:', this.battleRequest,
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

  // 
  get battleState() {
    return this.toolsState;
  }

  // Checks if initialization is disabled for the battle
  get initDisabled() {
    return (this.battle?.stepQueue || []).some((step) => step?.startsWith('|noinit|nonexistent|'));
  }

  // Creates a clone of the side conditions
  static clonePlayerSideConditions(conditions) {
    return Object.entries(conditions || {}).reduce((prev, [key, value]) => {
      prev[key] = Array.isArray(value) ? [...value] : value;
      return prev;
    }, {});
  }

  // Creates an clean ID
  static formatId(value) {
    return value
      ?.toString?.()
      .normalize('NFD')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();
  }

  // Creates a standardized object for the current battle state
  static sanitizePlayerSide(player, battleSide) {
    const {
      selectionIndex,
      pokemon: playerPokemon,
      side,
    } = player || {};

    const currentPokemon = playerPokemon?.length && selectionIndex > -1 ? playerPokemon[selectionIndex] : null;

    const sideConditions = battleSide?.sideConditions || side?.conditions || {};

    // Creates an array of sanitized side conditions
    const sideConditionNames = Object.keys(sideConditions)
      .map((condition) => ToolsBootstrappable.formatId(condition))
      .filter(Boolean);

    // Creates an array of sanitized volatiles
    const volatileNames = Object.keys(currentPokemon?.volatiles || {})
      .map((volatile) => ToolsBootstrappable.formatId(volatile))
      .filter(Boolean);

    // Creates a state object
    return {
      spikes: (sideConditionNames.includes('spikes') && sideConditions.spikes?.[1]) || 0,
      isReflect: sideConditionNames.includes('reflect'),
      isLightScreen: sideConditionNames.includes('lightscreen'),
      isProtected: volatileNames.includes('protect'),
      isSeeded: volatileNames.includes('leechseed'),
      isForesight: volatileNames.includes('foresight'),
      isSwitching: currentPokemon?.active ? 'out' : 'in',
    };
  }

  // Creates a valid generation number
  static detectGenFromFormat (format, defaultGen = null) {
    if (typeof format === 'number') {
      return Math.max(format, 0);
    }

    const genFormatRegex = /^gen(10|\d)/i;

    if (!genFormatRegex.test(format)) {
      return defaultGen;
    }

    const gen = parseInt(format.match(genFormatRegex)[1], 10) || 0;

    if (gen < 1) {
      return defaultGen;
    }

    return gen;
  }

  // Creates the initial battle state
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
        '[Gen 3 OU Tools] Tools has already been initialized for this battle:', battleId,
        '\ntoolsStateInit:', battleInstance.toolsStateInit,
        '\nbattle:', battleInstance,
        '\ntoolsState:', this.toolsState,
      );

      return;
    }

    // Defines the initial nonce representing the battle state
    const initNonce = uuidnil;

    console.debug(
      '[Gen 3 OU Tools] Initializing Tools for this battle:', battleId,
      '\ninitNonce:', initNonce,
      '\nbattle:', battleInstance,
    );

    // Creates a snapshot of the battle state
    this.toolsState = {
      battleId,
      battleNonce: initNonce,
      gen: battleInstance.gen,
      format: battleId.split('-').find((part) => ToolsBootstrappable.detectGenFromFormat(part)),
      gameType: battleInstance.gameType === 'singles' ? 'singles' : 'doubles',
      turn: Math.max((battleInstance.turn || 0), 0),
      active: !battleInstance.ended,
      paused: false,
      switchPlayers: battleInstance.viewpointSwitched ?? battleInstance.sidesSwitched,
      p1: {
        active: false,
        name: null,
        rating: null,
        side: {
          conditions: {},
        },
      },
      p2: {
        active: false,
        name: null,
        rating: null,
        side: {
          conditions: {},
        },
      },
    };

    // Populates the snapshot with player and side data
    ['p1', 'p2'].forEach((playerKey) => {
      const player = battleInstance[playerKey];

      this.toolsState[playerKey] = {
        active: !!player?.id,
        name: player?.name || null,
        rating: player?.rating || null,
        side: {
          conditions: ToolsBootstrappable.clonePlayerSideConditions(player?.sideConditions),
        },
      };

      // Populates the player side conditions with sanitized data
      this.toolsState[playerKey].side = {
        conditions: this.toolsState[playerKey].side.conditions,
        ...ToolsBootstrappable.sanitizePlayerSide(this.toolsState[playerKey], player),
      };
    });

    // Sets the initialization lock
    battleInstance.toolsStateInit = true;
  }

  // Creates a string that represents a unique battle state 
  // EDITINGNOTE: This needs to be updated with the data that my tool actually uses to sync at the right times.
  static calcBattleToolsNonce(battle, request) {
    const stepQueue = battle?.stepQueue?.filter?.((step) => !!step && !/^\|(?:inactive|-message|c(?!.+\|\/raw)|j|l|player)/i.test(step)) || [];

    return stepQueue.join(';');
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
        '[Gen 3 OU Tools] Tools has been destroyed for this battle:', battleInstance.id,
        '\ntoolsDestroyed:', battleInstance.toolsDestroyed,
        '\nbattle:', battleInstance,
      );

      return;
    }

    // Checks if the battle is missing players
    if (['p1', 'p2'].every((playerKey) => !battleInstance[playerKey]?.id)) {
      console.debug(
        '[Gen 3 OU Tools] Not all players exist in this battle:', battleInstance.id,
        '\nplayers:', ['p1', 'p2'].map((playerKey) => battleInstance[playerKey]?.id),
        '\nstepQueue:', battleInstance.stepQueue,
      );

      return;
    }

    // 
    if (!battleInstance.toolsStateInit) {

      // defines the userID
      const { Adapter } = ToolsBootstrappable;
      const authUserId = (!!Adapter?.authUsername && ToolsBootstrappable.formatId(Adapter.authUsername)) || null;

      // 
      this.initToolsState();

      // Checks if the user is a player in the battle
      if (!battleInstance.ended && ['p1', 'p2'].some((playerKey) => ToolsBootstrappable.formatId(battleInstance[playerKey]?.name) === authUserId)) {
        return;
      }
    }

    // 
    if (!battleInstance.toolsStateInit) {
      return;
    }

    // make sure the battle was active on the previous sync, but now has ended
    if (this.battleState?.active && battleInstance.ended) {
      console.debug(
        '[Gen 3 OU Tools] Updating active state for this finished battle:', battleInstance.id,
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
    battleInstance.nonce = ToolsBootstrappable.calcBattleToolsNonce(battleInstance, this.battleRequest);

    // 
    if (!this.battleState?.battleNonce) {
      return;
    }

    // dispatch a battle sync if the nonces are different (i.e., something changed)
    if (battleInstance.nonce === this.battleState.battleNonce) {
      return;
    }

    console.debug(
      '[Gen 3 OU Tools] Syncing this battle:', battleInstance.id,
      '\nnonce (prev):', this.battleState.battleNonce,
      '\nnonce (cur):', battleInstance.nonce,
      '\nbattleRequest:', this.battleRequest,
      '\nbattle:', battleInstance,
      '\nbattleState (prev):', this.battleState,
    );

    // 
    this.syncBattle(battleInstance, this.battleRequest);
  }

  // 
  static getDexForFormat (format) {
    if (typeof Dex === 'undefined') {
      console.warn(
        '[Gen 3 OU Tools] The global Dex object is not available.',
        '\nformat:', format,
      );

      return null;
    }

    if (!format) {
      return Dex;
    }

    if (typeof format === 'number') {
      return format > 0 ? Dex.forGen(format) : Dex;
    }

    const formatAsId = ToolsBootstrappable.formatId(format);
    const gen = ToolsBootstrappable.detectGenFromFormat(formatAsId);

    if (typeof gen !== 'number' || gen < 1) {
      return Dex;
    }

    return Dex.forGen(gen);
  };

  // 
  static parsePokemonDetails(details) {
    if (!details) {
      return null;
    }

    const [speciesForme] = details.split(', ');

    if (!speciesForme) {
      return null;
    }

    return { speciesForme };
  };

  // 
  static similarPokemon(pokemonA, pokemonB, config) {
    if (!pokemonA?.details || !pokemonB?.details) {
      return false;
    }

    const { details: detailsA } = pokemonA;
    const { details: detailsB } = pokemonB;
    const { format } = config || {};

    const dex = ToolsBootstrappable.getDexForFormat(format);

    const { speciesForme: speciesA } = ToolsBootstrappable.parsePokemonDetails(detailsA);
    const dexA = dex.species.get(speciesA);
    const formeA = (dexA?.exists && dexA.baseSpecies) || null;

    if (!formeA) {
      return false;
    }

    const { speciesForme: speciesB } = ToolsBootstrappable.parsePokemonDetails(detailsB);
    const dexB = dex.species.get(speciesB);
    const formeB = (dexB?.exists && dexB.baseSpecies) || null;

    if (!formeB) {
      return false;
    }

    return formeA === formeB;
  };

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

    // checks for valid toolsstate
    if (!this.battleState?.battleId) {
      return execAddPokemon();
    }

    // 
    const { pokemon: pokemonFromState } = this.battleState[playerKey] || {};

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
          ToolsBootstrappable.similarPokemon(
            { details },
            pokemon, 
            { format: this.battleState.format },
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
      '[Gen 3 OU Tools] Restored client toolsId:', newPokemon.toolsId,
      '\nplayer:', side.sideid,
      '\nprevPokemon:', prevPokemon,
      '\nnewPokemon:', newPokemon,
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
    const format = this.battle.id.split('-').find((part) => ToolsBootstrappable.detectGenFromFormat(part));

    if (!format) {
      return;
    }

    console.debug(
      '[Gen 3 OU Tools] Syncing server team data for this battle:', this.battle,
      '\nmyPokemon (prev):', this.battle.myPokemon,
      '\nmyPokemon (cur):', myPokemon,
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
        ToolsBootstrappable.similarPokemon(
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
    this.battle.nonce = ToolsBootstrappable.calcBattleToolsNonce(this.battle, this.battleRequest);

    console.debug(
      '[Gen 3 OU Tools] Restored server toolsIds.',
      '\nnonce (prev):', prevNonce,
      '\nnonce (cur):', this.battle.nonce,
      '\nmyPokemon (prev):', myPokemon,
      '\nmyPokemon (cur)', this.battle.myPokemon,
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