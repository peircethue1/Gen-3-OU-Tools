/**
 * 
 * EDITINGNOTE: Needed final decisions are noted
 * EDITINGNOTE: Standardize approach for forms (Castform and possibly Unown)
 * EDITINGNOTE: Should boosts default to 0? Check use of 0 as a default throughout all files
 * EDITINGNOTE: Should I remove faintCounter throughout all files since it's been deemed irrelevant here?
 * EDITINGNOTE: Investigate the 100 max hp issue. Without revive effects in gen 3, I don't see why the stats of fainted mons are relevant
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
  const { format, clientPokemon, serverPokemon } = config || {};

  // Defines the Dex and generation number
  const dex = getDexForFormat(format);
  const gen = detectGenFromFormat(format);

  // Creates a copy of the Pokemon
  const syncedPokemon = clonePokemon(pokemon);

  // Checks if the Pokemon lacks a source and client data is available, and defines the client as the source
  if (!syncedPokemon.source && clientPokemon?.speciesForme) {
    syncedPokemon.source = 'client';
  }

  // Defines the Pokemon object
  [
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
  ].forEach((key) => {

    // Defines the previous and updated values
    const prevValue = syncedPokemon[key];
    let value = clientPokemon?.[key];

    // Checks if the updated value is invalid
    if (value === undefined) {
      return;
    }

    switch (key) {
      case 'speciesForme': {

        // Removes the wildcard form
        value = value.replace('-*', '');

        // Checks if the species form is unchanged
        if (prevValue === value) {
          return;
        }

        // Defines the Pokemon types
        const updatedSpecies = dex.species.get(value);

        syncedPokemon.types = [ ...(updatedSpecies?.types || syncedPokemon.types || []) ];

        break;
      }

      case 'hp':
      case 'maxhp': {

        // Checks if the server has valid data for the Pokemon HP and max HP, and skips defining Pokemon HP and max HP
        if (typeof serverPokemon?.hp === 'number' && typeof serverPokemon.maxhp === 'number') {
          return;
        }

        break;
      }

      case 'status': {

        // Removes fainted Pokemon status
        if (!syncedPokemon.hp) {
          value = null;
        }

        break;
      }

      case 'statusData': {

        // Checks if the status data is valid and defines status counters
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
        
        // Checks if the hit data is valid and defines the hit counter
        if (typeof value === 'number' && value > -1) {
          syncedPokemon.hitCounter = value;
        }

        return;
      }

      case 'ability': {

        // Checks if the ability data is invalid, and skips defining the Pokemon ability
        if (!value || /^\([\w\s]+\)$/.test(value) || formatId(value) === 'noability') {
          return;
        }

        break;
      }

      case 'item': {

        // Checks if the item data is invalid or unrevealed, and skips defining the item
        if ((!value || formatId(value) === 'exists') && !clientPokemon?.prevItem) {
          return;
        }

        // Fetches the item name for the item ID
        value = dex?.items.get(value)?.name || value;

        break;
      }

      case 'lastMove': {

        // Checks if the last move is valid
        if (!value) {
          break;
        }

        // Fetches the move name for the move string
        const dexMove = dex.moves.get(value);

        if (dexMove?.exists) {
          value = dexMove.name;
        }

        break;
      }

      case 'moveTrack': {

        // Defines the move tracker
        const { moveTrack, revealedMoves, transformedMoves } = sanitizeMoveTrack(clientPokemon, format);

        value = moveTrack;

        // Checks if the source is server data
        if (syncedPokemon.source === 'server') {
          break;
        }

        // Defines revealed moves and transformed moves
        syncedPokemon.revealedMoves = revealedMoves;
        syncedPokemon.transformedMoves = transformedMoves;

        break;
      }

      case 'volatiles': {
        const volatiles = value;

        // Check if the Pokemon type has been changed and defines the Pokemon types
        const changedTypes = ('typechange' in volatiles && volatiles.typechange[1]?.split?.('/')) || [];

        if (changedTypes.length) {
          syncedPokemon.types = [...changedTypes];
        }

        // Checks if the type change has been reset and defines the Pokemon types
        const resetTypes = ('typechange' in syncedPokemon.volatiles && !changedTypes.length && dex.species.get(syncedPokemon.speciesForme)?.types) || [];

        if (resetTypes?.length) {
          syncedPokemon.types = [...resetTypes];
        }

        // Defines the form and level of the transformed Pokemon
        const transformedPokemon = ('transform' in volatiles && volatiles.transform?.[1]) || null;
        const transformedForme = transformedPokemon?.speciesForme;

        syncedPokemon.transformedForme = transformedForme || null;
        syncedPokemon.transformedLevel = transformedPokemon?.level || null;

        // Checks if the Pokemon has changed form without using transform and defines the form
        const formeChange = ('formechange' in volatiles && volatiles.formechange?.[1]) || null;
        const dexForme = formeChange ? dex.species.get(formeChange) : null;

        if (!transformedForme && formeChange) {
          syncedPokemon.speciesForme = formeChange;

          // Checks if the Pokemon form has valid Dex types and defines the Pokemon types
          if (dexForme?.types?.length) {
            syncedPokemon.types = [...dexForme.types];
          }
        }

        // Checks if the Pokemon transformed into a changed form and defines its transformed form as the changed form
        if (transformedPokemon && formeChange) {
          syncedPokemon.transformedForme = formeChange;
        }

        // Defines the Pokemon volatiles
        value = sanitizeVolatiles(clientPokemon);

        break;
      }

      case 'boosts': {

        // Defines the Pokemon boost object
        value = ['atk', 'def', 'spa', 'spd', 'spe'].reduce((prev, stat) => {

          // Defines the previous and updated boost values
          const prevBoost = prev[stat];
          const boost = clientPokemon?.boosts?.[stat] || 0;

          // Checks if the boost value is changed and updates the boost value
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

      default: {
        break;
      }
    }

    // Checks if the previous value is unchanged
    const stringifiedValue = JSON.stringify(value);

    if (stringifiedValue === JSON.stringify(prevValue)) {
      return;
    }

    // Defines the value for the key
    syncedPokemon[key] = typeof value === 'object' ? JSON.parse(stringifiedValue) : value;
  });

  // Checks if server data is available
  if (serverPokemon?.ident) {
    
    // Defines the server as the source
    syncedPokemon.source = 'server';

    // Checks if the Pokemon HP and max HP data is valid
    if (typeof serverPokemon.hp === 'number' && typeof serverPokemon.maxhp === 'number') {

      // Defines the Pokemon HP
      syncedPokemon.hp = serverPokemon.hp;

      // Checks if the Pokemon HP and max HP values are valid, and defines the Pokemon max HP
      if (serverPokemon.hp || serverPokemon.maxhp !== 100) {
        syncedPokemon.maxhp = serverPokemon.maxhp;
      }
    }

    // Checks if the ability data is valid and defines the Pokemon ability 
    const serverAbility = serverPokemon.ability || serverPokemon.baseAbility;

    if (serverAbility) {
      const dexAbility = dex.abilities.get(serverAbility);

      if (dexAbility?.name) {
        syncedPokemon.ability = dexAbility.name;
      }
    }

    // Checks if the item data is valid and defines the item
    if (serverPokemon.item) {
      const dexItem = dex.items.get(serverPokemon.item);

      if (dexItem?.exists && dexItem.name) {
        syncedPokemon.item = dexItem.name;
      }
    }

    // Checks if the statistics data is valid and defines the Pokemon statistics
    if (!nonEmptyObject(syncedPokemon.serverStats) && nonEmptyObject(serverPokemon.stats)) {
      syncedPokemon.serverStats = {...serverPokemon.stats, hp: serverPokemon.maxhp};

      // Checks if the Pokemon HP and max HP values are invalid, and defines the Pokemon HP
      if (!serverPokemon.hp && serverPokemon.maxhp === 100) {
        syncedPokemon.serverStats.hp = 0;
      }
    }

    // Checks if the moves data is valid for untransformed and transformed Pokemon, and defines the untransformed and transformed Pokemon moves
    const serverMoves = serverPokemon.moves?.map((id) => dex.moves.get(id)?.name).filter(Boolean);
    const shouldUpdateServerMoves = !!serverMoves?.length && !syncedPokemon.serverMoves?.length && !syncedPokemon.transformedForme;

    if (shouldUpdateServerMoves) {
      syncedPokemon.serverMoves = [...serverMoves];
    }

    syncedPokemon.transformedMoves = [...(serverMoves?.length && syncedPokemon.transformedForme ? serverMoves : [])];
  }

  // Checks if the item has been knocked off and defines the Pokemon item, item effect, previous item, and previous item effect
  if (syncedPokemon.item && formatId(syncedPokemon.itemEffect) === 'knockedoff') {
    syncedPokemon.prevItem = syncedPokemon.item;
    syncedPokemon.prevItemEffect = syncedPokemon.itemEffect;
    syncedPokemon.item = null;
    syncedPokemon.itemEffect = null;
  }

  const {
    transformedForme,
    abilities,
    transformedAbilities,
    baseStats,
    transformedBaseStats,
  } = sanitizePokemon(syncedPokemon, format);

  // Checks if the untransformed and transformed ability data is valid and has changed, and defines the untransformed and transformed Pokemon abilities
  const shouldUpdateAbilities = Array.isArray(abilities) && !similarArrays(abilities, syncedPokemon.abilities);

  if (shouldUpdateAbilities) {
    syncedPokemon.abilities = [...abilities];
  }

  const shouldUpdateTransformedAbilities = Array.isArray(transformedAbilities) && !similarArrays(transformedAbilities, syncedPokemon.transformedAbilities);

  if (shouldUpdateTransformedAbilities) {
    syncedPokemon.transformedAbilities = [...transformedAbilities];
  }

  // Checks if the statistics data is available and defines the Pokemon statistics
  if (nonEmptyObject(baseStats)) {
    syncedPokemon.baseStats = { ...baseStats };
  }

  // Defines the transformed Pokemon statistics
  syncedPokemon.transformedBaseStats = (transformedForme && nonEmptyObject(transformedBaseStats) && { ...transformedBaseStats }) || null;

  // Checks if the Pokemon is untransformed and defines the transformed Pokemon moves
  if (!transformedForme) {
    syncedPokemon.transformedMoves = [];
  }

  // Checks if the Pokemon has transformed moves and defines the Pokemon moves
  if (syncedPokemon.transformedMoves?.length) {
    syncedPokemon.moves = [...syncedPokemon.transformedMoves];
  }

  // Defines the Pokemon statistic spread
  syncedPokemon.spreadStats = calcPokemonSpreadStats(syncedPokemon);

  return syncedPokemon;
};