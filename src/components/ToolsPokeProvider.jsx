// EDITINGNOTE: Reviewed, see notes...

import * as React from 'react';
import { usagePercentFinder, usagePercentSorter } from '@gen-3-ou-tools/utilities.js';
import { ToolsContext } from '@gen-3-ou-tools/pages/ToolsContext.js';
import { ToolsPokeContext } from './ToolsPokeContext.js';

export const ToolsPokeProvider = ({ playerKey, children }) => {
  const ctx = React.useContext(ToolsContext);
  const { state } = ctx || {};

  const opponentKey = playerKey === 'p1' ? 'p2' : 'p1';

  const player = React.useMemo(() => state[playerKey] || {}, [playerKey, state]);

  const opponent = React.useMemo(() => state[opponentKey] || {}, [opponentKey, state]);

  const {
    pokemon: playerParty,
    selectionIndex: playerIndex,
  } = player;

  const {
    pokemon: opponentParty,
    selectionIndex: opponentIndex,
  } = opponent;

  const playerPokemon = React.useMemo(() => playerParty?.[playerIndex] || {}, [playerIndex, playerParty]);

  const opponentPokemon = React.useMemo(() => opponentParty?.[opponentIndex] || {}, [opponentIndex, opponentParty]);

  // EDITINGNOTE: This is a placeholder
  const usage = React.useMemo(() => ({
    abilities: Array.from({ length: 2 }, (_, index) => [`Placeholder Ability ${index + 1}`, 0.5]),
    items: Array.from({ length: 10 }, (_, index) => [`Placeholder Item ${index + 1}`, 0.1]),
    moves: Array.from({ length: 10 }, (_, index) => [`Placeholder Move ${index + 1}`, 0.4]),
  }), []);

  const abilityUsageFinder = React.useMemo(() => usagePercentFinder(usage?.abilities), [usage?.abilities]);
  const abilityUsageSorter = React.useMemo(() => usagePercentSorter(abilityUsageFinder), [abilityUsageFinder]);

  const itemUsageFinder = React.useMemo(() => usagePercentFinder(usage?.items), [usage?.items]);
  const itemUsageSorter = React.useMemo(() => usagePercentSorter(itemUsageFinder), [itemUsageFinder]);

  const moveUsageFinder = React.useMemo(() => usagePercentFinder(usage?.moves), [usage?.moves]);
  const moveUsageSorter = React.useMemo(() => usagePercentSorter(moveUsageFinder), [moveUsageFinder]);

  // EDITINGNOTE: This is a placeholder
  const matchups = React.useMemo(() => (
    (usage?.moves || []).map(([moveName]) => ({
      move: {
        name: moveName,
        bp: 10,
        type: 'Placeholder',
        category: 'Placeholder',
      },
      attacker: playerPokemon,
      defender: opponentPokemon,
      damageRange: '10% - 10%',
      koChance: 'Placeholder',
      koColor: '#4caf50',
      description: {
        raw: `${moveName} vs Opponent: 10% - 10%`,
        attacker: playerPokemon?.speciesForme || 'Attacker',
        defender: opponentPokemon?.speciesForme || 'Defender',
        damageRange: '10% - 10%',
        koChance: 'Placeholder',
        recoil: [10, 10],
        recovery: [10, 10],
      },
    }))
  ), [opponentPokemon, playerPokemon, usage?.moves]);

  const value = React.useMemo(() => ({
    state,

    playerKey,
    player,
    playerPokemon,
    opponent,
    opponentPokemon,

    usage,
    abilityUsageFinder,
    abilityUsageSorter,
    itemUsageFinder,
    itemUsageSorter,
    moveUsageFinder,
    moveUsageSorter,

    matchups,
  }), [
    abilityUsageFinder,
    abilityUsageSorter,
    itemUsageFinder,
    itemUsageSorter,
    matchups,
    moveUsageFinder,
    moveUsageSorter,
    opponent,
    opponentPokemon,
    player,
    playerKey,
    playerPokemon,
    state,
    usage,
  ]);

  return (
    <ToolsPokeContext.Provider value={value}>
      {children}
    </ToolsPokeContext.Provider>
  );
};