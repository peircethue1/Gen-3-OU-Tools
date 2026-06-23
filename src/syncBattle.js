/**
 * 
 * EDITINGNOTE: Full review
 * EDITINGNOTE: Handle "render" and possibly html
 * EDITINGNOTE: Make sure battleState and toolsState are applied correctly
 * EDITINGNOTE: I don't want to support replays, so do I want to stop syncing when !this.toolsState.active? Should I detect if the authPlayer is in the battle?
 * EDITINGNOTE: I only want to support gen 3 ou, so how do I stop my tool from running in other contexts?
 * EDITINGNOTE: Make initialized and synced variables consistent, and check what variables I actually need throughout
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
import { ToolsDomRenderer } from './ToolsRenderer.js';

export function syncBattle(battle, request) {

 // 
  const {
    id: battleId,
    nonce: battleNonce,
    gen,
    gameType,
    turn,
    paused,
    ended,
    myPokemon,
    speciesClause,
    stepQueue,
  } = battle || {};

  // 
  if (!battleId) {
    throw new Error('Attempted to sync a battle instance with an invalid battleId.');
  }

  // 
  if (this.battleState.battleNonce && this.battleState.battleNonce === battleNonce) {
      console.debug(
        '[Gen 3 OU Tools] Skipping sync due to matching nonce.',
        '\nbattleId:', battleId,
        '\nbattleNonce:', battleNonce,
        '\nbattle:', battle,
        '\nbattleState:', this.battleState,
      );

    return;
  }

  // update the gen, if provided
  if (typeof gen === 'number' && gen > 0) {
    this.toolsState.gen = gen;
  }

  // update the battle's active state, but only allow it to go from true -> false
  if (this.battleState.active && typeof ended === 'boolean' && ended) {
    this.toolsState.active = false;
  }

  // 
  if (typeof paused === 'boolean' || typeof ended === 'boolean') {
    this.toolsState.paused = paused || ended;
  }

  // 
  this.toolsState.gameType = gameType === 'singles' ? 'singles' : 'doubles';

  // update the current turn number
  this.toolsState.turn = Math.max((turn || 0), 0);

  // update the authPlayerKey (if any)
  this.toolsState.authPlayerKey = detectAuthPlayerKeyFromBattle(battle);

  // EDITINGNOTE: this originally had detectPlayerKeyFromBattle(battle);, why do we get rid of, because we're not supporting replays?
  const detectedPlayerKey = this.battleState.authPlayerKey;
  
  if (detectedPlayerKey) {
    this.toolsState.playerKey = detectedPlayerKey;
    this.toolsState.opponentKey = this.battleState.playerKey === 'p1' ? 'p2' : 'p1';
  }

  // update the sidesSwitched from the battle
  this.toolsState.switchPlayers = battle.viewpointSwitched ?? battle.sidesSwitched;

  // sync the field first cause we'll need the updated values for some calculations later
  const syncedField = syncField(this.battleState, battle);

  if (!syncedField) {
      console.warn(
        '[Gen 3 OU Tools] Could not sync the field.',
        '\nbattleId:', battleId,
        '\nsyncedField:', syncedField,
        '\nbattleState.field:', this.battleState.field,
        '\nbattle:', battle,
        '\nbattleState:', this.battleState,
      );
  } else {
    this.toolsState.field = syncedField;
  }

  // keep track of CalcdexPokemon mutations from one player to another (e.g., revealed properties of the transform target Pokemon from the current player's transformed Pokemon)
  const futureMutations = {
    p1: [],
    p2: [],
  };

  // 
  for (const playerKey of ['p1', 'p2']) {

    // 
    if (!(playerKey in battle) || battle[playerKey]?.sideid !== playerKey) {
      continue;
    }

    // 
    const player = battle[playerKey];
    const playerState = this.toolsState[playerKey];

    if (player.name && playerState.name !== player.name) {
      playerState.name = player.name;
    }

    // 
    if (player.rating && playerState.rating !== player.rating) {
      playerState.rating = player.rating;
    }

    // 
    if (!playerState.active) {
      playerState.active = true;
    }

    // determine if `myPokemon[]` belongs to the current player
    const isMyPokemonSide = !!this.battleState.playerKey && playerKey === this.battleState.playerKey;
    const hasMyPokemon = !!myPokemon?.length;

    if ((!isMyPokemonSide || !hasMyPokemon) && (!Array.isArray(player.pokemon) || !player.pokemon.length)) {
        console.debug(
          '[Gen 3 OU Tools] Skipping Pokemon sync because no Pokemon were found.',
          '\nplayer:', playerKey,
          ...(isMyPokemonSide ? ['\nmyPokemon:', myPokemon] : []),
          '\nbattle.pokemon:', player.pokemon,
          '\nbattleState.pokemon:', playerState.pokemon,
          '\nbattleId:', battleId,
          '\nbattle:', battle,
          '\nbattleState:', this.battleState,
        );

      continue;
    }

    // determine the max amount of Pokemon
    const maxPokemon = Math.max(player?.totalPokemon || 0, 6);

    if (playerState.maxPokemon !== maxPokemon) {
      playerState.maxPokemon = maxPokemon;
    }

    // if we're in an active battle and the logged-in user is also a player, but did not receieve myPokemon from the server yet, don't process any Pokemon! (we need the calcdexId to be assigned to myPokemon first, then mapped to the clientPokemon)
    const initialPokemon = (this.battleState.active && isMyPokemonSide && this.battleState.authPlayerKey === playerKey ? myPokemon : player.pokemon) || [];

    // 
    const currentOrder = initialPokemon.map((pokemon) => {

      // 
      const clientSourced = 'getIdent' in pokemon;

      // 
      if (!pokemon.toolsId) {

        // found a case where the client Pokemon was given before the ServerPokemon for the myPokemon[] side
        pokemon.toolsId = (isMyPokemonSide && !!pokemon.details && [
          ...(myPokemon || []),
          ...(player.pokemon || []),
          ...(playerState.pokemon || []),
        ].find((existingPokemon) => (!!existingPokemon?.toolsId && !!existingPokemon.details && similarPokemon(pokemon, existingPokemon, {
          format: this.battleState.format,
        })))?.toolsId
        ) || calcPokemonToolsId(pokemon, playerKey);

        console.debug(
          '[Gen 3 OU Tools] Assigned toolsId.',
          '\nsource:', clientSourced ? 'client' : 'server',
          '\nspeciesForme:', pokemon.speciesForme,
          '\nplayer:', playerKey,
          '\nisMyPokemonSide:', isMyPokemonSide,
          '\nhasMyPokemon:', hasMyPokemon,
          '\ntoolsId:', pokemon.toolsId,
          '\npokemon:', pokemon,
          '\nbattleId:', battleId,
          '\nbattle:', battle,
          '\nbattleState:', this.battleState,
        );
      }

      // 
      if (isMyPokemonSide && hasMyPokemon && !clientSourced) {

        // 
        const clientPokemon = player.pokemon
          .find((clientPokemon) => !clientPokemon.toolsId && !!clientPokemon.details && similarPokemon(pokemon, clientPokemon, {
            format: this.battleState.format,
          }));

        if (clientPokemon) {
          clientPokemon.toolsId = pokemon.toolsId;
        }
      }

      return pokemon.toolsId;
    });

    // reconstruct a full list of the current player's Pokemon, whether revealed or not (but if we don't have the relevant info [i.e., !isMyPokemonSide], then just access the player's `pokemon`)
    const playerPokemon = currentOrder.map((toolsId) => {

      // try to find a matching clientPokemon that has already been revealed using the ident, which is seemingly consistent between the player's `pokemon` (Pokemon[]) and `myPokemon` (ServerPokemon[])
      const clientPokemonIndex = player.pokemon.findIndex((pokemon) => pokemon.toolsId === toolsId);

      // 
      if (clientPokemonIndex > -1) {
        return player.pokemon[clientPokemonIndex];
      }

      // 
      const serverPokemon = (isMyPokemonSide && hasMyPokemon && myPokemon.find((pokemon) => pokemon.toolsId === toolsId)) || null;

      if (!serverPokemon?.details) {
        return null;
      }

      if (!serverPokemon.toolsId) {
        serverPokemon.toolsId = toolsId;
      }

      // at this point, most likely means that the Pokemon is not yet revealed, so convert the ServerPokemon into a partially-filled Pokemon object
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

    // 
    if (diffArrays(currentOrder, playerState.pokemonOrder || []).length) {
      playerState.pokemonOrder = currentOrder;
    }

    console.debug(
      '[Gen 3 OU Tools] Preparing to sync Pokemon.',
      '\npokemon.length:', playerPokemon.length,
      '\nmaxPokemon:', maxPokemon,
      '\nplayer:', playerKey,
      '\nisMyPokemonSide:', isMyPokemonSide,
      '\nhasMyPokemon:', hasMyPokemon,
      '\npokemonOrder:', playerState.pokemonOrder,
      '\npokemon (assembled):', playerPokemon,
      '\npokemon (battle):', player.pokemon,
      '\nbattleId:', battleId,
      '\nbattle:', battle,
      '\nbattleState:', this.battleState,
    );

    // update each pokemon (note that the index `i` should be relatively consistent between turns)
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
          '\norder:', playerState.pokemonOrder,
          '\npokemon (assembled):', playerPokemon,
          '\npokemon (battle):', player.pokemon,
          '\nbattleId:', battleId,
          '\nbattle:', battle,
          '\nbattleState', this.battleState,
        );

        continue;
      }

      // 
      const serverPokemon = (isMyPokemonSide && hasMyPokemon && myPokemon.find((pokemon) => pokemon.toolsId === clientPokemon.toolsId)) || null;

      // 
      const matchedPokemonIndex = playerState.pokemon.findIndex((pokemon) => pokemon.toolsId === clientPokemon.toolsId);
      const matchedPokemon = playerState.pokemon[matchedPokemonIndex] || null;

      // this is our starting point for the current clientPokemon
      const basePokemon = matchedPokemon || sanitizePokemon(
        clientPokemon,
        this.battleState.format,
      );

      // in case the volatiles aren't sanitized yet lol
      if ('transform' in basePokemon.volatiles && typeof basePokemon.volatiles.transform[1] !== 'string') {
        basePokemon.volatiles = sanitizeVolatiles(basePokemon);
      }

      // and then from here on out, we just directly modify syncedPokemon (serverPokemon and dex are optional, which will add additional known properties)
      const syncedPokemon = syncPokemon(basePokemon, {
        format: this.battleState.format,
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
              '\nbattleState:', this.battleState,
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
        if (playerState.pokemon.length >= playerState.maxPokemon) {
          console.warn(
            '[Gen 3 OU Tools] Skipping Pokemon sync because the player already has the maximum number of Pokemon.',
            '\npokemon:', syncedPokemon.ident || syncedPokemon.speciesForme,
            '\nindex:', index,
            '\nplayer:', playerKey,
            '\npokemon.length:', playerState.pokemon.length,
            '\nmaxPokemon:', playerState.maxPokemon,
            '\nsyncedPokemon.toolsId:', syncedPokemon.toolsId,
            '\nsyncedPokemon:', syncedPokemon,
            '\nclientPokemon.toolsId:', clientPokemon.toolsId,
            '\nclientPokemon:', clientPokemon,
            '\nserverPokemon.toolsId:', serverPokemon?.toolsId,
            '\nserverPokemon:', serverPokemon,
            '\npokemon (battle):', player.pokemon,
            '\nbattleState.pokemon:', playerState.pokemon,
            '\nbattleId:', battleId,
            '\nbattle:', battle,
            '\nbattleState:', this.battleState,
          );

          continue;
        }

        const size = playerState.pokemon.push(syncedPokemon);

        console.debug(
          '[Gen 3 OU Tools] Added Pokemon.',
          '\npokemon:', syncedPokemon.ident || syncedPokemon.speciesForme,
          '\nindex:', size - 1,
          '\nplayer:', playerKey,
          '\npokemon.length:', playerState.pokemon.length,
          '\nmaxPokemon:', playerState.maxPokemon,
          '\nsyncedPokemon.toolsId:', syncedPokemon.toolsId,
          '\nsyncedPokemon:', syncedPokemon,
          '\nclientPokemon.toolsId:', clientPokemon.toolsId,
          '\nclientPokemon:', clientPokemon,
          '\nserverPokemon.toolsId:', serverPokemon?.toolsId,
          '\nserverPokemon:', serverPokemon,
          '\npokemon (battle):', player.pokemon,
          '\nbattleState.pokemon:', playerState.pokemon,
          '\nbattleId:', battleId,
          '\nbattle:', battle,
          '\nbattleState:', this.battleState,
        );
      } else {
        playerState.pokemon[matchedPokemonIndex] = syncedPokemon;

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
          '\nbattleState.pokemon:', playerState.pokemon,
          '\nbattleId:', battleId,
          '\nbattle:', battle,
          '\nbattleState:', this.battleState,
        );
      }
    }

    // 
    playerState.activeIndices = (player.active || []).map((activePokemon) => {

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
        activeIndex = playerState.pokemon.findIndex((pokemon) => pokemon.toolsId === activeId);
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
          '\nbattle player', player,
          '\nstate player', '(state)', playerState.pokemon,
          '\norder"', playerState.pokemonOrder,
          '\nbattleId:', battleId,
          '\nbattle:', battle,
          '\nbattleState', this.battleState,
        );
      }

      return null;
    }).filter((number) => typeof number === 'number' && number > -1);

    // repopulate the active property of each pokemon now that we have the actual indices
    playerState.pokemon.forEach((pokemon, index) => {
      pokemon.active = playerState.activeIndices.includes(index);
    });

    // EDITINGNOTE: here we encounter the user's active selection for pokemon... we will need to decide whether to keep this logic here or move it elsewhere

    // sync player side
    if (playerState.active) {
      // sync the sideConditions from the battle (this is first so that it'll be available in sanitizePlayerSide(), just in case)
      playerState.side.conditions = clonePlayerSideConditions(player.sideConditions);

      playerState.side = {
        conditions: playerState.side.conditions,
        ...sanitizePlayerSide(playerState, battle[playerKey]),
      };
    }
  }

  // I've gotten rid of the part that handles autoboostmap here

  // this is important, otherwise we can't ignore re-renders of the same battle state (which may result in reaching React's maximum update depth)
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