// EDITINGNOTE: Reviewed, see notes...
// EDITINGNOTE: What of this is only related to drag and drop, a feature I'm removing?

import * as React from 'react';
import { useToolsContext } from './hooks.js';
import { nonEmptyObject, similarArrays } from './utilities.js';
import { PiconRackContext } from './_PICONRACKCONTEXT.js';

export const PiconRackProvider = ({ children }) => {
  const { state } = useToolsContext();

  const makeItemId = (playerKey, pokemonId) => `picon:${playerKey}:${pokemonId}`;

  const parsePlayerParty = React.useCallback((playerKey) => (
    (state?.[playerKey]?.pokemon || [])
      .map((pokemon) => !!pokemon?.toolsId && makeItemId(playerKey, pokemon.toolsId))
      .filter(Boolean)
  ), [state]);

  // EDITINGNOTE: This is implemented as containerIds.current, which is defined in their code but not in ours. Should we strip this out or simplify it?
  const containerIds = React.useRef(
    ['p1', 'p2'].reduce((prev, key) => {
      prev[key] = `picon:${key}`;

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

  // EDITINGNOTE: Should this stay here or move outside the export? I'm suspecting move because of React dependencies
  const dndMuxTest = /^picon:(p\d):/;

  const extractPlayerKey = React.useCallback((id, detectOnly) => {
    const detectedKey = dndMuxTest.exec(String(id || ''))?.[1];
    const pid = String(id || '').replace(dndMuxTest, '') || null;

    if (!pid || detectOnly) {
      return detectedKey;
    }

    const matchedKey = Object.entries(playerOrdering)
      .find(([, oids]) => oids.some((oid) => oid?.includes(pid)))?.[0];

    return matchedKey || detectedKey;
  }, [playerOrdering]);

  const extractPokemonId = (id) => String(id || '').replace(dndMuxTest, '') || null;

  // EDITINGNOTE: The setter has been removed. How should this be handled?
  const [lastAddedId] = React.useState(null);

  // EDITINGNOTE: gridSpecs is used by a component that I have stripped out here. How do I determine what I need here?
  const value = React.useMemo(() => ({
    itemKeyPrefix: 'picon',
    containerIds: containerIds.current,
    lastAddedId,

    gridSpecs: {
      columns: 6,
      gridSize: 40,
      gridGap: 0,
    },

    ...playerOrdering,

    makeItemId,
    extractPlayerKey,
    extractPokemonId,
  }), [lastAddedId, playerOrdering, makeItemId, extractPlayerKey]);

  return (
      <PiconRackContext.Provider value={value}>
          {children}
      </PiconRackContext.Provider>
  );
};