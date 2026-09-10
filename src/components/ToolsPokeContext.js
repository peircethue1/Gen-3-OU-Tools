// EDITINGNOTE: Reviewed...

import * as React from 'react';

export const ToolsPokeContext = React.createContext({
  state: {},

  playerKey: null,
  player: {},
  playerPokemon: {},
  opponent: {},
  opponentPokemon: {},

  usage: {},
  abilityUsageFinder: () => null,
  abilityUsageSorter: () => 0,
  itemUsageFinder: () => null,
  itemUsageSorter: () => 0,
  moveUsageFinder: () => null,
  moveUsageSorter: () => 0,

  matchups: [],
});