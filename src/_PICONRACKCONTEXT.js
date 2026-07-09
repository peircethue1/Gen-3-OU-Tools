// EDITINGNOTE: Reviewed...

import * as React from 'react';

export const PiconRackContext = React.createContext({
  itemKeyPrefix: null,

  containerIds: {
    p1: null,
    p2: null,
  },

  lastAddedId: null,

  gridSpecs: {
    columns: 1,
    gridSize: 1,
    gridGap: 0,
  },

  p1: [],
  p2: [],

  makeItemId: () => null,
  extractPlayerKey: () => null,
  extractPokemonId: () => null,
});