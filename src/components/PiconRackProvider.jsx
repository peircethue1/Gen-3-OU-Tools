// EDITINGNOTE: Reviewed...

import * as React from 'react';
import { useToolsContext } from '@gen-3-ou-tools/hooks.js';
import { PiconRackContext } from './PiconRackContext.js';

const makeItemId = (playerKey, pokemonId) => `picon:${playerKey}:${pokemonId}`;

const dndMuxTest = /^picon:(p\d):/;

const extractPlayerKey = (id) => dndMuxTest.exec(String(id || ''))?.[1];

const extractPokemonId = (id) => String(id || '').replace(dndMuxTest, '') || null;

export const PiconRackProvider = ({ children }) => {
  const { state } = useToolsContext();

  const parsePlayerParty = React.useCallback((playerKey) => (
    (state?.[playerKey]?.pokemon || [])
      .map((pokemon) => !!pokemon?.toolsId && makeItemId(playerKey, pokemon.toolsId))
      .filter(Boolean)
  ), [state]);

  const playerOrdering = React.useMemo(() => (
    ['p1', 'p2'].reduce((prev, key) => {
      prev[key] = parsePlayerParty(key);

      return prev;
    }, {})
  ), [parsePlayerParty]);

  const value = React.useMemo(() => ({
    gridSpecs: {
      columns: 6,
      gridSize: 40,
      gridGap: 0,
    },

    ...playerOrdering,

    makeItemId,
    extractPlayerKey,
    extractPokemonId,
  }), [playerOrdering]);

  return (
    <PiconRackContext.Provider value={value}>
      {children}
    </PiconRackContext.Provider>
  );
};