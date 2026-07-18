/**
 * Syncs the battle state to the store
 * EDITINGNOTE: See notes...
 * EDITINGNOTE: I only want to support Gen 3 OU and not spectating; how do I stop my tool from opening or operating in other contexts?
 * EDITINGNOTE: Should I drop the request argument? I would also need to drop it where syncBattle is called in other files
 * EDITINGNOTE: I removed automatically setting playerState.selectionIndex, so I will need to change the way that is used
 * EDITINGNOTE: Where should I implement syncCalculator, syncPrediction, and syncInformation?
 */

import { createAsyncThunk } from '@reduxjs/toolkit';
import {
  cloneBattleState,
  clamp,
  detectAuthPlayerKeyFromBattle,
  similarPokemon,
  calcPokemonToolsId,
  diffArrays,
  sanitizePokemon,
  sanitizeVolatiles,
  detectPlayerKeyFromPokemon,
  detectToggledAbility,
  clonePlayerSideConditions,
  sanitizePlayerSide,
} from './utilities.js';// EDITINGNOTE: Build cloneBattleState and export detectToggledAbility
import { syncField } from './syncField.js';// EDITINGNOTE: Move syncField to its own file
import { syncPokemon } from './syncPokemon.js';

export const SyncBattleActionType = 'tools:sync';

