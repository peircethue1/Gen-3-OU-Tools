// EDITINGNOTE: Needed final decisions are noted...

import { v5 as uuidv5, NIL as uuidnil, v4 as uuidv4 } from 'uuid';

// 
export const clamp = (min, value, max) => (
  typeof max === 'number' && max > min
    ? Math.max(Math.min(value, max ?? value), min)
    : Math.max(value, min ?? value)
);

// Creates a generation for the format
export const detectGenFromFormat = (format) => {
  if (typeof format === 'number') {
    return clamp(0, format);
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

// Creates a copy of the player side conditions
export const clonePlayerSideConditions = (conditions) =>
  Object.entries(conditions || {}).reduce((prev, [key, value]) => {
    prev[key] = Array.isArray(value) ? [...value] : value;

    return prev;
  }, {});

// Creates a standardized identification string
export const formatId = (value) =>
  value?.toString?.()
    .normalize('NFD')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();

// Creates a standardized object for the player side
export const sanitizePlayerSide = (player, battleSide) => {
  const {
    selectionIndex,
    pokemon: playerPokemon,
    side,
  } = player || {};

  const currentPokemon = playerPokemon?.length && selectionIndex > -1 ? playerPokemon[selectionIndex] : null;

  const sideConditions = battleSide?.sideConditions || side?.conditions || {};

  const sideConditionNames = Object.keys(sideConditions)
    .map((condition) => formatId(condition))
    .filter(Boolean);

  const volatileNames = Object.keys(currentPokemon?.volatiles || {})
    .map((volatile) => formatId(volatile))
    .filter(Boolean);

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

// Checks if the object contains any elements or keys
export const nonEmptyObject = (object) => {
  if (typeof object !== 'object') {
    return false;
  }

  if (Array.isArray(object)) {
    return !!object.length;
  }

  return !!Object.keys(object || {}).length;
};

// Creates a string for the key-value pair
const serializePayload = (payload) =>
  Object.entries(payload || {})
    .map(([key, value]) => `${key}:${(typeof value === 'object' ? JSON.stringify(value) : String(value))}`)
    .join('|');

// Creates a deterministic identification string
const calcToolsId = (payload) => {
  const serialized = nonEmptyObject(payload)
    ? serializePayload(payload)
    : ['string', 'number', 'boolean'].includes(typeof payload)
      ? String(payload)
      : null;

  if (!serialized) {
    return null;
  }

  return uuidv5(
    serialized?.replace(/[^A-Z0-9\x20~`!@#$%^&*()+\-_=\[\]{}<>\|:;,\.'"\/\\]/gi, ''),
    uuidnil,
  );
};

// Creates a standardized object for the Pokemon volatiles
export const sanitizeVolatiles = (pokemon) =>
  Object.entries(pokemon?.volatiles || {}).reduce((volatiles, [id, volatile]) => {
    const [, value, ...rest] = volatile || [];

    const transformed = formatId(id) === 'transform' && typeof value?.speciesForme === 'string';

    if (transformed || !value || ['string', 'number'].includes(typeof value)) {
      volatiles[id] = transformed ? [id, value.speciesForme, ...rest] : volatile;
    }

    return volatiles;
  }, {});

// Creates a deterministic string that represents the Pokemon state EDITINGNOTE: Come back to this to decide what we need from battle and what we need from state. Do I need faintCounter?
const calcPokemonToolsNonce = (pokemon) =>
  calcToolsId({
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

// Creates a deterministic string that represents the player side EDITINGNOTE: Come back to this to decide what we need from battle and what we need from state
const calcSideToolsNonce = (side) =>
  calcToolsId({
    id: side?.id,
    sideid: side?.sideid,
    name: side?.name,
    rating: side?.rating,
    totalPokemon: side?.totalPokemon?.toString(),
    active: side?.active?.map((pokemon) => calcPokemonToolsNonce(pokemon)).join(';'),
    pokemon: side?.pokemon?.map((pokemon) => calcPokemonToolsNonce(pokemon)).join(';'),
    sideConditions: Object.keys(side?.sideConditions || {}).join(';'),
  });

// Creates a deterministic string that represents the state EDITINGNOTE: Come back to this to decide what we need from battle and what we need from state
export const calcBattleToolsNonce = (battle, request, toolsState) => {
  const stepQueue = battle?.stepQueue?.filter?.((step) => !!step && !/^\|(?:inactive|-message|c(?!.+\|\/raw)|j|l|player)/i.test(step)) || [];

  return calcToolsId({
    id: battle?.id,
    gen: battle?.gen?.toString(),
    tier: battle?.tier,
    gameType: battle?.gameType,
    paused: String(!!battle?.paused),
    ended: String(!!battle?.ended),
    myPokemon: battle?.myPokemon?.length
    ? calcToolsId(battle.myPokemon.map((pokemon) => calcPokemonToolsNonce(pokemon)).join(';') || 'empty')
    : null,
    mySide: calcSideToolsNonce(battle?.mySide),
    nearSide: calcSideToolsNonce(battle?.nearSide),
    p1: calcSideToolsNonce(battle?.p1),
    p2: calcSideToolsNonce(battle?.p2),
    stepQueue: calcToolsId(stepQueue.join(';')),
    rqid: request?.rqid?.toString(),
    requestType: request?.requestType,
    side: request?.side?.id,
    smogonChaos: !!toolsState?.smogonChaos,
    smogonLeads: !!toolsState?.smogonLeads,
  });
};

// Fetches the Dex for the format
export const getDexForFormat = (format) => {
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

// Creates a structured object for the Pokemon details
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

// Checks if two Pokemon details strings are for the same Pokemon
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

// Creates an identitification string for the Pokemon
const detectPokemonIdent = (pokemon) => [
  ('side' in (pokemon || {}) && pokemon.side?.sideid) || pokemon?.searchid?.split?.(':')[0] || pokemon?.ident?.split?.(':')[0],
  pokemon?.speciesForme || pokemon?.details?.split?.(', ')?.[0] || pokemon?.searchid?.split?.('|')[1] || pokemon?.ident?.split?.(': ')[1] || pokemon?.name,
].filter(Boolean).join(': ') || pokemon?.ident || pokemon?.searchid?.split?.('|')[0] || null;

// Creates a player key for the Pokemon
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

// Fetches the username
const getAuthUsername = () => (
  window.app.user?.attributes?.name || null
);

// Creates a player key for the username
export const detectAuthPlayerKeyFromBattle = (battle) => {
  const detectedPlayerKey = detectPlayerKeyFromPokemon(battle?.myPokemon?.[0]);

  if (detectedPlayerKey) {
    return detectedPlayerKey;
  }

  const authName = getAuthUsername();

  if (!authName) {
    return null;
  }

  return battle?.sides?.find?.((side) =>
    'name' in (side || {}) && [side.id, side.name].filter(Boolean).includes(authName)
  )?.sideid || null;
};

// Creates a copy of the field
const cloneField = (field) => {
  const output = { ...field };

  if ('attackerSide' in output) {
    delete output.attackerSide;
  }

  if ('defenderSide' in output) {
    delete output.defenderSide;
  }

  return output;
};

// Relates weather identifiers
const WEATHER_MAP = {
  raindance: 'Rain',
  sandstorm: 'Sand',
  sunnyday: 'Sun',
  hail: 'Hail',
};

// Creates a standardized object for the field
const sanitizeField = (battle) => {
  const { weather } = battle || {};

  const sanitizedField = {
    weather: WEATHER_MAP[weather] || null,
    attackerSide: null,
    defenderSide: null,
  };

  return sanitizedField;
};

// Updates the field object based on the field state
export const syncField = (state, battle) => {
  if (!nonEmptyObject(state?.field) || !battle?.p1) {
    console.warn(
      '[Gen 3 OU Tools] The field or battle is invalid.',
      '\nstate.field:', state.field,
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

// Creates a unique identification string for the Pokemon
export const calcPokemonToolsId = (pokemon, playerKey) =>
  calcToolsId({
    ident: [
      playerKey || pokemon?.playerKey || detectPlayerKeyFromPokemon(pokemon),
      uuidv4(),
    ].filter(Boolean).join(': '),
    speciesForme: pokemon?.speciesForme,
  });

// Creates an array that contains all elements that exist in exactly one of two arrays
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

// Creates a species form for the Pokemon
const detectSpeciesForme = (pokemon) =>
  pokemon?.speciesForme ||
  pokemon?.details?.split?.(', ')[0] ||
  pokemon?.searchid?.split?.('|')[1] ||
  pokemon?.ident?.split?.(': ')[1];

// Creates a structured object for the Pokemon statistics
const populateStatsTable = (stats, config) => {
  const { spread } = config || {};

  const output = { hp: null, atk: null, def: null, spa: null, spd: null, spe: null };

  if (!nonEmptyObject(stats)) {
    return output;
  }

  const max = spread === 'ev' ? 255 : 31;

  Object.entries(stats).forEach(([stat, rawValue]) => {
    const value = typeof rawValue === 'number' ? rawValue : Number(rawValue);

    if (Number.isNaN(value)) {
      return;
    }

    output[stat] = clamp(0, value, max);
  });

  return output;
};

// Creates a structured object for the Pokemon moves
const getDexMoveTrack = (dex, moveTrack, transformed) =>
  moveTrack?.filter((track) => (
    Array.isArray(track) &&
    typeof track[0] === 'string' &&
    !!track[0] &&
    (transformed ? track[0].startsWith('*') : !track[0].startsWith('*'))
  ))
  .map(([moveName, ppUsed]) => [
    dex.moves.get(moveName?.replace('*', '')),
    ppUsed || 0,
  ])
  .filter(([move]) => move?.exists && !!move.name);

// Creates a standardized object for the Pokemon moves
export const sanitizeMoveTrack = (pokemon, format) => {
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

// Checks if two arrays contain exactly the same elements
export const similarArrays = (arrayA, arrayB) => {
  if (!Array.isArray(arrayA) || !Array.isArray(arrayB)) {
    return false;
  }

  const diff = diffArrays(arrayA, arrayB);

  if (!Array.isArray(diff)) {
    return false;
  }

  return !diff.length;
};

// Checks if the Pokemon ability is active
const detectToggledAbility = (pokemon) => {
  const ability = pokemon.ability;
  const volatiles = Object.keys(pokemon.volatiles || {});
  const abilityId = formatId(ability);

  return volatiles.some((key) => key?.includes(abilityId));
};

// Creates a standardized object for the Pokemon EDITINGNOTE: Do I need faintCounter?
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
    types: (typeChanged ? pokemon.volatiles.typechange[1].split('/') : pokemon?.types) || [],
    hp: pokemon?.hp ?? 100,
    maxhp: pokemon?.maxhp || 100,
    fainted: pokemon?.hp === 0,
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

      table[stat] = clamp(-6, raw, 6);

      return table;
    }, {}),
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

  sanitizedPokemon.abilities = [
    ...Object.values(species?.abilities || {})
  ].filter((ability) => !!ability && formatId(ability) !== 'noability');

  sanitizedPokemon.transformedAbilities = [
    ...Object.values(transformedSpecies?.abilities || {})
  ].filter((ability) => !!ability && formatId(ability) !== 'noability');

  sanitizedPokemon.abilityToggled = detectToggledAbility(sanitizedPokemon);

  if (!sanitizedPokemon?.toolsId) {
    sanitizedPokemon.toolsId = calcPokemonToolsId(sanitizedPokemon);
  }

  return sanitizedPokemon;
};

// Creates a copy of the Pokemon
export const clonePokemon = (pokemon) => {
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

// Relates natures and statistics
const POKEMON_NATURE_BOOSTS = {
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

// Truncates the number to a specific bit size
const truncate = (num, bits) => (
  bits ? (num >>> 0) % (2 ** bits) : (num >>> 0)
);

// Creates a raw Pokemon statistic
const calcPokemonStat = (stat, base, iv, ev, level, nature) => {
  const actualIv = clamp(0, iv);
  const actualEv = clamp(0, ev);
  const actualLevel = clamp(0, level, 100);

  if (stat === 'hp') {
    if (base === 1) {
      return base;
    }

    return truncate(((2 * base + actualIv + truncate(actualEv / 4)) * actualLevel) / 100) + actualLevel + 10;
  }

  const value = truncate(((2 * base + actualIv + truncate(actualEv / 4)) * actualLevel) / 100) + 5;

  if (nature && nature in POKEMON_NATURE_BOOSTS) {
    const [plus, minus] = POKEMON_NATURE_BOOSTS[nature];

    if (plus && stat === plus) {
      return truncate(truncate(value * 110, 16) / 100);
    }

    if (minus && stat === minus) {
      return truncate(truncate(value * 90, 16) / 100);
    }
  }

  return value;
};

// Creates a raw Pokemon statistic spread EDITINGNOTE: What are the right default values here?
export const calcPokemonSpreadStats = (pokemon) => {
  if (!nonEmptyObject(pokemon?.baseStats)) {
    return { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
  }

  return ['hp', 'atk', 'def', 'spa', 'spd', 'spe'].reduce((prev, stat) => {
    const baseStat = (pokemon.transformedForme && stat !== 'hp' ? pokemon.transformedBaseStats : pokemon.baseStats)?.[stat];

    prev[stat] = calcPokemonStat(
      stat,
      baseStat,
      pokemon.ivs?.[stat],
      pokemon.evs?.[stat],
      (stat !== 'hp' && pokemon.transformedLevel) || pokemon.level,
      pokemon.nature,
    );

    return prev;
  }, { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 });
};

// EDITINGNOTE: This is the beginning of React component utilities. These are unreviewed and unordered
export const PlayerSideConditionsDexMap = {
  isLightScreen: ['moves', 'lightscreen'],
  isReflect: ['moves', 'reflect'],
  isSeeded: ['moves', 'leechseed'],
  spikes: ['moves', 'spikes'],
};

const DexDescriptionFormatters = [
  { regex: /Abilit(y|ies)/, replacement: 'abilit$1' },
  { regex: /Nature(s)?/, replacement: 'nature$1' },
  { regex: /Item(s)?/, replacement: 'item$1' },
  { regex: /KOes/, replacement: 'KOs' },
  { regex: /supereffective/, replacement: 'super effective' },
  { regex: /(?<=\s+)and(?=\s+)/, replacement: '&' },
  { regex: /(?<=\d)x(?=[.,:;!?\s])/i, replacement: '×' },
  { regex: /1\/2[\w\s]+max\s+HP/, replacement: '50% HP' },
  { regex: /1\/3[\w\s]+max\s+HP/, replacement: '33% HP' },
  { regex: /1\/4[\w\s]+max\s+HP/, replacement: '25% HP' },
  { regex: /1\/5[\w\s]+max\s+HP/, replacement: '20% HP' },
  { regex: /1\/6[\w\s]+max\s+HP/, replacement: '16% HP' },
  { regex: /1\/8[\w\s]+max\s+HP/, replacement: '12% HP' },
  { regex: /1\/10[\w\s]+max\s+HP/, replacement: '10% HP' },
  { regex: /1\/16[\w\s]+max\s+HP/, replacement: '6% HP' },
  { regex: /(?:(?<!Special\s+|Sp\.?\s+)Attack(?!s)|(?<!Sp\.?\s+)Atk(?=[.,:;!?\s]))/, replacement: 'ATK' },
  { regex: /(?:(?<!Special\s+|Sp\.?\s+)Defense(?!s)|(?<!Sp\.?\s+)Def(?=[.,:;!?\s]))/, replacement: 'DEF' },
  { regex: /(?:Special\s+Attack|Sp\.?\s+Atk|SpA(?=[.,:;!?\s]))/, replacement: 'SPA' },
  { regex: /(?:Special\s+Defense|Sp\.?\s+Def|SpD(?=[.,:;!?\s]))/, replacement: 'SPD' },
  { regex: /(?:Speed(?!s)|Spe(?=[.,:;!?\s]))/, replacement: 'SPE' },
];

export const formatDexDescription = (description) => {
  if (!description) {
    return null;
  }

  return DexDescriptionFormatters.reduce((prev, formatter) => {
    const { regex, replacement } = formatter;

    return prev.replace(regex, replacement);
  }, description);
};

export const getWeatherConditions = () => {
  return ['Rain', 'Sand', 'Sun', 'Hail'];
};