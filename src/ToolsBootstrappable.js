// 

import {
  type CalcdexPlayer,
  type CalcdexPlayerKey,
  type CalcdexPokemon,
  CalcdexPlayerKeys as AllPlayerKeys,
} from '@showdex/interfaces/calc';~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
import { syncBattle } from '@showdex/redux/actions';~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
import { type RootDispatch, calcdexSlice } from '@showdex/redux/store';~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
import {
  clonePlayerSideConditions,
  sanitizePlayerSide,
  similarPokemon,
} from '@showdex/utils/battle';~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
import { calcBattleCalcdexNonce } from '@showdex/utils/calc';~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
import { formatId } from '@showdex/utils/core';~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
import { detectGenFromFormat } from '@showdex/utils/dex';~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
import { detectClassicHost } from '@showdex/utils/host';~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
import { BootClassicBootstrappable } from './BootClassicBootstrappable.js';

export class ToolsBootstrappable extends BootClassicBootstrappable {

  // 
  constructor(battleId) {
    super();

    this.battleId = (battleId || null);

    this.prevBattleSubscription = null;
    this.battleSubscription = (state) => {
      console.debug(
        '[Gen 3 OU Tools] battle.subscribe()', state, 'for', this.battle?.id || this.battleId,
        '\nbattle:', this.battle,
        '\nrequest:', this.battleRequest,
      );

      // call the original subscription() first, if any, so we don't break anything we don't mean to!
      this.prevBattleSubscription?.(state);
      this.syncTools();
    };
  }

  // 
  get battle() {
    throw new Error('ToolsBootstrappable Error: get battle() is not implemented.');
  }

  //
  get battleRequest() {
    throw new Error('ToolsBootstrappable Error: get battleRequest() is not implemented.');
  }

  // check for '|noinit|nonexistent|' in the `data` & if present, ignore initializing this battle
  get initDisabled() {
    const queue = this.battle?.stepQueue || [];
    return queue.some(step => typeof step === 'string' && step.startsWith('|noinit|nonexistent|'));
  }

  // EDITINGNOTE: where does this actually need to go?
  clonePlayerSideConditions(conditions) {
    return Object.entries(conditions || {}).reduce((prev, [key, value]) => {
      prev[key] = Array.isArray(value) ? [...value] : value;
      return prev;
    }, {});
  }

  //EDITINGNOTE: where does this actually need to go? should this be static?
  formatId(value) {
    return value
      ?.toString?.()
      .normalize('NFD')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();
  }

  //EDITINGNOTE: where does this actually need to go? Also check if the (a) => convention is right and that the same convention is followed everywhere
  sanitizePlayerSide(player, battleSide) {
    const selectionIndex = player?.selectionIndex;
    const playerPokemon = player?.pokemon;
    const side = player?.side;

    const currentPokemon = playerPokemon?.length && selectionIndex > -1 ? playerPokemon[selectionIndex] : null;

    const sideConditions = battleSide?.sideConditions || side?.conditions || {};

    const sideConditionNames = Object.keys(sideConditions)
      .map((c) => formatId(c))
      .filter(Boolean);

    const volatileNames = Object.keys(currentPokemon?.volatiles || {})
      .map((v) => formatId(v))
      .filter(Boolean);

    return {
      spikes: (sideConditionNames.includes('spikes') && sideConditions.spikes?.[1]) || 0,
      isReflect: sideConditionNames.includes('reflect'),
      isLightScreen: sideConditionNames.includes('lightscreen'),
      isProtected: volatileNames.includes('protect'),
      isSeeded: volatileNames.includes('leechseed'),
      isForesight: volatileNames.includes('foresight'),
      isSwitching: currentPokemon?.active ? 'out' : 'in',
    };
  };

