/**
 * Creates the Tools slice and hooks
 */

import { createSlice, current } from '@reduxjs/toolkit';
import {
  detectGenFromFormat,
  sanitizeField,
  nonEmptyObject,
  calcPokemonToolsId,
} from '@gen-3-ou-tools/utilities.js';
import { useSelector } from '@gen-3-ou-tools/hooks.js';
import { syncBattle, SyncBattleActionType } from './syncBattle.js';

// Creates the Redux slice
export const toolsSlice = createSlice({
  name: 'tools',

  initialState: {},

  // Manages state changes
  reducers: {
    init: (state, action) => {
      const {
        battleId,
        name,
        defaultName,
        gen: genFromPayload,
        format: formatFromPayload,
        gameType,
        turn = 0,
        active = true,
        containerSize = 'xs',
        containerWidth = 320,
        authPlayerKey,
        opponentKey,
        field,
        cached,
        ...payload
      } = action.payload;

      if (!battleId) {
        console.error('[Gen 3 OU Tools] Failed to initialize a Tools battle state because the battleId is invalid.');

        return;
      }

      if (battleId in state) {
        console.warn('[Gen 3 OU Tools] A Tools battle state already exists with this battleId:', battleId);

        return;
      }

      const genFromFormat = detectGenFromFormat(formatFromPayload);
      const gen = genFromFormat || genFromPayload;

      // Creates the Tools battle state
      state[battleId] = {
        ...payload,

        battleId,
        name,
        defaultName,
        gen,
        format: formatFromPayload,
        gameType,
        turn,
        active,
        containerSize,
        containerWidth,
        authPlayerKey,
        opponentKey,

        // Initializes the player sides
        ...['p1', 'p2'].reduce((prev, currentPlayerKey) => {
          prev[currentPlayerKey] = {
            sideid: currentPlayerKey,
            active: currentPlayerKey in payload,
            name: null,
            rating: null,
            activeIndex: null,
            selectionIndex: null,
            maxPokemon: 0,
            side: null,

            ...payload[currentPlayerKey],

            pokemonOrder: [],
            pokemon: [],
          };

          return prev;
        }, { p1: null, p2: null }),

        field: field || sanitizeField(),
        cached,
      };

      console.debug(
        '[Gen 3 OU Tools] Initialized the Tools battle state.',
        '\ntype:', action.type,
        '\nbattleId:', battleId,
        '\npayload:', action.payload,
        '\nbattleState:', current(state)[battleId],
      );
    },

    update: (state, action) => {
      const {
        battleId,
        battleNonce,
        name,
        gen,
        format,
        gameType,
        active,
        containerSize,
        containerWidth,
        authPlayerKey,
        opponentKey,
        field,
        cached,
      } = action.payload || {};

      if (!battleId) {
        console.debug(
          '[Gen 3 OU Tools] Failed to update a Tools battle state because the battleId is invalid.',
          '\ntype:', action.type,
          '\npayload:', action.payload,
        );

        return;
      }

      const currentState = state[battleId];

      if (!currentState?.battleId) {
        console.error(
          '[Gen 3 OU Tools] Could not find the Tools battle state.',
          '\nbattleId:', battleId,
          '\ntype:', action.type,
          '\npayload:', action.payload,
        );

        return;
      }

      // Updates the Tools battle state
      state[battleId] = {
        ...currentState,

        battleId: battleId || currentState.battleId,
        battleNonce: battleNonce || currentState.battleNonce,
        name: (name || currentState.name)?.trim(),
        gen: typeof gen === 'number' && gen > 0 ? gen : currentState.gen,
        format: format || currentState.format,
        gameType: gameType || currentState.gameType,
        containerSize: containerSize || currentState.containerSize,
        containerWidth: containerWidth || currentState.containerWidth,
        authPlayerKey: authPlayerKey || currentState.authPlayerKey,
        opponentKey: opponentKey || currentState.opponentKey,
        cached: cached || currentState.cached,
      };

      // Updates the player sides
      ['p1', 'p2'].forEach((playerkey) => {
        if (!nonEmptyObject(action.payload[playerkey])) {
          return;
        }

        state[battleId][playerkey] = {
          ...currentState[playerkey],
          ...action.payload[playerkey],

          side: {
            ...currentState[playerkey]?.side,
            ...action.payload[playerkey]?.side,
          },
        };
      });

      // Updates the field
      if (nonEmptyObject(field)) {
        state[battleId].field = {
          ...currentState.field,
          ...field,
        };
      }

      if (currentState.active && typeof active === 'boolean' && !active) {
        state[battleId].active = active;
      }

      console.debug(
        '[Gen 3 OU Tools] Updated the Tools battle state.',
        '\ntype:', action.type,
        '\nbattleId:', battleId,
        '\npayload:', action.payload,
        '\nbattleState:', current(state)[battleId],
      );
    },

    updateField: (state, action) => {
      const { battleId, field } = action.payload || {};

      if (!battleId) {
        console.error('[Gen 3 OU Tools] Failed to update the field of the Tools battle state because the battleId is invalid.');

        return;
      }

      if (!state[battleId]?.battleId) {
        console.error('[Gen 3 OU Tools] Could not find a Tools battle state with this battleId:', battleId);

        return;
      }

      const { field: currentField } = state[battleId] || {};

      state[battleId].field = { ...currentField, ...field };

      console.debug(
        '[Gen 3 OU Tools] Updated the field of the Tools battle state.',
        '\ntype:', action.type,
        '\nbattleId:', battleId,
        '\npayload:', action.payload,
        '\nbattleState:', current(state)[battleId],
      );
    },

    updatePlayer: (state, action) => {
      const { battleId } = action.payload;

      if (!battleId) {
        console.error('[Gen 3 OU Tools] Failed to update the players of the Tools battle state because the battleId is invalid.');

        return;
      }

      if (!state[battleId]?.battleId) {
        console.error('[Gen 3 OU Tools] Could not find a Tools battle state with this battleId:', battleId);

        return;
      }

      if (['p1', 'p2'].every((playerKey) => !Object.keys(action.payload[playerKey] || {}).length)) {
        console.error('[Gen 3 OU Tools] Could not find any players to update.');

        return;
      }

      // Updates the player sides
      ['p1', 'p2'].forEach((playerKey) => {
        const payload = action.payload[playerKey];

        if (!Object.keys(payload || {}).length) {
          return;
        }

        state[battleId][playerKey] = {
          ...state[battleId][playerKey],
          ...payload,

          side: {
            ...state[battleId][playerKey].side,
            ...payload?.side,
          },
        };
      });

      console.debug(
        '[Gen 3 OU Tools] Updated the players of the Tools battle state.',
        '\ntype:', action.type,
        '\nbattleId:', battleId,
        '\npayload:', action.payload,
        '\nbattleState:', current(state)[battleId],
      );
    },

    updatePokemon: (state, action) => {
      const { battleId, playerKey, pokemon } = action.payload || {};

      if (!battleId) {
        console.error('[Gen 3 OU Tools] Failed to update the Pokemon of the Tools battle state because the battleId is invalid.');

        return;
      }

      if (!state[battleId]?.battleId) {
        console.error('[Gen 3 OU Tools] Could not find a Tools battle state with this battleId:', battleId);

        return;
      }

      const battleState = state[battleId];

      if (!battleState?.[playerKey]?.sideid) {
        console.error(
          '[Gen 3 OU Tools] Could not find the player in the Tools battle state.',
          '\nplayer:', playerKey,
          '\nbattleId:', battleId,
          '\npokemon:', pokemon,
          '\nbattleState:', current(state)[battleId],
        );

        return;
      }

      const playerState = battleState[playerKey];
      const pokemonId = pokemon?.toolsId || calcPokemonToolsId(pokemon);
      const pokemonStateIndex = playerState.pokemon.findIndex((pokemon) => pokemon.toolsId === pokemonId);
      const pokemonState = pokemonStateIndex >= 0 ? playerState.pokemon[pokemonStateIndex] : null;

      if (!pokemonState) {
        console.warn(
          '[Gen 3 OU Tools] Could not find the Pokemon in the Tools battle state.',
          '\npokemonId:', pokemonId,
          '\nplayer:', playerKey,
          '\nbattleId:', battleId,
          '\npokemon:', pokemon,
          '\nplayerState:', current(state)?.[battleId]?.[playerKey],
          '\nbattleState:', current(state)?.[battleId],
        );

        return;
      }

      playerState.pokemon[pokemonStateIndex] = {
        ...pokemonState,
        ...pokemon,
      };

      console.debug(
        '[Gen 3 OU Tools] Updated the Pokemon of the Tools battle state.',
        '\ntype:', action.type,
        '\nbattleId:', battleId,
        '\npayload:', action.payload,
        '\nbattleState:', current(state)[battleId],
      );
    },

    destroy: (state, action) => {
      const battleIds = [...(Array.isArray(action.payload) ? action.payload : [action.payload])].filter(Boolean);

      if (!battleIds.length) {
        return;
      }

      // Destroys the Tools battle state
      battleIds.forEach((id) => {
        if (!(id in state)) {
          return;
        }

        delete state[id];
      });

      console.debug(
        '[Gen 3 OU Tools] Destroyed the Tools battle state.',
        '\ntype:', action.type,
        '\npayload:', action.payload,
        '\nstate:', current(state),
      );
    },
  },

  // Handles external actions
  extraReducers: (build) => {
    build.addCase(syncBattle.fulfilled, (state, action) => {
      const { battleId } = action.payload || {};

      if (!battleId) {
        return;
      }

      state[battleId] = action.payload;

      console.debug(
        '[Gen 3 OU Tools] Synced the Tools battle state.',
        '\ntype:', SyncBattleActionType,
        '\nbattleId:', battleId,
        '\npayload:', action.payload,
        '\nstate:', current(state)[battleId],
      );
    })
  }
});

// Retrieves the Tools state
export const useToolsState = () => useSelector((state) => state?.tools);

// Retrieves the Tools battle state
export const useToolsBattleState = (battleId) => useSelector((state) => state?.tools?.[battleId]);