export const syncBattle = createAsyncThunk(SyncBattleActionType, (payload, api) => {
  const { battle, request } = payload || {};

  const {
    id: battleId,
    nonce: battleNonce,
    gen,
    gameType,
    turn,
    paused,
    ended,
    myPokemon,
  } = battle || {};

  const rootState = api.getState();
  const state = rootState?.tools;

  if (!battleId) {
    throw new Error('Attempted to sync a battle state with an invalid battleId.');
  }

  if (!(battleId in state)) {
    throw new Error(`Could not find a battle state with battleId: ${battleId}`);
  }

  const battleState = cloneBattleState(state[battleId]);

  if (battleState.battleNonce && battleState.battleNonce === battleNonce) {
    console.debug(
      '[Gen 3 OU Tools] Skipping sync due to matching battle nonce.',
      '\nbattleId:', battleId,
      '\nbattleNonce:', battleNonce,
      '\nbattle:', battle,
      '\nstate:', battleState,
    );

    return;
  }

  if (typeof gen === 'number' && gen > 0) {
    battleState.gen = gen;
  }

  if (battleState.active && typeof ended === 'boolean' && ended) {
    battleState.active = false;
  }

  if (typeof paused === 'boolean' || typeof ended === 'boolean') {
    battleState.paused = paused || ended;
  }

  battleState.gameType = gameType === 'singles' ? 'singles' : 'doubles';// EDITINGNOTE: Should I default to single or doubles across all files?

  battleState.turn = clamp(0, turn || 0);

  const detectedAuthPlayerKey = detectAuthPlayerKeyFromBattle(battle);

  if (detectedAuthPlayerKey) {
    battleState.authPlayerKey = detectedAuthPlayerKey;

    battleState.opponentKey = detectedAuthPlayerKey === 'p1' ? 'p2' : 'p1';
  }

  battleState.switchPlayers = battle.viewpointSwitched ?? battle.sidesSwitched;// EDITINGNOTE: Is this useful?

  const syncedField = syncField(battleState, battle);

  if (!syncedField) {
    console.warn(
      '[Gen 3 OU Tools] Could not sync the field.',
      '\nbattleId:', battleId,
      '\nsyncedField:', syncedField,
      '\nstate.field:', battleState.field,
      '\nbattle:', battle,
      '\nstate:', battleState,
    );
  } else {
    battleState.field = syncedField;
  }

  const futureMutations = {
    p1: [],
    p2: [],
  };

  // Syncs each player side
  for (const playerKey of ['p1', 'p2']) {
    if (battle[playerKey]?.sideid !== playerKey) {
      continue;
    }

    const player = battle[playerKey];
    const playerState = battleState[playerKey];

    if (player.name && playerState.name !== player.name) {
      playerState.name = player.name;
    }

    if (player.rating && playerState.rating !== player.rating) {
      playerState.rating = player.rating;
    }

    if (!playerState.active) {
      playerState.active = true;
    }

    const isMyPokemonSide = !!battleState.authPlayerKey && playerKey === battleState.authPlayerKey;
    const hasMyPokemon = !!myPokemon?.length;

    if ((!isMyPokemonSide || !hasMyPokemon) && (!Array.isArray(player.pokemon) || !player.pokemon.length)) {
      console.debug(
        '[Gen 3 OU Tools] Skipping Pokemon sync because no Pokemon are available.',
        '\nplayer:', playerKey,
        ...(isMyPokemonSide ? ['\nmyPokemon:', myPokemon] : []),
        '\nbattle pokemon:', player.pokemon,
        '\nstate pokemon:', playerState.pokemon,
        '\nbattleId:', battleId,
        '\nbattle:', battle,
        '\nstate:', battleState,
      );

      continue;
    }

    const maxPokemon = clamp(0, player?.totalPokemon || 0, 6);

    if (playerState.maxPokemon !== maxPokemon) {
      playerState.maxPokemon = maxPokemon;
    }

    const initialPokemon = (battleState.active && isMyPokemonSide ? myPokemon : player.pokemon) || [];// EDITINGNOTE: Should I fall back to the client Pokemon if the server Pokemon are not available, or to empty Pokemon?

    // Creates the team order
    const currentOrder = initialPokemon.map((pokemon) => {
      const clientSourced = 'getIdent' in pokemon;

      // Assigns an identifier to the Pokemon
      if (!pokemon.toolsId) {
        pokemon.toolsId = (isMyPokemonSide && !!pokemon.details && [
          ...(myPokemon || []),
          ...(player.pokemon || []),
          ...(playerState.pokemon || []),
        ].find((existingPokemon) => (
          !!existingPokemon?.toolsId &&
          !!existingPokemon.details &&
          similarPokemon(pokemon, existingPokemon, { format: battleState.format })// EDITINGNOTE: Check whether normalizeFormes: 'fucked' is needed
        ))?.toolsId) || calcPokemonToolsId(pokemon, playerKey);

        console.debug(
          '[Gen 3 OU Tools] Assigned a toolsId to the Pokemon.',
          '\nsource:', clientSourced ? 'client' : 'server',
          '\nspeciesForme:', pokemon.speciesForme,
          '\nplayer:', playerKey,
          '\nisMyPokemonSide:', isMyPokemonSide,
          '\nhasMyPokemon:', hasMyPokemon,
          '\ntoolsId:', pokemon.toolsId,
          '\npokemon:', pokemon,
          '\nbattleId:', battleId,
          '\nbattle:', battle,
          '\nstate:', battleState,
        );
      }

      // Assigns the identifier from a server Pokemon to the matching client Pokemon
      if (isMyPokemonSide && hasMyPokemon && !clientSourced) {
        const clientPokemon = player.pokemon.find((clientPokemon) =>
          !clientPokemon.toolsId &&
          !!clientPokemon.details &&
          similarPokemon(pokemon, clientPokemon, { format: battleState.format })// EDITINGNOTE: Check whether normalizeFormes: 'fucked' is needed
        );

        if (clientPokemon) {
          clientPokemon.toolsId = pokemon.toolsId;
        }
      }

      return pokemon.toolsId;
    });

    // Creates the Pokemon list from the client and server
    const playerPokemon = currentOrder.map((toolsId) => {
      const clientPokemonIndex = player.pokemon.findIndex((pokemon) => pokemon.toolsId === toolsId);

      if (clientPokemonIndex >= 0) {
        return player.pokemon[clientPokemonIndex];
      }

      const serverPokemon = (isMyPokemonSide && hasMyPokemon && myPokemon.find((pokemon) => pokemon.toolsId === toolsId)) || null;

      if (!serverPokemon?.details) {
        return null;
      }

      if (!serverPokemon.toolsId) {
        serverPokemon.toolsId = toolsId;
      }

      return {
        toolsId: serverPokemon.toolsId,
        ident: serverPokemon.ident,
        searchid: serverPokemon.searchid,
        name: serverPokemon.name,
        speciesForme: serverPokemon.speciesForme,
        details: serverPokemon.details,
        gender: serverPokemon.gender,
        level: serverPokemon.level,
        hp: serverPokemon.hp,
        maxhp: serverPokemon.maxhp,
      };
    });

    if (diffArrays(currentOrder, playerState.pokemonOrder || []).length) {
      playerState.pokemonOrder = currentOrder;
    }

    console.debug(
      '[Gen 3 OU Tools] Preparing to sync Pokemon.',
      '\npokemon length:', playerPokemon.length,
      '\nmaxPokemon:', maxPokemon,
      '\nplayer:', playerKey,
      '\nisMyPokemonSide:', isMyPokemonSide,
      '\nhasMyPokemon:', hasMyPokemon,
      '\norder:', playerState.pokemonOrder,
      '\npokemon (assembled):', playerPokemon,
      '\npokemon (battle):', player.pokemon,
      '\nbattleId:', battleId,
      '\nbattle:', battle,
      '\nstate:', battleState,
    );

    // Syncs each Pokemon for the player side
    for (let index = 0; index < playerPokemon.length; index++) {
      const clientPokemon = playerPokemon[index];

      if (!clientPokemon?.toolsId) {
        console.debug(
          '[Gen 3 OU Tools] Skipping sync for the Pokemon without toolsId.',
          '\npokemon:', clientPokemon?.ident || clientPokemon?.speciesForme,
          '\nindex:', index,
          '\nplayer:', playerKey,
          '\ntoolsId:', clientPokemon?.toolsId,
          '\npokemon (client):', clientPokemon,
          '\norder:', playerState.pokemonOrder,
          '\npokemon (assembled):', playerPokemon,
          '\npokemon (battle):', player.pokemon,
          '\nbattleId:', battleId,
          '\nbattle:', battle,
          '\nstate:', battleState,
        );

        continue;
      }

      const serverPokemon = (
        isMyPokemonSide &&
        hasMyPokemon &&
        myPokemon.find((pokemon) => pokemon.toolsId === clientPokemon.toolsId)
      ) || null;

      const matchedPokemonIndex = playerState.pokemon.findIndex((pokemon) => pokemon.toolsId === clientPokemon.toolsId);
      const matchedPokemon = playerState.pokemon[matchedPokemonIndex] || null;
      const basePokemon = matchedPokemon || sanitizePokemon(clientPokemon, battleState.format);// EDITINGNOTE: Should I remove format from sanitizePokemon?

      if ('transform' in basePokemon.volatiles && typeof basePokemon.volatiles.transform[1] !== 'string') {
        basePokemon.volatiles = sanitizeVolatiles(basePokemon);
      }

      const syncedPokemon = syncPokemon(basePokemon, {
        format: battleState.format,
        clientPokemon,
        serverPokemon,
        weather: syncedField.weather,
      });// EDITINGNOTE: Are format and weather useful?

      syncedPokemon.slot = index;

      if (!syncedPokemon.playerKey || syncedPokemon.playerKey !== playerKey) {
        syncedPokemon.playerKey = playerKey;
      }

      // Creates mutations revealed by transformation
      if (syncedPokemon.transformedForme && clientPokemon?.volatiles?.transform?.length) {
        const targetClientPokemon = clientPokemon.volatiles.transform[1];
        const targetPlayerKey = (!!targetClientPokemon?.ident && detectPlayerKeyFromPokemon(targetClientPokemon)) || null;
        const mutations = { toolsId: targetClientPokemon.toolsId, ident: targetClientPokemon.ident };

        if (syncedPokemon.source === 'server' && ['p1', 'p2'].includes(targetPlayerKey)) {
          console.debug(
            '[Gen 3 OU Tools] Syncing Pokemon data revealed by transformation.',
            '\ntarget pokemon name:', targetClientPokemon.ident || targetClientPokemon.speciesForme,
            '\ntarget player:', targetPlayerKey,
            '\npokemon name:', syncedPokemon.ident || syncedPokemon.speciesForme,
            '\nindex:', index,
            '\nplayer:', playerKey,
            '\ntarget toolsID:', targetClientPokemon.toolsId,
            '\ntarget pokemon:', targetClientPokemon,
            '\ntoolsId:', syncedPokemon.toolsId,
            '\npokemon:', syncedPokemon,
            '\nbattleId:', battleId,
            '\nbattle:', battle,
            '\nstate:', battleState,
          );

          if (syncedPokemon.ability) {
            mutations.ability = syncedPokemon.ability;
          }

          if (syncedPokemon.transformedMoves.length) {
            mutations.revealedMoves = [...syncedPokemon.transformedMoves];
          }
        }

        if (Object.keys(mutations).length > 2) {
          futureMutations[targetPlayerKey].push(mutations);
        }
      }

      // Applies mutations to the Pokemon
      const pendingMutations = futureMutations[playerKey]
        ?.filter((mutation) => (
          (mutation.toolsId && syncedPokemon.toolsId === mutation.toolsId) ||
          (mutation.ident && syncedPokemon.ident === mutation.ident)
        ))
        .map(({ toolsId, ident, ...mutations }) => ({ ...mutations }));

      if (pendingMutations?.length) {
        pendingMutations.forEach((mutation) => {
          Object.entries(mutation).forEach(([key, value]) => {
            syncedPokemon[key] = value;

            if (key === 'revealedMoves') {
              syncedPokemon.moves = [...value];
            }
          });
        });
      }

      // Checks if no matching Pokemon was found in the state and adds or updates the Pokemon
      if (!matchedPokemon) {
        if (playerState.pokemon.length >= playerState.maxPokemon) {
          console.warn(
            '[Gen 3 OU Tools] Skipping the Pokemon sync because the player has the maximum Pokemon.',
            '\npokemon name:', syncedPokemon.ident || syncedPokemon.speciesForme,
            '\nindex:', index,
            '\nplayer:', playerKey,
            '\npokemon length:', playerState.pokemon.length,
            '\nmaxPokemon:', playerState.maxPokemon,
            '\ntoolsId:', syncedPokemon.toolsId,
            '\npokemon:', syncedPokemon,
            '\ntoolsId (client):', clientPokemon.toolsId,
            '\npokemon (client):', clientPokemon,
            '\ntoolsId (server):', serverPokemon?.toolsId,
            '\npokemon (server):', serverPokemon,
            '\npokemon (battle):', player.pokemon,
            '\npokemon (state):', playerState.pokemon,
            '\nbattleId:', battleId,
            '\nbattle:', battle,
            '\nstate:', battleState,
          );

          continue;
        }

        const size = playerState.pokemon.push(syncedPokemon);

        console.debug(
          '[Gen 3 OU Tools] Syncing a new Pokemon to the state.',
          '\npokemon name:', syncedPokemon.ident || syncedPokemon.speciesForme,
          '\nindex:', size - 1,
          '\nplayer:', playerKey,
          '\npokemon length:', playerState.pokemon.length,
          '\nmaxPokemon:', playerState.maxPokemon,
          '\ntoolsId:', syncedPokemon.toolsId,
          '\npokemon:', syncedPokemon,
          '\ntoolsId (client):', clientPokemon.toolsId,
          '\npokemon (client):', clientPokemon,
          '\ntoolsId (server):', serverPokemon?.toolsId,
          '\npokemon (server):', serverPokemon,
          '\npokemon (battle):', player.pokemon,
          '\npokemon (state):', playerState.pokemon,
          '\nbattleId:', battleId,
          '\nbattle:', battle,
          '\nstate:', battleState,
        );
      } else {
        playerState.pokemon[matchedPokemonIndex] = syncedPokemon;

        console.debug(
          '[Gen 3 OU Tools] Syncing an existing Pokemon in the state.',
          '\npokemon name:', syncedPokemon.ident || syncedPokemon.speciesForme,
          '\nindex:', matchedPokemonIndex,
          '\nplayer:', playerKey,
          '\ntoolsId:', syncedPokemon.toolsId,
          '\npokemon:', syncedPokemon,
          '\ntoolsId (client):', clientPokemon.toolsId,
          '\npokemon (client):', clientPokemon,
          '\ntoolsId (server):', serverPokemon?.toolsId,
          '\npokemon (server):', serverPokemon,
          '\npokemon (battle):', player.pokemon,
          '\npokemon (state):', playerState.pokemon,
          '\nbattleId:', battleId,
          '\nbattle:', battle,
          '\nstate:', battleState,
        );
      }
    }

    // Maps the active Pokemon to its team order
    playerState.activeIndices = (player.active || []).map((activePokemon) => {
      if (!activePokemon?.details || detectPlayerKeyFromPokemon(activePokemon) !== playerKey) {
        return null;
      }

      const activeId = activePokemon?.toolsId || player.pokemon.find((pokemon) => pokemon === activePokemon)?.toolsId;
      const activeIndex = activeId ? playerState.pokemon.findIndex((pokemon) => pokemon.toolsId === activeId) : -1;

      if (activeIndex > -1) {
        return activeIndex;
      }

      if (activePokemon) {
        console.warn(
          '[Gen 3 OU Tools] Could not find the active Pokemon.',
          '\nactiveId:', activeId,
          '\nplayer:', playerKey,
          '\npokemon:', activePokemon,
          '\nplayer (battle):', player,
          '\npokemon (state):', playerState.pokemon,
          '\norder:', playerState.pokemonOrder,
          '\nbattleId:', battleId,
          '\nbattle:', battle,
          '\nstate:', battleState,
        );
      }

      return null;
    }).filter((number) => typeof number === 'number' && number > -1);

    playerState.pokemon.forEach((pokemon, index) => {
      pokemon.active = playerState.activeIndices.includes(index);
    });

    playerState.pokemon.forEach((pokemon, index) => {
      const opponentState = battleState[battleState.opponentKey];
      const opponentIndex = opponentState?.selectionIndex;
      const opponentPokemon = opponentState?.pokemon?.[opponentIndex];

      pokemon.abilityToggled = detectToggledAbility(pokemon, {
        format: battleState.format,
        gameType: battleState.gameType,
        pokemonIndex: index,
        opponentPokemon,
        selectionIndex: playerState.selectionIndex,
        activeIndices: playerState.activeIndices,
        weather: battleState.field.weather,
        terrain: battleState.field.terrain,
      });
    });//EDITINGNOTE: Make sure my implementation of detectToggledAbility doesn't use selectionIndex or opponentPokemon

    // Creates and sanitizes side conditions
    if (playerState.active) {
      playerState.side.conditions = clonePlayerSideConditions(player.sideConditions);

      playerState.side = {
        conditions: playerState.side.conditions,
        ...sanitizePlayerSide(playerState, battle[playerKey]),
      };
    }
  }

  if (battleNonce) {
    battleState.battleNonce = battleNonce;
  }

  console.info(
    '[Gen 3 OU Tools] Sync completed.',
    '\nformat:', battleState.format,
    '\nturn:', battle?.turn,
    '\nsynced pokemon:', ['p1', 'p2']
      .filter((playerKey) => battleState[playerKey]?.active)
      .map((playerKey) => `${playerKey}:${battleState[playerKey]?.pokemon?.length || 0}`)
      .join(', '),
  );

  return battleState;
});