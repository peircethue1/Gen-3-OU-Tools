// EDITINGNOTE: Full review

import { v5 as uuidv5, NIL as uuidnil, v4 as uuidv4 } from 'uuid';

// Creates a valid generation number
export const detectGenFromFormat = (format) => {
  if (typeof format === 'number') {
    return Math.max(format, 0);
  }

  const genFormatRegex = /^gen(10|\d)/i;

  if (!genFormatRegex.test(format)) {
    return null;
  }

  const gen = parseInt(format.match(genFormatRegex)[1], 10) || 0;

  if (gen < 1) {
    return null;
  }

  return gen;
};

// Creates a clone of the side conditions
export const clonePlayerSideConditions = (conditions) =>
  Object.entries(conditions || {}).reduce((prev, [key, value]) => {
    prev[key] = Array.isArray(value) ? [...value] : value;

    return prev;
  }, {});

// Creates an clean ID
export const formatId = (value) =>
  value?.toString?.().normalize('NFD').replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

// Creates a standardized object for the current battle state
export const sanitizePlayerSide = (player, battleSide) => {
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
};

// 
export const nonEmptyObject = (object) => {
  if (typeof object !== 'object') {
    return false;
  }

  if (Array.isArray(object)) {
    return !!obj.length;
  }

  return !!Object.keys(object || {}).length;
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
export const sanitizeVolatiles = (pokemon) =>
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
const calcPokemonToolsNonce = (pokemon) => calcToolsId({
  ident: pokemon?.ident,
  name: pokemon?.name,
  speciesForme: pokemon?.speciesForme,
  hp: pokemon?.hp?.toString(),
  maxhp: pokemon?.maxhp?.toString(),
  level: pokemon?.level?.toString(),
  gender: pokemon?.gender,
  ability: pokemon?.ability,
  baseAbility: pokemon?.baseAbility,
  nature: (!!pokemon?.speciesForme && 'nature' in pokemon && pokemon.nature) || null,
  types: (!!pokemon?.speciesForme && 'types' in pokemon && pokemon.types?.join('|')) || null,
  item: pokemon?.item,
  itemEffect: pokemon?.itemEffect,
  prevItem: pokemon?.prevItem,
  prevItemEffect: pokemon?.prevItemEffect,
  ivs: (!!pokemon?.speciesForme && 'ivs' in pokemon && calcToolsId(pokemon.ivs)) || null,
  evs: (!!pokemon?.speciesForme && 'evs' in pokemon && calcToolsId(pokemon.evs)) || null,
  status: pokemon?.status,
  statusData: calcToolsId(pokemon?.statusData),
  statusStage: pokemon?.statusStage?.toString(),
  volatiles: calcToolsId(sanitizeVolatiles(pokemon)),
  turnstatuses: calcToolsId(pokemon?.turnstatuses),
  sleepCounter: (!!pokemon?.speciesForme && 'sleepCounter' in pokemon && pokemon.sleepCounter?.toString())
    || (nonEmptyObject(pokemon?.statusData) && pokemon.statusData.sleepTurns?.toString())
    || null,
  toxicCounter: (!!pokemon?.speciesForme && 'toxicCounter' in pokemon && pokemon.toxicCounter?.toString())
    || (nonEmptyObject(pokemon?.statusData) && pokemon.statusData.toxicTurns?.toString())
    || null,
  hitCounter: (!!pokemon?.speciesForme && 'hitCounter' in pokemon && pokemon.hitCounter?.toString())
    || (!!pokemon?.speciesForme && 'timesAttacked' in pokemon && pokemon.timesAttacked?.toString())
    || null,
  faintCounter: (!!pokemon?.speciesForme && 'faintCounter' in pokemon && pokemon.faintCounter?.toString()) || null,
  moves: pokemon?.moves?.join(';'),
  moveTrack: calcToolsId((pokemon?.moveTrack)?.map((track) => track?.join(':'))?.join(';')),
  revealedMoves: (!!pokemon?.speciesForme && 'revealedMoves' in pokemon && calcToolsId(pokemon.revealedMoves)) || null,
  boosts: calcToolsId(pokemon?.boosts),
  baseStats: (!!pokemon?.speciesForme && 'baseStats' in pokemon && calcToolsId(pokemon.baseStats)) || null,
  spreadStats: (!!pokemon?.speciesForme && 'spreadStats' in pokemon && calcToolsId(pokemon.spreadStats)) || null,
  criticalHit: (!!pokemon?.speciesForme && 'criticalHit' in pokemon && pokemon.criticalHit?.toString()) || null,
});

// 
const calcSideToolsNonce = (side) => calcToolsId({
  id: side?.id,
  sideid: side?.sideid,
  name: side?.name,
  rating: side?.rating,
  totalPokemon: side?.totalPokemon?.toString(),
  active: side?.active?.map((mon) => calcPokemonToolsNonce(mon)).join(';'),
  pokemon: side?.pokemon?.map((mon) => calcPokemonToolsNonce(mon)).join(';'),
  sideConditions: Object.keys(side?.sideConditions || {}).join(';'),
});

// Creates a string that represents a unique battle state
export const calcBattleToolsNonce = (battle, request, battleState) => {
  const stepQueue = battle?.stepQueue?.filter?.((step) => !!step && !/^\|(?:inactive|-message|c(?!.+\|\/raw)|j|l|player)/i.test(step)) || [];

  return calcToolsId({
    id: battle?.id,
    gen: battle?.gen?.toString(),
    tier: battle?.tier,
    gameType: battle?.gameType,
    paused: String(!!battle?.paused),
    ended: String(!!battle?.ended),
    myPokemon: battle?.myPokemon?.length ? calcToolsId(
      battle.myPokemon.map((pokemon) => calcPokemonToolsNonce(pokemon)).join(';') || 'empty',
    ) : null,
    mySide: calcSideToolsNonce(battle?.mySide),
    nearSide: calcSideToolsNonce(battle?.nearSide),
    p1: calcSideToolsNonce(battle?.p1),
    p2: calcSideToolsNonce(battle?.p2),
    stepQueue: calcToolsId(stepQueue.join(';')),
    rqid: request?.rqid?.toString(),
    requestType: request?.requestType,
    side: request?.side?.id,
    smogonChaos: !!battleState?.smogonChaos,
    smogonLeads: !!battleState?.smogonLeads,
  });
};

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
export const similarPokemon = (pokemonA, pokemonB, config) => {
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
const detectPokemonIdent = (pokemon) => [
  ('side' in (pokemon || {}) && pokemon.side?.sideid) || pokemon?.searchid?.split?.(':')[0] || pokemon?.ident?.split?.(':')[0],
  pokemon?.speciesForme || pokemon?.details?.split?.(', ')?.[0] || pokemon?.searchid?.split?.('|')[1] || pokemon?.ident?.split?.(': ')[1] || pokemon?.name,
].filter(Boolean).join(': ') || pokemon?.ident || pokemon?.searchid?.split?.('|')[0] || null;

// 
export const detectPlayerKeyFromPokemon = (pokemon) => {
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
export const detectAuthPlayerKeyFromBattle = (battle) => {
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
const WEATHER_MAP = {
  raindance: 'Rain',
  sandstorm: 'Sand',
  sunnyday: 'Sun',
  hail: 'Hail',
};

// 
const sanitizeField = (battle) => {
  const { weather } = battle || {};

  const sanitizedField = {
    weather: WEATHER_MAP[weather] || null,
    attackerSide: null,
    defenderSide: null,
  };

  return sanitizedField;
};

// 
export const syncField = (state, battle) => {
  if (!nonEmptyObject(state?.field) || !battle?.p1) {
    console.warn(
      '[Gen 3 OU Tools] The field or battle is invalid.',
      '\nbattleState.field:', state.field,
      '\nbattle:', battle,
    );

    return state?.field;
  }

  const newField = cloneField(state.field);
  const updatedField = sanitizeField(battle);

  Object.keys(updatedField).forEach((key) => {
    if (['attackerSide', 'defenderSide'].includes(key)) {
      return;
    }

    const value = updatedField?.[key];
    const originalValue = state.field?.[key];

    if (JSON.stringify(value) === JSON.stringify(originalValue)) {
      return;
    }

    newField[key] = value;
  });

  newField.autoWeather = null;

  return newField;
};

// 
export const calcPokemonToolsId = (pokemon, playerKey) => calcToolsId({
  ident: [
    playerKey || pokemon?.playerKey || detectPlayerKeyFromPokemon(pokemon),
    uuidv4(),
  ].filter(Boolean).join(': '),

  speciesForme: pokemon?.speciesForme,
});

// 
export const diffArrays = (arrayA, arrayB) => {
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

  const diffIndexFilter = (source, target) => (sourceIndex) => !target.some((value) => value === source[sourceIndex]);

  const diffIndicesA = arrayA.map((_, index) => index).filter(diffIndexFilter(arrayA, arrayB));
  const diffIndicesB = arrayB.map((_, index) => index).filter(diffIndexFilter(arrayB, arrayA));

  return [
    ...diffIndicesA.map((index) => arrayA[index]),
    ...diffIndicesB.map((index) => arrayB[index]),
  ];
};

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
export const sanitizePokemon = (pokemon, format) => {
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
const tr = (num, bits = 0) => (
  bits ? (num >>> 0) % (2 ** bits) : (num >>> 0)
);

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
  syncedPokemon.spreadStats = calcPokemonSpreadStats(format, syncedPokemon);

  return syncedPokemon;
};