/**
 * 
 * EDITINGNOTE: Full review
 * EDITINGNOTE: Handle "render" and possibly html
 * EDITINGNOTE: Make sure tools state is applied correctly
 * EDITINGNOTE: I don't want to support replays, so do I want to stop syncing when !this.tools state.active? Should I detect if the authPlayer is in the battle?
 * EDITINGNOTE: I only want to support gen 3 ou, so how do I stop my tool from running in other contexts?
 * EDITINGNOTE: Make initialized and synced variables consistent, and check what variables I actually need throughout
 * EDITINGNOTE: do I use ID (abbreviation)
 */

import {
  detectAuthPlayerKeyFromBattle,
  syncField,
  formatId,
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
      '[Gen 3 OU Tools] Skipping sync due to matching nonce.',
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

  // Checks if the user player key is available and defines the player key of the user and opponent
  const detectedAuthPlayerKey = this.toolsState.authPlayerKey || detectAuthPlayerKeyFromBattle(battle);

  if (detectedAuthPlayerKey) {
  this.toolsState.authPlayerKey = detectedAuthPlayerKey;
  this.toolsState.opponentKey = detectedAuthPlayerKey === 'p1' ? 'p2' : 'p1';
  }

  // Defines the switched state EDITINGNOTE: determine if either of these is only relevant for replays
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

  // EDITINGNOTE: needs comment
  for (const playerKey of ['p1', 'p2']) {

    // Checks if the player key is not available or the battle data is not for the player key
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

    // Checks if the state is inactive and defines the active state EDITINGNOTE: how would I end up with false here?
    if (!playerToolsState.active) {
      playerToolsState.active = true;
    }

    // Checks if the the side is not the user side or doesn't have the user Pokemon, and no Pokemon are available
    const isMyPokemonSide = !!this.toolsState.authPlayerKey && playerKey === this.toolsState.authPlayerKey;
    const hasMyPokemon = !!myPokemon?.length;

    if ((!isMyPokemonSide || !hasMyPokemon) && (!Array.isArray(player.pokemon) || !player.pokemon.length)) {
      console.debug(
        '[Gen 3 OU Tools] Skipping Pokemon sync because no Pokemon were found.',
        '\nplayer:', playerKey,
        ...(isMyPokemonSide ? ['\nmyPokemon:', myPokemon] : []),
        '\nbattle.pokemon:', player.pokemon,
        '\nplayerToolsState.pokemon:', playerToolsState.pokemon,
        '\nbattleId:', battleId,
        '\nbattle:', battle,
        '\nstate:', this.toolsState,
      );

      continue;
    }

    // Checks if the battle and state have mismatched maximum Pokemon and defines the maximum Pokemon
    const maxPokemon = Math.max(Math.min(player?.totalPokemon || 0, 6), 1)

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

      // Checks if the the side is the user side and has the user Pokemon, and the source of the Pokemon is the server
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

      // Checks if the Pokemon details are unavailable
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
      '\npokemon.length:', playerPokemon.length,
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

    // update each pokemon (note that the index `i` should be relatively consistent between turns) EDITINGNOTE: LEFTOFFHERE
    for (let index = 0; index < playerPokemon.length; index++) {

      // 
      const clientPokemon = playerPokemon[index];

      if (!clientPokemon?.toolsId) {
        console.debug(
          '[Gen 3 OU Tools] Skipping Pokemon without toolsId.',
          '\npokemon:', clientPokemon?.ident || clientPokemon?.speciesForme,
          '\nindex:', index,
          '\nplayer:', playerKey,
          '\nclientPokemon.toolsId:', clientPokemon?.toolsId,
          '\nclientPokemon:', clientPokemon,
          '\norder:', playerToolsState.pokemonOrder,
          '\npokemon (assembled):', playerPokemon,
          '\npokemon (battle):', player.pokemon,
          '\nbattleId:', battleId,
          '\nbattle:', battle,
          '\ntoolsState', this.toolsState,
        );

        continue;
      }

      // 
      const serverPokemon = (isMyPokemonSide && hasMyPokemon && myPokemon.find((pokemon) => pokemon.toolsId === clientPokemon.toolsId)) || null;

      // 
      const matchedPokemonIndex = playerToolsState.pokemon.findIndex((pokemon) => pokemon.toolsId === clientPokemon.toolsId);
      const matchedPokemon = playerToolsState.pokemon[matchedPokemonIndex] || null;

      // this is our starting point for the current clientPokemon
      const basePokemon = matchedPokemon || sanitizePokemon(
        clientPokemon,
        this.toolsState.format,
      );

      // in case the volatiles aren't sanitized yet lol
      if ('transform' in basePokemon.volatiles && typeof basePokemon.volatiles.transform[1] !== 'string') {
        basePokemon.volatiles = sanitizeVolatiles(basePokemon);
      }

      // and then from here on out, we just directly modify syncedPokemon (serverPokemon and dex are optional, which will add additional known properties)
      const syncedPokemon = syncPokemon(basePokemon, {
        format: this.toolsState.format,
        clientPokemon: clientPokemon,
        serverPokemon,
        weather: syncedField.weather,
      });

      // update (2023/10/18): not really using `slot` at all, so yolo ?
      syncedPokemon.slot = index;

      // update the syncedPokemon's playerKey, if falsy or mismatched
      if (!syncedPokemon.playerKey || syncedPokemon.playerKey !== playerKey) {
        syncedPokemon.playerKey = playerKey;
      }

      // if the Pokemon is transformed, see which one it's transformed as
      if (syncedPokemon.transformedForme && clientPokemon?.volatiles?.transform?.length) {

        // since we sanitized the volatiles earlier, we actually need the pointer to the target Pokemon from the original Showdown.Pokemon (i.e., the clientPokemon) to retrieve its ident
        const targetClientPokemon = clientPokemon.volatiles.transform[1];
        const targetPlayerKey = (!!targetClientPokemon?.ident && detectPlayerKeyFromPokemon(targetClientPokemon)) || null;
        const mutations = {
          toolsId: targetClientPokemon.toolsId,
          ident: targetClientPokemon.ident,
        };

        // if the Pokemon is also server-sourced, we can apply some known info as revealed info of the target Pokemon
        if (syncedPokemon.source === 'server' && ['p1', 'p2'].includes(targetPlayerKey)) {
            console.debug(
              '[Gen 3 OU Tools] Syncing information revealed by transformation.',
              '\ntargetpokemon:', targetClientPokemon.ident || targetClientPokemon.speciesForme,
              '\ntarget player:', targetPlayerKey,
              '\npokemon:', syncedPokemon.ident || syncedPokemon.speciesForme,
              '\nindex:', index,
              '\nplayer:', playerKey,
              '\ntarget:', targetClientPokemon.toolsId, targetClientPokemon,
              '\nsyncedPokemon.toolsId:', syncedPokemon.toolsId,
              '\nsyncedPokemon:', syncedPokemon,
              '\nbattleId:', battleId,
              '\nbattle:', battle,
              '\nstate:', this.toolsState,
            );

          // 
          if (syncedPokemon.ability) {
            mutations.ability = syncedPokemon.ability;
          }

          // 
          if (syncedPokemon.transformedMoves.length) {
            mutations.revealedMoves = [...syncedPokemon.transformedMoves];
          }
        }

        // the `2` includes the initial calcdexId & ident properties earlier (so if we only have 2 still, then we know there aren't any mutations to add to futureMutations)
        if (Object.keys(mutations).length > 2) {
          futureMutations[targetPlayerKey].push(mutations);
        }
      }

      // apply any applicable futureMutations
      const pendingMutations = futureMutations[playerKey]?.filter((mutation) => (
        (!!mutation?.toolsId && syncedPokemon.toolsId === mutation.toolsId)
          || (!!mutation?.ident && syncedPokemon.ident === mutation.ident)
      )).map(({
        toolsId,
        ident,
        ...mutations
      }) => ({ ...mutations }));

      // 
      if (pendingMutations?.length) {
        pendingMutations.forEach((mutation) => Object.entries(mutation).forEach(([
          key,
          value,
        ]) => {
          syncedPokemon[key] = value;

          if (key === 'revealedMoves') {
            syncedPokemon.moves = [...value];
          }
        }));
      }

      // add the pokemon to the player's Calcdex state (if not maxed already)
      if (!matchedPokemon) {
        if (playerToolsState.pokemon.length >= playerToolsState.maxPokemon) {
          console.warn(
            '[Gen 3 OU Tools] Skipping Pokemon sync because the player already has the maximum number of Pokemon.',
            '\npokemon:', syncedPokemon.ident || syncedPokemon.speciesForme,
            '\nindex:', index,
            '\nplayer:', playerKey,
            '\npokemon.length:', playerToolsState.pokemon.length,
            '\nmaxPokemon:', playerToolsState.maxPokemon,
            '\nsyncedPokemon.toolsId:', syncedPokemon.toolsId,
            '\nsyncedPokemon:', syncedPokemon,
            '\nclientPokemon.toolsId:', clientPokemon.toolsId,
            '\nclientPokemon:', clientPokemon,
            '\nserverPokemon.toolsId:', serverPokemon?.toolsId,
            '\nserverPokemon:', serverPokemon,
            '\npokemon (battle):', player.pokemon,
            '\nplayerToolsState.pokemon:', playerToolsState.pokemon,
            '\nbattleId:', battleId,
            '\nbattle:', battle,
            '\nstate:', this.toolsState,
          );

          continue;
        }

        const size = playerToolsState.pokemon.push(syncedPokemon);

        console.debug(
          '[Gen 3 OU Tools] Added Pokemon.',
          '\npokemon:', syncedPokemon.ident || syncedPokemon.speciesForme,
          '\nindex:', size - 1,
          '\nplayer:', playerKey,
          '\npokemon.length:', playerToolsState.pokemon.length,
          '\nmaxPokemon:', playerToolsState.maxPokemon,
          '\nsyncedPokemon.toolsId:', syncedPokemon.toolsId,
          '\nsyncedPokemon:', syncedPokemon,
          '\nclientPokemon.toolsId:', clientPokemon.toolsId,
          '\nclientPokemon:', clientPokemon,
          '\nserverPokemon.toolsId:', serverPokemon?.toolsId,
          '\nserverPokemon:', serverPokemon,
          '\npokemon (battle):', player.pokemon,
          '\nplayerToolsState.pokemon:', playerToolsState.pokemon,
          '\nbattleId:', battleId,
          '\nbattle:', battle,
          '\nstate:', this.toolsState,
        );
      } else {
        playerToolsState.pokemon[matchedPokemonIndex] = syncedPokemon;

        console.debug(
          '[Gen 3 OU Tools] Synced Pokemon.',
          '\npokemon:', syncedPokemon.ident || syncedPokemon.speciesForme,
          '\nindex:', matchedPokemonIndex,
          '\nplayer:', playerKey,
          '\nsyncedPokemon.toolsId:', syncedPokemon.toolsId,
          '\nsyncedPokemon:', syncedPokemon,
          '\nclientPokemon.toolsId:', clientPokemon.toolsId,
          '\nclientPokemon:', clientPokemon,
          '\nserverPokemon.toolsId:', serverPokemon?.toolsId,
          '\nserverPokemon:', serverPokemon,
          '\npokemon (battle):', player.pokemon,
          '\nplayerToolsState.pokemon:', playerToolsState.pokemon,
          '\nbattleId:', battleId,
          '\nbattle:', battle,
          '\nstate:', this.toolsState,
        );
      }
    }

    // 
    playerToolsState.activeIndices = (player.active || []).map((activePokemon) => {

      // particularly in FFA, there may be a Pokemon belonging to another player in active[]
      if (!activePokemon?.details || detectPlayerKeyFromPokemon(activePokemon) !== playerKey) {
        return null;
      }

      // 
      let activeId = activePokemon?.toolsId || player.pokemon.find((pokemon) => pokemon === activePokemon)?.toolsId;

      // note: leave as `let` for those dank console logs
      let activeIndex = -1;

      // 
      if (activeId) {
        activeIndex = playerToolsState.pokemon.findIndex((pokemon) => pokemon.toolsId === activeId);
      }

      // 
      if (activeIndex > -1) {
        return activeIndex;
      }

      // 
      if (activePokemon) {
        console.warn(
          '[Gen 3 OU Tools] Attempted to add existing activeId.',
          '\nactiveId:', activeId,
          '\nplayer:', playerKey,
          '\nactivePokemon:', activePokemon,
          '\nbattle player:', player,
          '\nplayerToolsState.pokemon:', playerToolsState.pokemon,
          '\norder:', playerToolsState.pokemonOrder,
          '\nbattleId:', battleId,
          '\nbattle:', battle,
          '\nstate:', this.toolsState,
        );
      }

      return null;
    }).filter((number) => typeof number === 'number' && number > -1);

    // repopulate the active property of each pokemon now that we have the actual indices
    playerToolsState.pokemon.forEach((pokemon, index) => {
      pokemon.active = playerToolsState.activeIndices.includes(index);
    });

    // sync player side
    if (playerToolsState.active) {
      // sync the sideConditions from the battle (this is first so that it'll be available in sanitizePlayerSide(), just in case)
      playerToolsState.side.conditions = clonePlayerSideConditions(player.sideConditions);

      playerToolsState.side = {
        conditions: playerToolsState.side.conditions,
        ...sanitizePlayerSide(playerToolsState, battle[playerKey]),
      };
    }
  }

  // I've gotten rid of the part that handles autoboostmap here

  // this is important, otherwise we can't ignore re-renders of the same state (which may result in reaching React's maximum update depth)
  if (battleNonce) {
    this.toolsState.battleNonce = battleNonce;
  }

  // 
  this.syncCalculator();
  this.syncPrediction();
  this.syncInformation();

  // Retrieve the HTML room container tied to this battle
  const toolsElement = battle.toolsHtmlRoom?.el;

  if (!toolsElement) {
    console.warn('[Gen 3 OU Tools] syncBattle completed, but the room element was not found for this battle:', battle.id);
    
    return;
  }

  console.debug('[Gen 3 OU Tools] syncBattle completed successfully. Rendering the panel.');

  // Directly execute the DOM renderer update hook
  this.renderTools(toolsElement);
};