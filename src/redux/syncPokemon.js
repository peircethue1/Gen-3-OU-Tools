/**
 * Syncs the Pokemon state with the battle
 * EDITINGNOTE: See note...
 */

import {
  getDexForFormat,
  clonePokemon,
  formatId,
  sanitizeMoveTrack,
  sanitizeVolatiles,
  nonEmptyObject,
  sanitizePokemon,
  similarArrays,
  calcPokemonSpreadStats,
} from '@gen-3-ou-tools/utilities.js';

export const syncPokemon = (pokemon, config) => {
  const { format, clientPokemon, serverPokemon } = config || {};

  const dex = getDexForFormat(format);

  const syncedPokemon = clonePokemon(pokemon);

  if (!syncedPokemon.source && clientPokemon?.speciesForme) {
    syncedPokemon.source = 'client';
  }

  // Syncs the Pokemon state with the client
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
    const prevValue = syncedPokemon[key];
    let value = clientPokemon?.[key];

    if (value === undefined) {
      return;
    }

    switch (key) {
      case 'speciesForme': {
        value = value.replace('-*', '');// EDITINGNOTE: Check if Gen 3 OU has the wildcard forme

        if (prevValue === value) {
          return;
        }

        const updatedSpecies = dex.species.get(value);

        syncedPokemon.types = [...(updatedSpecies?.types || syncedPokemon.types || [])];

        break;
      }

      case 'hp':
      case 'maxhp': {
        if (typeof serverPokemon?.hp === 'number' && typeof serverPokemon.maxhp === 'number') {
          return;
        }

        break;
      }

      case 'status': {
        if (!syncedPokemon.hp) {
          value = null;
        }

        break;
      }

      case 'statusData': {
        const statusData = value;

        if (typeof statusData?.sleepTurns === 'number' && statusData.sleepTurns >= 0) {
          syncedPokemon.sleepCounter = statusData.sleepTurns;
        }

        if (typeof statusData?.toxicTurns === 'number' && statusData.toxicTurns >= 0) {
          syncedPokemon.toxicCounter = statusData.toxicTurns;
        }

        return;
      }

      case 'timesAttacked': {
        if (typeof value === 'number' && value >= 0) {
          syncedPokemon.hitCounter = value;
        }

        return;
      }

      case 'ability': {
        if (!value || /^\([\w\s]+\)$/.test(value)) {
          return;
        }

        break;
      }

      case 'baseAbility': {
        if (!value || /^\([\w\s]+\)$/.test(value)) {
          return;
        }

        syncedPokemon.dirtyBaseAbility = null;

        break;
      }

      case 'item': {
        if ((!value || formatId(value) === 'exists') && !clientPokemon?.prevItem) {
          return;
        }

        value = dex?.items.get(value)?.name || value;

        // Syncs the base item with the first revealed item
        if (!syncedPokemon.baseItem) {
          if (value && formatId(value) !== 'exists') {
            syncedPokemon.baseItem = value;
            syncedPokemon.dirtyBaseItem = null;
          } else if (clientPokemon?.prevItem) {
            const prevItem = dex?.items.get(clientPokemon.prevItem)?.name || clientPokemon.prevItem;

            if (prevItem) {
              syncedPokemon.baseItem = prevItem;
              syncedPokemon.dirtyBaseItem = null;
            }
          }
        }

        break;
      }

      case 'lastMove': {
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
        const { moveTrack, revealedMoves, transformedMoves } = sanitizeMoveTrack(clientPokemon, format);

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

        const changedTypes = ('typechange' in volatiles && volatiles.typechange[1]?.split?.('/')) || [];

        if (changedTypes.length) {
          syncedPokemon.types = [...changedTypes];
        }

        const resetTypes = (
          'typechange' in syncedPokemon.volatiles &&
          !changedTypes.length &&
          dex.species.get(syncedPokemon.speciesForme)?.types
        ) || [];

        if (resetTypes?.length) {
          syncedPokemon.types = [...resetTypes];
        }

        const transformedPokemon = ('transform' in volatiles && volatiles.transform?.[1]) || null;
        const transformedForme = transformedPokemon?.speciesForme;

        syncedPokemon.transformedForme = transformedForme || null;
        syncedPokemon.transformedLevel = transformedPokemon?.level || null;

        const formeChange = ('formechange' in volatiles && volatiles.formechange?.[1]) || null;
        const dexForme = formeChange ? dex.species.get(formeChange) : null;

        // Handles form changes without transformation
        if (!transformedForme && formeChange) {
          syncedPokemon.speciesForme = formeChange;

          if (dexForme?.types?.length) {
            syncedPokemon.types = [...dexForme.types];
          }
        }

        if (transformedPokemon && formeChange) {
          syncedPokemon.transformedForme = formeChange;
        }

        value = sanitizeVolatiles(clientPokemon);

        break;
      }

      case 'boosts': {

        // Syncs stat boosts from the client
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

      default: {
        break;
      }
    }

    const stringifiedValue = JSON.stringify(value);

    if (stringifiedValue === JSON.stringify(prevValue)) {
      return;
    }

    syncedPokemon[key] = typeof value === 'object' ? JSON.parse(stringifiedValue) : value;
  });

  // Syncs the Pokemon state with the server
  if (serverPokemon?.ident) {
    syncedPokemon.source = 'server';

    // Applies server HP values to the Pokemon
    if (typeof serverPokemon.hp === 'number' && typeof serverPokemon.maxhp === 'number') {
      syncedPokemon.hp = serverPokemon.hp;

      if (serverPokemon.hp || serverPokemon.maxhp !== 100) {
        syncedPokemon.maxhp = serverPokemon.maxhp;
      }
    }

    const serverAbility = serverPokemon.ability || serverPokemon.baseAbility;

    // Applies the server ability to the Pokemon
    if (serverAbility) {
      const dexAbility = dex.abilities.get(serverAbility);

      if (dexAbility?.name) {
        syncedPokemon.ability = dexAbility.name;
      }
    }

    const serverBaseAbility = serverPokemon.baseAbility;

    // Applies the server base ability to the Pokemon
    if (serverBaseAbility) {
      const dexBaseAbility = dex.abilities.get(serverBaseAbility);

      if (dexBaseAbility?.name) {
        syncedPokemon.baseAbility = dexBaseAbility.name;
        syncedPokemon.dirtyBaseAbility = null;
      }
    }

    // Applies the server item and base item to the Pokemon
    if (serverPokemon.item) {
      const dexItem = dex.items.get(serverPokemon.item);

      if (dexItem?.exists && dexItem.name) {
        syncedPokemon.item = dexItem.name;

        if (!syncedPokemon.baseItem) {
          syncedPokemon.baseItem = dexItem.name;
          syncedPokemon.dirtyBaseItem = null;
        }
      }
    }

    // Applies the server stats to the Pokemon
    if (!nonEmptyObject(syncedPokemon.serverStats) && nonEmptyObject(serverPokemon.stats)) {
      syncedPokemon.serverStats = { ...serverPokemon.stats, hp: serverPokemon.maxhp };

      if (!serverPokemon.hp && serverPokemon.maxhp === 100) {
        syncedPokemon.serverStats.hp = 0;
      }
    }

    const serverMoves = serverPokemon.moves
      ?.map((id) => dex.moves.get(id)?.name)
      .filter(Boolean);

    const shouldUpdateServerMoves = !!serverMoves?.length &&
      !syncedPokemon.serverMoves?.length &&
      !syncedPokemon.transformedForme;

    if (shouldUpdateServerMoves) {
      syncedPokemon.serverMoves = [...serverMoves];
    }

    syncedPokemon.transformedMoves = [...(serverMoves?.length && syncedPokemon.transformedForme ? serverMoves : [])];
  }

  // Handles a knocked off item
  if (syncedPokemon.item && formatId(syncedPokemon.itemEffect) === 'knockedoff') {
    syncedPokemon.prevItem = syncedPokemon.item;
    syncedPokemon.prevItemEffect = syncedPokemon.itemEffect;

    if (!syncedPokemon.baseItem) {
      syncedPokemon.baseItem = syncedPokemon.item;
      syncedPokemon.dirtyBaseItem = null;
    }

    syncedPokemon.item = null;
    syncedPokemon.itemEffect = null;
    syncedPokemon.dirtyItem = null;
  }

  const {
    transformedForme,
    abilities,
    transformedAbilities,
    baseStats,
    transformedBaseStats,
  } = sanitizePokemon(syncedPokemon, format);

  const shouldUpdateAbilities = Array.isArray(abilities) && !similarArrays(abilities, syncedPokemon.abilities);

  if (shouldUpdateAbilities) {
    syncedPokemon.abilities = [...abilities];
  }

  const shouldUpdateTransformedAbilities = Array.isArray(transformedAbilities) &&
    !similarArrays(transformedAbilities, syncedPokemon.transformedAbilities);

  if (shouldUpdateTransformedAbilities) {
    syncedPokemon.transformedAbilities = [...transformedAbilities];
  }

  if (nonEmptyObject(baseStats)) {
    syncedPokemon.baseStats = { ...baseStats };
  }

  syncedPokemon.transformedBaseStats = (
    transformedForme &&
    nonEmptyObject(transformedBaseStats) &&
    { ...transformedBaseStats }
  ) || null;

  if (!transformedForme) {
    syncedPokemon.transformedMoves = [];
  }

  if (syncedPokemon.transformedMoves?.length) {
    syncedPokemon.moves = [...syncedPokemon.transformedMoves];
  }

  syncedPokemon.spreadStats = calcPokemonSpreadStats(syncedPokemon);

  return syncedPokemon;
};