// EDITINGNOTE: See note...

import { v5 as uuidv5, NIL as uuidnil } from 'uuid';

// Checks if the host is the classic host
export const detectClassicHost = (host) => (
  (!host?.__GEN_3_OU_TOOLS_HOST || host.__GEN_3_OU_TOOLS_HOST === 'classic') &&
  typeof host?.app?.receive === 'function' &&
  typeof host?.Battle?.prototype?.run === 'function'
);

// Retrieves the authenticated username
export const getAuthUsername = () => (
  window.app.user?.attributes?.name || null
);

// Retrieves the system color scheme
const getSystemColorScheme = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  const queryResult = window.matchMedia?.('(prefers-color-scheme: dark)');

  if (typeof queryResult?.matches !== 'boolean') {
    return null;
  }

  return queryResult.matches ? 'dark' : 'light';
};

// Retrieves the color scheme
export const getColorScheme = () => {
  const schemeFromPrefs = window.Dex?.prefs?.('theme');

  switch (schemeFromPrefs) {
    case 'light':
    case 'dark': {
      return schemeFromPrefs;
    }

    case 'system': {
      const systemScheme = getSystemColorScheme();

      if (systemScheme) {
        return systemScheme;
      }

      break;
    }

    default: {
      break;
    }
  }

  return 'light';
};

// Restricts a value to a specified range
export const clamp = (min, value, max) => (
  typeof max === 'number' && max > min
    ? Math.max(Math.min(value, max ?? value), min)
    : Math.max(value, min ?? value)
);

// Defines a regular expression for the generation
const GEN_FORMAT_REGEX = /^gen(10|\d)/i;

// Identifies the generation from a format
export const detectGenFromFormat = (format) => {
  if (typeof format === 'number') {
    return clamp(0, format);
  }

  if (!GEN_FORMAT_REGEX.test(format)) {
    return null;
  }

  const gen = parseInt(format.match(GEN_FORMAT_REGEX)[1], 10) || 0;

  if (gen < 1) {
    return null;
  }

  return gen;
};

// Translates weather identifiers to names
const WEATHER_MAP = {
  raindance: 'Rain',
  sandstorm: 'Sand',
  sunnyday: 'Sun',
  hail: 'Hail',
};