  // Creates an initial battle state
  initToolsState() {
    const battleInstance = this.battle;
    const battleId = battleInstance?.id || this.battleId;

    if (!battleId) {
      return;
    }

    // Prevents the initial state tool from running again once it is already initialized
    if (battleInstance.toolsStateInit) {
      console.debug(
        '[Gen 3 OU Tools] Tools state has already been initialized for', battleId,
        '\ntoolsStateInit:', battleInstance.toolsStateInit,
        '\nbattle:', battleInstance,
      );

      return;
    }

    const initNonce = 0

    console.debug(
      '[Gen 3 OU Tools] Initializing Tools state for', battleId,
      '\ninitNonce:', initNonce,
      '\nbattle:', battleInstance,
    );

    // Creates a snapshot of the battle 
    this.toolsState = {
      battleId: battleId,
      battleNonce: initNonce,
      gen: battleInstance.gen,
      // EDITINGNOTE: I think I just want gen3ou or null? Regardless, I need to change this once I see gen3ou's battleId
      format: battleId,
      gameType: battleInstance.gameType === 'doubles' ? 'Doubles' : 'Singles',
      turn: Math.max((battleInstance.turn || 0), 0),
      // EDITINGNOTE: do I even need this? it says its used for cleanup routines but i only want tools to close once the window is closed
      active: !battleInstance.ended,
      // EDITINGNOTE: I don't understand the purpose of this or how it works, but it seems important
      switchPlayers: battleInstance.viewpointSwitched ?? battleInstance.sidesSwitched,
      p1: {},
      p2: {},
    };

    // gets player and side information
    ['p1', 'p2'].forEach((playerKey) => {
      const player = battleInstance[playerKey];

      this.toolsState[playerKey] = {
        active: !!player?.id,
        name: player?.name || null,
        rating: player?.rating || null,
        // EDITINGNOTE: I don't know what's going on here, or whether I even need it, but null isn't right
        autoSelect: null,
        side: {
          conditions: clonePlayerSideConditions(player?.sideConditions)
        },
      };

      // populates the player side conditions with sanitized information
      this.toolsState[playerKey].side = {
        conditions: this.toolsState[playerKey].side.conditions,
        ...sanitizePlayerSide(
          this.toolsState[playerKey],
          player,
        ),
      };
    });

    // sets the lock
    battleInstance.toolsStateInit = true;
  }

  // EDITINGNOTE: I introduce the nonce here, this needs to be updated with the data that I actually use so that it can accurately track state changes, also do I actually need ; after the last }
  calcBattleToolsNonce(battle, request) {
    const stepQueue = battle?.stepQueue
    ?.filter?.((q) => !!q && !/^\|(?:inactive|-message|c(?!.+\|\/raw)|j|l|player)/i.test(q))
    || [];
    
    return stepQueue.join(';');
  }

  // address battleInstance = this.battle
  syncTools() {
    const battleInstance = this.battle;

    if (!battleInstance?.id) {
      return;
    }

    // don't render if we've already destroyed the calcdex state
    if (battleInstance.toolsDestroyed) {
      console.debug(
        '[Gen 3 OU Tools] Tools state has been destroyed for', battleInstance.id,
        '\ntoolsDestroyed:', battleInstance.toolsDestroyed,
        '\nbattle:', battleInstance,
      );

      return;
    }

    // ignore any freshly created battle objects with missing players
    if (['p1', 'p2'].every((k) => !battleInstance[k]?.id)) {
      console.debug(
        '[Gen 3 OU Tools] Not all players exist yet in the battle!',
        '\nplayers:', ['p1', 'p2'].map((k) => battleInstance[k]?.id),
        '\nstepQueue:', battleInstance.stepQueue,
        '\nbattle.id:', battleInstance.id,
      );

      return;
    }

    // 
    if (!battleInstance.toolsStateInit) {
      
      // 
      const authUserId = (!!Adapter?.authUsername && formatId(Adapter.authUsername)) || null;

      this.initCalcdexState();

      // 
      if (!battleInstance.ended && ['p1', 'p2'].some((k) => formatId(battleInstance[k]?.name) === authUserId)) {
        return;
      }
    }

    if (!battleInstance.toolsStateInit) {
      return;
    }

    // make sure the battle was active on the previous sync, but now has ended
    if (this.battleState?.active && battleInstance.ended) {
      console.debug(
        '[Gen 3 OU Tools] Battle', battleInstance.id, 'ended; updating active state...',
        '\ntoolsRoomId:', battleInstance.toolsRoomId,
        '\nbattle:', battleInstance,
      );

      // should I be putting all of this. onto adapter. instead? what is the point of active false paused true? should I initialize active and paused variables during init?
      this.toolsState = {
        battleId: battleInstance.id,
        battleNonce: battleInstance.nonce,
        active: false,
        paused: true,
      };

      return;
    }

    // 
    this.battle.nonce = calcBattleToolsNonce(this.battle, this.battleRequest);

    // 
    if (!this.battleState?.battleNonce) {
      return;
    }

    // dispatch a battle sync if the nonces are different (i.e., something changed)
    if (this.battle.nonce === this.battleState.battleNonce) {
      return;
    }

    console.debug(
      'Syncing battle for', this.battle.id,
      '\nnonce (prev):', this.battleState.battleNonce, '(now):', this.battle.nonce,
      '\nrequest:', this.battleRequest,
      '\nbattle:', this.battle,
      '\nstate (prev):', this.battleState,
    );

    // why can we get rid of their custom function for connecting with redux, its quite a beast, it sets up quite a lot of tracking
    this.syncBattle(this.battle, this.battleRequest);
  }










