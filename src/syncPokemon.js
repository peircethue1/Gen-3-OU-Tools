/**
 * 
 * EDITINGNOTE: Full review
 */

import {
  getDexForFormat,
  detectGenFromFormat,
  clonePokemon,
  nonEmptyObject,
  formatId,
  sanitizeMoveTrack,
  sanitizeVolatiles,
  sanitizePokemon,
  similarArrays,
  calcPokemonSpreadStats,
} from './utilities.js';

export const syncPokemon = (pokemon, config) => {
  const {
    format,
    clientPokemon,
    serverPokemon,
  } = config || {};

  const dex = getDexForFormat(format);
  const gen = detectGenFromFormat(format);

  // final synced Pokemon that will be returned at the end
  const syncedPokemon = clonePokemon(pokemon);

  // if server-sourced, will be updated below
  if (!syncedPokemon.source && clientPokemon?.speciesForme) {
    syncedPokemon.source = 'client';
  }

  // you should not be looping through any special CalcdexPokemon-specific properties here!
  ([
    'name',
    'speciesForme',
    'hp',
    'maxhp',
    'status',
    'statusData',
    'timesAttacked',
    'ability',
    'baseAbility',
    'item',
    'itemEffect',
    'prevItem',
    'prevItemEffect',
    'moves',
    'lastMove',
    'moveTrack',
    'volatiles',
    'turnstatuses',
    'boosts',
  ]).forEach((key) => {
    const prevValue = syncedPokemon[key];
    let value = clientPokemon?.[key];

    // note: this will accept null values!
    if (value === undefined) {
      return;
    }

    // note: `return` to not set the `value` & go next, `break` to stop processing & move onto the `value` diff check to set it
    switch (key) {
      case 'name': {
        break;
      }

      case 'speciesForme': {

        // e.g., 'Urshifu-*' -> 'Urshifu' (to fix forme switching, which is prevented due to the wildcard forme)
        value = value.replace('-*', '');

        if (prevValue === value) {
          return;
        }

        // if the speciesForme changed, update the types & possible abilities (could change due to mega-evolutions or gigantamaxing, for instance)
        const updatedSpecies = dex.species.get(value);

        syncedPokemon.types = [
          ...(updatedSpecies?.types || syncedPokemon.types || []),
        ];

        if (nonEmptyObject(updatedSpecies?.abilities)) {
          syncedPokemon.abilities = [
            ...Object.values(updatedSpecies.abilities),
          ];
        }

        break;
      }

      case 'hp':
      case 'maxhp': {

        // note: returning at any point here will skip syncing the `value` from the Showdown.Pokemon (i.e., clientPokemon) to the CalcdexPokemon (i.e., syncedPokemon) (but only for the current `key` of the iteration, of course)
        if (typeof serverPokemon?.hp === 'number' && typeof serverPokemon.maxhp === 'number') {
          return;
        }

        // note: breaking will continue the sync operation (which in this case, if a serverPokemon wasn't provided, we'll use the hp/maxhp from the clientPokemon)
        break;
      }

      case 'status': {

        // remove the Pokemon's status if fainted
        if (!syncedPokemon.hp) {
          value = null;
        }

        break;
      }

      case 'statusData': {
        const statusData = value;

        if (typeof statusData?.sleepTurns === 'number' && statusData.sleepTurns > -1) {
          syncedPokemon.sleepCounter = statusData.sleepTurns;
        }

        if (typeof statusData?.toxicTurns === 'number' && statusData.toxicTurns > -1) {
          syncedPokemon.toxicCounter = statusData.toxicTurns;
        }

        return;
      }

      case 'timesAttacked': {
        if (typeof value === 'number' && value > -1) {
          syncedPokemon.hitCounter = value;
        }

        return;
      }

      case 'ability': {
        if (!value || /^\([\w\s]+\)$/.test(value) || formatId(value) === 'noability') {
          return;
        }

        break;
      }

      case 'item': {

        // ignore any unrevealed item (resulting in a falsy value) that hasn't been knocked-off/consumed/etc. (this can be checked since when the item be consumed, prevItem would NOT be falsy)
        if ((!value || formatId(value) === 'exists') && !clientPokemon?.prevItem) {
          return;
        }

        // run the item through the dex in case it's formatted as an id
        value = dex?.items.get(value)?.name || value;

        break;
      }

      case 'prevItem': {
        break;
      }

      case 'boosts': {
        value = ['atk', 'def', 'spa', 'spd', 'spe'].reduce((prev, stat) => {
          const prevBoost = prev[stat];
          const boost = clientPokemon?.boosts?.[stat] || 0;

          if (boost !== prevBoost) {
            prev[stat] = boost;
          }

          return prev;
        }, {
          atk: syncedPokemon.boosts?.atk || 0,
          def: syncedPokemon.boosts?.def || 0,
          spa: syncedPokemon.boosts?.spa || 0,
          spd: syncedPokemon.boosts?.spd || 0,
          spe: syncedPokemon.boosts?.spe || 0,
        });

        break;
      }

      case 'lastMove': {

        // allowing falsy values to enable clearing the lastMove
        if (!value) {
          break;
        }

        const dexMove = dex.moves.get(value);

        if (dexMove?.exists) {
          value = dexMove.name;
        }

        break;
      }

      case 'moveTrack': {
        const {
          moveTrack,
          revealedMoves,
          transformedMoves,
        } = sanitizeMoveTrack(clientPokemon, format);

        value = moveTrack;

        if (syncedPokemon.source === 'server') {
          break;
        }

        syncedPokemon.revealedMoves = revealedMoves;
        syncedPokemon.transformedMoves = transformedMoves;

        break;
      }

      case 'volatiles': {
        const volatiles = value;

        // check for type changes (and apply only when not terastallized) (client reports a 'typechange' volatile when a Pokemon terastallizes)
        const changedTypes = (

          // e.g., 'Psychic/Ice' -> ['Psychic', 'Ice']
          'typechange' in volatiles && volatiles.typechange[1]?.split?.('/')
        ) || [];

        if (changedTypes.length) {
          syncedPokemon.types = [...changedTypes];
        }

        // check for type change resets
        const resetTypes = ('typechange' in syncedPokemon.volatiles && !changedTypes.length && dex.species.get(syncedPokemon.speciesForme)?.types) || [];

        if (resetTypes?.length) {
          syncedPokemon.types = [...resetTypes];
        }

        // check for type additions (separate from type changes)
        const addedType = ('typeadd' in volatiles && volatiles.typeadd?.[1]) || null;

        if (addedType && !syncedPokemon.types.includes(addedType)) {
          syncedPokemon.types.push(addedType);
        }

        // check for transformations (e.g., from Ditto/Mew)
        const transformedPokemon = ('transform' in volatiles && volatiles.transform?.[1]) || null;

        const transformedForme = transformedPokemon?.speciesForme;

        syncedPokemon.transformedForme = transformedForme || null;
        syncedPokemon.transformedLevel = transformedPokemon?.level || null;

        // check for (untransformed) forme changes
        const formeChange = ('formechange' in volatiles && volatiles.formechange?.[1]) || null;
        const dexForme = formeChange ? dex.species.get(formeChange) : null;

        if (!transformedForme && formeChange) {
          syncedPokemon.speciesForme = formeChange;

          // update the Pokemon's types to match its new forme's types
          if (dexForme?.types?.length) {
            syncedPokemon.types = [...dexForme.types];
          }
        }

        // sanitizing to make sure a transformed Pokemon doesn't crash the extension lol
        value = sanitizeVolatiles(clientPokemon);

        break;
      }

      default: {
        break;
      }
    }

    // update (2023/07/18): storing the value like this so we don't have to run JSON.stringify() again below when we set syncedPokemon[key] (rather, just simply passing it to JSON.parse())
    const stringifiedValue = JSON.stringify(value);

    if (stringifiedValue === JSON.stringify(prevValue)) {
      return;
    }

    syncedPokemon[key] = typeof value === 'object' ? JSON.parse(stringifiedValue) : value;
  });

  // fill in some additional fields if the serverPokemon was provided
  if (serverPokemon?.ident) {
    syncedPokemon.source = 'server';

    // should always be the case, idk why it shouldn't be (but you know we gotta check)
    if (typeof serverPokemon.hp === 'number' && typeof serverPokemon.maxhp === 'number') {
      syncedPokemon.hp = serverPokemon.hp;

      // EDITINGNOTE: Figure out what to do here. make sure `maxhp` isn't a percentage (which is usually the case with dead Pokemon, i.e., 0% HP) (this isn't foolproof tho cause there could be instances where the `maxhp` is legit 100 lol)
      if (serverPokemon.hp || serverPokemon.maxhp !== 100) {
        syncedPokemon.maxhp = serverPokemon.maxhp;
      }
    }

    // sometimes, the server may only provide the baseAbility (w/ an undefined ability)
    const serverAbility = serverPokemon.ability || serverPokemon.baseAbility;

    if (serverAbility) {
      const dexAbility = dex.abilities.get(serverAbility);

      if (dexAbility?.name) {
        syncedPokemon.ability = dexAbility.name;
      }
    }

    if (serverPokemon.item) {
      const dexItem = dex.items.get(serverPokemon.item);

      if (dexItem?.exists && dexItem.name) {
        syncedPokemon.item = dexItem.name;
      }
    }

    // copy the server stats for more accurate final stats calculations
    if (!nonEmptyObject(syncedPokemon.serverStats) && nonEmptyObject(serverPokemon.stats)) {
      syncedPokemon.serverStats = {
        ...serverPokemon.stats,
        hp: serverPokemon.maxhp,
      };

      // when refreshing the page, server will report dead ServerPokemon with 0 hp and 100 maxhp, which breaks the guessing part since no EV/IV combination may match 100 HP (setting 0 HP for the serverStats tells guessServerSpread() to ignore the HP when guessing)
      if (!serverPokemon.hp && serverPokemon.maxhp === 100) {
        syncedPokemon.serverStats.hp = 0;
      }
    }

    // sanitize the moves from the serverPokemon
    const serverMoves = serverPokemon.moves?.map((id) => dex.moves.get(id)?.name).filter(Boolean);

    // set the serverMoves/transformedMoves if available (& not transformed, otherwise, serverMoves[] will be of the Transform-target Pokemon's moves!!)
    const shouldUpdateServerMoves = !!serverMoves?.length && !syncedPokemon.serverMoves?.length && !syncedPokemon.transformedForme;

    if (shouldUpdateServerMoves) {
      syncedPokemon.serverMoves = [...serverMoves];
    }

    syncedPokemon.transformedMoves = [...(serverMoves?.length && syncedPokemon.transformedForme ? serverMoves : [])];
  }

  // from Showdown's battle log: "In Gens 3-4, Knock Off only makes the target's item unusable; it cannot obtain a new item."
  if (syncedPokemon.item && formatId(syncedPokemon.itemEffect) === 'knockedoff') {
    syncedPokemon.prevItem = syncedPokemon.item;
    syncedPokemon.prevItemEffect = syncedPokemon.itemEffect;
    syncedPokemon.item = null;
    syncedPokemon.itemEffect = null;
  }

  // only using sanitizePokemon() to get some values back (is this a good idea? idk)
  const {
    transformedForme,
    abilities,
    transformedAbilities,
    baseStats,
    transformedBaseStats,
  } = sanitizePokemon(syncedPokemon, format);

  // update the abilities (including transformedAbilities) if they're different from what was stored prior (note: only checking if they're arrays instead of their length since th ability list could be empty)
  const shouldUpdateAbilities = Array.isArray(abilities) && !similarArrays(abilities, syncedPokemon.abilities);

  if (shouldUpdateAbilities) {
    syncedPokemon.abilities = [...abilities];
  }

  const shouldUpdateTransformedAbilities = Array.isArray(transformedAbilities) && !similarArrays(transformedAbilities, syncedPokemon.transformedAbilities);

  if (shouldUpdateTransformedAbilities) {
    syncedPokemon.transformedAbilities = [...transformedAbilities];
  }

  // check for base stats (in case of forme changes)
  if (nonEmptyObject(baseStats)) {
    syncedPokemon.baseStats = { ...baseStats };
  }

  // check for transformed base stats
  syncedPokemon.transformedBaseStats = (transformedForme && nonEmptyObject(transformedBaseStats) && { ...transformedBaseStats }) || null;

  // clear the list of transformed moves if the Pokemon is no longer transformed // (this one applies to both client [i.e., non-server-sourced] & [redundantly] server-sourced syncedPokemon)
  if (!transformedForme) {
    syncedPokemon.transformedMoves = [];
  }

  // if the Pokemon is transformed, auto-set the moves
  if (syncedPokemon.transformedMoves?.length) {
    syncedPokemon.moves = [...syncedPokemon.transformedMoves];
  }

  // basically just shallow-copies moves[], i.e., basically a no-op
  syncedPokemon.moves = [...syncedPokemon.moves];

  // recalculate the spread stats (calcPokemonSpredStats() will determine whether to use the transformedBaseStats or baseStats)
  syncedPokemon.spreadStats = calcPokemonSpreadStats(syncedPokemon);

  return syncedPokemon;
};