// Normalizes the field state
export const sanitizeField = (battle) => {
  const { weather } = battle || {};

  const sanitizedField = {
    weather: WEATHER_MAP[weather] || null,
    attackerSide: null,
    defenderSide: null,
  };

  return sanitizedField;
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

// Converts an object to a string
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

// Retrieves the identifier of a Pokemon
const detectPokemonIdent = (pokemon) => [
  ('side' in (pokemon || {}) && pokemon.side?.sideid) ||
  pokemon?.searchid?.split?.(':')[0] ||
  pokemon?.ident?.split?.(':')[0],
  pokemon?.speciesForme ||
  pokemon?.details?.split?.(', ')?.[0] ||
  pokemon?.searchid?.split?.('|')[1] ||
  pokemon?.ident?.split?.(': ')[1] ||
  pokemon?.name,
].filter(Boolean).join(': ') ||
  pokemon?.ident ||
  pokemon?.searchid?.split?.('|')[0] ||
  null;

// Retrieves the player key of a Pokemon
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

// Creates an identification string for the Pokemon
export const calcPokemonToolsId = (pokemon, playerKey) =>
  calcToolsId({
    ident: playerKey || pokemon?.playerKey || detectPlayerKeyFromPokemon(pokemon),
    speciesForme: pokemon?.speciesForme,
  });

// Checks if a string resembles JSON
const isJsonLike = (value) => (
  !!value && typeof value === 'string' && (
    (value.startsWith('{') && value.trim().endsWith('}')) ||
    (value.startsWith('[') && value.trim().endsWith(']'))
  )
);

// Safely parses a JSON string
const safeJsonParse = (value) => {
  if (!isJsonLike(value)) {
    return null;
  }

  try {
    const result = JSON.parse(value);

    if (!Array.isArray(result) && typeof result !== 'object') {
      console.warn(
        '[Gen 3 OU Tools] Parsing the JSON value did not result in an array or object.',
        '\nvalue:', value,
        '\nresult:', result,
      );

      return null;
    }

    return result;
  } catch (error) {
    console.warn(
      '[Gen 3 OU Tools] Failed to safely parse the JSON value.',
      '\nerror:', error,
      '\nvalue:', value,
    );

    return null;
  }
};

// Retrieves the extension identifier
const getExtensionId = () => {
  if (typeof document?.getElementById !== 'function') {
    return null;
  }

  const mainScript = document.getElementById('gen-3-ou-tools-script-main');

  if (typeof mainScript?.getAttribute !== 'function') {
    return null;
  }

  return mainScript.getAttribute('data-ext-id');
};

// Sends a fetch request
const sendFetchMessage = (extensionId, message) => new Promise((resolve, reject) => {
  if (typeof chrome === 'undefined') {
    reject(new Error('Extension context is unavailable'));

    return;
  }

  chrome.runtime.sendMessage(extensionId, { type: 'fetch', ...message }, (response) => {
    if (!response || response.error) {
      const error = new Error(response?.message || 'Failed to fetch Smogon data');

      if (response) {
        error.name = response.name || error.name;
        error.stack = response.stack || error.stack;
      }

      reject(error);

      return;
    }

    resolve({
      ok: response.ok,
      status: response.status,
      headers: response.headers,
      text: () => response.value,
      json: () => safeJsonParse(response.value),
    });
  });
});

// Fetches data from a URL
export const runtimeFetch = async (url) => {
  const extensionId = getExtensionId();

  const response = await sendFetchMessage(extensionId, { url });

  return response;
};

// Stores the database connection
export const gen3OUToolsDb = { value: null };

// Defines the metadata store name
const metaName = 'meta';

// Retrieves metadata from the database
export const readMetaDb = (keys, config) => new Promise((resolve, reject) => {
  const db = config?.db || gen3OUToolsDb.value;

  if (!metaName || typeof db?.transaction !== 'function' || !keys?.length) {
    resolve({});

    return;
  }

  const store = db.transaction(metaName, 'readonly').objectStore(metaName);
  const req = store.openCursor();

  const output = {};

  req.onsuccess = (event) => {
    const cursor = event.target.result;

    if (!cursor) {
      resolve(output);

      return;
    }

    const key = String(cursor.key);

    if (!keys.includes(key)) {
      cursor.continue();

      return;
    }

    output[key] = cursor.value;

    cursor.continue();
  };

  req.onerror = (event) => {
    const error = event.target?.error;

    console.error(
      '[Gen 3 OU Tools] Failed to read metadata from the database.',
      '\nerror:', error,
      '\ndatabase name:', db.name,
      '\ndatabase version:', db.version,
    );

    reject(error);
  };
});

// Defines the Smogon store name
const smogonName = 'smogon';

// Retrieves Smogon data from the database
export const readSmogonDb = (keys, config) => new Promise((resolve, reject) => {
  const db = config?.db || gen3OUToolsDb.value;

  if (!smogonName || typeof db?.transaction !== 'function') {
    console.warn(
      '[Gen 3 OU Tools] Failed to read from the Smogon database because it is not initialized.',
      '\nstore name:', smogonName,
      '\ndatabase name:', db?.name,
      '\ndatabase version:', db?.version,
    );

    reject(new Error('Failed to read from the Smogon database because it is not initialized'));

    return;
  }

  if (!keys?.length) {
    resolve({});

    return;
  }

  const store = db.transaction(smogonName, 'readonly').objectStore(smogonName);
  const req = store.openCursor();

  const output = {};

  req.onsuccess = (event) => {
    const cursor = event.target.result;

    if (!cursor) {
      resolve(output);

      return;
    }

    const key = String(cursor.key);

    if (!keys.includes(key)) {
      cursor.continue();

      return;
    }

    output[key] = cursor.value;

    cursor.continue();
  };

  req.onerror = (event) => {
    const error = event.target?.error;

    console.error(
      '[Gen 3 OU Tools] Failed to read Smogon data from the database.',
      '\nerror:', error,
      '\ndatabase name:', db.name,
      '\ndatabase version:', db.version,
    );

    reject(error);
  };
});

// Saves Smogon data to the database
export const writeSmogonDb = (payload, config) => new Promise((resolve, reject) => {
  const db = config?.db || gen3OUToolsDb.value;

  if (!smogonName || !nonEmptyObject(payload) || typeof db?.transaction !== 'function') {
    console.warn(
      '[Gen 3 OU Tools] Failed to write to the Smogon database.',
      '\ncause:', !nonEmptyObject(payload) ? 'payload is empty' : 'database is not initialized',
      '\nstore name:', smogonName,
      '\ndatabase name:', db?.name,
      '\ndatabase version:', db?.version,
    );

    reject(new Error('Failed to write to the Smogon database'));

    return;
  }

  const txn = db.transaction(smogonName, 'readwrite');
  const store = txn.objectStore(smogonName);

  Object.entries(payload).forEach(([key, value]) => store.put(value, key));

  txn.oncomplete = () => resolve();

  txn.onerror = (event) => {
    const error = event.target?.error;

    console.error(
      '[Gen 3 OU Tools] Failed to write Smogon data to the database.',
      '\nerror:', error,
      '\ndatabase name:', db.name,
      '\ndatabase version:', db.version,
    );

    reject(error);
  };
});

// Saves metadata to the database
export const writeMetaDb = (payload, config) => new Promise((resolve, reject) => {
  const db = config?.db || gen3OUToolsDb.value;

  if (!metaName || typeof db?.transaction !== 'function' || !nonEmptyObject(payload)) {
    resolve();

    return;
  }

  const txn = db.transaction(metaName, 'readwrite');
  const store = txn.objectStore(metaName);

  Object.entries(payload).forEach(([key, value]) => store.put(value, key));

  txn.oncomplete = () => {
    resolve();
  };

  txn.onerror = (event) => {
    const error = event.target?.error;

    console.error(
      '[Gen 3 OU Tools] Failed to write metadata to the database.',
      '\nerror:', error,
      '\ndatabase name:', db.name,
      '\ndatabase version:', db.version,
    );

    reject(error);
  };
});

// Creates a copy of the field
export const cloneField = (field) => {
  const output = { ...field };

  if ('attackerSide' in output) {
    delete output.attackerSide;
  }

  if ('defenderSide' in output) {
    delete output.defenderSide;
  }

  return output;
};

// Normalizes an identifier
export const formatId = (value) =>
  value?.toString?.()
    .normalize('NFD')
    .replace(/[^a-zA-Z0-9]/g, '')
    .toLowerCase();

// Retrieves the Dex for a format
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

// Creates a copy of the Pokemon
export const clonePokemon = (pokemon) => {
  const output = { ...pokemon };

  if (Array.isArray(output.types)) {
    output.types = [...output.types];
  }

  if (Array.isArray(output.dirtyTypes)) {
    output.dirtyTypes = [...output.dirtyTypes];
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

  if (nonEmptyObject(output.dirtyBoosts)) {
    output.dirtyBoosts = { ...output.dirtyBoosts };
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

// Retrieves the move track from the Dex
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

// Normalizes the move track of a Pokemon
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

// Normalizes the volatiles of a Pokemon
export const sanitizeVolatiles = (pokemon) =>
  Object.entries(pokemon?.volatiles || {}).reduce((volatiles, [id, volatile]) => {
    const [, value, ...rest] = volatile || [];

    const transformed = formatId(id) === 'transform' && typeof value?.speciesForme === 'string';

    if (transformed || !value || ['string', 'number'].includes(typeof value)) {
      volatiles[id] = transformed ? [id, value.speciesForme, ...rest] : volatile;
    }

    return volatiles;
  }, {});

// Identifies the species form of a Pokemon
const detectSpeciesForme = (pokemon) =>
  pokemon?.speciesForme ||
  pokemon?.details?.split?.(', ')[0] ||
  pokemon?.searchid?.split?.('|')[1] ||
  pokemon?.ident?.split?.(': ')[1];

// Creates a stats table
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

// Checks if the Pokemon ability is active
export const detectToggledAbility = (pokemon, dirtyAbility) => {
  const ability = dirtyAbility !== undefined ? dirtyAbility : pokemon.ability;

  if (!ability) {
    return null;
  }

  const volatiles = Object.keys(pokemon.volatiles || {});
  const abilityId = formatId(ability);

  return volatiles.some((key) => key?.includes(abilityId));
};

// Normalizes a Pokemon
export const sanitizePokemon = (pokemon, format) => {
  const dex = getDexForFormat(format);

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
    speciesForme: detectSpeciesForme(pokemon) || null,
    transformedForme: (transformed
      ? typeof pokemon.volatiles.transform[1] === 'object'
        ? pokemon.volatiles.transform[1]?.speciesForme
        : pokemon.volatiles.transform[1]
      : null
    ) || null,
    level: pokemon?.level || 0,
    transformedLevel: pokemon?.transformedLevel || null,
    gender: pokemon?.gender || 'N',
    shiny: pokemon?.shiny || false,
    types: (typeChanged ? pokemon.volatiles.typechange[1].split('/') : pokemon?.types) || [],
    dirtyTypes: pokemon?.dirtyTypes || [],
    hp: pokemon?.hp ?? 100,
    dirtyHp: pokemon?.dirtyHp ?? null,
    maxhp: pokemon?.maxhp || 100,
    fainted: pokemon?.hp === 0,
    baseAbility: pokemon?.baseAbility || null,
    dirtyBaseAbility: pokemon?.dirtyBaseAbility || null,
    ability: pokemon?.ability || null,
    dirtyAbility: pokemon?.dirtyAbility || null,
    abilityToggled: pokemon?.abilityToggled || null,
    dirtyAbilityToggled: pokemon?.dirtyAbilityToggled || null,
    abilities: pokemon?.abilities || [],
    transformedAbilities: pokemon?.transformedAbilities || [],
    item: (!!pokemon?.item && dex.items.get(pokemon.item.replace('(exists)', ''))?.name) || null,
    dirtyItem: pokemon?.dirtyItem || null,
    baseItem: (!!pokemon?.baseItem && dex.items.get(pokemon.baseItem.replace('(exists)', ''))?.name) || null,
    dirtyBaseItem: pokemon?.dirtyBaseItem || null,
    itemEffect: pokemon?.itemEffect || null,
    prevItem: pokemon?.prevItem || null,
    prevItemEffect: pokemon?.prevItemEffect || null,
    nature: pokemon?.nature || null,
    ivs: populateStatsTable(pokemon?.ivs, { spread: 'iv' }),
    evs: populateStatsTable(pokemon?.evs, { spread: 'ev' }),
    boosts: ['atk', 'def', 'spa', 'spd', 'spe'].reduce((table, stat) => {
      const boosts = pokemon?.boosts;
      const raw = boosts?.[stat] ?? 0;

      table[stat] = clamp(-6, raw, 6);

      return table;
    }, {}),
    dirtyBoosts: ['atk', 'def', 'spa', 'spd', 'spe'].reduce((table, stat) => {
      table[stat] = pokemon?.dirtyBoosts?.[stat] ?? null;

      if (typeof table[stat] === 'number') {
        table[stat] = clamp(-6, table[stat] || 0, 6);
      }

      return table;
    }, {}),
    transformedBaseStats: pokemon?.transformedBaseStats || null,
    serverStats: pokemon?.serverStats || null,
    status: (!!pokemon?.hp && pokemon?.status) || null,
    dirtyStatus: pokemon?.dirtyStatus || null,
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

  const transformedSpecies = sanitizedPokemon.transformedForme
    ? dex.species.get(sanitizedPokemon.transformedForme)
    : null;

  if (nonEmptyObject(transformedSpecies?.baseStats)) {
    sanitizedPokemon.transformedBaseStats = { ...transformedSpecies.baseStats };

    if ('hp' in sanitizedPokemon.transformedBaseStats) {
      delete sanitizedPokemon.transformedBaseStats.hp;
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

  sanitizedPokemon.dirtyAbilityToggled = detectToggledAbility(sanitizedPokemon, sanitizedPokemon.dirtyAbility);

  if (!sanitizedPokemon?.toolsId) {
    sanitizedPokemon.toolsId = calcPokemonToolsId(sanitizedPokemon);
  }

  return sanitizedPokemon;
};

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

  const diffA = arrayA.filter((element) => !arrayB.includes(element));
  const diffB = arrayB.filter((element) => !arrayA.includes(element));

  return [...diffA, ...diffB];
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

// Defines Pokemon nature stat modifiers
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

// Creates a stat value
const calcPokemonStat = (stat, base, iv, ev, level, nature) => {
  if (!base || typeof iv !== 'number' || typeof ev !== 'number' || !level || !nature) {
    return null;
  }

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

// Creates a stat spread for a Pokemon
export const calcPokemonSpreadStats = (pokemon) => {
  if (!nonEmptyObject(pokemon?.baseStats)) {
    return null;
  }

  return ['hp', 'atk', 'def', 'spa', 'spd', 'spe'].reduce((prev, stat) => {
    const baseStat = (
      pokemon.transformedForme && stat !== 'hp'
        ? pokemon.transformedBaseStats
        : pokemon.baseStats
    )?.[stat];

    prev[stat] = calcPokemonStat(
      stat,
      baseStat,
      pokemon.ivs?.[stat],
      pokemon.evs?.[stat],
      (stat !== 'hp' && pokemon.transformedLevel) || pokemon.level,
      pokemon.nature,
    );

    return prev;
  }, {});
};

// Creates a copy of all Pokemon
const cloneAllPokemon = (pokemon) => pokemon?.map(clonePokemon) || [];

// Creates a copy of player side conditions
export const clonePlayerSideConditions = (conditions) =>
  Object.entries(conditions || {}).reduce((prev, [key, value]) => {
    prev[key] = Array.isArray(value) ? [...value] : value;

    return prev;
  }, {});

// Creates a copy of a player side
const clonePlayerSide = (side) => {
  const output = { ...side };

  if (nonEmptyObject(output.conditions)) {
    output.conditions = clonePlayerSideConditions(output.conditions);
  }

  return output;
};

// Creates a copy of a player
const clonePlayer = (player) => {
  const output = { ...player };

  if (Array.isArray(output.pokemonOrder)) {
    output.pokemonOrder = [...output.pokemonOrder];
  }

  if (Array.isArray(output.pokemon)) {
    output.pokemon = cloneAllPokemon(output.pokemon);
  }

  if (nonEmptyObject(output.side)) {
    output.side = clonePlayerSide(output.side);
  }

  return output;
};

// Creates a copy of the battle state
export const cloneBattleState = (battle) => {
  const output = { ...battle };

  if (nonEmptyObject(output.field)) {
    output.field = cloneField(output.field);
  }

  ['p1', 'p2'].forEach((playerKey) => {
    if (nonEmptyObject(output[playerKey])) {
      output[playerKey] = clonePlayer(output[playerKey]);
    }
  });

  return output;
};

// Identifies the authenticated player key from the battle
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
    'name' in (side || {}) &&
    [side.id, side.name].filter(Boolean).includes(authName)
  )?.sideid || null;
};

// Retrieves the species form from the Pokemon details
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

// Checks if two Pokemon are the same species
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

// Normalizes a player side
export const sanitizePlayerSide = (player, battleSide) => {
  const {
    selectionIndex,
    pokemon: playerPokemon,
    side,
  } = player || {};

  const currentPokemon = playerPokemon?.length && selectionIndex >= 0 ? playerPokemon[selectionIndex] : null;
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

// Initializes the Smogon store in the database
const createSmogonDb = (db) => {
  if (!smogonName || typeof db?.createObjectStore !== 'function') {
    console.warn(
      '[Gen 3 OU Tools] Failed to create the Smogon object store.',
      '\ncreateObjectStore:', typeof db?.createObjectStore,
      '\nstore name:', smogonName,
      '\ndatabase name:', db?.name,
      '\ndatabase version:', db?.version,
    );

    return null;
  }

  if (db.objectStoreNames.contains(smogonName)) {
    console.debug('[Gen 3 OU Tools] The Smogon object store already exists with this name:', smogonName);

    return null;
  }

  const store = db.createObjectStore(smogonName);

  console.debug(
    '[Gen 3 OU Tools] Created the Smogon object store.',
    '\nstore name:', store?.name,
    '\ndatabase name:', db.name,
    '\ndatabase version:', db.version,
  );

  return store;
};

// Initializes the metadata store in the database
const createMetaDb = (db) => {
  if (!metaName || typeof db?.createObjectStore !== 'function') {
    console.warn(
      '[Gen 3 OU Tools] Failed to create the metadata object store.',
      '\ncreateObjectStore:', typeof db?.createObjectStore,
      '\nstore name:', metaName,
      '\ndatabase name:', db?.name,
      '\ndatabase version:', db?.version,
    );

    return null;
  }

  if (db.objectStoreNames.contains(metaName)) {
    console.debug('[Gen 3 OU Tools] The metadata object store already exists with this name:', metaName);

    return null;
  }

  const store = db.createObjectStore(metaName);

  console.debug(
    '[Gen 3 OU Tools] Created the metadata object store.',
    '\nstore name:', store?.name,
    '\ndatabase name:', db.name,
    '\ndatabase version:', db.version,
  );

  return store;
};

// Saves the connection timestamp and version to the database
const updateMetaDb = (db) => {
  if (typeof db?.transaction !== 'function') {
    console.warn(
      '[Gen 3 OU Tools] Failed to update metadata.',
      '\ntransaction:', typeof db?.transaction,
      '\ndatabase name:', db?.name,
      '\ndatabase version:', db?.version,
    );

    return;
  }

  const payload = {
    updated: Date.now(),
    'package-version': '1.0.0',
  };

  writeMetaDb(payload, { db });
};

// Defines the database name
const dbName = 'gen-3-ou-tools';

// Defines the database version
const dbVersion = 1;

// Connects to the database
export const openIndexedDb = () => new Promise((resolve, reject) => {
  if (typeof indexedDB === 'undefined' || !dbName || !dbVersion) {
    console.error(
      '[Gen 3 OU Tools] IndexedDB is unavailable or is not configured.',
      '\nindexedDB:', typeof window?.indexedDB,
      '\ndatabase name:', dbName,
      '\ndatabase version:', dbVersion,
    );

    reject(new Error('IndexedDB is unavailable or is not configured'));

    return;
  }

  const req = indexedDB.open(dbName, dbVersion);

  req.onupgradeneeded = (event) => {
    const db = event.target?.result;

    if (typeof db?.createObjectStore !== 'function') {
      console.warn(
        '[Gen 3 OU Tools] Failed to upgrade database.',
        '\ncreateObjectStore:', typeof db?.createObjectStore,
        '\ndatabase name:', dbName,
        '\ndatabase version:', dbVersion,
      );

      return;
    }

    createSmogonDb(db);

    createMetaDb(db);

    console.debug(
      '[Gen 3 OU Tools] The database was upgraded.',
      '\ndatabase name:', db.name,
      '\ndatabase version:', db.version,
    );
  };

  req.onsuccess = (event) => {
    gen3OUToolsDb.value = event.target?.result;

    updateMetaDb(gen3OUToolsDb.value);

    console.debug(
      '[Gen 3 OU Tools] Connected to the database.',
      '\ndatabase name:', gen3OUToolsDb.value?.name,
      '\ndatabase version:', gen3OUToolsDb.value?.version,
    );

    resolve(gen3OUToolsDb.value);
  };

  req.onerror = (event) => {
    const error = event.target?.error;

    console.error(
      '[Gen 3 OU Tools] Failed to connect to the database.',
      '\nerror:', error,
      '\ndatabase name:', gen3OUToolsDb.value?.name,
      '\ndatabase version:', gen3OUToolsDb.value?.version,
    );

    reject(error);
  };
});

// Creates a nonce identifier for a Pokemon
const calcPokemonToolsNonce = (pokemon) =>
  calcToolsId({
    ident: pokemon?.ident,
    name: pokemon?.name,
    speciesForme: pokemon?.speciesForme,
    hp: pokemon?.hp?.toString(),
    dirtyHp: pokemon?.dirtyHp?.toString(),
    maxhp: pokemon?.maxhp?.toString(),
    level: pokemon?.level?.toString(),
    gender: pokemon?.gender,
    ability: pokemon?.ability,
    dirtyAbility: (!!pokemon?.speciesForme && 'dirtyAbility' in pokemon && pokemon.dirtyAbility) || null,
    baseAbility: pokemon?.baseAbility,
    dirtyBaseAbility: (!!pokemon?.speciesForme && 'dirtyBaseAbility' in pokemon && pokemon.dirtyBaseAbility) || null,
    nature: (!!pokemon?.speciesForme && 'nature' in pokemon && pokemon.nature) || null,
    types: (!!pokemon?.speciesForme && 'types' in pokemon && pokemon.types?.join('|')) || null,
    dirtyTypes: (!!pokemon?.speciesForme && 'dirtyTypes' in pokemon && pokemon.dirtyTypes?.join('|')) || null,
    item: pokemon?.item,
    dirtyItem: (!!pokemon?.speciesForme && 'dirtyItem' in pokemon && pokemon.dirtyItem) || null,
    baseItem: (!!pokemon?.speciesForme && 'baseItem' in pokemon && pokemon.baseItem) || null,
    dirtyBaseItem: (!!pokemon?.speciesForme && 'dirtyBaseItem' in pokemon && pokemon.dirtyBaseItem) || null,
    itemEffect: pokemon?.itemEffect,
    prevItem: pokemon?.prevItem,
    prevItemEffect: pokemon?.prevItemEffect,
    ivs: (!!pokemon?.speciesForme && 'ivs' in pokemon && calcToolsId(pokemon.ivs)) || null,
    evs: (!!pokemon?.speciesForme && 'evs' in pokemon && calcToolsId(pokemon.evs)) || null,
    status: pokemon?.status,
    dirtyStatus: pokemon?.dirtyStatus,
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
    moves: pokemon?.moves?.join(';'),
    moveTrack: calcToolsId((pokemon?.moveTrack)?.map((track) => track?.join(':'))?.join(';')),
    revealedMoves: (!!pokemon?.speciesForme && 'revealedMoves' in pokemon && calcToolsId(pokemon.revealedMoves)) || null,
    boosts: calcToolsId(pokemon?.boosts),
    dirtyBoosts: (!!pokemon?.speciesForme && 'dirtyBoosts' in pokemon && calcToolsId(pokemon.dirtyBoosts)) || null,
    baseStats: (!!pokemon?.speciesForme && 'baseStats' in pokemon && calcToolsId(pokemon.baseStats)) || null,
    spreadStats: (!!pokemon?.speciesForme && 'spreadStats' in pokemon && calcToolsId(pokemon.spreadStats)) || null,
    criticalHit: (!!pokemon?.speciesForme && 'criticalHit' in pokemon && pokemon.criticalHit?.toString()) || null,
  });

// Creates a nonce identifier for a player side
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

// Creates a nonce identifier for the battle
export const calcBattleToolsNonce = (battle) => {
  const stepQueue = battle?.stepQueue?.filter?.((step) =>
    !!step && !/^\|(?:inactive|-message|c(?!.+\|\/raw)|j|l|player)/i.test(step)) || [];

  return calcToolsId({
    id: battle?.id,
    gen: battle?.gen?.toString(),
    tier: battle?.tier,
    gameType: battle?.gameType,
    ended: String(!!battle?.ended),
    myPokemon: battle?.myPokemon?.length
      ? calcToolsId(battle.myPokemon.map((pokemon) => calcPokemonToolsNonce(pokemon)).join(';') || 'empty')
      : null,
    mySide: calcSideToolsNonce(battle?.mySide),
    nearSide: calcSideToolsNonce(battle?.nearSide),
    p1: calcSideToolsNonce(battle?.p1),
    p2: calcSideToolsNonce(battle?.p2),
    stepQueue: calcToolsId(stepQueue.join(';')),
  });
};




















// EDITINGNOTE: This is the beginning of React component utilities. These are unreviewed and unordered.
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