  // patches in the calcdexId to client Showdown.Pokemon
  protected patchClientCalcdexIdentifier(
    playerKey: CalcdexPlayerKey,
    addPokemon: Showdown.Side['addPokemon'],
    addPokemonArgv: Parameters<Showdown.Side['addPokemon']>,
  ): ReturnType<Showdown.Side['addPokemon']> {
    this.startTimer();

    if (!playerKey || typeof addPokemon !== 'function' || !addPokemonArgv?.length) {
      this.endTimer('(bad patch args)');

      return null;
    }

    const execAddPokemon = () => addPokemon(...addPokemonArgv);

    if (!this.battle?.id || !this.battle.calcdexStateInit) {
      this.endTimer('(bad battle)', this.battle?.id, this.battle);

      return execAddPokemon();
    }

    /* if (this.battle.calcdexIdPatched) {
      this.endTimer('(already patched)');

      return execAddPokemon();
    } */

    const side = this.battle[playerKey];

    if (!side?.sideid) {
      this.endTimer('(bad side)', side);

      return execAddPokemon();
    }

    // we'll collect potential candidates to assemble the final search list below
    const pokemonSearchCandidates: (Showdown.Pokemon | CalcdexPokemon)[] = [];

    // make sure this comes first before `pokemonState` in case `replaceSlot` is specified
    if (side.pokemon?.length) {
      pokemonSearchCandidates.push(...side.pokemon);
    }

    // update (2024/01/03): someone encountered a strange case in Gen 9 VGC 2024 Reg F when after using Parting Shot,
    // accessing battleState.format in the similarPokemon() call below would result in a TypeError, causing their
    // Showdown to break (spitting the runMajor() stack trace into the BattleRoom chat)... which means battleState was
    // undefined for some reason o_O (apparently this doesn't happen often tho)
    if (!this.battleState?.battleId) {
      // we'll just let the client deal with whatever this is
      return addPokemon(...addPokemonArgv);
    }

    const { pokemon: pokemonFromState } = this.battleState[playerKey] || {};

    if (pokemonFromState?.length) {
      pokemonSearchCandidates.push(...pokemonFromState);
    }

    // don't filter this in case `replaceSlot` is specified
    const pokemonSearchList = pokemonSearchCandidates.map((p) => ({
      calcdexId: p.calcdexId,
      ident: p.ident,
      // name: p.name,
      speciesForme: p.speciesForme,
      gender: p.gender,
      details: p.details,
      searchid: p.searchid,
    }));

    const [
      , // unused; i.e., name
      ident,
      details,
      replaceSlot = -1,
    ] = addPokemonArgv;

    // just js things uwu
    const prevPokemon = (replaceSlot > -1 && pokemonSearchList[replaceSlot])
      || pokemonSearchList.filter((p) => !!p.calcdexId).find((p) => (
        // e.g., ident = 'p1: CalcdexDemolisher' (nicknamed) or 'p1: Ditto' (unnamed default)
        // update (2023/07/30): while `ident` is mostly available, when viewing a replay (i.e., an old saved battle), it's not!
        (!ident || (
          (!!p?.ident && p.ident === ident)
            // e.g., searchid = 'p1: CalcdexDemolisher|Ditto'
            // nickname case: pass; default case: fail ('p1: CalcdexDemolisher' !== 'p1: Ditto')
            // note: not doing startsWith() since 'p1: Mewtwo|Mewtwo' will pass when given ident 'p1: Mew'
            || (!!p?.searchid?.includes('|') && p.searchid.split('|')[0] === ident)
        ))
          && similarPokemon({ details }, p, {
            format: this.battleState.format,
            normalizeFormes: 'wildcard',
            ignoreMega: true,
          })
      ));

    /* l.debug(
      'side.addPokemon()', 'for', ident || name || details?.split(',')?.[0], 'for player', side.sideid,
      '\n', 'ident', ident,
      '\n', 'details', details,
      '\n', 'replaceSlot', replaceSlot,
      '\n', 'prevPokemon[]', prevPokemon,
      '\n', 'pokemonSearchList[]', pokemonSearchList,
      // '\n', 'side', side,
      // '\n', 'battle', this.battle,
    ); */

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

    this.battle.nonce = calcBattleCalcdexNonce(this.battle, this.battleRequest);

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