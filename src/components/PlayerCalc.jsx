// EDITINGNOTE: Reviewed, see note...

import * as React from 'react';
import cx from 'classnames';
import { useToolsContext } from '@gen-3-ou-tools/hooks.js';
import { clamp } from '@gen-3-ou-tools/utilities.js';
import { useColorScheme } from '@gen-3-ou-tools/redux/gen3OUToolsSlice.js';
import { PiconRackContext } from './PiconRackContext.js';
import { PlayerPiconButton } from './PlayerPiconButton.jsx';
import { PlayerInfo } from './+STUBS.jsx';
import { DroppableGrid } from './+STUBS.jsx';
import { ToolsPokeProvider } from './+STUBS.jsx';
import { PokeCalc } from './+STUBS.jsx';
import '@gen-3-ou-tools/main.css';

export const PlayerCalc = ({ className, position, playerKey, defaultName }) => {
  const colorScheme = useColorScheme();

  const { state, selectPokemon } = useToolsContext();
  const { containerSize, containerWidth, format } = state;

  const playerState = React.useMemo(() => state[playerKey] || {}, [playerKey, state]);
  const { maxPokemon } = playerState;

  const rackCtx = React.useContext(PiconRackContext);
  const itemIds = rackCtx[playerKey] || [];

  const {
    gridSpecs,
    makeItemId,
    extractPlayerKey,
    extractPokemonId,
  } = rackCtx;

  const renderItem = React.useCallback((id, sortable) => {// EDITINGNOTE: I need to evaluate a way to pass unrevealed to PlayerPiconButton to determine whether to render a pokeball or grey box. Also, targetindex supports unrevealed when it doesn't need to as it's disabled in playerpiconbutton
    const pkey = extractPlayerKey?.(id);
    const pid = extractPokemonId?.(id) || id;
    const party = state?.[pkey]?.pokemon || [];
    const partyIndex = party?.findIndex((pokemon) => pokemon?.toolsId === pid) ?? -1;
    const targetIndex = partyIndex >= 0 ? partyIndex : clamp(0, sortable?.itemIndex ?? party.length, party.length);

    return (
      <PlayerPiconButton
        key={`PlayerCalc:PlayerPiconButton:${playerKey}:${pid}`}
        player={state?.[pkey]}
        partyIndex={partyIndex}
        format={format}
        onPress={() => selectPokemon(playerKey, targetIndex)}
      />
    );
  }, [extractPlayerKey, extractPokemonId, format, playerKey, selectPokemon, state]);

  return (
    <div
      className={cx(
        'playercalc-container',
        !!colorScheme && `playercalc-${colorScheme}`,
        containerWidth < 380 && 'playercalc-slim',
        containerSize === 'xs' && 'playercalc-extraSmall',
        ['xs', 'sm'].includes(containerSize) && 'playercalc-small',
        ['md', 'lg', 'xl'].includes(containerSize) && 'playercalc-large',
        (containerSize === 'xl' || containerWidth > 990) && 'playercalc-extraLarge',
        className,
      )}
    >
      <div className={'playercalc-playerBar'}>
        <PlayerInfo
          className={'playercalc-playerInfo'}
          position={position}
          playerKey={playerKey}
          defaultName={defaultName}
        />

        <DroppableGrid
          containerClassName={'playercalc-teamList'}
          itemIds={itemIds}
          itemKeyPrefix={makeItemId(playerKey, 'droppable')}
          renderItem={renderItem}
          gridSpecs={gridSpecs}
        >
          {(
            Array(clamp(0, 6 - itemIds.length))
              .fill(null)
              .map((_, index) => {
                const itemIndex = itemIds.length + index;

                return renderItem(
                  makeItemId(playerKey, String(itemIndex)),
                  {
                    itemIndex,
                    unrevealed: itemIndex < maxPokemon,
                  },
                );
              })
          )}
        </DroppableGrid>
      </div>

      <ToolsPokeProvider playerKey={playerKey}>
        <PokeCalc
          className={'playercalc-pokeCalc'}
        />
      </ToolsPokeProvider>
    </div>
  );
};