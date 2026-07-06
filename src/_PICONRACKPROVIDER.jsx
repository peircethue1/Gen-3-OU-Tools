import * as React from 'react';
import { useToolsContext } from './hooks.js';
import { nonEmptyObject, similarArrays } from './utilities.js';
import { PiconRackContext } from './_PICONRACKCONTEXT.js';

export const PiconRackProvider = ({ children }) => {
  const itemKeyPrefix = 'picon';

  const { state } = useToolsContext();

  const columns = 6;

  const makeItemId = (playerKey, pokemonId) => `${itemKeyPrefix}:${playerKey}:${pokemonId}`;

  const parsePlayerParty = React.useCallback((playerKey) => (
    (state?.[playerKey]?.pokemon || [])
      .map((pokemon) => !!pokemon?.toolsId && makeItemId(playerKey, pokemon.toolsId))
      .filter(Boolean)
  ), [state]);

  const containerIds = React.useRef(
    ['p1', 'p2'].reduce((prev, key) => {
      prev[key] = makeItemId(key, 'sortable');

      return prev;
    }, {}),
  );

  const [playerOrdering, setPlayerOrdering] = React.useState(
    ['p1', 'p2'].reduce((prev, key) => {
      prev[key] = parsePlayerParty(key);

      return prev;
    }, {}),
  );

  React.useEffect(() => {
    const mutations = ['p1', 'p2'].reduce((prev, key) => {
      const current = playerOrdering[key];
      const next = parsePlayerParty(key);

      if (similarArrays(current, next)) {
        return prev;
      }

      prev[key] = next;

      return prev;
    }, {});

    if (!nonEmptyObject(mutations)) {
      return;
    }

    setPlayerOrdering((prev) => ({
      ...prev,
      ...mutations,
    }));
  }, [
    state?.p1?.pokemon,
    state?.p2?.pokemon,
  ]);

  const dndMuxTest = React.useMemo(
    () => new RegExp(`^${itemKeyPrefix || ''}:(p\\d):`),
    [itemKeyPrefix],
  );

  const extractPlayerKey = React.useCallback((
    id,
    detectOnly,
  ) => {
    const detectedKey = dndMuxTest.exec(String(id || ''))?.[1];
    const pid = String(id || '').replace(dndMuxTest, '') || null;

    if (!pid || detectOnly) {
      return detectedKey;
    }

    const matchedKey = Object.entries(playerOrdering)
      .find(([, oids]) => oids.some((oid) => oid?.includes(pid)))
      ?.[0];

    return matchedKey || detectedKey;
  }, [
    dndMuxTest,
    playerOrdering,
  ]);

  const extractPokemonId = React.useCallback((
    id,
  ) => String(id || '').replace(dndMuxTest, '') || null, [
    dndMuxTest,
  ]);

  const [overlayId] = React.useState(null);
  const [lastAddedId] = React.useState(null);

  const value = React.useMemo(() => ({
    itemKeyPrefix,
    containerIds: containerIds.current,
    overlayId,
    lastAddedId,

    gridSpecs: {
      columns,
      gridSize: 40,
      gridGap: 0,
    },

    ...playerOrdering,

    makeItemId,
    extractPlayerKey,
    extractPokemonId,
  }), [
    columns,
    extractPlayerKey,
    extractPokemonId,
    itemKeyPrefix,
    lastAddedId,
    makeItemId,
    overlayId,
    playerOrdering,
  ]);

  return (
      <PiconRackContext.Provider value={value}>
          {children}
      </PiconRackContext.Provider>
  );
};