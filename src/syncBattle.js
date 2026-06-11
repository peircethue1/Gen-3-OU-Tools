/**
 * 
 * EDITINGNOTE: Make sure battleState and toolsState are applied correctly
 * EDITINGNOTE: I don't want to support replays, so do I want to stop syncing when !this.toolsState.active? Should I detect if the authPlayer is in the battle?
 * EDITINGNOTE: I only want to support gen 3 ou, so how do I stop my tool from running in other contexts?
 * EDITINGNOTE: Make initialized and synced variables consistent, and check what variables I actually need throughout
 */


import { v5 as uuidv5, NIL as uuidnil, v4 as uuidv4 } from 'uuid';
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

  // EDITINGNOTE: this originally had detectPlayerKeyFromBattle(battle);, why do we get rid of, because we're not supporting replays?
  const detectedPlayerKey = this.battleState.authPlayerKey;
  
  if (detectedPlayerKey) {
    this.toolsState.playerKey = detectedPlayerKey;
    this.toolsState.opponentKey = this.battleState.playerKey === 'p1' ? 'p2' : 'p1';
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
  const WEATHER_MAP = {
    raindance: 'Rain',
    sandstorm: 'Sand',
    sunnyday: 'Sun',
    hail: 'Hail',
  };

  // 
  const sanitizeField = () => {
    const { weather } = battle || {};

    const sanitizedField = {
      weather: WEATHER_MAP[weather] || null,
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

  // 
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
      console.warn('[Gen 3 OU Tools] The global Dex is not available for this format:', format);

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
  const sanitizeVolatiles = (pokemon) =>
    Object.entries(pokemon?.volatiles || {}).reduce((volatiles, [id, volatile]) => {
      const [, value, ...rest] = volatile || [];

      const transformed = formatId(id) === 'transform' && typeof value?.speciesForme === 'string';

      if (transformed || !value || ['string', 'number'].includes(typeof value)) {
        volatiles[id] = transformed ? [
          id,
          value.speciesForme,
          ...rest,
        ] : volatile;
      }

      return volatiles;
    }, {});

  // 
  const detectSpeciesForme = (pokemon) => pokemon?.speciesForme || 
    pokemon?.details?.split?.(', ')[0] || 
    pokemon?.searchid?.split?.('|')[1] || 
    pokemon?.ident?.split?.(': ')[1];

  // 
  const populateStatsTable = (stats, config) => {
    const { spread } = config || {};

    const output = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'].reduce((prev, stat) => {
      prev[stat] = null;

      return prev;
    }, {});

    if (!nonEmptyObject(stats)) {
      return output;
    }

    const max = spread === 'ev' ? 252 : 31;

    Object.entries(stats).forEach(([
      stat,
      rawValue,
    ]) => {
      const value = typeof rawValue === 'number' ? rawValue : Number(rawValue);

      if (Number.isNaN(value)) {
        return;
      }

      output[stat] = Math.max(Math.min(value, max ?? value), 0);
    });

    return output;
  };

  // 
  const getDexMoveTrack = (dex, moveTrack, transformed) => 
    moveTrack?.filter((track) => (
      Array.isArray(track) && typeof track[0] === 'string' && !!track[0] && (transformed ? track[0].startsWith('*') : !track[0].startsWith('*'))
    ))
    .map(([moveName, ppUsed]) => [
      dex.moves.get(moveName?.replace('*', '')),
      ppUsed || 0,
    ])
    .filter(([move]) => move?.exists && !!move.name);

  // 
  const sanitizeMoveTrack = (pokemon, format) => {
    const dex = getDexForFormat(format);

    const output = {
      moveTrack: [],
      revealedMoves: [],
      transformedMoves: [],
    };

    if (!dex || !pokemon?.moveTrack?.length) {
      return output;
    }

    const { moveTrack } = pokemon;
    const dexMoveTrack = getDexMoveTrack(dex, moveTrack, false);
    const dexTransformedMoveTrack = getDexMoveTrack(dex, moveTrack, true);

    if (!dexMoveTrack.length && !dexTransformedMoveTrack.length) {
      return output;
    }

    output.moveTrack = dexMoveTrack.map(([move, ppUsed]) => [
      move.name,
      ppUsed,
    ]);

    output.transformedMoves = dexTransformedMoveTrack
      .map(([move]) => move.name);

    output.revealedMoves = dexMoveTrack
      .map(([move]) => move.name);

    return output;
  };

  // 
  const sanitizePokemon = (pokemon, format) => {
    const dex = getDexForFormat(format);
    const gen = detectGenFromFormat(format);

    const typeChanged = !!pokemon?.volatiles?.typechange?.[1];
    const transformed = !!pokemon?.volatiles?.transform?.[1];

    const sanitizedPokemon = {
      toolsId: pokemon?.toolsId || null,
      source: pokemon?.source || null,
      playerKey: pokemon?.playerKey || detectPlayerKeyFromPokemon(pokemon),

      slot: pokemon?.slot ?? null,
      ident: detectPokemonIdent(pokemon),
      name: pokemon?.name || null,
      details: pokemon?.details || null,
      searchid: pokemon?.searchid || null,
      active: pokemon?.active || false,

      speciesForme: detectSpeciesForme(pokemon)?.replace('-*', '') || null,
      transformedForme: (
        transformed
          ? typeof pokemon.volatiles.transform[1] === 'object'
            ? pokemon.volatiles.transform[1]?.speciesForme
            : pokemon.volatiles.transform[1]
          : null
      ) || null,

      level: pokemon?.level || 0,
      transformedLevel: pokemon?.transformedLevel || null,
      gender: pokemon?.gender || 'N',
      shiny: pokemon?.shiny || false,

      types: (
        typeChanged
          ? pokemon.volatiles.typechange[1].split('/')
          : pokemon?.types
      ) || [],

      hp: pokemon?.hp ?? 100,
      maxhp: pokemon?.maxhp || 100,
      fainted: !pokemon?.hp,

      baseAbility: pokemon?.baseAbility?.replace(/no\s?ability/i, ''),
      ability: pokemon?.ability || null,
      abilityToggled: pokemon?.abilityToggled || false,
      abilities: pokemon?.abilities || [],
      transformedAbilities: pokemon?.transformedAbilities || [],

      item: (!!pokemon?.item && dex.items.get(pokemon.item.replace('(exists)', ''))?.name) || null,

      itemEffect: pokemon?.itemEffect || null,
      prevItem: pokemon?.prevItem || null,
      prevItemEffect: pokemon?.prevItemEffect || null,

      nature: pokemon?.nature || null,
      ivs: populateStatsTable(pokemon?.ivs, { spread: 'iv', format }),
      evs: populateStatsTable(pokemon?.evs, { spread: 'ev', format }),

      boosts: ['atk', 'def', 'spa', 'spd', 'spe'].reduce((table, stat) => {
        const boosts = pokemon?.boosts;

        const raw = boosts?.[stat] ?? 0;

        table[stat] = Math.max(Math.min(raw, 6), -6);

        return table;
      }, {}),

      // I've gotten rid of Autoboostmap here
      transformedBaseStats: pokemon?.transformedBaseStats || null,
      serverStats: pokemon?.serverStats || null,

      status: (!!pokemon?.hp && pokemon?.status) || null,
      turnstatuses: Object.entries(pokemon?.turnstatuses || {}).reduce((
        prev, 
        [effectId, effectState],
      ) => ({
        ...prev,
        ...(Array.isArray(effectState) && { [effectId]: [...effectState] }),
      }), {}),

      chainMove: pokemon?.chainMove || null,
      chainCounter: pokemon?.chainCounter || 0,

      sleepCounter: pokemon?.sleepCounter || pokemon?.statusData?.sleepTurns || 0,

      toxicCounter: pokemon?.toxicCounter || pokemon?.statusData?.toxicTurns || 0,

      hitCounter: pokemon?.hitCounter || pokemon?.timesAttacked || 0,

      faintCounter: pokemon?.faintCounter || 0,

      criticalHit: pokemon?.criticalHit || false,

      lastMove: pokemon?.lastMove || null,
      moves: [...(pokemon?.moves || [])],
      serverMoves: pokemon?.serverMoves || [],
      transformedMoves: pokemon?.transformedMoves || [],

      ...sanitizeMoveTrack(pokemon, format),

      volatiles: sanitizeVolatiles(pokemon),
    };

    const species = dex.species.get(sanitizedPokemon.speciesForme);

    sanitizedPokemon.baseStats = { ...species?.baseStats };

    const transformedSpecies = sanitizedPokemon.transformedForme ? dex.species.get(sanitizedPokemon.transformedForme) : null;

    if (nonEmptyObject(transformedSpecies?.baseStats)) {
      sanitizedPokemon.transformedBaseStats = { ...transformedSpecies.baseStats };

      if ('hp' in sanitizedPokemon.transformedBaseStats) {
        delete (sanitizedPokemon.transformedBaseStats).hp;
      }
    }

    const speciesTypes = (transformedSpecies || species)?.types;

    if (!typeChanged && speciesTypes?.length) {
      sanitizedPokemon.types = [...speciesTypes];
    }

    sanitizedPokemon.abilities = [...Object.values(species?.abilities || {})].filter((ability) => !!ability && formatId(ability) !== 'noability');

    sanitizedPokemon.transformedAbilities = [...Object.values(transformedSpecies?.abilities || {})].filter((ability) => !!ability && formatId(ability) !== 'noability');

    const abilitiesSource = sanitizedPokemon.transformedAbilities.length ? sanitizedPokemon.transformedAbilities : sanitizedPokemon.abilities;

    if (!sanitizedPokemon?.toolsId) {
      sanitizedPokemon.toolsId = calcPokemonToolsId(sanitizedPokemon);
    }

    return sanitizedPokemon;
  };

  // 
  const clonePokemon = (pokemon) => {
    const output = { ...pokemon };

    if (Array.isArray(output.types)) {
      output.types = [...output.types];
    }

    if (Array.isArray(output.abilities)) {
      output.abilities = [...output.abilities];
    }

    if (Array.isArray(output.transformedAbilities)) {
      output.transformedAbilities = [...output.transformedAbilities];
    }

    if (nonEmptyObject(output.ivs)) {
      output.ivs = { ...output.ivs };
    }

    if (nonEmptyObject(output.evs)) {
      output.evs = { ...output.evs };
    }

    if (Array.isArray(output.moves)) {
      output.moves = [...output.moves];
    }

    if (Array.isArray(output.serverMoves)) {
      output.serverMoves = [...output.serverMoves];
    }

    if (Array.isArray(output.transformedMoves)) {
      output.transformedMoves = [...output.transformedMoves];
    }

    if (Array.isArray(output.moveTrack)) {
      output.moveTrack = output.moveTrack.map((track) => [...track]);
    }

    if (Array.isArray(output.revealedMoves)) {
      output.revealedMoves = [...output.revealedMoves];
    }

    if (nonEmptyObject(output.boosts)) {
      output.boosts = { ...output.boosts };
    }

    if (nonEmptyObject(output.baseStats)) {
      output.baseStats = { ...output.baseStats };
    }

    if (nonEmptyObject(output.transformedBaseStats)) {
      output.transformedBaseStats = { ...output.transformedBaseStats };
    }

    if (nonEmptyObject(output.serverStats)) {
      output.serverStats = { ...output.serverStats };
    }

    if (nonEmptyObject(output.spreadStats)) {
      output.spreadStats = { ...output.spreadStats };
    }

    return output;
  };

  // 
  const similarArrays = (...args) => {
    if (args.length < 2) {
      return false;
    }

    const diff = diffArrays(...args);

    if (!Array.isArray(diff)) {
      return false;
    }

    return !diff.length;
  };

  // 
  const tr = (num, bits = 0) => (
    bits ? (num >>> 0) % (2 ** bits) : (num >>> 0)
  );

  // 
  const Pokemon_Nature_Boosts = {
    Adamant: ['atk', 'spa'],
    Bashful: [],
    Bold: ['def', 'atk'],
    Brave: ['atk', 'spe'],
    Calm: ['spd', 'atk'],
    Careful: ['spd', 'spa'],
    Docile: [],
    Gentle: ['spd', 'def'],
    Hardy: [],
    Hasty: ['spe', 'def'],
    Impish: ['def', 'spa'],
    Jolly: ['spe', 'spa'],
    Lax: ['def', 'spd'],
    Lonely: ['atk', 'def'],
    Mild: ['spa', 'def'],
    Modest: ['spa', 'atk'],
    Naive: ['spe', 'spd'],
    Naughty: ['atk', 'spd'],
    Quiet: ['spa', 'spe'],
    Quirky: [],
    Rash: ['spa', 'spd'],
    Relaxed: ['def', 'spe'],
    Sassy: ['spd', 'spe'],
    Serious: [],
    Timid: ['spe', 'atk'],
  };

  //
  const calcPokemonStat = (format, stat, base, iv, ev, level, nature) => {
    const gen = typeof format === 'string' ? detectGenFromFormat(format) : format;

    const actualIv = Math.max(iv, 0);
    const actualEv = Math.max(ev, 0);
    const actualLevel = Math.max(Math.min(level, 100), 0);

    if (stat === 'hp') {
      if (base === 1) {
        return base;
      }

      return tr(((2 * base + actualIv + tr(actualEv / 4)) * actualLevel) / 100) + actualLevel + 10;
    }

    const value = tr(((2 * base + actualIv + tr(actualEv / 4)) * actualLevel) / 100) + 5;

    if (nature && nature in Pokemon_Nature_Boosts) {
      const [
        plus,
        minus,
      ] = Pokemon_Nature_Boosts[nature];

      if (plus && stat === plus) {
        return tr(tr(value * 110, 16) / 100);
      }

      if (minus && stat === minus) {
        return tr(tr(value * 90, 16) / 100);
      }
    }

    return value;
  };

  //
  const calcPokemonSpreadStats = (format, pokemon) => {
    if (!nonEmptyObject(pokemon?.baseStats)) {
      return { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    }

    return ['hp', 'atk', 'def', 'spa', 'spd', 'spe'].reduce((prev, stat) => {
      const baseStat = (pokemon.transformedForme && stat !== 'hp' ? pokemon.transformedBaseStats : pokemon.baseStats)?.[stat];

      prev[stat] = calcPokemonStat(
        format,
        stat,
        baseStat,
        pokemon.ivs?.[stat],
        pokemon.evs?.[stat],
        (stat !== 'hp' && pokemon.transformedLevel) || (pokemon.level ?? 100),
        pokemon.nature,
      );

      return prev;
    }, { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
  };

  // 
  const syncPokemon = (pokemon, config) => {
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
    syncedPokemon.spreadStats = calcPokemonSpreadStats(format, syncedPokemon);

    return syncedPokemon;
  };

  // 
  const clonePlayerSideConditions = (conditions) => {
    Object.entries(conditions || {}).reduce((prev, [key, value]) => {
      prev[key] = Array.isArray(value) ? [...value] : value;
      return prev;
    }, {});
  }

  // 
  const sanitizePlayerSide = (player, battleSide) => {
    const {
      selectionIndex,
      pokemon: playerPokemon,
      side,
    } = player || {};

    const currentPokemon = playerPokemon?.length && selectionIndex > -1 ? playerPokemon[selectionIndex] : null;

    const sideConditions = battleSide?.sideConditions || side?.conditions || {};

    // Creates an array of sanitized side conditions
    const sideConditionNames = Object.keys(sideConditions)
      .map((condition) => formatId(condition))
      .filter(Boolean);

    // Creates an array of sanitized volatiles
    const volatileNames = Object.keys(currentPokemon?.volatiles || {})
      .map((volatile) => formatId(volatile))
      .filter(Boolean);

    // Creates a state object
    return {
      spikes: (sideConditionNames.includes('spikes') && sideConditions.spikes?.[1]) || 0,
      isReflect: sideConditionNames.includes('reflect'),
      isLightScreen: sideConditionNames.includes('lightscreen'),
      isProtected: volatileNames.includes('protect'),
      isSeeded: volatileNames.includes('leechseed'),
      isForesight: volatileNames.includes('foresight'),
      isSwitching: currentPokemon?.active ? 'out' : 'in',
    };
  }

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

    // 
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
  this.syncPrediction();

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