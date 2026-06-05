/**
 * EDITINGNOTE: Build
 */

import { ToolsDomRenderer } from './ToolsRenderer.js';
import { v5 as uuidv5, NIL as uuidnil, v4 as uuidv4 } from 'uuid';

export function syncBattle(battle, request) {

  // 
  if (!this.toolsState || !battle) {
    return;
  }


























 // EDITINGNOTE: MAKE SURE TO SWAP OUT BATTLESTATE WITH TOOLSSTATE FOR ALL DEFINITIONS IN THIS CHUNK, CALCDEX WITH TOOLS
 // EDITINGNOTE: search terms: settings
 // EDITINGNOTE: check for import dependencies, check continues
 // EDITINGNOTE: I don't want to support replays, so do I just want to stop syncing when !this.toolsState.active? what about detecting the playerKey?

 // EDITINGNOTE: do i need each of these? check initialized and synced variables are consistent
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
        '[Gen 3 OU Tools] Skipping sync due to matching battleNonce for this battle:', battleId,
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
  if (this.toolsState.active && typeof ended === 'boolean' && ended) {
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

  // 
  const detectPokemonIdent = (pokemon) => [
    ('side' in (pokemon || {}) && pokemon.side?.sideid) || pokemon?.searchid?.split?.(':')[0] || pokemon?.ident?.split?.(':')[0],
    pokemon?.speciesForme || pokemon?.details?.split?.(', ')?.[0] || pokemon?.searchid?.split?.('|')[1] || pokemon?.ident?.split?.(': ')[1] || pokemon?.name,
  ].filter(Boolean).join(': ') || pokemon?.ident || pokemon?.searchid?.split?.('|')[0] || null;

  // 
  const detectPlayerKeyFromPokemon = (pokemon) => {
    if (pokemon?.playerKey) {
      return pokemon.playerKey;
    }

    const ident = detectPokemonIdent(pokemon);

    if (!ident) {
      return null;
    }

    return /^(p\d)[a-z]?:/.exec(ident)?.[1];
  };

  // 
  const getAuthUsername = () => (
    window.app.user?.attributes?.name || null
  );

  // 
  const detectAuthPlayerKeyFromBattle = () => {
    const detectedPlayerKey = detectPlayerKeyFromPokemon(battle?.myPokemon?.[0]);

    if (detectedPlayerKey) {
      return detectedPlayerKey;
    }

    const authName = getAuthUsername();

    if (!authName) {
      return null;
    }

    return battle?.sides?.find?.((side) => 'name' in (side || {}) && [
      side.id,
      side.name,
    ].filter(Boolean).includes(authName))?.sideid || null;
  };

  // update the authPlayerKey (if any)
  this.toolsState.authPlayerKey = detectAuthPlayerKeyFromBattle();

  // 
  const detectedPlayerKey = this.toolsState.authPlayerKey;
  
  if (detectedPlayerKey) {
    this.toolsState.playerKey = detectedPlayerKey;
    this.toolsState.opponentKey = this.toolsState.playerKey === 'p2' ? 'p1' : 'p2';
  }

  // update the sidesSwitched from the battle
  this.toolsState.switchPlayers = battle.viewpointSwitched ?? battle.sidesSwitched;

  // 
  const nonEmptyObject = (obj) => {
    if (typeof obj !== 'object') {
      return false;
    }

    if (Array.isArray(obj)) {
      return !!obj.length;
    }

    return !!Object.keys(obj || {}).length;
  };

  // 
  const cloneField = (field) => {
    const output = {
      ...field,
    };

    if ('attackerSide' in output) {
      delete output.attackerSide;
    }

    if ('defenderSide' in output) {
      delete output.defenderSide;
    }

    return output;
  };

  // 
  const formatId = (value) => value
    ?.toString?.()
    .normalize('NFD')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();

  // 
  const sanitizeField = () => {
    const {
      pseudoWeather,
      weather,
    } = battle || {};

    const pseudoWeatherMoveNames = pseudoWeather
      ?.map((weatherState) => formatId(weatherState?.[0]))
      .filter(Boolean)
      ?? [];

    const [pseudoWeatherName] = pseudoWeatherMoveNames;

    const sanitizedField = {
      weather: WeatherMap[weather] || null,
      terrain: PseudoWeatherMap[pseudoWeatherName] || null,
      attackerSide: null,
      defenderSide: null,
    };

    return sanitizedField;
  };

  // 
  const syncField = () => {
    if (!nonEmptyObject(this.battleState?.field) || !battle?.p1) {
      console.warn(
        '[Gen 3 OU Tools] The field or battle is invalid.',
        '\nbattleState.field:', this.battleState.field,
        '\nbattle:', battle,
      );

      return this.battleState?.field;
    }

    const newField = cloneField(this.battleState.field);
    const updatedField = sanitizeField();

    Object.keys(updatedField).forEach((key) => {
      if (['attackerSide', 'defenderSide'].includes(key)) {
        return;
      }

      const value = updatedField?.[key];
      const originalValue = this.battleState.field?.[key];

      if (JSON.stringify(value) === JSON.stringify(originalValue)) {
        return;
      }

      newField[key] = value;
    });

    newField.autoWeather = null;

    return newField;
  };

  // sync the field first cause we'll need the updated values for some calculations later
  const syncedField = syncField();

  if (!syncedField) {
      console.warn(
        '[Gen 3 OU Tools] Could not sync the field state for this battle:', battleId,
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
  const serializePayload = (payload) => Object.entries(payload || {})
    .map(([key, value]) => `${key}:${(typeof value === 'object' ? JSON.stringify(value) : String(value)) ?? '???'}`)
    .join('|');

  // 
  const calcToolsId = (payload) => {
    const serialized = nonEmptyObject(payload) ? serializePayload(payload) :
      ['string', 'number', 'boolean'].includes(typeof payload) ? String(payload) : null;

    if (!serialized) {
      return null;
    }

    return uuidv5(
      serialized?.replace(/[^A-Z0-9\x20~`!@#$%^&*()+\-_=\[\]{}<>\|:;,\.'"\/\\]/gi, ''),
      uuidnil,
    );
  };

  // EDITINGNOTE: I am betting that ident and speciesforme is enough for gen 3 ou
  const calcPokemonToolsId = (pokemon, playerKey) => calcToolsId({
    ident: [
      playerKey || pokemon?.playerKey || detectPlayerKeyFromPokemon(pokemon),
      uuidv4(),
    ].filter(Boolean).join(': '),

    speciesForme: pokemon?.speciesForme,
  });

  // 
  const detectGenFromFormat = (format, defaultGen = null) => {
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

  // 
  const getDexForFormat = (format) => {
    if (typeof Dex === 'undefined') {
      console.warn(
        '[Gen 3 OU Tools] The global Dex object is not available.',
        '\nformat:', format,
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

  // 
  const parsePokemonDetails = (details) => {
    if (!details) {
      return null;
    }

    const [speciesForme] = details.split(', ');

    if (!speciesForme) {
      return null;
    }

    return { speciesForme };
  };

  // 
  const similarPokemon = (pokemonA, pokemonB, config) => {
    if (!pokemonA?.details || !pokemonB?.details) {
      return false;
    }

    const { details: detailsA } = pokemonA;
    const { details: detailsB } = pokemonB;
    const { format } = config || {};

    const dex = getDexForFormat(format);

    const { speciesForme: speciesA } = parsePokemonDetails(detailsA);
    const dexA = dex.species.get(speciesA);
    const formeA = (dexA?.exists && dexA.baseSpecies) || null;

    if (!formeA) {
      return false;
    }

    const { speciesForme: speciesB } = parsePokemonDetails(detailsB);
    const dexB = dex.species.get(speciesB);
    const formeB = (dexB?.exists && dexB.baseSpecies) || null;

    if (!formeB) {
      return false;
    }

    return formeA === formeB;
  };

  // 
  const diffArrays = (arrayA, arrayB, serialize) => {
    if (!Array.isArray(arrayA) || !Array.isArray(arrayB)) {
      return null;
    }

    if (!arrayA.length && !arrayB.length) {
      return [];
    }

    if (arrayA.length && !arrayB.length) {
      return [...arrayA];
    }

    if (!arrayA.length && arrayB.length) {
      return [...arrayB];
    }

    const parse = (value) => (
      serialize ? JSON.stringify(value) : value
    );

    const parsedA = serialize ? arrayA.map((value) => parse(value)) : arrayA;
    const parsedB = serialize ? arrayB.map((value) => parse(value)) : arrayB;

    const diffIndexFilter = (source, target) => (sourceIndex) => !(serialize ? target.includes(source[sourceIndex]) : target.some((value) => value === source[sourceIndex]));

    const diffIndicesA = parsedA.map((_, index) => index).filter(diffIndexFilter(parsedA, parsedB));
    const diffIndicesB = parsedB.map((_, index) => index).filter(diffIndexFilter(parsedB, parsedA));

    return [
      ...diffIndicesA.map((index) => arrayA[index]),
      ...diffIndicesB.map((index) => arrayB[index]),
    ];
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
          '[Gen 3 OU Tools] Skipping Pokemon sync because no Pokemon were found for this player:', playerKey,
          ...(isMyPokemonSide ? ['\nmyPokemon:', myPokemon] : []),
          '\nbattle.pokemon:', player.pokemon,
          '\nbattleState.pokemon:', playerState.pokemon,
          '\nbattleId:', battleId,
          '\nbattle:', battle,
          '\nbattleState', battleState,
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
          '[Gen 3 OU Tools] Assigned toolsId for this player:', playerKey,
          '\nspeciesForme:', pokemon.speciesForme,
          '\nisMyPokemonSide:', isMyPokemonSide,
          '\nhasMyPokemon:', hasMyPokemon,
          '\nsourced:', clientSourced ? 'client' : 'server',
          '\ntoolsId:', pokemon.toolsId,
          '\npokemon:', pokemon,
          '\nbattleId:', battleId,
          '\nbattle:', battle,
          '\nbattleState:', battleState,
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
      '[Gen 3 OU Tools] Preparing to process Pokemon for this player:', playerKey,
      '\npokemon:', playerPokemon.length,
      '\nmaxPokemon:', maxPokemon,
      '\nisMyPokemonSide:', isMyPokemonSide,
      '\nhasMyPokemon:', hasMyPokemon,
      '\npokemonOrder:', playerState.pokemonOrder,
      '\npokemon (assembled):', playerPokemon,
      '\npokemon (battle):', player.pokemon,
      '\nbattleId:', battleId,
      '\nbattle:', battle,
      '\nbattleState', this.battleState,
    );

    // update each pokemon (note that the index `i` should be relatively consistent between turns) EDITINGNOTE: LEFT OFF HERE
    for (let index = 0; index < playerPokemon.length; index++) {

      // 
      const clientPokemon = playerPokemon[index];

      if (!clientPokemon?.toolsId) {
        console.debug(
          '[Gen 3 OU Tools] Skipping Pokemon without toolsId for this player:', playerKey,
          '\nindex:', index,
          '\npokemon:', clientPokemon?.ident || clientPokemon?.speciesForme,
          '\nclientPokemon.toolsId:', clientPokemon?.toolsId,
          '\nclientPokemon:', clientPokemon,
          '\norder:', playerState.pokemonOrder,
          '\npokemon (assembled):', playerPokemon,
          '\npokemon (battle):', player.pokemon,
          '\nbattleId:', battleId,
          '\nbattle:', battle,
          '\nbattleState', battleState,
        );

        continue;
      }

      // 
      const serverPokemon = (isMyPokemonSide && hasMyPokemon && myPokemon.find((pokemon) => pokemon.toolsId === clientPokemon.toolsId)) || null;

      const matchedPokemonIndex = playerState.pokemon.findIndex((pokemon) => pokemon.toolsId === clientPokemon.toolsId);
      const matchedPokemon = playerState.pokemon[matchedPokemonIndex] || null;

      // this is our starting point for the current clientPokemon editingnote: LEFT OFF HERE
      const basePokemon = matchedPokemon || sanitizePokemon(
        clientPokemon,
        battleState.format,
      );

      const settingsPlayerKey = battleState.authPlayerKey === playerKey && hasMyPokemon ? 'auth' : playerKey;

      if (!matchedPokemon) {
        basePokemon.autoPreset = settings?.defaultAutoPreset?.[settingsPlayerKey];
      }

      // in case the volatiles aren't sanitized yet lol
      if ('transform' in basePokemon.volatiles && typeof basePokemon.volatiles.transform[1] !== 'string') {
        basePokemon.volatiles = sanitizeVolatiles(basePokemon);
      }

      // and then from here on out, we just directly modify syncedPokemon
      // (serverPokemon and dex are optional, which will add additional known properties)
      // update (2023/10/13): syncPokemon() still handles server field populations like serverMoves[],
      // but the teambuilderPresets & serverStats guessing routines have been moved to useCalcdexPresets()
      const syncedPokemon = syncPokemon(basePokemon, {
        format: battleState.format,
        clientPokemon: clientPokemon,
        serverPokemon,
        weather: syncedField.weather,
        terrain: syncedField.terrain,
        autoMoves: (!isMyPokemonSide || !hasMyPokemon)
          // update (2023/02/03): defaultAutoMoves.auth is always false since we'd normally have myPokemon[],
          // but in cases of old replays, myPokemon[] won't be available, so we'd want to respect the user's setting
          // using the playerKey instead of 'auth'
          && settings?.defaultAutoMoves?.[settingsPlayerKey],
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

        const targetPlayerKey = (
          !!targetClientPokemon?.ident
            && detectPlayerKeyFromPokemon(targetClientPokemon)
        ) || null;

        const mutations = {
          calcdexId: targetClientPokemon.calcdexId, // may not exist
          ident: targetClientPokemon.ident, // using this as a fallback
        };

        // if the Pokemon is also server-sourced, we can apply some known info as revealed info of the target Pokemon
        if (syncedPokemon.source === 'server' && ['p1', 'p2'].includes(targetPlayerKey)) {
            console.debug(
              'Adding revealed info to', targetClientPokemon.ident || targetClientPokemon.speciesForme, 'of player', targetPlayerKey,
              'from transformed', syncedPokemon.ident || syncedPokemon.speciesForme, 'at index', index, 'of player', playerKey,
              '\n', 'target', targetClientPokemon.calcdexId, targetClientPokemon,
              '\n', 'synced', syncedPokemon.calcdexId, syncedPokemon,
              '\n', 'battle', battleId, battle,
              '\n', 'state', battleState,
            );

          if (syncedPokemon.ability) {
            mutations.ability = syncedPokemon.ability;
          }

          if (syncedPokemon.transformedMoves.length) {
            mutations.revealedMoves = [...syncedPokemon.transformedMoves];
          }
        }

        // if the target Pokemon has any presets[], copy them over to the transformed Pokemon
        // (this would typically only apply to 'sheet'/'import'-sourced presets)
        // (also note: this doesn't affect futureMutations at all, pretty much hijacking this if-statement,
        // which makes you a bad programmer for increasing the code's spaghetti... or a badass one for optimizing hehehe)
        const syncedPokemonPresetIds = syncedPokemon.presets.map((p) => p.calcdexId);
        const targetPokemonPresets = !!mutations.calcdexId
          && battleState[targetPlayerKey]?.pokemon?.find((p) => p.calcdexId === mutations.calcdexId)?.presets
            ?.filter((p) => !syncedPokemonPresetIds.includes(p.calcdexId));

        if (targetPokemonPresets?.length) {
          syncedPokemon.presets.push(...targetPokemonPresets);
        }

        // the `2` includes the initial calcdexId & ident properties earlier
        // (so if we only have 2 still, then we know there aren't any mutations to add to futureMutations)
        if (Object.keys(mutations).length > 2) {
          futureMutations[targetPlayerKey].push(mutations);
        }
      } // end syncedPokemon.transformedForme && ...

      // if the Pokemon isn't transformed, yeet any of its presets[] that don't belong to it
      // (possibly added from when it was transformed)
      const checkTransformedPresets = !!syncedPokemon.presets.length
        && !syncedPokemon.transformedForme
        && (
          syncedPokemon.ability === 'Imposter' || syncedPokemon.moves.includes('Transform')
        );

      if (checkTransformedPresets) {
        const validFormes = getPresetFormes(syncedPokemon.speciesForme, {
          format: battleState.format,
          source: 'server', // this is to get presets of all of the possible formes for the speciesForme
        });

        syncedPokemon.presets = syncedPokemon.presets.filter((p) => (
          validFormes.includes(p.speciesForme)
            && (!p.playerName || formatId(p.playerName) === formatId(playerState.name))
        ));
      }

      // apply any applicable futureMutations
      const pendingMutations = futureMutations[playerKey]?.filter((m) => (
        (!!m?.calcdexId && syncedPokemon.calcdexId === m.calcdexId)
          || (!!m?.ident && syncedPokemon.ident === m.ident)
      )).map(({
        // we're removing calcdexId & ident since we know they're for this Pokemon at this point
        calcdexId, // removed
        ident, // removed
        ...mutations
      }) => ({ ...mutations }));

      if (pendingMutations?.length) {
        pendingMutations.forEach((mutation) => Object.entries(mutation).forEach(([
          key,
          value,
        ]) => {
          syncedPokemon[key] = value;

          if (key === 'ability') {
            syncedPokemon.dirtyAbility = null;
          }

          if (key === 'revealedMoves') {
            syncedPokemon.moves = mergeRevealedMoves(syncedPokemon);
          }
        }));
      }

      // add the pokemon to the player's Calcdex state (if not maxed already)
      if (!matchedPokemon) {
        // first check if we got Zoroark'd (i.e., Illusion)
        // (this typically only applies for opponent Pokemon in Randoms, where the Pokemon are revealed as they're switched-in;
        // duplicate mimicked Pokemon don't exist for myPokemon and formats like OU, where the entire team is already revealed)
        // see: https://github.com/smogon/pokemon-showdown-client/blob/4e5002411cc80ff8044fd586bd0db2f80979b8f6/src/battle.ts#L747-L808
        if (playerState.pokemon.length >= playerState.maxPokemon || speciesClause) {
          const existingTable = {};
          let removalId = null;

          // note: purposefully ignoring level here
          // update (2023/10/18): doing so might be yeeting
          const syncedId = detectPokemonDetails(syncedPokemon, {
            format: battleState.format,
            normalizeForme: true,
          });

          for (let j = 0; j < player.pokemon.length; j++) {
            const pokemonA = player.pokemon[j];

            const idA = detectPokemonDetails(pokemonA, {
              format: battleState.format,
              normalizeForme: true,
              // ignoreLevel: true,
            });

            if (!idA || !(idA in existingTable)) {
              if (idA) {
                existingTable[idA] = j;
              }

              continue;
            }

            const indexB = existingTable[idA];
            const pokemonB = player.pokemon[indexB];

            const idB = detectPokemonDetails(pokemonB, {
              format: battleState.format,
              normalizeForme: true,
              // ignoreLevel: true,
            });

            if (!idB) {
              continue;
            }

            // check if we should remove pokemonB
            const targetB = syncedId === idA
              || player.active.includes(pokemonA)
              || (!pokemonA.hp && (pokemonB.hp || 0) > 0);

            removalId = targetB ? idB : idA;

            break;
          }

          // note: unlike in addPokemon() of Showdown.Side, we don't care about updating the Illusion Pokemon,
          // only removing it so that the real Pokemon can be tracked in the Calcdex
          const removalIndex = playerState.pokemon.findIndex((p) => detectPokemonDetails(p, {
            format: battleState.format,
            normalizeForme: true,
            ignoreLevel: true,
          }) === removalId);

          const removalPokemon = playerState.pokemon[removalIndex];

          if (removalPokemon?.speciesForme) {
            playerState.pokemon.splice(removalIndex, 1);

            if (__DEV__) {
              l.debug(
                'Removed Illusory', removalPokemon.ident || removalPokemon.speciesForme, 'from player', playerKey,
                '\n', 'length', '(prev)', playerState.pokemon.length + 1,
                '(now)', playerState.pokemon.length,
                '(max)', playerState.maxPokemon,
                '\n', 'removalIndex', removalIndex, 'removalId', removalId,
                '\n', 'removal', removalPokemon.calcdexId, removalPokemon,
                '\n', 'synced', syncedPokemon.calcdexId, syncedPokemon,
                '\n', 'client', clientPokemon.calcdexId, clientPokemon,
                '\n', 'server', serverPokemon?.calcdexId, serverPokemon,
                '\n', 'pokemon[]', '(battle)', player.pokemon,
                '\n', 'pokemon[]', '(state)', playerState.pokemon,
                '\n', 'battle', battleId, battle,
                '\n', 'state', battleState,
              );
            }
          }
        }

        if (playerState.pokemon.length >= playerState.maxPokemon) {
            console.warn(
              'Ignoring', syncedPokemon.ident || syncedPokemon.speciesForme, 'at index', index, 'for player', playerKey,
              'since they have the max number of Pokemon',
              '\n', 'length', '(now)', playerState.pokemon.length, '(max)', playerState.maxPokemon,
              '\n', 'synced', syncedPokemon.calcdexId, syncedPokemon,
              '\n', 'client', clientPokemon.calcdexId, clientPokemon,
              '\n', 'server', serverPokemon?.calcdexId, serverPokemon,
              '\n', 'pokemon[]', '(battle)', player.pokemon,
              '\n', 'pokemon[]', '(state)', playerState.pokemon,
              '\n', 'battle', battleId, battle,
              '\n', 'state', battleState,
            );
          }

          continue;
        }

        // note: this won't do anything if the Pokemon has no spreads available
        syncedPokemon.showPresetSpreads = settings?.showSpreadsFirst || false;

        // set the initial showGenetics value from the settings if this is server-sourced
        const geneticsKey = playerKey === battleState.authPlayerKey ? 'auth' : playerKey;
        const showBaseStats = settings?.showBaseStats === 'always'
          || (settings?.showBaseStats === 'meta' && !legalLockedFormat(battleState.format));

        // handles 3 cases:
        // (1) user selected all stats, so we should set this to true to initially show all rows, then allow them to be hidden
        // (2) user selected only some stats, so this becomes initially false so PokeStats can show the rows they've selected
        // (3) user selected no stats, so this becomes initially false, then allow them to all be shown
        // (note: hydrator may rehydrate an empty array as `false`, hence why we're checking if the value is an array first!)
        syncedPokemon.showGenetics = Array.isArray(settings?.lockGeneticsVisibility?.[geneticsKey]) && [
          showBaseStats && 'base',
          'iv',
          !detectLegacyGen(battleState.gen) && 'ev',
        ].filter(Boolean).every((
          k,
        ) => settings.lockGeneticsVisibility[geneticsKey].includes(k));

        const size = playerState.pokemon.push(syncedPokemon);

          console.debug(
            'Added', syncedPokemon.ident || syncedPokemon.speciesForme, 'to index', size - 1, 'for player', playerKey,
            '\n', 'length', '(now)', playerState.pokemon.length, '(max)', playerState.maxPokemon,
            '\n', 'synced', syncedPokemon.calcdexId, syncedPokemon,
            '\n', 'client', clientPokemon.calcdexId, clientPokemon,
            ...(clientIllusionPokemon?.calcdexId ? ['\n', 'illusion', clientIllusionPokemon.calcdexId, clientIllusionPokemon] : []),
            '\n', 'server', serverPokemon?.calcdexId, serverPokemon,
            '\n', 'pokemon[]', '(battle)', player.pokemon,
            '\n', 'pokemon[]', '(state)', playerState.pokemon,
            '\n', 'battle', battleId, battle,
            '\n', 'state', battleState,
          );
      } else {
        playerState.pokemon[matchedPokemonIndex] = syncedPokemon;

          console.debug(
            'Updated', syncedPokemon.ident || syncedPokemon.speciesForme, 'at index', matchedPokemonIndex, 'for player', playerKey,
            '\n', 'synced', syncedPokemon.calcdexId, syncedPokemon,
            '\n', 'client', clientPokemon.calcdexId, clientPokemon,
            ...(clientIllusionPokemon?.calcdexId ? ['\n', 'illusion', clientIllusionPokemon.calcdexId, clientIllusionPokemon] : []),
            '\n', 'server', serverPokemon?.calcdexId, serverPokemon,
            '\n', 'pokemon[]', '(battle)', player.pokemon,
            '\n', 'pokemon[]', '(state)', playerState.pokemon,
            '\n', 'battle', battleId, battle,
            '\n', 'state', battleState,
          );
      }
    }

    // keep track of which calcdexId's we've added so far (for myPokemon in Doubles)
    const processedIds = [];

    playerState.activeIndices = (player.active || []).map((activePokemon) => {
      // particularly in FFA, there may be a Pokemon belonging to another player in active[]
      if (!activePokemon?.details || detectPlayerKeyFromPokemon(activePokemon) !== playerKey) {
        return null;
      }

      // checking myPokemon first (if it's available) for Illusion/Zoroark
      let activeId = (
        isMyPokemonSide
          && hasMyPokemon
          // update (2023/07/26): had to update this logic for Supreme Overlord in Doubles;
          // without checking the calcdexId (& solely checking `p.active`), the resulting activeIndices
          // may only include the first active Pokemon in myPokemon[] for this specific case
          // (also, while active[] in Showdown.Side will set the Showdown.Pokemon to `null` if dead, e.g.,
          // [null, { speciesForme: 'Kingambit', ... }], the dead Showdown.ServerPokemon in myPokemon[]
          // will still be `active` !!)
          && myPokemon.find((p) => (
            p?.active
              && p.hp > 0
              && (
                (!p.calcdexId && !activePokemon.calcdexId)
                  // update (2023/10/09): you know who it is baby
                  || formatId(p.ability || p.baseAbility) === 'illusion'
                  || p.calcdexId === activePokemon.calcdexId
              )
              && !processedIds.includes(p?.calcdexId)
          ))?.calcdexId
      )
        || activePokemon?.calcdexId
        || player.pokemon.find((p) => p === activePokemon)?.calcdexId;

      // note: leave as `let` for those dank console logs
      let activeIndex = -1;

      if (activeId) {
        activeIndex = playerState.pokemon.findIndex((p) => p.calcdexId === activeId);
      }

      if (activeIndex > -1 && !processedIds.includes(activeId)) {
        processedIds.push(activeId);

        return activeIndex;
      }

      if (activePokemon) {
        console.warn(
          ...(activeId && processedIds.includes(activeId) ? [
            'Attempted to add existing activeId', activeId, 'for player', playerKey,
            '\n', 'processedIds', processedIds,
          ] : [
            'Could not find activeIndex with activeId', activeId, 'for player', playerKey,
          ]),
          '\n', 'active', '(client)', activePokemon,
          '\n', 'player', '(battle)', player,
          '\n', 'player', '(state)', playerState.pokemon,
          '\n', 'order[]', playerState.pokemonOrder,
          '\n', 'battle', battleId, battle,
          '\n', 'state', battleState,
        );
      }

      return null;
    }).filter((n) => typeof n === 'number' && n > -1);

    // repopulate the active property of each pokemon now that we have the actual indices
    playerState.pokemon.forEach((pokemon, i) => {
      pokemon.active = playerState.activeIndices.includes(i);
    });

    if (playerState.activeIndices.length) {
      // surprisingly encountered a race-condition with player.faintCounter not being the most up-to-date value,
      // so we'll just count it ourselves LOL
      const faintCounter = playerState.pokemon.filter((p) => !p.hp).length;

      // update the faintCounter from the player side if not active on the field & not fainted
      // OR the Pokemon's current faintCounter is 0 when the battle is inactive (probably from a page reload)
      if (faintCounter > 0) {
        const pendingPokemon = playerState.pokemon.filter((p) => (
          // note: Pokemon can have a `/^fallen\d$/` volatile (e.g., `'fallen1'`), which is the server reporting
          // the actual faintCounter essentially, so if present, we'll assume syncPokemon() has already applied it
          !Object.keys(p.volatiles || {}).some((k) => k?.startsWith('fallen'))
        ) && (
          // update (2023/10/07): apparently the "only-update-the-faintCounter-when-switched-out" mechanic only
          // applies to Supreme Overlord, so everything else (like Last Respects on Houndstone) should always sync
          // (as long as the Pokemon isn't dedge, of course) ... LOL ty gam frek
          (((p.dirtyAbility || p.ability) !== 'Supreme Overlord' as AbilityName || !p.active) && p.hp > 0)
            || (!battleState.active && !p.faintCounter)
        ));

        pendingPokemon.forEach((pokemon) => {
          // if the current `pokemon` is dedge & its faintCounter is 0, remove 1 to not include itself
          const reloadOffset = !pokemon.hp && !pokemon.faintCounter ? 1 : 0;

          pokemon.faintCounter = clamp(0, faintCounter - reloadOffset, maxPokemon);

          // auto-clear the dirtyFaintCounter if the user previously set one
          if (typeof pokemon.dirtyFaintCounter === 'number') {
            pokemon.dirtyFaintCounter = null;
          }
        });
      }

      if (playerState.autoSelect) {
        if (!playerState.activeIndices.includes(playerState.selectionIndex)) {
          // update (2023/01/30): only update the selectionIndex if it's not one of the activeIndices
          [playerState.selectionIndex] = playerState.activeIndices;
        }
      }
    }

    // update abilityToggled for all of the player's pokemon now that they're all synced up
    if (!battleState.legacy) {
      playerState.pokemon.forEach((p, i) => {
        // pretty much used for Stakeout ya lol
        const opponentState = battleState[battleState.opponentKey];
        const opponentIndex = opponentState?.selectionIndex;
        const opponentPokemon = opponentState?.pokemon?.[opponentIndex];

        /**
         * @todo there's an edge case where if you're p1 w/ a Stakeout Pokemon, since you sync first, the active state
         * of p2 isn't available yet, so Stakeout could potentially remain active, but I reeaaallly don't feel like
         * addressing that atm :o (Stakeout was a lot more work an initially anticipated lol)
         */
        p.abilityToggled = detectToggledAbility(p, {
          format: battleState.format,
          gameType: battleState.gameType,
          pokemonIndex: i,
          opponentPokemon,
          selectionIndex: playerState.selectionIndex,
          activeIndices: playerState.activeIndices,
          weather: battleState.field.weather,
          terrain: battleState.field.terrain,
        });
      });
    }

    // sync player side
    if (playerState.active) {
      // sync the sideConditions from the battle
      // (this is first so that it'll be available in sanitizePlayerSide(), just in case)
      // update (2023/07/18): structuredClone() is slow af, so removing it from the codebase
      // playerState.side.conditions = structuredClone(player.sideConditions || {});
      playerState.side.conditions = clonePlayerSideConditions(player.sideConditions);

      playerState.side = {
        conditions: playerState.side.conditions,
        ...sanitizePlayerSide(
          battleState.gen,
          playerState,
          battle[playerKey],
        ),
      };
    }
  }

  // now that all players were processed, recount the number of players
  // (typically required for FFA, when players 3 & 4 need to be invited, so the playerCount never updates)
  battleState.playerCount = countActivePlayers(battleState);

  // also now is the perfect time to populate each Pokemon's autoBoostMap of each player
  AllPlayerKeys.forEach((playerKey) => {
    if (!battleState[playerKey]?.pokemon?.length) {
      return;
    }

    battleState[playerKey].pokemon.forEach((pokemon) => {
      pokemon.autoBoostMap = mapAutoBoosts(pokemon, battle.stepQueue, {
        format: battleState.format,
        players: battleState,
        field: battleState.field,
      });
    });
  });

  // this is important, otherwise we can't ignore re-renders of the same battle state
  // (which may result in reaching React's maximum update depth)
  if (battleNonce) {
    battleState.battleNonce = battleNonce;
  }






























  // Retrieve the HTML room container tied to this battle
  const toolsElement = battle.toolsHtmlRoom?.el;

  if (!toolsElement) {
    console.warn('[Gen 3 OU Tools] syncBattle completed, but the room element was not found for this battle:', battle.id);
    
    return;
  }

  console.debug('[Gen 3 OU Tools] syncBattle completed successfully. Rendering the panel.');
  
  // Directly execute the DOM renderer update hook
  this.renderTools(toolsElement);
}