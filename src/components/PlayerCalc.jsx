// EDITINGNOTE: Reviewed, needs imports and styles, see notes...

import * as React from 'react';
import cx from 'classnames';
import { PlayerPiconButton } from './_STUBS.jsx';
import { DroppableGrid } from './_STUBS.jsx';
import { PiconRackContext } from './_PICONRACKCONTEXT.js';
import { useColorScheme } from './hooks.js';
import { clamp } from './utilities.js';
import { ToolsPokeProvider } from './_STUBS.jsx';
import { useToolsContext } from './hooks.js';
import { PlayerInfo } from './_STUBS.jsx';
import { PokeCalc } from './_STUBS.jsx';
import './main.css';

export const PlayerCalc = ({ className, style, position, playerKey, defaultName }) => {
  const colorScheme = useColorScheme();

  const { state, selectPokemon } = useToolsContext();
  const { containerSize, containerWidth, format } = state;

  const playerState = React.useMemo(() => state[playerKey] || {}, [state, playerKey]);
  const { maxPokemon } = playerState;

  const [contextPiconId, setContextPiconId] = React.useState(null);

  const rackCtx = React.useContext(PiconRackContext);
  const itemIds = rackCtx[playerKey] || [];

  // EDITINGNOTE: check on lastAddedId, gridSpecs, makeItemId once DroppableGrid is built
  const {
    lastAddedId,
    gridSpecs,
    makeItemId,
    extractPlayerKey,
    extractPokemonId,
  } = rackCtx;

  // EDITINGNOTE: check on sortable once PlayerPiconButton is built
  const renderItem = React.useCallback((id, sortable) => {
    // EDITINGNOTE: check on this second argument once PiconRackContext is built
    const pkey = extractPlayerKey?.(id, true);
    const pid = extractPokemonId?.(id) || id;
    const party = state?.[pkey]?.pokemon || [];
    const partyIndex = party?.findIndex((pokemon) => pokemon?.toolsId === pid) ?? -1;
    const targetIndex = partyIndex > -1 ? partyIndex : clamp(0, sortable?.itemIndex ?? party.length, party.length);

    return (
      <PlayerPiconButton
        key={`PlayerCalc:PlayerPiconButton:${playerKey}:${pid}`}
        player={state?.[pkey]}
        pokemon={party[partyIndex]}
        format={format}
        itemIndex={partyIndex < 0 ? sortable?.itemIndex : undefined}
        onPress={() => selectPokemon(playerKey, targetIndex)}
      />
    );
  }, [extractPlayerKey, extractPokemonId, state, playerKey, format, selectPokemon]);

  return (
    <div
      className={cx(
        'playercalc-container',
        // EDITINGNOTE: check on the use of colorScheme as a style once main.css is built
        !!colorScheme && `playercalc-${colorScheme}`,
        containerWidth < 380 && 'playercalc-slim',
        containerSize === 'xs' && 'playercalc-extraSmall',
        ['xs', 'sm'].includes(containerSize) && 'playercalc-small',
        ['md', 'lg', 'xl'].includes(containerSize) && 'playercalc-large',
        (containerSize === 'xl' || containerWidth > 990) && 'playercalc-extraLarge',
        className,
      )}
      style={style}
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
          // EDITINGNOTE: check on makeItemId once DroppableGrid is built
          itemKeyPrefix={makeItemId(playerKey, 'droppable')}
          renderItem={renderItem}
          lastAddedId={lastAddedId}
          focusedId={contextPiconId}
          gridSpecs={gridSpecs}
        >
          {(
            // EDITINGNOTE: Rewrite this array to differentiate between unrevealed and missing pokemon
            Array(clamp(0, clamp(maxPokemon || 0, 6) - itemIds.length))
              .fill(null)
              .map((_, i) => {
                const itemIndex = itemIds.length + i;

                return renderItem(
                  makeItemId(playerKey, String(itemIndex)),
                  { itemIndex },
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