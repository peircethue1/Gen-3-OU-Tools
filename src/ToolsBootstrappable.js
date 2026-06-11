/**
 * 
 * EDITINGNOTE: REVIEW THIS, THEN TOOLSCLASSICBOOTSTRAPPER, THEN SYNCBATTLE, THEN SYNCPREDICTION
 * EDITINGNOTE: Review comment content only, REVIEW NONCE CHUNK IN FULL
 */

import { NIL as uuidnil, v5 as uuidv5 } from 'uuid';
import { syncBattle } from './syncBattle.js';
import { BootClassicBootstrappable } from './BootClassicBootstrappable.js';
import { syncPrediction } from './syncPrediction.js';

export class ToolsBootstrappable extends BootClassicBootstrappable {

  // 
  prevBattleSubscription = null;

  // 
  syncBattle = syncBattle;
  syncPrediction = syncPrediction;

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

  // 
  get battleState() {
    return this.toolsState;
  }

  // Checks if initialization is disabled for the battle
  get initDisabled() {
    return (this.battle?.stepQueue || []).some((step) => step?.startsWith('|noinit|nonexistent|'));
  }

  // Creates a valid generation number
  static detectGenFromFormat(format, defaultGen = null) {
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

  // 
  static sanitizeField() {
    return {
      weather: null,
      attackerSide: null,
      defenderSide: null,
    };
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
        '[Gen 3 OU Tools] The battle has already been initialized.',
        '\nbattleId:', battleId,
        '\ntoolsStateInit:', battleInstance.toolsStateInit,
        '\nbattle:', battleInstance,
        '\ntoolsState:', this.toolsState,
      );

      return;
    }

    // Defines the initial nonce representing the battle state
    const initNonce = uuidnil;

    console.debug(
      '[Gen 3 OU Tools] Initializing the battle.',
      '\nbattleId:', battleId,
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
      playerKey: null,
      authPlayerKey: null,
      opponentKey: null,
      switchPlayers: battleInstance.viewpointSwitched ?? battleInstance.sidesSwitched,
      field: ToolsBootstrappable.sanitizeField(),
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
          conditions: ToolsBootstrappable.clonePlayerSideConditions(player?.sideConditions),
        },
        pokemonOrder: [],
        pokemon: [],
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










  // 
  static nonEmptyObject = (obj) => {
    if (typeof obj !== 'object') {
      return false;
    }

    if (Array.isArray(obj)) {
      return !!obj.length;
    }

    return !!Object.keys(obj || {}).length;
  }

  // 
  static serializePayload = (payload) => Object.entries(payload || {})
    .map(([key, value]) => `${key}:${(typeof value === 'object' ? JSON.stringify(value) : String(value)) ?? '???'}`)
    .join('|')

