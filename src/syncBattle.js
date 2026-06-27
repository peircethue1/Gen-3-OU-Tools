/**
 * Syncs the state with the battle
 * EDITINGNOTE: Needed final decisions are noted...
 * EDITINGNOTE: I only want to support gen 3 ou and not replays; how do I stop my tool from running in other contexts?
 * EDITINGNOTE: Check consistency of initialized, synced, and nonce properties throughout files
 * EDITINGNOTE: Should I drop request from syncBattle? I would also need to drop it from syncBattle in other files
 */

import {
  detectAuthPlayerKeyFromBattle,
  syncField,
  similarPokemon,
  calcPokemonToolsId,
  diffArrays,
  sanitizePokemon,
  sanitizeVolatiles,
  detectPlayerKeyFromPokemon,
  clonePlayerSideConditions,
  sanitizePlayerSide,
} from './utilities.js';
import { syncPokemon } from './syncPokemon.js';

export function syncBattle(battle, request) {
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

  // Checks if the battle has an invalid ID
  if (!battleId) {
    throw new Error('Attempted to sync a battle with an invalid battleId.');
  }

  // Checks if the battle and state have mismatched IDs
  if (this.toolsState.battleId !== battleId) {
    console.warn(
      '[Gen 3 OU Tools] Skipping sync due to mismatched battleId.',
      'battleId:', battleId,
      'state.battleId:', this.toolsState.battleId,
    );

    return;
  }

  // Checks if the updated battle nonce matches the previous battle nonce
  if (this.toolsState.battleNonce && this.toolsState.battleNonce === battleNonce) {
    console.debug(
      '[Gen 3 OU Tools] Skipping sync due to matching battle nonce.',
      '\nbattleId:', battleId,
      '\nbattleNonce:', battleNonce,
      '\nbattle:', battle,
      '\nstate:', this.toolsState,
    );

    return;
  }

  // Checks if the generation is valid and defines the generation
  if (typeof gen === 'number' && gen > 0) {
    this.toolsState.gen = gen;
  }

  // Checks if the battle was previously active and is now ended, and defines the active state
  if (this.toolsState.active && typeof ended === 'boolean' && ended) {
    this.toolsState.active = false;
  }

  // Checks if the paused or ended state is valid and defines the paused state
  if (typeof paused === 'boolean' || typeof ended === 'boolean') {
    this.toolsState.paused = paused || ended;
  }

  // Defines the game type
  this.toolsState.gameType = gameType === 'singles' ? 'singles' : 'doubles';

  // Defines the turn
  this.toolsState.turn = Math.max((turn || 0), 0);

  // Checks if the user player is available and defines the user and opponent player
  const detectedAuthPlayerKey = this.toolsState.authPlayerKey || detectAuthPlayerKeyFromBattle(battle);

  if (detectedAuthPlayerKey) {
  this.toolsState.authPlayerKey = detectedAuthPlayerKey;
  this.toolsState.opponentKey = detectedAuthPlayerKey === 'p1' ? 'p2' : 'p1';
  }

  // Defines the switched state EDITINGNOTE: determine if either is only relevant for replays
  this.toolsState.switchPlayers = battle.viewpointSwitched ?? battle.sidesSwitched;

  // Checks if the field is available and defines the field
  const syncedField = syncField(this.toolsState, battle);

  if (!syncedField) {
    console.warn(
      '[Gen 3 OU Tools] Could not sync the field.',
      '\nbattleId:', battleId,
      '\nsyncedField:', syncedField,
      '\nstate.field:', this.toolsState.field,
      '\nbattle:', battle,
      '\nstate:', this.toolsState,
    );
  } else {
    this.toolsState.field = syncedField;
  }

  const futureMutations = {
    p1: [],
    p2: [],
  };

  // Defines the player
  for (const playerKey of ['p1', 'p2']) {

    // Checks if the player is unavailable
    if (!(playerKey in battle) || battle[playerKey]?.sideid !== playerKey) {
      continue;
    }

    // Checks if the battle and state have mismatched player names and defines the player name
    const player = battle[playerKey];
    const playerToolsState = this.toolsState[playerKey];

    if (player.name && playerToolsState.name !== player.name) {
      playerToolsState.name = player.name;
    }

    // Checks if the battle and state have mismatched player ratings and defines the player rating
    if (player.rating && playerToolsState.rating !== player.rating) {
      playerToolsState.rating = player.rating;
    }

    // Checks if the state is inactive and defines the active state EDITINGNOTE: Investigate what turns this false
    if (!playerToolsState.active) {
      playerToolsState.active = true;
    }

    // Checks if the side is not the user side or doesn't have the user Pokemon, and no Pokemon are available
    const isMyPokemonSide = !!this.toolsState.authPlayerKey && playerKey === this.toolsState.authPlayerKey;
    const hasMyPokemon = !!myPokemon?.length;

    if ((!isMyPokemonSide || !hasMyPokemon) && (!Array.isArray(player.pokemon) || !player.pokemon.length)) {
      console.debug(
        '[Gen 3 OU Tools] Skipping Pokemon sync because no Pokemon are available.',
        '\nplayer:', playerKey,
        ...(isMyPokemonSide ? ['\nmyPokemon:', myPokemon] : []),
        '\nbattle pokemon:', player.pokemon,
        '\nstate pokemon:', playerToolsState.pokemon,
        '\nbattleId:', battleId,
        '\nbattle:', battle,
        '\nstate:', this.toolsState,
      );

      continue;
    }

    // Checks if the battle and state have mismatched maximum Pokemon and defines the maximum Pokemon
    const maxPokemon = Math.max(Math.min(player?.totalPokemon || 0, 6), 1);

    if (playerToolsState.maxPokemon !== maxPokemon) {
      playerToolsState.maxPokemon = maxPokemon;
    }

    const initialPokemon = (this.toolsState.active && isMyPokemonSide ? myPokemon : player.pokemon) || [];

    // Creates an array of Pokemon IDs
    const currentOrder = initialPokemon.map((pokemon) => {
      const clientSourced = 'getIdent' in pokemon;

      // Checks if the Pokemon ID is unavailable
      if (!pokemon.toolsId) {

        // Defines the Pokemon ID by matching an existing Pokemon ID or creating a new Pokemon ID
        pokemon.toolsId = (isMyPokemonSide && !!pokemon.details && [
          ...(myPokemon || []),
          ...(player.pokemon || []),
          ...(playerToolsState.pokemon || []),
        ].find((existingPokemon) => (
          !!existingPokemon?.toolsId &&
          !!existingPokemon.details &&
          similarPokemon(pokemon, existingPokemon, { format: this.toolsState.format })
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
          '\nstate:', this.toolsState,
        );
      }

      // Checks if the side is the user side and has the user Pokemon, and the source of the Pokemon is the server
      if (isMyPokemonSide && hasMyPokemon && !clientSourced) {

        // Matches the Pokemon to a client Pokemon without an ID
        const clientPokemon = player.pokemon.find((clientPokemon) =>
          !clientPokemon.toolsId &&
          !!clientPokemon.details &&
          similarPokemon(pokemon, clientPokemon, { format: this.toolsState.format })
        );

        // Checks if a matching Pokemon is available and defines the Pokemon ID
        if (clientPokemon) {
          clientPokemon.toolsId = pokemon.toolsId;
        }
      }

      return pokemon.toolsId;
    });

    // Creates a Pokemon for a Pokemon ID
    const playerPokemon = currentOrder.map((toolsId) => {

      // Matches the Pokemon ID to a client Pokemon
      const clientPokemonIndex = player.pokemon.findIndex((pokemon) => pokemon.toolsId === toolsId);

      if (clientPokemonIndex > -1) {
        return player.pokemon[clientPokemonIndex];
      }

      // Matches the Pokemon ID to a server Pokemon
      const serverPokemon = (isMyPokemonSide && hasMyPokemon && myPokemon.find((pokemon) => pokemon.toolsId === toolsId)) || null;

      // Checks if the Pokemon is valid
      if (!serverPokemon?.details) {
        return null;
      }

      // Checks if the Pokemon ID is unavailable and defines the Pokemon ID
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

    // Checks if the battle and state have mismatched orders and defines the order
    if (diffArrays(currentOrder, playerToolsState.pokemonOrder || []).length) {
      playerToolsState.pokemonOrder = currentOrder;
    }

    console.debug(
      '[Gen 3 OU Tools] Preparing to sync Pokemon.',
      '\npokemon length:', playerPokemon.length,
      '\nmaxPokemon:', maxPokemon,
      '\nplayer:', playerKey,
      '\nisMyPokemonSide:', isMyPokemonSide,
      '\nhasMyPokemon:', hasMyPokemon,
      '\norder:', playerToolsState.pokemonOrder,
      '\npokemon (assembled):', playerPokemon,
      '\npokemon (battle):', player.pokemon,
      '\nbattleId:', battleId,
      '\nbattle:', battle,
      '\nstate:', this.toolsState,
    );

    // Defines the Pokemon
    for (let index = 0; index < playerPokemon.length; index++) {

      // Checks if the Pokemon has an invalid Pokemon ID
      const clientPokemon = playerPokemon[index];

      if (!clientPokemon?.toolsId) {
        console.debug(
          '[Gen 3 OU Tools] Skipping Pokemon sync for Pokemon without toolsId.',
          '\npokemon:', clientPokemon?.ident || clientPokemon?.speciesForme,
          '\nindex:', index,
          '\nplayer:', playerKey,
          '\ntoolsId:', clientPokemon?.toolsId,
          '\npokemon (client):', clientPokemon,
          '\norder:', playerToolsState.pokemonOrder,
          '\npokemon (assembled):', playerPokemon,
          '\npokemon (battle):', player.pokemon,
          '\nbattleId:', battleId,
          '\nbattle:', battle,
          '\nstate:', this.toolsState,
        );

        continue;
      }

      const serverPokemon = (isMyPokemonSide && hasMyPokemon && myPokemon.find((pokemon) => pokemon.toolsId === clientPokemon.toolsId)) || null;
      const matchedPokemonIndex = playerToolsState.pokemon.findIndex((pokemon) => pokemon.toolsId === clientPokemon.toolsId);
      const matchedPokemon = playerToolsState.pokemon[matchedPokemonIndex] || null;
      const basePokemon = matchedPokemon || sanitizePokemon(clientPokemon, this.toolsState.format);

      // Checks if the Pokemon is transformed and defines the Pokemon volatiles
      if ('transform' in basePokemon.volatiles && typeof basePokemon.volatiles.transform[1] !== 'string') {
        basePokemon.volatiles = sanitizeVolatiles(basePokemon);
      }

      // Creates the Pokemon EDITINGNOTE: is weather used by syncPokemon?
      const syncedPokemon = syncPokemon(basePokemon, {
        format: this.toolsState.format,
        clientPokemon,
        serverPokemon,
        weather: syncedField.weather,
      });

      // Defines the Pokemon slot
      syncedPokemon.slot = index;

      // Checks if the Pokemon player is unavailable or mismatched and defines the Pokemon player
      if (!syncedPokemon.playerKey || syncedPokemon.playerKey !== playerKey) {
        syncedPokemon.playerKey = playerKey;
      }

      // Checks if the Pokemon is transformed
      if (syncedPokemon.transformedForme && clientPokemon?.volatiles?.transform?.length) {
        const targetClientPokemon = clientPokemon.volatiles.transform[1];
        const targetPlayerKey = (!!targetClientPokemon?.ident && detectPlayerKeyFromPokemon(targetClientPokemon)) || null;
        const mutations = { toolsId: targetClientPokemon.toolsId, ident: targetClientPokemon.ident };

        // Checks if the Pokemon source is the server and the transformation target player is valid
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
            '\nstate:', this.toolsState,
          );

          // Checks if the Pokemon ability is available and defines the mutation ability
          if (syncedPokemon.ability) {
            mutations.ability = syncedPokemon.ability;
          }

          // Checks if the Pokemon moves are available and defines the mutation moves
          if (syncedPokemon.transformedMoves.length) {
            mutations.revealedMoves = [...syncedPokemon.transformedMoves];
          }
        }

        // Checks if the mutation has been populated and adds the mutation to the mutation buffer
        if (Object.keys(mutations).length > 2) {
          futureMutations[targetPlayerKey].push(mutations);
        }
      }

      // Checks if the mutation buffer has a valid mutation for the Pokemon and defines the Pokemon
      const pendingMutations = futureMutations[playerKey]
        ?.filter((mutation) => (
          (!!mutation?.toolsId && syncedPokemon.toolsId === mutation.toolsId) ||
          (!!mutation?.ident && syncedPokemon.ident === mutation.ident)
        ))
        .map(({ toolsId, ident, ...mutations }) => ({
          ...mutations,
        }));

      if (pendingMutations?.length) {
        pendingMutations.forEach((mutation) =>
          Object.entries(mutation).forEach(([key, value]) => {
            syncedPokemon[key] = value;

            if (key === 'revealedMoves') {
              syncedPokemon.moves = [...value];
            }
          })
        );
      }

      // Checks if no Pokemon from the state match the client Pokemon
      if (!matchedPokemon) {

        // Checks if the state has the maximum Pokemon
        if (playerToolsState.pokemon.length >= playerToolsState.maxPokemon) {
          console.warn(
            '[Gen 3 OU Tools] Skipping Pokemon sync because the player has the maximum Pokemon.',
            '\npokemon name:', syncedPokemon.ident || syncedPokemon.speciesForme,
            '\nindex:', index,
            '\nplayer:', playerKey,
            '\npokemon length:', playerToolsState.pokemon.length,
            '\nmaxPokemon:', playerToolsState.maxPokemon,
            '\ntoolsId:', syncedPokemon.toolsId,
            '\npokemon:', syncedPokemon,
            '\ntoolsId (client):', clientPokemon.toolsId,
            '\npokemon (client):', clientPokemon,
            '\ntoolsId (server):', serverPokemon?.toolsId,
            '\npokemon (server):', serverPokemon,
            '\npokemon (battle):', player.pokemon,
            '\npokemon (state):', playerToolsState.pokemon,
            '\nbattleId:', battleId,
            '\nbattle:', battle,
            '\nstate:', this.toolsState,
          );

          continue;
        }

        // Adds the Pokemon to the state
        const size = playerToolsState.pokemon.push(syncedPokemon);

        console.debug(
          '[Gen 3 OU Tools] Syncing new Pokemon to the state.',
          '\npokemon name:', syncedPokemon.ident || syncedPokemon.speciesForme,
          '\nindex:', size - 1,
          '\nplayer:', playerKey,
          '\npokemon length:', playerToolsState.pokemon.length,
          '\nmaxPokemon:', playerToolsState.maxPokemon,
          '\ntoolsId:', syncedPokemon.toolsId,
          '\npokemon:', syncedPokemon,
          '\ntoolsId (client):', clientPokemon.toolsId,
          '\npokemon (client):', clientPokemon,
          '\ntoolsId (server):', serverPokemon?.toolsId,
          '\npokemon (server):', serverPokemon,
          '\npokemon (battle):', player.pokemon,
          '\npokemon (state):', playerToolsState.pokemon,
          '\nbattleId:', battleId,
          '\nbattle:', battle,
          '\nstate:', this.toolsState,
        );
      } else {

        // Updates the Pokemon in the state
        playerToolsState.pokemon[matchedPokemonIndex] = syncedPokemon;

        console.debug(
          '[Gen 3 OU Tools] Syncing existing Pokemon in the state.',
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
          '\npokemon (state):', playerToolsState.pokemon,
          '\nbattleId:', battleId,
          '\nbattle:', battle,
          '\nstate:', this.toolsState,
        );
      }
    }

    // Defines the active index
    playerToolsState.activeIndices = (player.active || []).map((activePokemon) => {

      // Checks if the Pokemon is invalid
      if (!activePokemon?.details || detectPlayerKeyFromPokemon(activePokemon) !== playerKey) {
        return null;
      }

      // Checks if the active index is valid
      const activeId = activePokemon?.toolsId || player.pokemon.find((pokemon) => pokemon === activePokemon)?.toolsId;
      const activeIndex = activeId ? playerToolsState.pokemon.findIndex((pokemon) => pokemon.toolsId === activeId) : -1;

      if (activeIndex > -1) {
        return activeIndex;
      }

      if (activePokemon) {
        console.warn(
          '[Gen 3 OU Tools] Could not find active index.',
          '\nactiveId:', activeId,
          '\nplayer:', playerKey,
          '\npokemon:', activePokemon,
          '\nplayer (battle):', player,
          '\npokemon (state):', playerToolsState.pokemon,
          '\norder:', playerToolsState.pokemonOrder,
          '\nbattleId:', battleId,
          '\nbattle:', battle,
          '\nstate:', this.toolsState,
        );
      }

      return null;
    }).filter((number) => typeof number === 'number' && number > -1);

    // Defines the active Pokemon
    playerToolsState.pokemon.forEach((pokemon, index) => {
      pokemon.active = playerToolsState.activeIndices.includes(index);
    });

    // Checks if the player is active
    if (playerToolsState.active) {

      // Defines the player side
      playerToolsState.side.conditions = clonePlayerSideConditions(player.sideConditions);

      playerToolsState.side = {
        conditions: playerToolsState.side.conditions,
        ...sanitizePlayerSide(playerToolsState, battle[playerKey]),
      };
    }
  }

  // Checks if the battle nonce is available and defines the battle nonce
  if (battleNonce) {
    this.toolsState.battleNonce = battleNonce;
  }

  // Syncs modules
  this.syncCalculator();
  this.syncPrediction();
  this.syncInformation();

  // Calls the state update callback
  if (typeof this.onStateUpdate === 'function') {
    this.onStateUpdate();
  }
};