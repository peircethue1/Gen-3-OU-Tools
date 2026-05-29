/**
 * 
 * EDITINGNOTE: LEFT OFF HERE ON SECOND PASS - CONTINUE DOWN, DO MAIN SECOND TO LAST, DO CONTENT LAST BUT IT HAS BEEN CLEANED UP ALREADY
 * EDITINGNOTE: fix error messages and comments
 */

import { BootClassicBootstrappable } from './BootClassicBootstrappable.js';

export class ToolsBootstrappable extends BootClassicBootstrappable {

  // 
  prevBattleSubscription = null;

  // 
  battleSubscription = (state) => {
    console.debug(
      '[Gen 3 OU Tools] battle.subscribe()', state, 'for', this.battle?.id || this.battleId,
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
      .map((condition) => formatId(condition))
      .filter(Boolean);

    // Creates an array of sanitized volatiles
    const volatileNames = Object.keys(currentPokemon?.volatiles || {})
      .map((volatile) => formatId(volatile))
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

    // Checks if the battle has already been initialized EDITINGNOTE: the original contains a reference to redux here, do I need it?
    if (battleInstance.toolsStateInit) {
      console.debug(
        '[Gen 3 OU Tools] Tools state has already been initialized for', battleId,
        '\ntoolsStateInit:', battleInstance.toolsStateInit,
        '\nbattle:', battleInstance,
        '\ntoolsState:', this.toolsState,
      );

      return;
    }

    // Defines the initial nonce representing the battle state
    const initNonce = 0;

    console.debug(
      '[Gen 3 OU Tools] Initializing Tools state for', battleId,
      '\ninitNonce:', initNonce,
      '\nbattle:', battleInstance,
    );

    // Creates a snapshot of the battle state
    this.toolsState = {
      battleId: battleId,
      battleNonce: initNonce,
      gen: battleInstance.gen,
      // EDITINGNOTE: Where do I restrict usage to the right format and game type, Gen 3 OU Singles?
      format: battleId.split('-').find((part) => detectGenFromFormat(part)),
      gameType: battleInstance.gameType === 'doubles' ? 'Doubles' : 'Singles',
      turn: Math.max((battleInstance.turn || 0), 0),
      // EDITINGNOTE: Do I need this?
      active: !battleInstance.ended,
      // EDITINGNOTE: How does this work?
      switchPlayers: battleInstance.viewpointSwitched ?? battleInstance.sidesSwitched,
      p1: {
        active: false,
        name: null,
        rating: null,
        // EDITINGNOTE: Do I need this?
        autoSelect: false,
        side: {
          conditions: {},
        },
      },
      p2: {
        active: false,
        name: null,
        rating: null,
        // EDITINGNOTE: Do I need this?
        autoSelect: false,
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
        // EDITINGNOTE: Do I need this? How does this work? This is dependent on authUsername, which I may need to add back.
        autoSelect: false,
        side: {
          conditions: clonePlayerSideConditions(player?.sideConditions),
        },
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

  // Creates a string that represents a unique battle state EDITINGNOTE: This needs to be updated with the data that my calculations actually use so that I can sync at the right times
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
        '[Gen 3 OU Tools] Tools state has been destroyed for', battleInstance.id,
        '\ntoolsDestroyed:', battleInstance.toolsDestroyed,
        '\nbattle:', battleInstance,
      );

      return;
    }

    // Checks if the battle is missing players
    if (['p1', 'p2'].every((playerKey) => !battleInstance[playerKey]?.id)) {
      console.debug(
        '[Gen 3 OU Tools] Not all players exist yet in the battle!',
        '\nplayers:', ['p1', 'p2'].map((playerKey) => battleInstance[playerKey]?.id),
        '\nstepQueue:', battleInstance.stepQueue,
        '\nbattle.id:', battleInstance.id,
      );

      return;
    }

    // 
    if (!battleInstance.toolsStateInit) {

      // 
      const { Adapter } = ToolsBootstrappable;

      // defines the userID
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

    // make sure the battle was active on the previous sync, but now has ended EDITINGNOTE: what is toolsRoomId???
    if (this.battleState?.active && battleInstance.ended) {
      console.debug(
        '[Gen 3 OU Tools] Battle', battleInstance.id, 'ended; updating active state...',
        '\ntoolsRoomId:', battleInstance.toolsRoomId,
        '\nbattle:', battleInstance,
      );

      // EDITINGNOTE: what is the point of active false paused true? should I initialize paused during init?
      this.toolsState = {
        battleId: battleInstance.id,
        battleNonce: battleInstance.nonce,
        active: false,
        paused: true,
      };

      return;
    }

    // 
    battleInstance.nonce = calcBattleToolsNonce(battleInstance, this.battleRequest);

    // 
    if (!this.battleState?.battleNonce) {
      return;
    }

    // dispatch a battle sync if the nonces are different (i.e., something changed)
    if (battleInstance.nonce === this.battleState.battleNonce) {
      return;
    }

    console.debug(
      '[Gen 3 OU Tools] Syncing battle for', battleInstance.id,
      '\nnonce (prev):', this.battleState.battleNonce, '(now):', battleInstance.nonce,
      '\nrequest:', this.battleRequest,
      '\nbattle:', battleInstance,
      '\nstate (prev):', this.battleState,
    );

    // EDITINGNOTE: Make sure this is implemented elsewhere, as in the original it is calling from redux/actions/syncbattle.ts LEFTOFFHERELEFTOFFHERELEFTOFFHERELEFTOFFHERELEFTOFFHERELEFTOFFHERELEFTOFFHERE
    this.syncBattle(this.battle, this.battleRequest);
  }

  // EDITINGNOTE: 
  static getDexForFormat (format) {
    if (typeof Dex === 'undefined') {
        console.warn(
          'Global Dex object is not available.',
          '\nformat', format,
        );

      return null;
    }

    if (!format) {
      return Dex;
    }

    if (typeof format === 'number') {
      return format > 0 ? Dex.forGen(format) : Dex;
    }

    const formatAsId = formatId(format);

    const gen = detectGenFromFormat(formatAsId);

    if (typeof gen !== 'number' || gen < 1) {
      return Dex;
    }

    return Dex.forGen(gen);
  };

  // EDITINGNOTE: where does this actually need to go? if these are only used in one place, maybe best to put them in there
  static parsePokemonDetails(details) {
    if (!details) {
      return null;
    }

    return details.split(',', 1) || null;
  };

  // EDITINGNOTE: where does this actually need to go?
  static similarPokemon(pokemonA, pokemonB, config) {
    if (!pokemonA?.details || !pokemonB?.details) {
      return false;
    }

    const { details: detailsA } = pokemonA;
    const { details: detailsB } = pokemonB;

    const {
      format,
      normalizeFormes,
    } = config || {};

    const shouldNormalizeFormes = normalizeFormes === 'wildcard' && [detailsA, detailsB].some((details) => details.includes('-*'));

    const dex = getDexForFormat(format);

    const { speciesForme: speciesA } = parsePokemonDetails(detailsA);

    const dexA = dex.species.get(speciesA);

    const formeA = (
      dexA?.exists && (
        shouldNormalizeFormes ? dexA.baseSpecies : dexA.name
      )
    ) || null;

    if (!formeA) {
      return false;
    }

    const { speciesForme: speciesB } = parsePokemonDetails(detailsB);

    const dexB = dex.species.get(speciesB);

    const formeB = (
      dexB?.exists && (
        shouldNormalizeFormes ? dexB.baseSpecies : dexB.name
      )
    ) || null;

    if (!formeB) {
      return false;
    }

    return (formeA === formeB);
  };

















  // patches in the calcdexId to client Showdown.Pokemon
  patchClientToolsIdentifier(playerKey, addPokemon, addPokemonArgv) {

    // checks for valid inputs
    if (!playerKey || typeof addPokemon !== 'function' || !addPokemonArgv?.length) {
      return null;
    }

    const execAddPokemon = () => addPokemon(...addPokemonArgv);

    // execute the client's function if we have a bad state
    if (!this.battle?.id || !this.battle.toolsStateInit) {
      return execAddPokemon();
    }

    const side = this.battle[playerKey];

    // execute the client's function if we have a bad side
    if (!side?.sideid) {
      return execAddPokemon();
    }

    // we'll collect potential candidates to assemble the final search list below, do I need to initialize this?
    const pokemonSearchCandidates = [];

    // make sure this comes first before `pokemonState` in case `replaceSlot` is specified
    if (side.pokemon?.length) {
      pokemonSearchCandidates.push(...side.pokemon);
    }

    // checks for valid toolsstate
    if (!this.toolsState?.battleId) {
      return execAddPokemon();
    }

    // EDITINGNOTE: this is coming back from redux via syncbattle
    const { pokemon: pokemonFromState } = this.toolsState[playerKey] || {};

    if (pokemonFromState?.length) {
      pokemonSearchCandidates.push(...pokemonFromState);
    }

    // don't filter this in case `replaceSlot` is specified DO I NEED ALL THIS?
    const pokemonSearchList = pokemonSearchCandidates.map((pokemon) => ({
      toolsId: pokemon.toolsId,
      ident: pokemon.ident,
      speciesForme: pokemon.speciesForme,
      gender: pokemon.gender,
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
    const prevPokemon = (replaceSlot > -1 && pokemonSearchList[replaceSlot]) || 
      pokemonSearchList.filter((pokemon) => !!pokemon.toolsId).find((pokemon) => (
        (!ident || ((!!pokemon?.ident && pokemon.ident === ident) || (!!pokemon?.searchid?.includes('|') && pokemon.searchid.split('|')[0] === ident)))
          && similarPokemon({ details }, pokemon, {
            format: this.toolsState.format,
            normalizeFormes: 'wildcard',
          })
      ));



    const newPokemon = execAddPokemon();

    if (!newPokemon?.speciesForme) {
      this.endTimer('(bad newPokemon)', newPokemon);

      return newPokemon;
    }

    if (!prevPokemon?.calcdexId) {
      this.endTimer('(bad prevPokemon)', prevPokemon);

      return newPokemon;
    }

    newPokemon.calcdexId = prevPokemon.calcdexId;

    l.debug(
      'Restored calcdexId', newPokemon.calcdexId,
      'from prevPokemon', prevPokemon.ident || prevPokemon.speciesForme,
      'to newPokemon', newPokemon.ident || newPokemon.speciesForme,
      'for player', side.sideid,
      '\n', 'prevPokemon[]', prevPokemon,
      '\n', 'newPokemon[]', newPokemon,
    );

    return newPokemon;
  }








  // patches in the calcdexId to Showdown.ServerPokemon (i.e., battle.myPokemon[])
  // note: the myPokemon[] arg should be from the freshest source, e.g., (request as Showdown.BattleRequest).side.pokemon[],
  // & preferably not from the battle state, e.g., battle.myPokemon[], since it would've already been mutated by that point
  protected patchServerCalcdexIdentifier(myPokemon: Showdown.ServerPokemon[]): void {
    this.startTimer();

    if (!this.battle?.id) {
      return void this.endTimer('(bad battle)', this.battle?.id, this.battle);
    }

    /* if (this.battle.calcdexIdPatched) {
      return void this.endTimer('(already patched)');
    } */

    if (!myPokemon?.length) {
      return void this.endTimer('(no server mon)', myPokemon, this.battle);
    }

    const format = this.battle.id.split('-').find((part) => detectGenFromFormat(part));

    if (!format) {
      return void this.endTimer('(bad format)', format, this.battle);
    }

    l.debug(
      'patchServerCalcdexIdentifier()', 'myPokemon[]', myPokemon,
      '\n', 'battle', this.battle,
      '\n', 'battle.myPokemon[]', this.battle.myPokemon,
    );

    if (!Array.isArray(this.battle.myPokemon)) {
      return void this.endTimer('(bad server mon)', this.battle.myPokemon, this.battle);
    }

    let didUpdate = !myPokemon?.length && !!this.battle.myPokemon?.length;

    // with each updated myPokemon[], see if we find a match to restore its calcdexId
    this.battle.myPokemon.forEach((pokemon) => {
      if (!pokemon?.ident || pokemon.calcdexId) {
        return;
      }

      // note (2023/07/30): leave the `ident` check as is here since viewing a replay wouldn't trigger this function
      // (there are no myPokemon[] when viewing a replay, even if you were viewing your own battle!)
      const prevMyPokemon = myPokemon.find((p) => !!p?.ident && (
        p.ident === pokemon.ident
          || p.speciesForme === pokemon.speciesForme
          || p.details === pokemon.details
          // update (2023/07/27): this check breaks when p.details is 'Mewtwo' & pokemon.speciesForme is 'Mew',
          // resulting in the Mewtwo's calcdexId being assigned to the Mew o_O
          // || p.details.includes(pokemon.speciesForme)
          // update (2023/07/30): `details` can include the gender, if applicable (e.g., 'Reuniclus, M')
          /* || p.details === [
            pokemon.speciesForme.replace('-*', ''),
            pokemon.gender !== 'N' && pokemon.gender,
          ].filter(Boolean).join(', ') */
          || similarPokemon(pokemon, p, {
            format,
            normalizeFormes: 'wildcard',
            ignoreMega: true,
          })
      ));

      if (!prevMyPokemon?.calcdexId) {
        return;
      }

      pokemon.calcdexId = prevMyPokemon.calcdexId;
      didUpdate = true;

      /* l.debug(
        'Restored previous calcdexId for', pokemon.speciesForme, 'in battle.myPokemon[]',
        '\n', 'calcdexId', prevMyPokemon.calcdexId,
        '\n', 'pokemon', '(prev)', prevMyPokemon, '(now)', pokemon,
      ); */
    });

    if (!didUpdate || !this.battle.calcdexInit) {
      return void this.endTimer('(no updates)');
    }

    const { nonce: prevNonce } = this.battle;

    this.battle.nonce = calcBattleToolsNonce(this.battle, this.battleRequest);

    l.debug(
      'Restored previous calcdexId\'s in battle.myPokemon[]',
      '\n', 'nonce', '(prev)', prevNonce, '(now)', this.battle.nonce,
      '\n', 'myPokemon[]', '(prev)', myPokemon, '(now)', this.battle.myPokemon,
    );

    // since myPokemon[] could be available now, forcibly fire a battle sync
    // (should we check if myPokemon[] is actually populated? maybe... but I'll leave it like this for now)
    this.battle.subscription('callback');
  }

  // needs to be uniquely implemented in each __SHOWDEX_HOST bootstrapper
  // (should make use of both the patchClientCalcdexIdentifier() & patchServerCalcdexIdentifier() methods)
  protected abstract patchCalcdexIdentifier(): void;

  /**
   * Determines if the auth user has won/loss, then increments the win/loss counter.
   *
   * * Specify the `forceResult` argument when you know the `battle` object might not be available.
   *   - `battle` wouldn't be typically available in a `ForfeitPopup` used in the `'classic'` Showdown client, for instance.
   *
   * @since 1.0.6
   */
  

  /**
   * Opens an existing Calcdex tab (or battle if overlayed) or creates a new one.
   *
   * * Extracted from the Hellodex bootstrapper in v1.2.0.
   *
   * @since 1.0.3
   */
  public abstract open(): void;

  /**
   * Closes the Calcdex (& its associated client battle room, if applicable).
   *
   * @since 1.3.0
   */
  public abstract close(): void;

  /**
   * Removes all traces of (& also `close()`'s) the Calcdex.
   *
   * @since 1.3.0
   */
  public abstract destroy(): void;
}