  // 
  static calcToolsId = (payload) => {
    const serialized = ToolsBootstrappable.nonEmptyObject(payload) ? ToolsBootstrappable.serializePayload(payload) :
      ['string', 'number', 'boolean'].includes(typeof payload) ? String(payload) : null;

    if (!serialized) {
      return null;
    }

    return uuidv5(
      serialized?.replace(/[^A-Z0-9\x20~`!@#$%^&*()+\-_=\[\]{}<>\|:;,\.'"\/\\]/gi, ''),
      uuidnil,
    );
  }

  // 
  static sanitizeVolatiles = (pokemon) =>
  Object.entries(pokemon?.volatiles || {}).reduce((volatiles, [id, volatile]) => {
    const [, value, ...rest] = volatile || [];

    const transformed = formatId(id) === 'transform' && typeof value?.speciesForme === 'string';

    if (transformed || !value || ['string', 'number'].includes(typeof value)) {
      volatiles[id] = transformed ? [
        id,
        value.speciesForme,
        ...rest,
      ] : volatile;
    }

    return volatiles;
  }, {});

  // 
  static calcPokemonToolsNonce = (pokemon) => ToolsBootstrappable.calcToolsId({
    ident: pokemon?.ident,
    name: pokemon?.name,
    speciesForme: pokemon?.speciesForme,
    hp: pokemon?.hp?.toString(),
    maxhp: pokemon?.maxhp?.toString(),
    level: pokemon?.level?.toString(),
    gender: pokemon?.gender,
    ability: pokemon?.ability,
    baseAbility: pokemon?.baseAbility,
    nature: (!!pokemon?.speciesForme && 'nature' in pokemon && pokemon.nature) || null,
    types: (!!pokemon?.speciesForme && 'types' in pokemon && pokemon.types?.join('|')) || null,
    item: pokemon?.item,
    itemEffect: pokemon?.itemEffect,
    prevItem: pokemon?.prevItem,
    prevItemEffect: pokemon?.prevItemEffect,
    ivs: (!!pokemon?.speciesForme && 'ivs' in pokemon && ToolsBootstrappable.calcToolsId(pokemon.ivs)) || null,
    evs: (!!pokemon?.speciesForme && 'evs' in pokemon && ToolsBootstrappable.calcToolsId(pokemon.evs)) || null,
    status: pokemon?.status,
    statusData: ToolsBootstrappable.calcToolsId(pokemon?.statusData),
    statusStage: pokemon?.statusStage?.toString(),
    volatiles: ToolsBootstrappable.calcToolsId(ToolsBootstrappable.sanitizeVolatiles(pokemon)),
    turnstatuses: ToolsBootstrappable.calcToolsId(pokemon?.turnstatuses),
    sleepCounter: (!!pokemon?.speciesForme && 'sleepCounter' in pokemon && pokemon.sleepCounter?.toString())
      || (ToolsBootstrappable.nonEmptyObject(pokemon?.statusData) && pokemon.statusData.sleepTurns?.toString())
      || null,
    toxicCounter: (!!pokemon?.speciesForme && 'toxicCounter' in pokemon && pokemon.toxicCounter?.toString())
      || (ToolsBootstrappable.nonEmptyObject(pokemon?.statusData) && pokemon.statusData.toxicTurns?.toString())
      || null,
    hitCounter: (!!pokemon?.speciesForme && 'hitCounter' in pokemon && pokemon.hitCounter?.toString())
      || (!!pokemon?.speciesForme && 'timesAttacked' in pokemon && pokemon.timesAttacked?.toString())
      || null,
    faintCounter: (!!pokemon?.speciesForme && 'faintCounter' in pokemon && pokemon.faintCounter?.toString()) || null,
    moves: pokemon?.moves?.join(';'),
    moveTrack: ToolsBootstrappable.calcToolsId((pokemon?.moveTrack)?.map((track) => track?.join(':'))?.join(';')),
    revealedMoves: (!!pokemon?.speciesForme && 'revealedMoves' in pokemon && ToolsBootstrappable.calcToolsId(pokemon.revealedMoves)) || null,
    boosts: ToolsBootstrappable.calcToolsId(pokemon?.boosts),
    baseStats: (!!pokemon?.speciesForme && 'baseStats' in pokemon && ToolsBootstrappable.calcToolsId(pokemon.baseStats)) || null,
    spreadStats: (!!pokemon?.speciesForme && 'spreadStats' in pokemon && ToolsBootstrappable.calcToolsId(pokemon.spreadStats)) || null,
    criticalHit: (!!pokemon?.speciesForme && 'criticalHit' in pokemon && pokemon.criticalHit?.toString()) || null,
  })

  // 
  static calcSideToolsNonce = (side) => ToolsBootstrappable.calcToolsId({
    id: side?.id,
    sideid: side?.sideid,
    name: side?.name,
    rating: side?.rating,
    totalPokemon: side?.totalPokemon?.toString(),
    active: side?.active?.map((mon) => ToolsBootstrappable.calcPokemonToolsNonce(mon)).join(';'),
    pokemon: side?.pokemon?.map((mon) => ToolsBootstrappable.calcPokemonToolsNonce(mon)).join(';'),
    sideConditions: Object.keys(side?.sideConditions || {}).join(';'),
  })

  // Creates a string that represents a unique battle state
  calcBattleToolsNonce = (battle, request) => {
    const stepQueue = battle?.stepQueue
      ?.filter?.((step) => !!step && !/^\|(?:inactive|-message|c(?!.+\|\/raw)|j|l|player)/i.test(step))
      || [];

    return ToolsBootstrappable.calcToolsId({
      id: battle?.id,
      gen: battle?.gen?.toString(),
      tier: battle?.tier,
      gameType: battle?.gameType,
      paused: String(!!battle?.paused),
      ended: String(!!battle?.ended),
      myPokemon: battle?.myPokemon?.length ? ToolsBootstrappable.calcToolsId(
        battle.myPokemon.map((pokemon) => ToolsBootstrappable.calcPokemonToolsNonce(pokemon)).join(';') || 'empty',
      ) : null,
      mySide: ToolsBootstrappable.calcSideToolsNonce(battle?.mySide),
      nearSide: ToolsBootstrappable.calcSideToolsNonce(battle?.nearSide),
      p1: ToolsBootstrappable.calcSideToolsNonce(battle?.p1),
      p2: ToolsBootstrappable.calcSideToolsNonce(battle?.p2),
      stepQueue: ToolsBootstrappable.calcToolsId(stepQueue.join(';')),
      rqid: request?.rqid?.toString(),
      requestType: request?.requestType,
      side: request?.side?.id,
      smogonChaos: !!this.battleState?.smogonChaos,
      smogonLeads: !!this.battleState?.smogonLeads,
    });
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
    battleInstance.nonce = this.calcBattleToolsNonce(battleInstance, this.battleRequest);

    // 
    if (!this.battleState?.battleNonce) {
      return;
    }

    // dispatch a battle sync if the nonces are different (i.e., something changed)
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
      '\nbattleState:', this.battleState,
    );

    // 
    this.syncBattle(battleInstance, this.battleRequest);
  }

  // 
  static getDexForFormat (format) {
    if (typeof Dex === 'undefined') {
      console.warn('[Gen 3 OU Tools] The global Dex is not available for this format:', format);

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
    const format = this.battle.id.split('-').find((part) => ToolsBootstrappable.detectGenFromFormat(part));

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
    this.battle.nonce = this.calcBattleToolsNonce(this.battle, this.battleRequest);

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